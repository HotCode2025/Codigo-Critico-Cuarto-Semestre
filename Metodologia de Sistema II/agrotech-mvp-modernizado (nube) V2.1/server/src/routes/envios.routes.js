// Envíos de materia prima a la fábrica o la bodega.
//
// Un envío se carga una sola vez (cuartel, kg, bins, destino, transporte) y de esos datos sale la
// ficha para emitir el DTV-e en ARCA. AgroTech no emite el DTV-e ni pide la clave fiscal: solo
// registra su número y vencimiento. Recorrido: cargado → dtv_registrado → entregado (o anulado).
// Un envío nunca se borra: se anula, para que quede el registro de lo que salió de la finca.
const router = require('express').Router();
const db = require('../db');
const { loteEsDelProductor } = require('../services/lotes');
const {
  errorFecha,
  errorOpcion,
  errorTexto,
  normalizarCuit,
  normalizarPatente,
  validarFiltrosId,
  validarIdParam
} = require('../services/validar');

const ESTADOS = ['cargado', 'dtv_registrado', 'entregado', 'anulado'];

const COLUMNAS = `id, lote_id, fecha, producto, kg, bins, destino_nombre, destino_cuit, transportista_nombre,
  transportista_cuit, chofer, patente_camion, patente_acoplado, observaciones, estado, dtv_numero,
  dtv_vencimiento, kg_balanza, entregado_en, anulado_motivo, creado_en`;

router.param('id', validarIdParam);

async function registrarEvento(productorId, tipo, datos) {
  await db.query('INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)', [
    productorId,
    tipo,
    JSON.stringify(datos)
  ]);
}

async function buscarEnvio(id, productorId) {
  const { rows } = await db.query(`SELECT ${COLUMNAS} FROM envios WHERE id = $1 AND productor_id = $2`, [
    id,
    productorId
  ]);
  return rows[0];
}

function errorKg(valor, campo) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 && n < 100000000 ? null : `${campo} debe ser un número mayor a 0`;
}

// Valida y normaliza los datos de carga de un envío. `parcial` es para editar: solo se revisan
// los campos que vienen. Devuelve { error } o { datos } con los nombres de las columnas.
function leerDatosEnvio(body, parcial = false) {
  const datos = {};
  const viene = campo => body[campo] !== undefined;
  const obligatorios = ['loteId', 'fecha', 'kg', 'destinoNombre'];
  if (!parcial) {
    const faltan = obligatorios.filter(c => body[c] === undefined || body[c] === null || body[c] === '');
    if (faltan.length)
      return { error: `${faltan.join(', ')} ${faltan.length > 1 ? 'son obligatorios' : 'es obligatorio'}` };
  }

  if (viene('fecha')) {
    if (!body.fecha) return { error: 'fecha es obligatoria' };
    const e = errorFecha(body.fecha);
    if (e) return { error: e };
    datos.fecha = body.fecha;
  }
  if (viene('kg')) {
    const e = errorKg(body.kg, 'kg');
    if (e) return { error: e };
    datos.kg = Number(body.kg);
  }
  if (viene('bins')) {
    const n = Number(body.bins || 0);
    if (!Number.isInteger(n) || n < 0 || n > 10000) return { error: 'bins debe ser un número entero de 0 o más' };
    datos.bins = n;
  }

  const textos = [
    ['destinoNombre', 'destino_nombre', 120],
    ['producto', 'producto', 60],
    ['transportistaNombre', 'transportista_nombre', 120],
    ['chofer', 'chofer', 120],
    ['observaciones', 'observaciones', 500]
  ];
  for (const [campo, columna, max] of textos) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[columna] = (body[campo] || '').trim() || null;
  }
  if (viene('destinoNombre') && !datos.destino_nombre) return { error: 'destinoNombre es obligatorio' };

  for (const [campo, columna] of [
    ['destinoCuit', 'destino_cuit'],
    ['transportistaCuit', 'transportista_cuit']
  ]) {
    if (!viene(campo)) continue;
    if (!body[campo]) {
      datos[columna] = null;
      continue;
    }
    const cuit = normalizarCuit(body[campo]);
    if (!cuit) return { error: `${campo} no es un CUIT válido (11 dígitos con el verificador correcto)` };
    datos[columna] = cuit;
  }

  for (const [campo, columna] of [
    ['patenteCamion', 'patente_camion'],
    ['patenteAcoplado', 'patente_acoplado']
  ]) {
    if (!viene(campo)) continue;
    if (!body[campo]) {
      datos[columna] = null;
      continue;
    }
    const patente = normalizarPatente(body[campo]);
    if (!patente) return { error: `${campo} no es una patente válida (AAA123 o AA123BB)` };
    datos[columna] = patente;
  }

  return { datos };
}

