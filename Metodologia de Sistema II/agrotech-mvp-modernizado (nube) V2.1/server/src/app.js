const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('express-async-errors');
const { requireAuth } = require('./middleware/auth');

const app = express();

// Detrás del proxy de Render: sin esto, el rate limit vería la misma IP para todos.
app.set('trust proxy', 1);

// La API solo devuelve JSON, pero el frontend (otro dominio) la consume por fetch.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS_ORIGIN admite varios orígenes separados por coma; '*' (o vacío) lo deja abierto.
const origenesPermitidos = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors({ origin: origenesPermitidos.includes('*') ? '*' : origenesPermitidos }));
// 15mb: una foto de factura en base64 (JSON) puede pesar varios MB; el
// límite por defecto de Express (100kb) la rechazaba siempre.
app.use(express.json({ limit: '15mb' }));

// La API sirve datos dinámicos por productor: ningún proxy/CDN intermedio
// debe cachear estas respuestas (vimos GET quedarse con datos viejos pese a
// que el navegador pedía la red directamente).
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth.routes'));

app.use('/api/cuenta', requireAuth, require('./routes/cuenta.routes'));
app.use('/api/fincas', requireAuth, require('./routes/fincas.routes'));
app.use('/api/lotes', requireAuth, require('./routes/lotes.routes'));
app.use('/api/gastos', requireAuth, require('./routes/gastos.routes'));
app.use('/api/ingresos', requireAuth, require('./routes/ingresos.routes'));
app.use('/api/cartera', requireAuth, require('./routes/cartera.routes'));
app.use('/api/inversiones', requireAuth, require('./routes/inversiones.routes'));
app.use('/api/resumen', requireAuth, require('./routes/resumen.routes'));
app.use('/api/config', requireAuth, require('./routes/config.routes'));
app.use('/api/red', requireAuth, require('./routes/red.routes'));
app.use('/api/historial', requireAuth, require('./routes/historial.routes'));

// Express reconoce el manejador de errores por sus 4 parámetros: `_next` tiene que estar aunque no se use.
app.use((err, req, res, _next) => {
  console.error(err);
  if (err.status || err.statusCode) {
    return res.status(err.status || err.statusCode).json({ error: err.message });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
