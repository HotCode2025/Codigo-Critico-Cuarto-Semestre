const express = require('express');
const cors = require('cors');
require('express-async-errors');
const { requireAuth } = require('./middleware/auth');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/auth.routes'));

app.use('/api/lotes', requireAuth, require('./routes/lotes.routes'));
app.use('/api/gastos', requireAuth, require('./routes/gastos.routes'));
app.use('/api/ingresos', requireAuth, require('./routes/ingresos.routes'));
app.use('/api/cartera', requireAuth, require('./routes/cartera.routes'));
app.use('/api/inversiones', requireAuth, require('./routes/inversiones.routes'));
app.use('/api/resumen', requireAuth, require('./routes/resumen.routes'));
app.use('/api/config', requireAuth, require('./routes/config.routes'));
app.use('/api/red', requireAuth, require('./routes/red.routes'));
app.use('/api/historial', requireAuth, require('./routes/historial.routes'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
