const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

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
  await db.query(
    `INSERT INTO lotes (productor_id, nombre, color, area) VALUES
     ($1, 'Lote 1', 'blue', 10)`,
    [productor.id]
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

module.exports = router;
