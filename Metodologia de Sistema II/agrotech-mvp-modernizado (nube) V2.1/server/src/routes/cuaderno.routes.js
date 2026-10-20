// Cuaderno de campo: lo que se hace en cada cuartel (aplicaciones fitosanitarias, fertilización, riego,
// poda, raleo, cosecha y otras labores). Es la evidencia que piden las certificaciones, y de las
// aplicaciones sale el período de carencia: hasta cuándo no se puede cosechar ese cuartel.
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

const TIPOS = ['aplicacion', 'fertilizacion', 'riego', 'poda', 'raleo', 'cosecha', 'labor'];
const COLUMNAS = `id, lote_id, fecha, tipo, producto, principio_activo, dosis, unidad_dosis, cantidad, unidad_cantidad,
  motivo, operador, equipo, carencia_dias, reingreso_horas, observaciones, creado_en`;

router.param('id', validarIdParam);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });

// Valida un registro y lo devuelve con el nombre de las columnas. `parcial` es para editar.
function leerRegistro(body, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  if (!parcial || viene('tipo')) {
    const e = errorOpcion(body.tipo, TIPOS, 'tipo');
    if (e) return { error: e };
    datos.tipo = body.tipo;
  }
  if (!parcial || viene('fecha')) {
    if (!body.fecha) return { error: 'fecha es obligatoria' };
    const e = errorFecha(body.fecha);
    if (e) return { error: e };
    if (String(body.fecha).slice(0, 10) > hoy())
      return { error: 'La fecha no puede ser futura: el cuaderno registra lo que ya se hizo' };
    datos.fecha = body.fecha;
  }
  for (const [campo, columna, max] of [
    ['producto', 'producto', 120],
    ['principioActivo', 'principio_activo', 120],
    ['unidadDosis', 'unidad_dosis', 20],
    ['unidadCantidad', 'unidad_cantidad', 20],
    ['motivo', 'motivo', 160],
    ['operador', 'operador', 120],
    ['equipo', 'equipo', 120],
    ['observaciones', 'observaciones', 500]
  ]) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[columna] = (body[campo] || '').trim() || null;
  }
  for (const [campo, columna, entero] of [
    ['dosis', 'dosis', false],
    ['cantidad', 'cantidad', false],
    ['carenciaDias', 'carencia_dias', true],
    ['reingresoHoras', 'reingreso_horas', true]
  ]) {
    if (!viene(campo)) continue;
    if (body[campo] === null || body[campo] === '') {
      datos[columna] = null;
      continue;
    }
    const n = Number(body[campo]);
    const valido = entero ? Number.isInteger(n) && n >= 0 && n <= 3650 : Number.isFinite(n) && n > 0;
    if (!valido) return { error: `${campo} no es un número válido` };
    datos[columna] = n;
  }
  // Una aplicación sin producto no sirve como registro para un auditor.
  const tipo = datos.tipo || body.tipoActual;
  if (tipo === 'aplicacion' && ((!parcial && !datos.producto) || (parcial && 'producto' in datos && !datos.producto))) {
    return { error: 'Para una aplicación, el producto es obligatorio' };
  }
  return { datos };
}

router.get('/', validarFiltrosId('loteId'), async (req, res) => {
  const { loteId, tipo, desde, hasta } = req.query;
  const condiciones = ['productor_id = $1'];
  const params = [req.productorId];
  const agregar = (sql, valor) => {
    params.push(valor);
    condiciones.push(sql.replace('?', `$${params.length}`));
  };
  if (tipo) {
    const e = errorOpcion(tipo, TIPOS, 'tipo');
    if (e) return res.status(400).json({ error: e });
    agregar('tipo = ?', tipo);
  }
  if (loteId) agregar('lote_id = ?', loteId);
  for (const [nombre, valor, sql] of [
    ['desde', desde, 'fecha >= ?'],
    ['hasta', hasta, 'fecha <= ?']
  ]) {
    if (!valor) continue;
    const e = errorFecha(valor, nombre);
    if (e) return res.status(400).json({ error: e });
    agregar(sql, valor);
  }
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} FROM cuaderno_campo WHERE ${condiciones.join(' AND ')} ORDER BY fecha DESC, id DESC LIMIT 1000`,
    params
  );
  res.json(rows);
});

// Cuarteles con una aplicación todavía dentro del período de carencia: no se pueden cosechar.
router.get('/carencias', async (req, res) => {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (c.lote_id) c.lote_id, l.nombre AS cuartel, c.producto, c.fecha, c.carencia_dias,
            (c.fecha + c.carencia_dias) AS cosecha_desde
     FROM cuaderno_campo c JOIN lotes l ON l.id = c.lote_id
     WHERE c.productor_id = $1 AND c.tipo = 'aplicacion' AND c.carencia_dias IS NOT NULL
       AND c.fecha + c.carencia_dias > $2::date
     ORDER BY c.lote_id, (c.fecha + c.carencia_dias) DESC`,
    [req.productorId, hoy()]
  );
  res.json(rows);
});

// Alta: el mismo registro se puede cargar en varios cuarteles a la vez (loteIds).
router.post('/', async (req, res) => {
  const loteIds = Array.isArray(req.body.loteIds) ? req.body.loteIds : [req.body.loteId];
  if (!loteIds.length || loteIds.some(id => !esIdValido(id)))
    return res.status(400).json({ error: 'Elegí al menos un cuartel' });
  if (loteIds.length > 100) return res.status(400).json({ error: 'Máximo 100 cuarteles por vez' });
  const { error, datos } = leerRegistro(req.body);
  if (error) return res.status(400).json({ error });
  for (const id of loteIds) {
    if (!(await loteEsDelProductor(id, req.productorId)))
      return res.status(404).json({ error: 'Cuartel no encontrado' });
  }

  const columnas = ['productor_id', 'lote_id', ...Object.keys(datos)];
  const valores = [];
  const tuplas = [...new Set(loteIds.map(Number))].map(loteId => {
    const base = valores.length;
    valores.push(req.productorId, loteId, ...Object.values(datos));
    return `(${columnas.map((_, i) => `$${base + i + 1}`).join(', ')})`;
  });
  const { rows } = await db.query(
    `INSERT INTO cuaderno_campo (${columnas.join(', ')}) VALUES ${tuplas.join(', ')} RETURNING ${COLUMNAS}`,
    valores
  );
  res.status(201).json(rows);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { rows: actual } = await db.query('SELECT tipo FROM cuaderno_campo WHERE id = $1 AND productor_id = $2', [
    id,
    req.productorId
  ]);
  if (!actual[0]) return res.status(404).json({ error: 'Registro no encontrado' });
  const { error, datos } = leerRegistro({ ...req.body, tipoActual: actual[0].tipo }, true);
  if (error) return res.status(400).json({ error });
  if (req.body.loteId !== undefined) {
    if (!(await loteEsDelProductor(req.body.loteId, req.productorId)))
      return res.status(404).json({ error: 'Cuartel no encontrado' });
    datos.lote_id = Number(req.body.loteId);
  }
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  const { rows } = await db.query(
    `UPDATE cuaderno_campo SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE id = $${columnas.length + 1} AND productor_id = $${columnas.length + 2} RETURNING ${COLUMNAS}`,
    [...Object.values(datos), id, req.productorId]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('DELETE FROM cuaderno_campo WHERE id = $1 AND productor_id = $2 RETURNING id', [
    Number(req.params.id),
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ id: rows[0].id });
});

module.exports = router;
module.exports.TIPOS = TIPOS;
