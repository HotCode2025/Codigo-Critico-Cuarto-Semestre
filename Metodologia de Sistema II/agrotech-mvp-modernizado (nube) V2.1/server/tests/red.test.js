const { app, request, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

const alerta = (u, extra = {}) =>
  request(app)
    .post('/api/red/alertas')
    .set(u.auth)
    .send({ tipo: 'plaga', zona: 'Luján de Cuyo', descripcion: 'Oídio en vid', ...extra });
const trueque = (u, extra = {}) =>
  request(app)
    .post('/api/red/trueques')
    .set(u.auth)
    .send({ tipo: 'maquinaria', titulo: 'Presto tractor', zona: 'Luján de Cuyo', ...extra });

describe('alertas de la red', () => {
  test('crea y resuelve una alerta propia', async () => {
    const u = await registrar();
    const res = await alerta(u);
    expect(res.status).toBe(201);
    expect((await request(app).patch(`/api/red/alertas/${res.body.alerta.id}/resolver`).set(u.auth)).status).toBe(200);
  });

  test('tipo inválido, zona o cultivo demasiado largos responden 400 (antes 500)', async () => {
    const u = await registrar();
    expect((await alerta(u, { tipo: 'inventado' })).status).toBe(400);
    expect((await alerta(u, { zona: 'Z'.repeat(61) })).status).toBe(400);
    expect((await alerta(u, { cultivo: 'C'.repeat(41) })).status).toBe(400);
  });

  test('no se puede resolver la alerta de otro productor ni con un id inválido', async () => {
    const a = await registrar();
    const b = await registrar();
    const { body } = await alerta(a);
    expect((await request(app).patch(`/api/red/alertas/${body.alerta.id}/resolver`).set(b.auth)).status).toBe(404);
    expect((await request(app).patch('/api/red/alertas/abc/resolver').set(a.auth)).status).toBe(404);
  });
});

describe('trueques de la red', () => {
  test('crea una oferta y aparece en el listado de su zona', async () => {
    const u = await registrar();
    expect((await trueque(u)).status).toBe(201);
    const lista = (await request(app).get('/api/red/trueques?zona=Luján de Cuyo').set(u.auth)).body;
    expect(lista.some(t => t.titulo === 'Presto tractor')).toBe(true);
  });

  test('tipo inválido o título demasiado largo responden 400 (antes 500)', async () => {
    const u = await registrar();
    expect((await trueque(u, { tipo: 'otra-cosa' })).status).toBe(400);
    expect((await trueque(u, { titulo: 'T'.repeat(161) })).status).toBe(400);
  });

  test('contactar: id inválido da 404 y no podés contactar tu propia oferta', async () => {
    const u = await registrar();
    const { body } = await trueque(u);
    expect((await request(app).post('/api/red/trueques/abc/contactar').set(u.auth)).status).toBe(404);
    expect((await request(app).post(`/api/red/trueques/${body.trueque.id}/contactar`).set(u.auth)).status).toBe(400);
  });
});
