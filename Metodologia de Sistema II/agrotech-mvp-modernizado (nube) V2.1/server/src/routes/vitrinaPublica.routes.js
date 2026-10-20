// Vitrina pública (sin login): la página del productor, el detalle de cada lote que abre el QR de
// la etiqueta y el formulario de consulta. Solo muestra lo que el productor publicó, y solo si su
// vitrina está publicada. La consulta entra en su agenda de compradores y le llega un aviso por N8N.
const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');
const { consultaLimiter } = require('../middleware/rateLimit');
const { errorTexto } = require('../services/validar');
const { EMAIL_VALIDO } = require('./compradores.routes');

const PRODUCTO_PUBLICO = `p.codigo, p.nombre, p.descripcion, p.presentacion, p.cantidad_disponible, p.unidad_venta,
  p.precio, p.lote, p.fecha_elaboracion, p.fecha_vencimiento, l.nombre AS cuartel, l.cultivo`;

async function vitrinaPublicada(slug) {
  const { rows } = await db.query(
    `SELECT productor_id, slug, nombre_publico, descripcion, zona, whatsapp, email
     FROM vitrinas WHERE slug = $1 AND publicada`,
    [String(slug).toLowerCase()]
  );
  return rows[0];
}

router.get('/:slug', async (req, res) => {
  const vitrina = await vitrinaPublicada(req.params.slug);
  if (!vitrina) return res.status(404).json({ error: 'Vitrina no encontrada' });
  const { rows: productos } = await db.query(
    `SELECT ${PRODUCTO_PUBLICO} FROM productos_vitrina p LEFT JOIN lotes l ON l.id = p.lote_id
     WHERE p.productor_id = $1 AND p.publicado ORDER BY p.creado_en DESC`,
    [vitrina.productor_id]
  );
  delete vitrina.productor_id;
  res.json({ ...vitrina, productos });
});

// Lo que abre el QR de la etiqueta: de qué finca y cuartel viene el lote, y cuándo se elaboró.
router.get('/:slug/productos/:codigo', async (req, res) => {
  const vitrina = await vitrinaPublicada(req.params.slug);
  if (!vitrina) return res.status(404).json({ error: 'Vitrina no encontrada' });
  const { rows } = await db.query(
    `SELECT ${PRODUCTO_PUBLICO} FROM productos_vitrina p LEFT JOIN lotes l ON l.id = p.lote_id
     WHERE p.productor_id = $1 AND p.codigo = $2 AND p.publicado`,
    [vitrina.productor_id, String(req.params.codigo).toUpperCase()]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
  delete vitrina.productor_id;
  res.json({ vitrina, producto: rows[0] });
});

router.post('/:slug/consultas', consultaLimiter, async (req, res) => {
  const b = req.body;
  // Campo trampa: las personas no lo ven; si viene completo, es un robot. Se responde "ok" igual.
  if (b.web) return res.status(201).json({ ok: true });

  const vitrina = await vitrinaPublicada(req.params.slug);
  if (!vitrina) return res.status(404).json({ error: 'Vitrina no encontrada' });
  if (!b.nombre || !String(b.nombre).trim()) return res.status(400).json({ error: 'Contanos tu nombre' });
  if (!b.mensaje || !String(b.mensaje).trim()) return res.status(400).json({ error: 'Escribí tu consulta' });
  const email = (b.email || '').trim();
  const telefono = (b.telefono || '').trim();
  if (!email && !telefono) return res.status(400).json({ error: 'Dejá un teléfono o un email para responderte' });
  if (email && !EMAIL_VALIDO.test(email)) return res.status(400).json({ error: 'El email no es válido' });
  const errorEntrada =
    errorTexto(b.nombre, 120, 'nombre') ||
    errorTexto(b.empresa, 120, 'empresa') ||
    errorTexto(b.telefono, 30, 'telefono') ||
    errorTexto(b.email, 160, 'email') ||
    errorTexto(b.ciudad, 80, 'ciudad') ||
    errorTexto(b.mensaje, 1000, 'mensaje');
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });

  let producto = null;
  if (b.codigo) {
    const { rows } = await db.query(
      'SELECT id, nombre FROM productos_vitrina WHERE productor_id = $1 AND codigo = $2 AND publicado',
      [vitrina.productor_id, String(b.codigo).toUpperCase()]
    );
    producto = rows[0] || null;
  }

  const { rows } = await db.query(
    `INSERT INTO compradores (productor_id, nombre, empresa, telefono, email, ciudad, interes, origen, producto_id, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'vitrina', $8, $9) RETURNING id`,
    [
      vitrina.productor_id,
      b.nombre.trim(),
      (b.empresa || '').trim() || null,
      telefono || null,
      email || null,
      (b.ciudad || '').trim() || null,
      producto ? producto.nombre : null,
      producto ? producto.id : null,
      b.mensaje.trim()
    ]
  );
  notificarN8N(vitrina.productor_id, 'consulta_vitrina', {
    nombre: b.nombre.trim(),
    empresa: (b.empresa || '').trim() || null,
    producto: producto ? producto.nombre : null,
    mensaje: b.mensaje.trim()
  }).catch(() => {});
  res.status(201).json({ ok: true, id: rows[0].id });
});

module.exports = router;
