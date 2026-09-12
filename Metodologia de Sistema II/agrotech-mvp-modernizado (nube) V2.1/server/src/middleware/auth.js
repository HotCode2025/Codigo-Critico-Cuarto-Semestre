const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Falta el token de autenticación' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.productorId = payload.productorId;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { requireAuth };
