const { app, request, registrar, cerrarDb } = require('./helpers');
const db = require('../src/db');

afterAll(cerrarDb);

async function conDatos() {
  const u = await registrar('Con Datos');
  await request(app)
    .post('/api/gastos')
    .set(u.auth)
    .send({ loteId: u.loteId, concepto: 'Insumos', monto: 1500, estado: 'pagado' });
  await request(app)
    .post('/api/ingresos')
    .set(u.auth)
    .send({ loteId: u.loteId, monto: 9000, tipo: 'echeq', fechaCobro: '2026-12-01' });
  await request(app).post('/api/inversiones').set(u.auth).send({ ticker: 'AL30', monto: 1000 });
  await request(app)
    .post('/api/red/alertas')
    .set(u.auth)
    .send({ tipo: 'plaga', zona: 'Luján de Cuyo', descripcion: 'Oídio' });
  return u;
}

describe('exportar mis datos', () => {
  test('devuelve todo lo del productor como descarga y sin datos sensibles', async () => {
    const u = await conDatos();
    const res = await request(app).get('/api/cuenta/exportar').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="agrotech-mis-datos-\d{4}-\d{2}-\d{2}\.json"/
    );
    expect(res.body.perfil.email).toBe(u.email);
    expect(res.body.gastos).toHaveLength(1);
    expect(res.body.ingresos).toHaveLength(1);
    expect(res.body.carteraCheques).toHaveLength(1);
    expect(res.body.inversiones).toHaveLength(1);
    expect(res.body.alertasPublicadas).toHaveLength(1);
    expect(res.body.fincas.length).toBeGreaterThan(0);
    expect(res.body.historial.length).toBeGreaterThan(0);
    const texto = JSON.stringify(res.body);
    expect(texto).not.toMatch(/password_hash|reset_token/);
  });

  test('no incluye datos de otros productores', async () => {
    const a = await conDatos();
    const b = await registrar();
    const res = await request(app).get('/api/cuenta/exportar').set(b.auth);
    expect(res.body.gastos).toHaveLength(0);
    expect(res.body.alertasPublicadas).toHaveLength(0);
    expect(res.body.perfil.email).not.toBe(a.email);
  });

  test('exige estar autenticado', async () => {
    expect((await request(app).get('/api/cuenta/exportar')).status).toBe(401);
  });
});

describe('eliminar mi cuenta', () => {
  test('sin contraseña o con una incorrecta no borra nada', async () => {
    const u = await conDatos();
    expect((await request(app).delete('/api/cuenta').set(u.auth).send({})).status).toBe(400);
    expect((await request(app).delete('/api/cuenta').set(u.auth).send({ password: 12345678 })).status).toBe(400);
    expect((await request(app).delete('/api/cuenta').set(u.auth).send({ password: 'incorrecta' })).status).toBe(403);
    expect((await request(app).post('/api/auth/login').send({ email: u.email, password: 'secreta123' })).status).toBe(
      200
    );
  });

  test('con la contraseña correcta borra la cuenta y todos sus datos', async () => {
    const u = await conDatos();
    const res = await request(app).delete('/api/cuenta').set(u.auth).send({ password: 'secreta123' });
    expect(res.status).toBe(200);

    expect((await request(app).post('/api/auth/login').send({ email: u.email, password: 'secreta123' })).status).toBe(
      401
    );
    const id = u.productor.id;
    for (const tabla of [
      'fincas',
      'lotes',
      'gastos',
      'ingresos',
      'cheques_cartera',
      'inversiones',
      'historial_eventos',
      'alertas_red',
      'envios'
    ]) {
      const { rows } = await db.query(`SELECT COUNT(*)::int AS n FROM ${tabla} WHERE productor_id = $1`, [id]);
      expect([tabla, rows[0].n]).toEqual([tabla, 0]);
    }
  });

  test('no afecta a otros productores', async () => {
    const a = await conDatos();
    const b = await conDatos();
    await request(app).delete('/api/cuenta').set(a.auth).send({ password: 'secreta123' });
    const res = await request(app).get('/api/cuenta/exportar').set(b.auth);
    expect(res.body.gastos).toHaveLength(1);
    expect(res.body.perfil.email).toBe(b.email);
  });

  test('exige estar autenticado', async () => {
    expect((await request(app).delete('/api/cuenta').send({ password: 'x' })).status).toBe(401);
  });
});
