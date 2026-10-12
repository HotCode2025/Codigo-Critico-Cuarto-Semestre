const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

let contador = 0;

// Cada test crea sus propios productores con email único: no hace falta limpiar la base entre corridas.
function emailUnico(prefijo = 'prod') {
  contador += 1;
  return `${prefijo}-${Date.now()}-${contador}-${Math.random().toString(36).slice(2, 7)}@test.agrotech`;
}

async function registrar(nombre = 'Productor Test') {
  const email = emailUnico();
  const res = await request(app).post('/api/auth/register').send({ nombre, email, password: 'secreta123' });
  if (res.status !== 201) throw new Error(`No se pudo registrar: ${res.status} ${JSON.stringify(res.body)}`);
  const auth = { Authorization: `Bearer ${res.body.token}` };
  const lotes = (await request(app).get('/api/lotes').set(auth)).body;
  return { email, token: res.body.token, auth, productor: res.body.productor, loteId: lotes[0].id };
}

const cerrarDb = () => db.pool.end();

module.exports = { app, request, emailUnico, registrar, cerrarDb };
