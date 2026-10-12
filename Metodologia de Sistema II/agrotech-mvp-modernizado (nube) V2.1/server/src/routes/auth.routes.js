const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { notificarSistemaN8N } = require('../services/n8n');
const { requireAuth } = require('../middleware/auth');
const { errorTexto } = require('../services/validar');
const { loginLimiter, registroLimiter, recuperacionLimiter } = require('../middleware/rateLimit');

const PASSWORD_MIN = 6;
const PASSWORD_MAX_BYTES = 72;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Los emails se guardan y buscan en minúsculas: Ariel@x.com y ariel@x.com son la misma cuenta.
function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
const VERIFICACION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// Genera un token nuevo (reemplaza al anterior) y lo manda por email vía N8N. Nunca lanza:
// si N8N está caído la cuenta igual se crea y el productor puede pedir el reenvío después.
async function enviarVerificacion(productor) {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    await db.query(
      'UPDATE productores SET verificacion_token_hash = $1, verificacion_token_expira = $2 WHERE id = $3',
      [hashToken(token), new Date(Date.now() + VERIFICACION_TTL_MS), productor.id]
    );
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    await notificarSistemaN8N('verificar_email', {
      email: productor.email,
      nombre: productor.nombre,
      verificarUrl: `${frontendUrl}/verificar-email.html?token=${token}`
    });
  } catch (err) {
    console.error('[AgroTech] No se pudo enviar la verificación de email:', err.message);
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function firmarToken(productorId) {
  return jwt.sign({ productorId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', registroLimiter, async (req, res) => {
  const { nombre, password, telefono, zona, cultivoPrincipal } = req.body;
  const email = normalizarEmail(req.body.email);
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
  }
  if (!EMAIL_VALIDO.test(email)) {
    return res.status(400).json({ error: 'El email no es válido' });
  }
  const errorEntrada = errorTexto(nombre, 120, 'nombre') || errorTexto(req.body.email, 160, 'email')
    || errorTexto(telefono, 30, 'telefono') || errorTexto(zona, 60, 'zona') || errorTexto(cultivoPrincipal, 60, 'cultivoPrincipal');
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });
  if (typeof password !== 'string') return res.status(400).json({ error: 'La contraseña debe ser texto' });
  if (String(password).length < PASSWORD_MIN) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` });
  }

  const existe = await db.query('SELECT id FROM productores WHERE LOWER(email) = $1', [email]);
  if (existe.rows.length > 0) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO productores (nombre, email, password_hash, telefono, zona, cultivo_principal)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, email, zona, telefono, email_verificado AS "emailVerificado"`,
    [String(nombre).trim(), email, passwordHash, telefono || null, zona || null, cultivoPrincipal || null]
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

  if (process.env.N8N_DEFAULT_WEBHOOK_URL) {
    await db.query(
      `INSERT INTO config_n8n (productor_id, webhook_url, habilitado, actualizado_en)
       VALUES ($1, $2, true, now())`,
      [productor.id, process.env.N8N_DEFAULT_WEBHOOK_URL]
    );
  }

  enviarVerificacion(productor); // sin await: no demora ni hace fallar el registro

  res.status(201).json({ token: firmarToken(productor.id), productor });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  const email = normalizarEmail(req.body.email);
  if (!email || !password) return res.status(400).json({ error: 'email y password son obligatorios' });
  if (typeof password !== 'string') return res.status(400).json({ error: 'La contraseña debe ser texto' });

  const { rows } = await db.query(
    'SELECT id, nombre, email, zona, telefono, email_verificado AS "emailVerificado", password_hash FROM productores WHERE LOWER(email) = $1',
    [email]
  );
  const productor = rows[0];
  if (!productor || !(await bcrypt.compare(password, productor.password_hash))) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  delete productor.password_hash;
  res.json({ token: firmarToken(productor.id), productor });
});

