const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

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

  const resultado = await notificarN8N(req.productorId, 'alerta_nueva', alerta);

  res.status(201).json({ alerta, notificacion: resultado });
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
  res.status(201).json(rows[0]);
});

module.exports = router;
