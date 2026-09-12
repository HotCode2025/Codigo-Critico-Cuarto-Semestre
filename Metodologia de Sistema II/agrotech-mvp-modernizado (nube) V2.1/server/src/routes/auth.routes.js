const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { notificarSistemaN8N } = require('../services/n8n');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function firmarToken(productorId) {
  return jwt.sign({ productorId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', async (req, res) => {
  const { nombre, email, password, telefono, zona, cultivoPrincipal } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
  }

  const existe = await db.query('SELECT id FROM productores WHERE email = $1', [email]);
  if (existe.rows.length > 0) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO productores (nombre, email, password_hash, telefono, zona, cultivo_principal)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, email, zona`,
    [nombre, email, passwordHash, telefono || null, zona || null, cultivoPrincipal || null]
  );

  const productor = rows[0];
  const { rows: fincaRows } = await db.query(
    `INSERT INTO fincas (productor_id, nombre) VALUES ($1, 'Finca 1') RETURNING id`,
    [productor.id]
  );
  await db.query(
    `INSERT INTO lotes (productor_id, finca_id, nombre, color, area) VALUES
     ($1, $2, 'Lote 1', 'blue', 10)`,
    [productor.id, fincaRows[0].id]
  );

  res.status(201).json({ token: firmarToken(productor.id), productor });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email y password son obligatorios' });

  const { rows } = await db.query(
    'SELECT id, nombre, email, zona, password_hash FROM productores WHERE email = $1',
    [email]
  );
  const productor = rows[0];
  if (!productor || !(await bcrypt.compare(password, productor.password_hash))) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  delete productor.password_hash;
  res.json({ token: firmarToken(productor.id), productor });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email es obligatorio' });

  const { rows } = await db.query('SELECT id, nombre, email FROM productores WHERE email = $1', [email]);
  const productor = rows[0];

  // Respuesta genérica siempre, exista o no la cuenta: evita filtrar qué emails están registrados.
  const respuestaGenerica = { message: 'Si el email existe, vas a recibir instrucciones para recuperar tu contraseña.' };

  if (productor) {
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await db.query(
      'UPDATE productores SET reset_token_hash = $1, reset_token_expira = $2 WHERE id = $3',
      [hashToken(token), expira, productor.id]
    );

    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password.html?token=${token}`;

    notificarSistemaN8N('recuperar_password', {
      email: productor.email,
      nombre: productor.nombre,
      resetUrl
    }).catch(() => {});
  }

  res.json(respuestaGenerica);
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token y password son obligatorios' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const { rows } = await db.query(
    'SELECT id FROM productores WHERE reset_token_hash = $1 AND reset_token_expira > now()',
    [hashToken(token)]
  );
  const productor = rows[0];
  if (!productor) return res.status(400).json({ error: 'El link de recuperación es inválido o expiró' });

  const passwordHash = await bcrypt.hash(password, 10);
  await db.query(
    'UPDATE productores SET password_hash = $1, reset_token_hash = NULL, reset_token_expira = NULL WHERE id = $2',
    [passwordHash, productor.id]
  );

  res.json({ message: 'Contraseña actualizada correctamente' });
});

module.exports = router;
