// Lista de precios de insumos del productor, para el simulador. Cada precio guarda proveedor y
// fecha; se conserva el historial y el simulador usa el más reciente de cada insumo. Los precios
// se cargan a mano o leyendo una cotización (foto o PDF) con IA.
const router = require('express').Router();
const db = require('../db');
const { iaLimiter } = require('../middleware/rateLimit');
const { extraerPreciosCotizacion, Anthropic } = require('../services/cotizaciones');
const { errorFecha, errorOpcion, errorTexto, validarIdParam } = require('../services/validar');

const UNIDADES = ['kg', 'un', 'l'];
const MAX_POR_VEZ = 100;
const COLUMNAS = `id, nombre, unidad, precio, presentacion, precio_presentacion, proveedor, fecha, iva_incluido,
  origen, creado_en`;

router.param('id', validarIdParam);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });

function leerPrecio(p) {
  if (!p || !String(p.nombre || '').trim()) return { error: 'nombre es obligatorio' };
  const precio = Number(p.precio);
  if (!Number.isFinite(precio) || precio <= 0) return { error: `El precio de "${p.nombre}" debe ser mayor a 0` };
  const precioPresentacion =
    p.precioPresentacion === undefined || p.precioPresentacion === null || p.precioPresentacion === ''
      ? null
      : Number(p.precioPresentacion);
  if (precioPresentacion !== null && (!Number.isFinite(precioPresentacion) || precioPresentacion <= 0)) {
    return { error: 'precioPresentacion debe ser mayor a 0' };
  }
  const error =
    errorOpcion(p.unidad, UNIDADES, 'unidad') ||
    errorTexto(p.nombre, 120, 'nombre') ||
    errorTexto(p.presentacion, 80, 'presentacion') ||
    errorTexto(p.proveedor, 120, 'proveedor') ||
    errorFecha(p.fecha) ||
    errorOpcion(p.origen || 'manual', ['manual', 'ia'], 'origen');
  if (error) return { error };
  if (p.fecha && String(p.fecha).slice(0, 10) > hoy())
    return { error: 'La fecha de la cotización no puede ser futura' };
  return {
    fila: [
      String(p.nombre).trim(),
      p.unidad,
      precio,
      (p.presentacion || '').trim() || null,
      precioPresentacion,
      (p.proveedor || '').trim() || null,
      p.fecha || hoy(),
      typeof p.ivaIncluido === 'boolean' ? p.ivaIncluido : null,
      p.origen || 'manual'
    ]
  };
}

router.get('/precios', async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} FROM precios_insumos WHERE productor_id = $1 ORDER BY fecha DESC, id DESC`,
    [req.productorId]
  );
  res.json(rows);
});

// Guardar uno o varios precios a la vez (la lista revisada de una cotización entra entera).
router.post('/precios', async (req, res) => {
  const lista = Array.isArray(req.body.precios) ? req.body.precios : [req.body];
  if (!lista.length) return res.status(400).json({ error: 'No hay precios para guardar' });
  if (lista.length > MAX_POR_VEZ) return res.status(400).json({ error: `Máximo ${MAX_POR_VEZ} precios por vez` });
  const filas = [];
  for (const p of lista) {
    const { error, fila } = leerPrecio(p);
    if (error) return res.status(400).json({ error });
    filas.push(fila);
  }

  const valores = [];
  const tuplas = filas.map(fila => {
    const base = valores.length;
    valores.push(req.productorId, ...fila);
    return `(${fila.map((_, i) => `$${base + i + 2}`).join(', ')}, $${base + 1})`;
  });
  const { rows } = await db.query(
    `INSERT INTO precios_insumos (nombre, unidad, precio, presentacion, precio_presentacion, proveedor, fecha,
       iva_incluido, origen, productor_id)
     VALUES ${tuplas.join(', ')} RETURNING ${COLUMNAS}`,
    valores
  );
  res.status(201).json(rows);
});

router.delete('/precios/:id', async (req, res) => {
  const { rows } = await db.query('DELETE FROM precios_insumos WHERE id = $1 AND productor_id = $2 RETURNING id', [
    Number(req.params.id),
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Precio no encontrado' });
  res.json({ id: rows[0].id });
});

// Leer una cotización con IA. No guarda nada: devuelve la lista para que el productor la revise.
router.post('/extraer-cotizacion', iaLimiter, async (req, res) => {
  const { archivoBase64, mediaType } = req.body;
  if (!archivoBase64) return res.status(400).json({ error: 'archivoBase64 es obligatorio' });
  try {
    const resultado = await extraerPreciosCotizacion(archivoBase64, mediaType);
    if (!resultado.items.length) {
      return res.status(422).json({ error: 'No se encontraron precios en el documento' });
    }
    res.json(resultado);
  } catch (err) {
    if (err.status && !(err instanceof Anthropic.APIError)) return res.status(err.status).json({ error: err.message });
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Demasiadas solicitudes a la IA, probá de nuevo en un momento' });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: 'No se pudo leer la cotización con la IA' });
    }
    throw err;
  }
});

module.exports = router;
