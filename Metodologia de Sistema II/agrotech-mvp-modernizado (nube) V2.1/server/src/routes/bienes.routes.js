// Maquinaria, herramientas y bienes de uso: lo que dura años y no se consume (tractores, implementos,
// vehículos, escaleras, bins...). Con el service por fecha, los vencimientos de seguro y patente/VTV
// (avisos por N8N en jobs/bienes-scheduler.js), el historial de services y lo gastado en repuestos.
const router = require('express').Router();
const db = require('../db');
const { errorFecha, errorOpcion, errorTexto, esIdValido, validarIdParam } = require('../services/validar');
const { leerGasto, partesDelGasto, redondear } = require('../services/repartoGastos');

const TIPOS = ['tractor', 'implemento', 'vehiculo', 'herramienta', 'instalacion', 'otro'];
const ESTADOS = ['bueno', 'reparacion', 'baja'];

router.param('id', validarIdParam);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });

function leerBien(body, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  if (!parcial || viene('nombre')) {
    if (!body.nombre || !String(body.nombre).trim()) return { error: 'nombre es obligatorio' };
  }
  for (const [campo, lista] of [
    ['tipo', TIPOS],
    ['estado', ESTADOS]
  ]) {
    if (!viene(campo)) continue;
    const e = errorOpcion(body[campo], lista, campo);
    if (e) return { error: e };
    datos[campo] = body[campo];
  }
  for (const [campo, columna, max] of [
    ['nombre', 'nombre', 120],
    ['marca', 'marca', 80],
    ['modelo', 'modelo', 80],
    ['serie', 'serie', 60],
    ['notas', 'notas', 500]
  ]) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[columna] = (body[campo] || '').trim() || null;
  }
  for (const [campo, columna, min, max] of [
    ['anio', 'anio', 1900, 2100],
    ['cantidad', 'cantidad', 1, 100000],
    ['serviceCadaMeses', 'service_cada_meses', 1, 60]
  ]) {
    if (!viene(campo)) continue;
    if ((body[campo] === null || body[campo] === '') && campo !== 'cantidad') {
      datos[columna] = null;
      continue;
    }
    const n = Number(body[campo]);
    if (!Number.isInteger(n) || n < min || n > max) return { error: `${campo} no es un número válido` };
    datos[columna] = n;
  }
  if (viene('valorCompra')) {
    if (body.valorCompra === null || body.valorCompra === '') datos.valor_compra = null;
    else {
      const n = Number(body.valorCompra);
      if (!Number.isFinite(n) || n <= 0 || n >= 1e12) return { error: 'valorCompra debe ser mayor a 0' };
      datos.valor_compra = n;
    }
  }
  for (const [campo, columna] of [
    ['fechaCompra', 'fecha_compra'],
    ['ultimoService', 'ultimo_service'],
    ['seguroVence', 'seguro_vence'],
    ['patenteVence', 'patente_vence']
  ]) {
    if (!viene(campo)) continue;
    const e = errorFecha(body[campo], campo);
    if (e) return { error: e };
    datos[columna] = body[campo] || null;
  }
  if (datos.ultimo_service && String(datos.ultimo_service).slice(0, 10) > hoy()) {
    return { error: 'El último service no puede ser una fecha futura' };
  }
  if (viene('fincaId')) {
    if (body.fincaId === null || body.fincaId === '') datos.finca_id = null;
    else if (!esIdValido(body.fincaId)) return { error: 'fincaId no es válido' };
    else datos.finca_id = Number(body.fincaId);
  }
  return { datos };
}

