const rateLimit = require('express-rate-limit');

function limitador({ ventanaMin, maximo, mensaje, porProductor = false }) {
  return rateLimit({
    windowMs: ventanaMin * 60 * 1000,
    limit: maximo,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: mensaje },
    ...(porProductor && { keyGenerator: (req) => `productor:${req.productorId}` })
  });
}

const loginLimiter = limitador({
  ventanaMin: 15,
  maximo: 10,
  mensaje: 'Demasiados intentos de ingreso. Probá de nuevo en 15 minutos.'
});

const registroLimiter = limitador({
  ventanaMin: 60,
  maximo: 10,
  mensaje: 'Demasiados registros desde esta conexión. Probá de nuevo más tarde.'
});

// Cada pedido de recuperación manda un email desde la cuenta del administrador.
const recuperacionLimiter = limitador({
  ventanaMin: 60,
  maximo: 5,
  mensaje: 'Demasiados pedidos de recuperación. Probá de nuevo en una hora.'
});

// Cada llamada a la IA gasta cuota de Anthropic: se limita por productor, no por IP.
const iaLimiter = limitador({
  ventanaMin: 60,
  maximo: 20,
  porProductor: true,
  mensaje: 'Llegaste al límite de escaneos con IA por hora. Probá de nuevo más tarde.'
});

module.exports = { loginLimiter, registroLimiter, recuperacionLimiter, iaLimiter };
