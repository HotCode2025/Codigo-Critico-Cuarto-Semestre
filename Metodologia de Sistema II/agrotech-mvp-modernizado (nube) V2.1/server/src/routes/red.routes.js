const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

// Avisa por WhatsApp a los demás productores de la misma zona (no al autor,
// que ya ve lo que acaba de publicar) que tengan el número cargado y N8N
// habilitado. Se usa tanto para alertas como para ofertas de trueque.
async function avisarZona(zona, productorIdExcluir, evento, datos) {
  const { rows: destinatarios } = await db.query(
    `SELECT c.productor_id FROM config_n8n c
     JOIN productores p ON p.id = c.productor_id
     WHERE p.zona = $1 AND p.id != $2
       AND c.habilitado = true AND c.webhook_url IS NOT NULL AND p.telefono IS NOT NULL`,
    [zona, productorIdExcluir]
  );
  destinatarios.forEach(({ productor_id }) => {
    notificarN8N(productor_id, evento, datos).catch(() => {});
  });
  return destinatarios.length;
}

// --- Alertas colaborativas (plagas, clima, precios) ---

router.get('/alertas', async (req, res) => {
  const { zona } = req.query;
  const params = [];
  let where = '';
  if (zona) { params.push(zona); where = 'WHERE a.zona = $1'; }

  const { rows } = await db.query(
    `SELECT a.id, a.tipo, a.zona, a.cultivo, a.descripcion, a.estado, a.creado_en, p.nombre AS autor
     FROM alertas_red a JOIN productores p ON p.id = a.productor_id
     ${where} ORDER BY a.creado_en DESC LIMIT 50`,
    params
  );
  res.json(rows);
});

router.post('/alertas', async (req, res) => {
  const { tipo, zona, cultivo, descripcion } = req.body;
  if (!tipo || !zona || !descripcion) {
    return res.status(400).json({ error: 'tipo, zona y descripcion son obligatorios' });
  }

  const { rows } = await db.query(
    `INSERT INTO alertas_red (productor_id, tipo, zona, cultivo, descripcion)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, tipo, zona, cultivo, descripcion, estado, creado_en`,
    [req.productorId, tipo, zona, cultivo || null, descripcion]
  );
  const alerta = rows[0];
  const avisados = await avisarZona(zona, req.productorId, 'alerta_nueva', alerta);

  res.status(201).json({ alerta, notificacion: { success: avisados > 0, avisados } });
});

router.patch('/alertas/:id/resolver', async (req, res) => {
  const { rows } = await db.query(
    `UPDATE alertas_red SET estado = 'resuelta' WHERE id = $1 AND productor_id = $2
     RETURNING id, estado`,
    [req.params.id, req.productorId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Alerta no encontrada' });
  res.json(rows[0]);
});

// --- Trueque de maquinaria / mano de obra / insumos ---

router.get('/trueques', async (req, res) => {
  const { zona } = req.query;
  const params = [];
  let where = 'WHERE t.activo = true';
  if (zona) { params.push(zona); where += ` AND t.zona = $${params.length}`; }

  const { rows } = await db.query(
    `SELECT t.id, t.tipo, t.titulo, t.descripcion, t.zona, t.creado_en, p.nombre AS autor
     FROM trueques t JOIN productores p ON p.id = t.productor_id
     ${where} ORDER BY t.creado_en DESC LIMIT 50`,
    params
  );
  res.json(rows);
});

router.post('/trueques', async (req, res) => {
  const { tipo, titulo, descripcion, zona } = req.body;
  if (!tipo || !titulo || !zona) {
    return res.status(400).json({ error: 'tipo, titulo y zona son obligatorios' });
  }

  const { rows } = await db.query(
    `INSERT INTO trueques (productor_id, tipo, titulo, descripcion, zona)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, tipo, titulo, descripcion, zona, creado_en`,
    [req.productorId, tipo, titulo, descripcion || null, zona]
  );
  const trueque = rows[0];
  const avisados = await avisarZona(zona, req.productorId, 'trueque_nuevo', trueque);

  res.status(201).json({ trueque, notificacion: { success: avisados > 0, avisados } });
});

// Un productor interesado en una oferta le avisa al autor por WhatsApp, con
// su nombre y teléfono para que lo pueda contactar directo (sin chat en la app).
router.post('/trueques/:id/contactar', async (req, res) => {
  const { rows } = await db.query(
    `SELECT t.id, t.titulo, t.tipo, t.productor_id, p.nombre AS autor
     FROM trueques t JOIN productores p ON p.id = t.productor_id
     WHERE t.id = $1 AND t.activo = true`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
  const trueque = rows[0];

  if (trueque.productor_id === req.productorId) {
    return res.status(400).json({ error: 'No podés contactarte a vos mismo por tu propia oferta' });
  }

  const { rows: interesadoRows } = await db.query(
    'SELECT nombre, telefono FROM productores WHERE id = $1',
    [req.productorId]
  );
  const interesado = interesadoRows[0];
  if (!interesado.telefono) {
    return res.status(400).json({ error: 'Cargá tu número de WhatsApp en Más > Cuenta antes de contactar una oferta' });
  }

  const resultado = await notificarN8N(trueque.productor_id, 'trueque_interes', {
    titulo: trueque.titulo,
    tipo: trueque.tipo,
    interesadoNombre: interesado.nombre,
    interesadoTelefono: interesado.telefono
  });

  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [req.productorId, 'trueque_interes', JSON.stringify({ truequeId: trueque.id, titulo: trueque.titulo, autor: trueque.autor })]
  );

  res.json({ success: resultado.success, autor: trueque.autor });
});

module.exports = router;
