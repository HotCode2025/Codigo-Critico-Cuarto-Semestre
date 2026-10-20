// Cosecha a destajo: cosecheros de la temporada, tarja diaria por cuartel (tachos, bins, kilos o
// jornales), liquidación de lo que hay que pagar y kilos cosechados por cuartel. Es el control de la
// cosecha y de los pagos: no reemplaza el registro de los trabajadores ni el recibo de sueldo.
const router = require('express').Router();
const db = require('../db');
const { loteEsDelProductor } = require('../services/lotes');
const {
  errorFecha,
  errorOpcion,
  errorTexto,
  esIdValido,
  validarFiltrosId,
  validarIdParam
} = require('../services/validar');

const MODALIDADES = ['tacho', 'bin', 'kg', 'jornal'];
// Kilos por unidad si el productor no cargó los suyos (tacho o bolsa cosechera y bin de durazno).
const KG_POR_DEFECTO = { tacho: 20, bin: 400, kg: 1, jornal: null };
const MAX_CANTIDAD = { tacho: 2000, bin: 200, kg: 50000, jornal: 2 };

router.param('id', validarIdParam);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const fechaTexto = f => String(f).slice(0, 10).split('-').reverse().join('/');

// ----- Cosecheros -----
function leerCosechero(body, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  if (!parcial || viene('nombre')) {
    if (!body.nombre || !String(body.nombre).trim()) return { error: 'nombre es obligatorio' };
  }
  for (const [campo, max] of [
    ['nombre', 120],
    ['dni', 12],
    ['telefono', 30]
  ]) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[campo] = (body[campo] || '').trim() || null;
  }
  if (datos.dni) {
    datos.dni = datos.dni.replace(/\D/g, '');
    if (!/^\d{7,8}$/.test(datos.dni)) return { error: 'El DNI tiene que tener 7 u 8 números' };
  }
  if (viene('activo')) datos.activo = !!body.activo;
  return { datos };
}

router.get('/cosecheros', async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nombre, dni, telefono, activo FROM cosecheros WHERE productor_id = $1 ORDER BY activo DESC, nombre',
    [req.productorId]
  );
  res.json(rows);
});

router.post('/cosecheros', async (req, res) => {
  const { error, datos } = leerCosechero(req.body);
  if (error) return res.status(400).json({ error });
  const columnas = ['productor_id', ...Object.keys(datos)];
  const { rows } = await db.query(
    `INSERT INTO cosecheros (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING id, nombre, dni, telefono, activo`,
    [req.productorId, ...Object.values(datos)]
  );
  res.status(201).json(rows[0]);
});

