// Vitrina del productor (parte privada): su página pública y los productos terminados por lote.
// Lo que se publica es solo lo que se carga acá: ningún dato financiero sale a la vitrina.
const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { loteEsDelProductor } = require('../services/lotes');
const { errorFecha, errorTexto, validarIdParam } = require('../services/validar');
const { EMAIL_VALIDO } = require('./compradores.routes');

const COLUMNAS_PRODUCTO = `id, codigo, nombre, descripcion, presentacion, cantidad_disponible, unidad_venta, precio, lote,
  fecha_elaboracion, fecha_vencimiento, lote_id, publicado, creado_en`;
// Sin letras que se confunden al tipearlas (0/O, 1/I/L): el código también se puede escribir a mano.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

router.param('id', validarIdParam);

// "Finca Los Álamos" → "finca-los-alamos"
function slugDe(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

function codigoNuevo() {
  return Array.from(crypto.randomBytes(8), b => ALFABETO[b % ALFABETO.length]).join('');
}

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM vitrinas WHERE productor_id = $1', [req.productorId]);
  res.json(rows[0] || null);
});

// Crear o actualizar la vitrina. El slug es la dirección pública: redagrotech.com.ar/vitrina.html?v=<slug>
router.put('/', async (req, res) => {
  const b = req.body;
  if (!b.nombrePublico || !String(b.nombrePublico).trim()) {
    return res.status(400).json({ error: 'nombrePublico es obligatorio' });
  }
  const errorEntrada =
    errorTexto(b.nombrePublico, 120, 'nombrePublico') ||
    errorTexto(b.descripcion, 500, 'descripcion') ||
    errorTexto(b.zona, 60, 'zona') ||
    errorTexto(b.whatsapp, 30, 'whatsapp') ||
    errorTexto(b.email, 160, 'email') ||
    errorTexto(b.slug, 60, 'slug');
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });
  const email = (b.email || '').trim() || null;
  if (email && !EMAIL_VALIDO.test(email)) return res.status(400).json({ error: 'El email no es válido' });
  const slug = slugDe(b.slug || b.nombrePublico);
  if (slug.length < 3) return res.status(400).json({ error: 'La dirección pública tiene que tener al menos 3 letras' });

  const { rows: ocupado } = await db.query('SELECT 1 FROM vitrinas WHERE slug = $1 AND productor_id <> $2', [
    slug,
    req.productorId
  ]);
  if (ocupado.length) return res.status(409).json({ error: `La dirección "${slug}" ya la usa otro productor` });

  const { rows } = await db.query(
    `INSERT INTO vitrinas (productor_id, slug, nombre_publico, descripcion, zona, whatsapp, email, publicada, actualizado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (productor_id) DO UPDATE SET slug = $2, nombre_publico = $3, descripcion = $4, zona = $5,
       whatsapp = $6, email = $7, publicada = $8, actualizado_en = now()
     RETURNING *`,
    [
      req.productorId,
      slug,
      b.nombrePublico.trim(),
      (b.descripcion || '').trim() || null,
      (b.zona || '').trim() || null,
      (b.whatsapp || '').trim() || null,
      email,
      !!b.publicada
    ]
  );
  res.json(rows[0]);
});

// Valida los campos de un producto y los devuelve con el nombre de la columna.
async function leerProducto(body, productorId, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  if (!parcial || viene('nombre')) {
    if (!body.nombre || !String(body.nombre).trim()) return { error: 'nombre es obligatorio' };
  }
  for (const [campo, columna, max] of [
    ['nombre', 'nombre', 120],
    ['descripcion', 'descripcion', 500],
    ['presentacion', 'presentacion', 80],
    ['unidadVenta', 'unidad_venta', 40],
    ['lote', 'lote', 40]
  ]) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[columna] = (body[campo] || '').trim() || null;
  }
  for (const [campo, columna] of [
    ['fechaElaboracion', 'fecha_elaboracion'],
    ['fechaVencimiento', 'fecha_vencimiento']
  ]) {
    if (!viene(campo)) continue;
    const e = errorFecha(body[campo], campo);
    if (e) return { error: e };
    datos[columna] = body[campo] || null;
  }
  if (datos.fecha_elaboracion && datos.fecha_vencimiento && datos.fecha_vencimiento < datos.fecha_elaboracion) {
    return { error: 'El vencimiento no puede ser anterior a la elaboración' };
  }
  if (viene('cantidadDisponible')) {
    const n =
      body.cantidadDisponible === '' || body.cantidadDisponible === null ? null : Number(body.cantidadDisponible);
    if (n !== null && (!Number.isInteger(n) || n < 0)) {
      return { error: 'cantidadDisponible debe ser un número entero de 0 o más' };
    }
    datos.cantidad_disponible = n;
  }
  if (viene('precio')) {
    const n = body.precio === '' || body.precio === null ? null : Number(body.precio);
    if (n !== null && (!Number.isFinite(n) || n <= 0)) return { error: 'precio debe ser un número mayor a 0' };
    datos.precio = n;
  }
  if (viene('loteId')) {
    if (!body.loteId) datos.lote_id = null;
    else if (!(await loteEsDelProductor(body.loteId, productorId)))
      return { error: 'Cuartel no encontrado', status: 404 };
    else datos.lote_id = Number(body.loteId);
  }
  if (viene('publicado')) datos.publicado = !!body.publicado;
  return { datos };
}

router.get('/productos', async (req, res) => {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS_PRODUCTO} FROM productos_vitrina WHERE productor_id = $1 ORDER BY creado_en DESC, id DESC`,
    [req.productorId]
  );
  res.json(rows);
});

router.post('/productos', async (req, res) => {
  const { error, status, datos } = await leerProducto(req.body, req.productorId);
  if (error) return res.status(status || 400).json({ error });
  const columnas = ['productor_id', 'codigo', ...Object.keys(datos)];
  const valores = [req.productorId, codigoNuevo(), ...Object.values(datos)];
  const { rows } = await db.query(
    `INSERT INTO productos_vitrina (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING ${COLUMNAS_PRODUCTO}`,
    valores
  );
  res.status(201).json(rows[0]);
});

router.patch('/productos/:id', async (req, res) => {
  const { error, status, datos } = await leerProducto(req.body, req.productorId, true);
  if (error) return res.status(status || 400).json({ error });
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  const { rows } = await db.query(
    `UPDATE productos_vitrina SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE id = $${columnas.length + 1} AND productor_id = $${columnas.length + 2} RETURNING ${COLUMNAS_PRODUCTO}`,
    [...Object.values(datos), Number(req.params.id), req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(rows[0]);
});

// Borrar un producto: el QR impreso deja de funcionar. Para dejarlo de mostrar sin perder el QR,
// alcanza con despublicarlo (publicado: false).
router.delete('/productos/:id', async (req, res) => {
  const { rows } = await db.query('DELETE FROM productos_vitrina WHERE id = $1 AND productor_id = $2 RETURNING id', [
    Number(req.params.id),
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ id: rows[0].id });
});

module.exports = router;
module.exports.slugDe = slugDe;
