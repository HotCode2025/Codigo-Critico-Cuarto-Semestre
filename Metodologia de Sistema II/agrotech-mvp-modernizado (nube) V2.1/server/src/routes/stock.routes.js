// Stock de insumos: lista de insumos con su stock, compras (que pueden guardar el precio en la
// lista de precios del simulador), usos y ajustes por inventario. Las aplicaciones y fertilizaciones
// del cuaderno de campo descuentan solas (ver cuaderno.routes.js).
const router = require('express').Router();
const db = require('../db');
const { insumosConStock, avisarStockBajoSinFallar } = require('../services/stock');
const { errorFecha, errorOpcion, errorTexto, esIdValido, validarIdParam } = require('../services/validar');

const CATEGORIAS = ['fitosanitario', 'fertilizante', 'combustible', 'envase', 'otro'];
const UNIDADES = ['kg', 'l', 'un'];
const TIPOS = ['compra', 'uso', 'ajuste'];
const MAX = 1e9;

router.param('id', validarIdParam);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });

function leerInsumo(body, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  if (!parcial || viene('nombre')) {
    if (!body.nombre || !String(body.nombre).trim()) return { error: 'nombre es obligatorio' };
  }
  if (!parcial || viene('unidad')) {
    const e = errorOpcion(body.unidad, UNIDADES, 'unidad');
    if (e) return { error: e };
    datos.unidad = body.unidad;
  }
  if (viene('categoria')) {
    const e = errorOpcion(body.categoria, CATEGORIAS, 'categoria');
    if (e) return { error: e };
    datos.categoria = body.categoria;
  }
  for (const [campo, columna, max] of [
    ['nombre', 'nombre', 120],
    ['principioActivo', 'principio_activo', 120]
  ]) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[columna] = (body[campo] || '').trim() || null;
  }
  for (const [campo, columna, entero] of [
    ['carenciaDias', 'carencia_dias', true],
    ['stockMinimo', 'stock_minimo', false]
  ]) {
    if (!viene(campo)) continue;
    if (body[campo] === null || body[campo] === '') {
      datos[columna] = null;
      continue;
    }
    const n = Number(body[campo]);
    const valido = entero ? Number.isInteger(n) && n >= 0 && n <= 3650 : Number.isFinite(n) && n >= 0 && n < MAX;
    if (!valido) return { error: `${campo} no es un número válido` };
    datos[columna] = n;
  }
  if (viene('activo')) datos.activo = !!body.activo;
  return { datos };
}

router.get('/', async (req, res) => {
  res.json(await insumosConStock(req.productorId));
});