router.post('/forgot-password', recuperacionLimiter, async (req, res) => {
  const email = normalizarEmail(req.body.email);
  if (!email) return res.status(400).json({ error: 'email es obligatorio' });

  const { rows } = await db.query('SELECT id, nombre, email FROM productores WHERE LOWER(email) = $1', [email]);
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

router.post('/reset-password', recuperacionLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'token y password son obligatorios' });
  if (typeof password !== 'string' || typeof token !== 'string') return res.status(400).json({ error: 'token y password deben ser texto' });
  if (password.length < PASSWORD_MIN) return res.status(400).json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` });

  const { rows } = await db.query(
    'SELECT id FROM productores WHERE reset_token_hash = $1 AND reset_token_expira > now()',
    [hashToken(token)]
  );
  const productor = rows[0];
  if (!productor) return res.status(400).json({ error: 'El link de recuperación es inválido o expiró' });

  const passwordHash = await bcrypt.hash(password, 10);
  await db.query(
    // Recibir el link de recuperación en ese email prueba que es del productor: queda verificado.
    'UPDATE productores SET password_hash = $1, reset_token_hash = NULL, reset_token_expira = NULL, email_verificado = true WHERE id = $2',
    [passwordHash, productor.id]
  );

  res.json({ message: 'Contraseña actualizada correctamente' });
});

// Confirma el email con el token del link. Se puede usar más de una vez hasta que vence
// (hacer clic dos veces no puede dar error) porque solo marca la cuenta como verificada.
router.post('/verificar-email', loginLimiter, async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token es obligatorio' });

  const { rows } = await db.query(
    'UPDATE productores SET email_verificado = true WHERE verificacion_token_hash = $1 AND verificacion_token_expira > now() RETURNING id',
    [hashToken(token)]
  );
  if (rows.length === 0) {
    return res.status(400).json({ error: 'El link de verificación es inválido o venció. Pedí uno nuevo desde la app.' });
  }
  res.json({ message: 'Email confirmado. ¡Gracias!' });
});

router.post('/reenviar-verificacion', requireAuth, recuperacionLimiter, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nombre, email, email_verificado FROM productores WHERE id = $1',
    [req.productorId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (rows[0].email_verificado) return res.json({ yaVerificado: true });

  await enviarVerificacion(rows[0]);
  res.json({ yaVerificado: false, message: `Te mandamos un email a ${rows[0].email}` });
});

// Para que la app sepa si el email ya está confirmado (puede haberse confirmado en otro dispositivo).
router.get('/perfil', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nombre, email, zona, telefono, email_verificado AS "emailVerificado" FROM productores WHERE id = $1',
    [req.productorId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Cuenta no encontrada' });
  res.json(rows[0]);
});

// Cambiar la contraseña estando logueado: pide la actual (403 y no 401 si no coincide, para que
// el cliente no cierre la sesión por un error de tipeo) y descarta los links de recuperación
// que hubieran quedado pendientes. bcrypt solo mira los primeros 72 bytes, por eso el tope.
router.put('/password', requireAuth, loginLimiter, async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;
  if (!passwordActual || !passwordNueva) {
    return res.status(400).json({ error: 'passwordActual y passwordNueva son obligatorias' });
  }
  if (typeof passwordActual !== 'string' || typeof passwordNueva !== 'string') {
    return res.status(400).json({ error: 'Las contraseñas deben ser texto' });
  }
  if (passwordNueva.length < PASSWORD_MIN) {
    return res.status(400).json({ error: `La contraseña nueva debe tener al menos ${PASSWORD_MIN} caracteres` });
  }
  if (Buffer.byteLength(passwordNueva) > PASSWORD_MAX_BYTES) {
    return res.status(400).json({ error: 'La contraseña nueva es demasiado larga' });
  }
  if (passwordNueva === passwordActual) {
    return res.status(400).json({ error: 'La contraseña nueva tiene que ser distinta de la actual' });
  }

  const { rows } = await db.query('SELECT password_hash FROM productores WHERE id = $1', [req.productorId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (!(await bcrypt.compare(passwordActual, rows[0].password_hash))) {
    return res.status(403).json({ error: 'La contraseña actual no es correcta' });
  }

  await db.query(
    'UPDATE productores SET password_hash = $1, reset_token_hash = NULL, reset_token_expira = NULL WHERE id = $2',
    [await bcrypt.hash(passwordNueva, 10), req.productorId]
  );
  await db.query(
    'INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)',
    [req.productorId, 'password_cambiada', '{}']
  );
  res.json({ message: 'Contraseña actualizada correctamente' });
});

router.put('/perfil', requireAuth, async (req, res) => {
  const { telefono } = req.body;
  const errorEntrada = errorTexto(telefono, 30, 'telefono');
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });
  const { rows } = await db.query(
    `UPDATE productores SET telefono = $1 WHERE id = $2
     RETURNING id, nombre, email, zona, telefono, email_verificado AS "emailVerificado"`,
    [(telefono || '').trim() || null, req.productorId]
  );
  res.json(rows[0]);
});

module.exports = router;