router.patch('/cosecheros/:id', async (req, res) => {
  const { error, datos } = leerCosechero(req.body, true);
  if (error) return res.status(400).json({ error });
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  const { rows } = await db.query(
    `UPDATE cosecheros SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE id = $${columnas.length + 1} AND productor_id = $${columnas.length + 2}
     RETURNING id, nombre, dni, telefono, activo`,
    [...Object.values(datos), Number(req.params.id), req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cosechero no encontrado' });
  res.json(rows[0]);
});

// Solo se borra si no tiene tarjas; si trabajó, se da de baja para no perder la liquidación.
router.delete('/cosecheros/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: tarjas } = await db.query(
    'SELECT 1 FROM tarjas WHERE cosechero_id = $1 AND productor_id = $2 LIMIT 1',
    [id, req.productorId]
  );
  if (tarjas.length) {
    return res.status(409).json({ error: 'Tiene tarjas cargadas: dalo de baja en vez de borrarlo' });
  }
  const { rows } = await db.query('DELETE FROM cosecheros WHERE id = $1 AND productor_id = $2 RETURNING id', [
    id,
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Cosechero no encontrado' });
  res.json({ id: rows[0].id });
});

// ----- Tarifas -----
async function tarifasDe(productorId) {
  const { rows } = await db.query(
    'SELECT modalidad, precio, kg_por_unidad FROM tarifas_cosecha WHERE productor_id = $1',
    [productorId]
  );
  return MODALIDADES.map(modalidad => {
    const t = rows.find(r => r.modalidad === modalidad);
    return {
      modalidad,
      precio: t ? t.precio : null,
      kg_por_unidad: t && t.kg_por_unidad !== null ? t.kg_por_unidad : KG_POR_DEFECTO[modalidad]
    };
  });
}

function leerKg(modalidad, valor) {
  if (modalidad === 'kg') return { kg: 1 };
  if (modalidad === 'jornal') return { kg: null };
  if (valor === undefined || valor === null || valor === '') return { kg: undefined };
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0 || n > 2000) return { error: 'Los kilos por unidad no son válidos' };
  return { kg: n };
}

function leerPrecio(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 && n < 1e10 ? n : null;
}

router.get('/tarifas', async (req, res) => {
  res.json(await tarifasDe(req.productorId));
});

// Recibe [{ modalidad, precio, kgPorUnidad }] y guarda las que vienen.
router.put('/tarifas', async (req, res) => {
  const lista = Array.isArray(req.body) ? req.body : req.body.tarifas;
  if (!Array.isArray(lista) || !lista.length) return res.status(400).json({ error: 'Mandá al menos una tarifa' });
  const filas = [];
  for (const t of lista) {
    const e = errorOpcion(t.modalidad, MODALIDADES, 'modalidad');
    if (e) return res.status(400).json({ error: e });
    const precio = leerPrecio(t.precio);
    if (precio === null) return res.status(400).json({ error: `El precio por ${t.modalidad} no es válido` });
    const { kg, error } = leerKg(t.modalidad, t.kgPorUnidad);
    if (error) return res.status(400).json({ error });
    filas.push([t.modalidad, precio, kg === undefined ? null : kg]);
  }
  for (const [modalidad, precio, kg] of filas) {
    await db.query(
      `INSERT INTO tarifas_cosecha (productor_id, modalidad, precio, kg_por_unidad) VALUES ($1, $2, $3, $4)
       ON CONFLICT (productor_id, modalidad) DO UPDATE SET precio = EXCLUDED.precio, kg_por_unidad = EXCLUDED.kg_por_unidad`,
      [req.productorId, modalidad, precio, kg]
    );
  }
  res.json(await tarifasDe(req.productorId));
});

// ----- Tarjas -----
const COLUMNAS_TARJA = `t.id, t.cosechero_id, c.nombre AS cosechero, t.lote_id, l.nombre AS cuartel, t.fecha, t.modalidad,
  t.cantidad, t.precio_unidad, t.kg_por_unidad, t.pagado_en,
  ROUND(t.cantidad * t.precio_unidad, 2) AS importe, ROUND(t.cantidad * t.kg_por_unidad, 2) AS kg`;

function leerRango(query) {
  for (const campo of ['fecha', 'desde', 'hasta']) {
    const e = errorFecha(query[campo], campo);
    if (e) return { error: e };
  }
  const desde = query.fecha || query.desde || null;
  const hasta = query.fecha || query.hasta || null;
  if (desde && hasta && hasta < desde) return { error: 'hasta no puede ser anterior a desde' };
  return { desde, hasta };
}

router.get('/tarjas', validarFiltrosId('loteId', 'cosecheroId'), async (req, res) => {
  const { error, desde, hasta } = leerRango(req.query);
  if (error) return res.status(400).json({ error });
  const condiciones = ['t.productor_id = $1'];
  const params = [req.productorId];
  const agregar = (sql, valor) => {
    params.push(valor);
    condiciones.push(sql.replace('?', `$${params.length}`));
  };
  if (desde) agregar('t.fecha >= ?', desde);
  if (hasta) agregar('t.fecha <= ?', hasta);
  if (req.query.loteId) agregar('t.lote_id = ?', req.query.loteId);
  if (req.query.cosecheroId) agregar('t.cosechero_id = ?', req.query.cosecheroId);
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_TARJA} FROM tarjas t JOIN cosecheros c ON c.id = t.cosechero_id JOIN lotes l ON l.id = t.lote_id
     WHERE ${condiciones.join(' AND ')} ORDER BY t.fecha DESC, l.nombre, c.nombre LIMIT 2000`,
    params
  );
  res.json(rows);
});

// Carga la tarja del día de un cuartel: una fila por cosechero. Si el cosechero ya tenía tarja ese
// día en ese cuartel con la misma modalidad, se reemplaza; con cantidad 0 se borra. Lo ya pagado no
// se puede cambiar.
router.post('/tarjas', async (req, res) => {
  const { fecha, loteId, modalidad, filas } = req.body;
  if (!fecha) return res.status(400).json({ error: 'fecha es obligatoria' });
  const eFecha = errorFecha(fecha);
  if (eFecha) return res.status(400).json({ error: eFecha });
  if (String(fecha).slice(0, 10) > hoy()) return res.status(400).json({ error: 'La fecha no puede ser futura' });
  const eModalidad = errorOpcion(modalidad, MODALIDADES, 'modalidad');
  if (eModalidad) return res.status(400).json({ error: eModalidad });
  if (!Array.isArray(filas) || !filas.length) return res.status(400).json({ error: 'Cargá al menos un cosechero' });
  if (filas.length > 300) return res.status(400).json({ error: 'Máximo 300 cosecheros por vez' });
  if (!(await loteEsDelProductor(loteId, req.productorId))) {
    return res.status(404).json({ error: 'Cuartel no encontrado' });
  }

  const tarifa = (await tarifasDe(req.productorId)).find(t => t.modalidad === modalidad);
  const precio =
    req.body.precioUnidad !== undefined && req.body.precioUnidad !== ''
      ? leerPrecio(req.body.precioUnidad)
      : leerPrecio(tarifa.precio ?? NaN);
  if (precio === null) {
    return res.status(400).json({ error: `Poné el precio por ${modalidad === 'kg' ? 'kilo' : modalidad}` });
  }
  const { kg, error: eKg } = leerKg(modalidad, req.body.kgPorUnidad);
  if (eKg) return res.status(400).json({ error: eKg });
  const kgPorUnidad = kg === undefined ? Number(tarifa.kg_por_unidad) : kg;

  const vistos = new Set();
  for (const f of filas) {
    if (!esIdValido(f.cosecheroId)) return res.status(400).json({ error: 'Cosechero inválido' });
    if (vistos.has(Number(f.cosecheroId))) return res.status(400).json({ error: 'Hay un cosechero repetido' });
    vistos.add(Number(f.cosecheroId));
    const n = f.cantidad === null || f.cantidad === '' || f.cantidad === undefined ? 0 : Number(f.cantidad);
    if (!Number.isFinite(n) || n < 0 || n > MAX_CANTIDAD[modalidad]) {
      return res
        .status(400)
        .json({ error: `La cantidad de ${modalidad === 'kg' ? 'kilos' : modalidad + 's'} no es válida` });
    }
    f.cantidad = n;
  }
  const ids = [...vistos];
  const { rows: propios } = await db.query(
    'SELECT id, nombre FROM cosecheros WHERE id = ANY($1) AND productor_id = $2',
    [ids, req.productorId]
  );
  if (propios.length !== ids.length) return res.status(404).json({ error: 'Cosechero no encontrado' });

  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const { rows: pagadas } = await cliente.query(
      `SELECT cosechero_id FROM tarjas WHERE cosechero_id = ANY($1) AND lote_id = $2 AND fecha = $3 AND modalidad = $4
         AND pagado_en IS NOT NULL FOR UPDATE`,
      [ids, Number(loteId), fecha, modalidad]
    );
    if (pagadas.length) {
      await cliente.query('ROLLBACK');
      const nombres = propios.filter(p => pagadas.some(x => x.cosechero_id === p.id)).map(p => p.nombre);
      return res.status(409).json({ error: `Ya se le pagó ese día a ${nombres.join(', ')}: no se puede cambiar` });
    }
    let guardadas = 0;
    let borradas = 0;
    for (const f of filas) {
      if (f.cantidad === 0) {
        const r = await cliente.query(
          'DELETE FROM tarjas WHERE cosechero_id = $1 AND lote_id = $2 AND fecha = $3 AND modalidad = $4',
          [Number(f.cosecheroId), Number(loteId), fecha, modalidad]
        );
        borradas += r.rowCount;
        continue;
      }
      await cliente.query(
        `INSERT INTO tarjas (productor_id, cosechero_id, lote_id, fecha, modalidad, cantidad, precio_unidad, kg_por_unidad)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (cosechero_id, lote_id, fecha, modalidad) DO UPDATE
           SET cantidad = EXCLUDED.cantidad, precio_unidad = EXCLUDED.precio_unidad, kg_por_unidad = EXCLUDED.kg_por_unidad`,
        [req.productorId, Number(f.cosecheroId), Number(loteId), fecha, modalidad, f.cantidad, precio, kgPorUnidad]
      );
      guardadas += 1;
    }
    await cliente.query('COMMIT');
    res.status(201).json({ guardadas, borradas });
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
});

router.delete('/tarjas/:id', async (req, res) => {
  const { rows } = await db.query(
    'DELETE FROM tarjas WHERE id = $1 AND productor_id = $2 AND pagado_en IS NULL RETURNING id',
    [Number(req.params.id), req.productorId]
  );
  if (rows[0]) return res.json({ id: rows[0].id });
  const { rows: pagada } = await db.query('SELECT 1 FROM tarjas WHERE id = $1 AND productor_id = $2', [
    Number(req.params.id),
    req.productorId
  ]);
  if (pagada.length) return res.status(409).json({ error: 'Esa tarja ya está pagada: no se puede borrar' });
  res.status(404).json({ error: 'Tarja no encontrada' });
});

// ----- Liquidación -----
// Total por cosechero en el período: unidades por modalidad, kilos, importe, lo pagado y lo pendiente.
router.get('/liquidacion', async (req, res) => {
  const { error, desde, hasta } = leerRango(req.query);
  if (error) return res.status(400).json({ error });
  if (!desde || !hasta) return res.status(400).json({ error: 'Elegí desde y hasta' });
  const { rows } = await db.query(
    `SELECT c.id AS cosechero_id, c.nombre, c.dni,
            COUNT(DISTINCT t.fecha)::int AS dias,
            COALESCE(SUM(t.cantidad) FILTER (WHERE t.modalidad = 'tacho'), 0) AS tachos,
            COALESCE(SUM(t.cantidad) FILTER (WHERE t.modalidad = 'bin'), 0) AS bins,
            COALESCE(SUM(t.cantidad) FILTER (WHERE t.modalidad = 'jornal'), 0) AS jornales,
            COALESCE(ROUND(SUM(t.cantidad * t.kg_por_unidad), 2), 0) AS kg,
            ROUND(SUM(t.cantidad * t.precio_unidad), 2) AS importe,
            COALESCE(ROUND(SUM(t.cantidad * t.precio_unidad) FILTER (WHERE t.pagado_en IS NOT NULL), 2), 0) AS pagado,
            COALESCE(ROUND(SUM(t.cantidad * t.precio_unidad) FILTER (WHERE t.pagado_en IS NULL), 2), 0) AS pendiente
     FROM tarjas t JOIN cosecheros c ON c.id = t.cosechero_id
     WHERE t.productor_id = $1 AND t.fecha BETWEEN $2 AND $3
     GROUP BY c.id ORDER BY c.nombre`,
    [req.productorId, desde, hasta]
  );
  const suma = campo => Math.round(rows.reduce((s, r) => s + Number(r[campo]), 0) * 100) / 100;
  res.json({
    desde,
    hasta,
    cosecheros: rows,
    totales: { kg: suma('kg'), importe: suma('importe'), pagado: suma('pagado'), pendiente: suma('pendiente') }
  });
});

function leerPago(body) {
  const { error, desde, hasta } = leerRango(body);
  if (error) return { error };
  if (!desde || !hasta) return { error: 'Elegí desde y hasta' };
  const ids = body.cosecheroIds;
  if (ids !== undefined && (!Array.isArray(ids) || !ids.length || ids.some(id => !esIdValido(id)))) {
    return { error: 'cosecheroIds no es válido' };
  }
  return { desde, hasta, ids: ids ? ids.map(Number) : null };
}

// Marca como pagado lo pendiente del período (de todos o de los cosecheros elegidos). Si se pide,
// también lo carga como gasto pagado en cada cuartel, así entra en el balance.
router.post('/liquidacion/pagar', async (req, res) => {
  const { error, desde, hasta, ids } = leerPago(req.body);
  if (error) return res.status(400).json({ error });
  const fechaPago = req.body.fechaPago || hoy();
  const eFecha = errorFecha(fechaPago, 'fechaPago');
  if (eFecha) return res.status(400).json({ error: eFecha });
  if (String(fechaPago).slice(0, 10) > hoy())
    return res.status(400).json({ error: 'La fecha de pago no puede ser futura' });

  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const { rows } = await cliente.query(
      `UPDATE tarjas SET pagado_en = $4
       WHERE productor_id = $1 AND fecha BETWEEN $2 AND $3 AND pagado_en IS NULL
         ${ids ? 'AND cosechero_id = ANY($5)' : ''}
       RETURNING lote_id, ROUND(cantidad * precio_unidad, 2) AS importe`,
      ids ? [req.productorId, desde, hasta, fechaPago, ids] : [req.productorId, desde, hasta, fechaPago]
    );
    const porCuartel = {};
    for (const r of rows) porCuartel[r.lote_id] = (porCuartel[r.lote_id] || 0) + Number(r.importe);
    let gastos = 0;
    if (req.body.registrarGasto !== false) {
      for (const [loteId, monto] of Object.entries(porCuartel)) {
        if (monto <= 0) continue;
        await cliente.query(
          `INSERT INTO gastos (productor_id, lote_id, concepto, monto, estado, fecha) VALUES ($1, $2, $3, $4, 'pagado', $5)`,
          [
            req.productorId,
            Number(loteId),
            `Cosecha a destajo ${fechaTexto(desde)} al ${fechaTexto(hasta)}`,
            monto,
            fechaPago
          ]
        );
        gastos += 1;
      }
    }
    await cliente.query('COMMIT');
    const importe = Math.round(rows.reduce((s, r) => s + Number(r.importe), 0) * 100) / 100;
    res.json({ tarjas: rows.length, importe, gastos });
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
});

// Deshace un pago marcado por error (el gasto que se haya cargado se borra a mano en Gastos).
router.post('/liquidacion/deshacer-pago', async (req, res) => {
  const { error, desde, hasta, ids } = leerPago(req.body);
  if (error) return res.status(400).json({ error });
  const { rowCount } = await db.query(
    `UPDATE tarjas SET pagado_en = NULL
     WHERE productor_id = $1 AND fecha BETWEEN $2 AND $3 AND pagado_en IS NOT NULL
       ${ids ? 'AND cosechero_id = ANY($4)' : ''}`,
    ids ? [req.productorId, desde, hasta, ids] : [req.productorId, desde, hasta]
  );
  res.json({ tarjas: rowCount });
});

// ----- Rendimiento -----
// Kilos cosechados por cuartel en el período (de las tarjas por tacho, bin o kilo) y kilos por hectárea.
router.get('/rendimiento', async (req, res) => {
  const { error, desde, hasta } = leerRango(req.query);
  if (error) return res.status(400).json({ error });
  if (!desde || !hasta) return res.status(400).json({ error: 'Elegí desde y hasta' });
  const { rows } = await db.query(
    `SELECT l.id AS lote_id, l.nombre AS cuartel, l.area, l.cultivo,
            ROUND(SUM(t.cantidad * t.kg_por_unidad), 2) AS kg, COUNT(DISTINCT t.fecha)::int AS dias,
            CASE WHEN l.area > 0 THEN ROUND(SUM(t.cantidad * t.kg_por_unidad) / l.area, 0) END AS kg_ha
     FROM tarjas t JOIN lotes l ON l.id = t.lote_id
     WHERE t.productor_id = $1 AND t.fecha BETWEEN $2 AND $3 AND t.kg_por_unidad IS NOT NULL
     GROUP BY l.id ORDER BY l.nombre`,
    [req.productorId, desde, hasta]
  );
  res.json(rows);
});

module.exports = router;