router.post('/insumos', async (req, res) => {
  const { error, datos } = leerInsumo(req.body);
  if (error) return res.status(400).json({ error });
  const columnas = ['productor_id', ...Object.keys(datos)];
  try {
    const { rows } = await db.query(
      `INSERT INTO insumos (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      [req.productorId, ...Object.values(datos)]
    );
    res.status(201).json((await insumosConStock(req.productorId, rows[0].id))[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya tenés un insumo con ese nombre' });
    throw err;
  }
});

router.patch('/insumos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { error, datos } = leerInsumo(req.body, true);
  if (error) return res.status(400).json({ error });
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  try {
    const { rows } = await db.query(
      `UPDATE insumos SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
       WHERE id = $${columnas.length + 1} AND productor_id = $${columnas.length + 2} RETURNING id`,
      [...Object.values(datos), id, req.productorId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Insumo no encontrado' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ya tenés un insumo con ese nombre' });
    throw err;
  }
  // Cambiar el mínimo puede dejarlo bajo (o repuesto).
  if ('stock_minimo' in datos || 'activo' in datos) await avisarStockBajoSinFallar(req.productorId);
  res.json((await insumosConStock(req.productorId, id))[0]);
});

// Solo se borra si no tiene movimientos; si los tiene, se da de baja para no perder la historia.
router.delete('/insumos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: movimientos } = await db.query(
    'SELECT 1 FROM movimientos_stock WHERE insumo_id = $1 AND productor_id = $2 LIMIT 1',
    [id, req.productorId]
  );
  if (movimientos.length) {
    return res.status(409).json({ error: 'Tiene movimientos: dalo de baja en vez de borrarlo' });
  }
  const { rows } = await db.query('DELETE FROM insumos WHERE id = $1 AND productor_id = $2 RETURNING id', [
    id,
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Insumo no encontrado' });
  res.json({ id: rows[0].id });
});

router.get('/insumos/:id/movimientos', async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await db.query(
    `SELECT m.id, m.fecha, m.tipo, m.cantidad, m.precio_unitario, m.proveedor, m.nota, m.cuaderno_id,
            l.nombre AS cuartel
     FROM movimientos_stock m
     LEFT JOIN cuaderno_campo c ON c.id = m.cuaderno_id
     LEFT JOIN lotes l ON l.id = c.lote_id
     WHERE m.insumo_id = $1 AND m.productor_id = $2 ORDER BY m.fecha DESC, m.id DESC LIMIT 500`,
    [id, req.productorId]
  );
  res.json(rows);
});

// Compra (+), uso (−) o ajuste por inventario (se manda lo que se contó: stockContado).
router.post('/movimientos', async (req, res) => {
  const b = req.body;
  if (!esIdValido(b.insumoId)) return res.status(400).json({ error: 'Elegí el insumo' });
  const eTipo = errorOpcion(b.tipo, TIPOS, 'tipo');
  if (eTipo) return res.status(400).json({ error: eTipo });
  const fecha = b.fecha || hoy();
  const eFecha = errorFecha(fecha);
  if (eFecha) return res.status(400).json({ error: eFecha });
  if (String(fecha).slice(0, 10) > hoy()) return res.status(400).json({ error: 'La fecha no puede ser futura' });
  const eTexto = errorTexto(b.proveedor, 120, 'proveedor') || errorTexto(b.nota, 300, 'nota');
  if (eTexto) return res.status(400).json({ error: eTexto });

  const [insumo] = await insumosConStock(req.productorId, Number(b.insumoId));
  if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });

  let cantidad;
  if (b.tipo === 'ajuste') {
    const contado = Number(b.stockContado);
    if (
      b.stockContado === undefined ||
      b.stockContado === '' ||
      !Number.isFinite(contado) ||
      contado < 0 ||
      contado >= MAX
    ) {
      return res.status(400).json({ error: 'Poné cuánto contaste en el depósito' });
    }
    cantidad = Math.round((contado - Number(insumo.stock)) * 1000) / 1000;
    if (cantidad === 0) return res.status(400).json({ error: 'El stock ya es ese: no hay nada que ajustar' });
  } else {
    const n = Number(b.cantidad);
    if (!Number.isFinite(n) || n <= 0 || n >= MAX)
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    cantidad = b.tipo === 'uso' ? -n : n;
  }

  // Precio de la compra: por unidad, o el total de la factura dividido por la cantidad.
  let precio = null;
  if (b.tipo === 'compra') {
    const unitario = b.precioUnitario !== undefined && b.precioUnitario !== '' && b.precioUnitario !== null;
    const total = b.precioTotal !== undefined && b.precioTotal !== '' && b.precioTotal !== null;
    if (unitario || total) {
      const v = Number(unitario ? b.precioUnitario : b.precioTotal);
      if (!Number.isFinite(v) || v <= 0 || v >= 1e12)
        return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
      precio = unitario ? v : Math.round((v / cantidad) * 10000) / 10000;
    }
  }

  const cliente = await db.pool.connect();
  let movimiento;
  try {
    await cliente.query('BEGIN');
    const { rows } = await cliente.query(
      `INSERT INTO movimientos_stock (productor_id, insumo_id, fecha, tipo, cantidad, precio_unitario, proveedor, nota)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, fecha, tipo, cantidad, precio_unitario, proveedor, nota`,
      [
        req.productorId,
        insumo.id,
        fecha,
        b.tipo,
        cantidad,
        precio,
        (b.proveedor || '').trim() || null,
        (b.nota || '').trim() || null
      ]
    );
    movimiento = rows[0];
    // El precio de la compra también va a la lista de precios que usa el simulador.
    if (precio && b.guardarPrecio) {
      await cliente.query(
        `INSERT INTO precios_insumos (productor_id, nombre, unidad, precio, proveedor, fecha, origen)
         VALUES ($1, $2, $3, $4, $5, $6, 'manual')`,
        [req.productorId, insumo.nombre, insumo.unidad, precio, (b.proveedor || '').trim() || null, fecha]
      );
    }
    await cliente.query('COMMIT');
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
  await avisarStockBajoSinFallar(req.productorId);
  res.status(201).json({ movimiento, insumo: (await insumosConStock(req.productorId, insumo.id))[0] });
});

// Los usos que vienen del cuaderno se corrigen o se borran desde el cuaderno.
router.delete('/movimientos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: actual } = await db.query(
    'SELECT cuaderno_id FROM movimientos_stock WHERE id = $1 AND productor_id = $2',
    [id, req.productorId]
  );
  if (!actual[0]) return res.status(404).json({ error: 'Movimiento no encontrado' });
  if (actual[0].cuaderno_id) {
    return res.status(409).json({ error: 'Es una aplicación del cuaderno de campo: borrala desde el cuaderno' });
  }
  await db.query('DELETE FROM movimientos_stock WHERE id = $1', [id]);
  await avisarStockBajoSinFallar(req.productorId);
  res.json({ id });
});

module.exports = router;