router.get('/', validarFiltrosId('loteId'), async (req, res) => {
  const { estado, loteId } = req.query;
  const condiciones = ['productor_id = $1'];
  const params = [req.productorId];
  if (estado) {
    const e = errorOpcion(estado, ESTADOS, 'estado');
    if (e) return res.status(400).json({ error: e });
    params.push(estado);
    condiciones.push(`estado = $${params.length}`);
  }
  if (loteId) {
    params.push(loteId);
    condiciones.push(`lote_id = $${params.length}`);
  }
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} FROM envios WHERE ${condiciones.join(' AND ')} ORDER BY fecha DESC, id DESC`,
    params
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const envio = await buscarEnvio(Number(req.params.id), req.productorId);
  if (!envio) return res.status(404).json({ error: 'Envío no encontrado' });
  res.json(envio);
});

router.post('/', async (req, res) => {
  const { error, datos } = leerDatosEnvio(req.body);
  if (error) return res.status(400).json({ error });
  if (!(await loteEsDelProductor(req.body.loteId, req.productorId))) {
    return res.status(404).json({ error: 'Cuartel no encontrado' });
  }

  const columnas = ['productor_id', 'lote_id', ...Object.keys(datos)];
  const valores = [req.productorId, Number(req.body.loteId), ...Object.values(datos)];
  const { rows } = await db.query(
    `INSERT INTO envios (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING ${COLUMNAS}`,
    valores
  );
  await registrarEvento(req.productorId, 'envio_cargado', rows[0]);
  res.status(201).json(rows[0]);
});

// Editar solo mientras el envío está cargado: una vez registrado el DTV-e, sus datos son los que
// se declararon en ARCA. Si algo cambió (otro camión, otros kg), se anula y se carga de nuevo.
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const envio = await buscarEnvio(id, req.productorId);
  if (!envio) return res.status(404).json({ error: 'Envío no encontrado' });
  if (envio.estado !== 'cargado') {
    return res.status(409).json({
      error: 'Solo se puede editar un envío cargado. Si ya tiene DTV-e y cambió algo, anulalo y cargalo de nuevo.'
    });
  }

  const { error, datos } = leerDatosEnvio(req.body, true);
  if (error) return res.status(400).json({ error });
  if (req.body.loteId !== undefined) {
    if (!(await loteEsDelProductor(req.body.loteId, req.productorId))) {
      return res.status(404).json({ error: 'Cuartel no encontrado' });
    }
    datos.lote_id = Number(req.body.loteId);
  }
  if (Object.keys(datos).length === 0) return res.json(envio);

  const sets = Object.keys(datos).map((columna, i) => `${columna} = $${i + 1}`);
  const { rows } = await db.query(
    `UPDATE envios SET ${sets.join(', ')} WHERE id = $${sets.length + 1} AND productor_id = $${sets.length + 2}
     RETURNING ${COLUMNAS}`,
    [...Object.values(datos), id, req.productorId]
  );
  await registrarEvento(req.productorId, 'envio_editado', rows[0]);
  res.json(rows[0]);
});

// Registrar (o corregir) el DTV-e que el productor emitió en ARCA para este envío.
router.patch('/:id/dtv', async (req, res) => {
  const id = Number(req.params.id);
  const { numero, vencimiento } = req.body;
  if (!numero || !vencimiento) return res.status(400).json({ error: 'numero y vencimiento son obligatorios' });
  const errorEntrada = errorTexto(numero, 40, 'numero') || errorFecha(vencimiento, 'vencimiento');
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });

  const envio = await buscarEnvio(id, req.productorId);
  if (!envio) return res.status(404).json({ error: 'Envío no encontrado' });
  if (!['cargado', 'dtv_registrado'].includes(envio.estado)) {
    return res.status(409).json({ error: `No se puede registrar el DTV-e de un envío ${envio.estado}` });
  }

  const { rows } = await db.query(
    `UPDATE envios SET dtv_numero = $1, dtv_vencimiento = $2, estado = 'dtv_registrado'
     WHERE id = $3 AND productor_id = $4 RETURNING ${COLUMNAS}`,
    [numero.trim(), vencimiento, id, req.productorId]
  );
  await registrarEvento(req.productorId, 'envio_dtv_registrado', rows[0]);
  res.json(rows[0]);
});

// Marcar la llegada a destino con los kg del ticket de balanza. Sin DTV-e la carga no puede viajar,
// así que no se puede entregar un envío que no lo tenga registrado.
router.patch('/:id/entregar', async (req, res) => {
  const id = Number(req.params.id);
  const errorEntrada = errorKg(req.body.kgBalanza, 'kgBalanza');
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });

  const envio = await buscarEnvio(id, req.productorId);
  if (!envio) return res.status(404).json({ error: 'Envío no encontrado' });
  if (envio.estado === 'cargado') {
    return res.status(409).json({ error: 'Primero registrá el DTV-e del envío: sin DTV-e la carga no puede viajar' });
  }
  if (envio.estado !== 'dtv_registrado') {
    return res.status(409).json({ error: `El envío ya está ${envio.estado}` });
  }

  const { rows } = await db.query(
    `UPDATE envios SET kg_balanza = $1, estado = 'entregado', entregado_en = now()
     WHERE id = $2 AND productor_id = $3 RETURNING ${COLUMNAS}`,
    [Number(req.body.kgBalanza), id, req.productorId]
  );
  await registrarEvento(req.productorId, 'envio_entregado', rows[0]);
  res.json(rows[0]);
});

router.patch('/:id/anular', async (req, res) => {
  const id = Number(req.params.id);
  const errorEntrada = errorTexto(req.body.motivo, 200, 'motivo');
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });

  const envio = await buscarEnvio(id, req.productorId);
  if (!envio) return res.status(404).json({ error: 'Envío no encontrado' });
  if (['entregado', 'anulado'].includes(envio.estado)) {
    return res.status(409).json({ error: `No se puede anular un envío ${envio.estado}` });
  }
  const { rows: remitos } = await db.query("SELECT 1 FROM remitos WHERE envio_id = $1 AND estado = 'emitido'", [id]);
  if (remitos.length)
    return res.status(409).json({ error: 'El envío tiene un remito vigente: anulá primero el remito' });

  const { rows } = await db.query(
    `UPDATE envios SET estado = 'anulado', anulado_motivo = $1
     WHERE id = $2 AND productor_id = $3 RETURNING ${COLUMNAS}`,
    [(req.body.motivo || '').trim() || null, id, req.productorId]
  );
  await registrarEvento(req.productorId, 'envio_anulado', rows[0]);
  res.json(rows[0]);
});

module.exports = router;