// Bienes con el próximo service (último + cada cuántos meses) y lo gastado en repuestos y services
// en los últimos 12 meses.
async function bienesDe(productorId, id = null) {
  const { rows } = await db.query(
    `SELECT b.id, b.finca_id, f.nombre AS finca, b.nombre, b.tipo, b.marca, b.modelo, b.anio, b.serie, b.cantidad,
            b.estado, b.fecha_compra, b.valor_compra, b.notas, b.service_cada_meses, b.ultimo_service,
            b.seguro_vence, b.patente_vence,
            CASE WHEN b.service_cada_meses IS NOT NULL AND b.ultimo_service IS NOT NULL
                 THEN (b.ultimo_service + make_interval(months => b.service_cada_meses))::date END AS proximo_service,
            COALESCE((SELECT ROUND(SUM(m.cantidad * m.precio_unitario), 2) FROM insumos i
                      JOIN movimientos_stock m ON m.insumo_id = i.id AND m.tipo = 'compra'
                      WHERE i.bien_id = b.id AND m.fecha > $2::date - INTERVAL '12 months'), 0) AS gasto_repuestos,
            COALESCE((SELECT ROUND(SUM(s.costo), 2) FROM services_bien s
                      WHERE s.bien_id = b.id AND s.fecha > $2::date - INTERVAL '12 months'), 0) AS gasto_services
     FROM bienes b LEFT JOIN fincas f ON f.id = b.finca_id
     WHERE b.productor_id = $1 ${id ? 'AND b.id = $3' : ''}
     ORDER BY (b.estado = 'baja'), b.tipo, b.nombre`,
    id ? [productorId, hoy(), id] : [productorId, hoy()]
  );
  return rows;
}

router.get('/', async (req, res) => {
  res.json(await bienesDe(req.productorId));
});

