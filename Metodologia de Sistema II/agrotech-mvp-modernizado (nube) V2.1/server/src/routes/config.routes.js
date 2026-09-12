const router = require('express').Router();
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

router.get('/n8n', async (req, res) => {
  const { rows } = await db.query(
    'SELECT webhook_url AS "webhookUrl", habilitado FROM config_n8n WHERE productor_id = $1',
    [req.productorId]
  );
  res.json(rows[0] || { webhookUrl: null, habilitado: false });
});

router.put('/n8n', async (req, res) => {
  const { webhookUrl, habilitado } = req.body;
  await db.query(
    `INSERT INTO config_n8n (productor_id, webhook_url, habilitado, actualizado_en)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (productor_id) DO UPDATE SET webhook_url = $2, habilitado = $3, actualizado_en = now()`,
    [req.productorId, webhookUrl || null, !!habilitado]
  );
  res.json({ webhookUrl: webhookUrl || null, habilitado: !!habilitado });
});

router.post('/n8n/test', async (req, res) => {
  const resultado = await notificarN8N(req.productorId, 'test_conexion', {
    mensaje: 'Prueba de conexión desde AgroTech MVP'
  });
  res.json(resultado);
});

module.exports = router;