router.post('/', async (req, res) => {
  const { error, datos } = leerBien(req.body);
  if (error) return res.status(400).json({ error });
  if (datos.finca_id) {
    const { rows } = await db.query('SELECT 1 FROM fincas WHERE id = $1 AND productor_id = $2', [
      datos.finca_id,
      req.productorId
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Finca no encontrada' });
  }
  const columnas = ['productor_id', ...Object.keys(datos)];
  const { rows } = await db.query(
    `INSERT INTO bienes (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    [req.productorId, ...Object.values(datos)]
  );
  res.status(201).json((await bienesDe(req.productorId, rows[0].id))[0]);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { error, datos } = leerBien(req.body, true);
  if (error) return res.status(400).json({ error });
  if (datos.finca_id) {
    const { rows } = await db.query('SELECT 1 FROM fincas WHERE id = $1 AND productor_id = $2', [
      datos.finca_id,
      req.productorId
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Finca no encontrada' });
  }
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  const { rows } = await db.query(
    `UPDATE bienes SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE id = $${columnas.length + 1} AND productor_id = $${columnas.length + 2} RETURNING id`,
    [...Object.values(datos), id, req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Bien no encontrado' });
  res.json((await bienesDe(req.productorId, id))[0]);
});

// Borra el bien con su historial de services y los gastos que armaron. Los repuestos quedan en el
// stock, sin bien. Para lo que se vendió o se rompió conviene "de baja", que guarda la historia.
router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('DELETE FROM bienes WHERE id = $1 AND productor_id = $2 RETURNING id', [
    Number(req.params.id),
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Bien no encontrado' });
  res.json({ id: rows[0].id });
});

// ----- Services -----
async function bienPropio(id, productorId) {
  const { rows } = await db.query('SELECT id, nombre FROM bienes WHERE id = $1 AND productor_id = $2', [
    id,
    productorId
  ]);
  return rows[0] || null;
}

router.get('/:id/services', async (req, res) => {
  const id = Number(req.params.id);
  if (!(await bienPropio(id, req.productorId))) return res.status(404).json({ error: 'Bien no encontrado' });
  const { rows } = await db.query(
    `SELECT s.id, s.fecha, s.descripcion, s.taller, s.costo,
            (SELECT COUNT(*)::int FROM gastos g WHERE g.service_bien_id = s.id) AS gastos
     FROM services_bien s WHERE s.bien_id = $1 ORDER BY s.fecha DESC, s.id DESC`,
    [id]
  );
  res.json(rows);
});

// Registra un service o arreglo. Si es el más nuevo, pasa a ser el "último service" del bien. Con
// costo, puede ir a Gastos (en un cuartel o repartido por hectárea).
router.post('/:id/services', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body;
  const bien = await bienPropio(id, req.productorId);
  if (!bien) return res.status(404).json({ error: 'Bien no encontrado' });
  if (!b.descripcion || !String(b.descripcion).trim()) return res.status(400).json({ error: 'Contá qué se hizo' });
  const fecha = b.fecha || hoy();
  const e = errorFecha(fecha) || errorTexto(b.descripcion, 300, 'descripcion') || errorTexto(b.taller, 120, 'taller');
  if (e) return res.status(400).json({ error: e });
  if (String(fecha).slice(0, 10) > hoy()) return res.status(400).json({ error: 'La fecha no puede ser futura' });
  let costo = null;
  if (b.costo !== undefined && b.costo !== null && b.costo !== '') {
    costo = Number(b.costo);
    if (!Number.isFinite(costo) || costo <= 0 || costo >= 1e12)
      return res.status(400).json({ error: 'El costo debe ser mayor a 0' });
  }
  const gasto = leerGasto(b.gasto, ['ninguno', 'cuartel', 'repartir']);
  if (gasto.error) return res.status(400).json({ error: gasto.error });
  if (gasto.modo !== 'ninguno' && !costo)
    return res.status(400).json({ error: 'Poné el costo para cargarlo en Gastos' });

  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const { rows } = await cliente.query(
      `INSERT INTO services_bien (bien_id, fecha, descripcion, taller, costo) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, fecha, descripcion, taller, costo`,
      [id, fecha, String(b.descripcion).trim(), (b.taller || '').trim() || null, costo]
    );
    const service = rows[0];
    await cliente.query(
      `UPDATE bienes SET ultimo_service = $1, aviso_service = NULL
       WHERE id = $2 AND (ultimo_service IS NULL OR ultimo_service <= $1)`,
      [fecha, id]
    );
    const gastos = [];
    if (gasto.modo !== 'ninguno') {
      const r = await partesDelGasto(cliente, req.productorId, gasto, costo);
      if (r.error) {
        await cliente.query('ROLLBACK');
        return res.status(r.status).json({ error: r.error });
      }
      const concepto = `Service ${bien.nombre}${r.partes.length > 1 ? ' (repartido por ha)' : ''}`.slice(0, 120);
      for (const p of r.partes) {
        const { rows: g } = await cliente.query(
          `INSERT INTO gastos (productor_id, lote_id, concepto, monto, estado, fecha, service_bien_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, lote_id, concepto, monto, estado, fecha`,
          [
            req.productorId,
            p.loteId,
            concepto,
            p.monto,
            gasto.estado,
            gasto.vence || String(fecha).slice(0, 10),
            service.id
          ]
        );
        await cliente.query('INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)', [
          req.productorId,
          'gasto_registrado',
          JSON.stringify(g[0])
        ]);
        gastos.push({ id: g[0].id, loteId: p.loteId, monto: redondear(p.monto) });
      }
    }
    await cliente.query('COMMIT');
    res.status(201).json({ service, gastos, bien: (await bienesDe(req.productorId, id))[0] });
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
});

// Borra un service (y los gastos que armó). El "último service" pasa a ser el anterior.
router.delete('/:id/services/:service', async (req, res) => {
  const id = Number(req.params.id);
  if (!esIdValido(req.params.service)) return res.status(404).json({ error: 'Service no encontrado' });
  if (!(await bienPropio(id, req.productorId))) return res.status(404).json({ error: 'Bien no encontrado' });
  const { rows } = await db.query('DELETE FROM services_bien WHERE id = $1 AND bien_id = $2 RETURNING id, fecha', [
    Number(req.params.service),
    id
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Service no encontrado' });
  // Solo si era el último: una fecha cargada a mano en el bien no se pierde.
  await db.query(
    'UPDATE bienes SET ultimo_service = (SELECT MAX(fecha) FROM services_bien WHERE bien_id = $1) WHERE id = $1 AND ultimo_service = $2',
    [id, rows[0].fecha]
  );
  res.json({ id: rows[0].id });
});

module.exports = router;
module.exports.TIPOS = TIPOS;
