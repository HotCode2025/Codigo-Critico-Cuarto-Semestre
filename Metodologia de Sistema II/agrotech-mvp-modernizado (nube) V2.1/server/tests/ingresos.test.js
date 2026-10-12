const { app, request, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

const crear = (u, extra = {}) =>
  request(app).post('/api/ingresos').set(u.auth).send({ loteId: u.loteId, monto: 1000, tipo: 'contado', ...extra });

describe('validación al crear ingresos', () => {
  test('un tipo inválido responde 400 (antes era 500)', async () => {
    const u = await registrar();
    const res = await crear(u, { tipo: 'efectivo' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tipo/);
  });

  test('estado, monto y fecha inválidos responden 400', async () => {
    const u = await registrar();
    expect((await crear(u, { estado: 'cualquiera' })).status).toBe(400);
    expect((await crear(u, { monto: -50 })).status).toBe(400);
    expect((await crear(u, { monto: 'abc' })).status).toBe(400);
    expect((await crear(u, { tipo: 'echeq', fechaCobro: '31/12/2026' })).status).toBe(400);
  });

  test('los valores válidos siguen funcionando', async () => {
    const u = await registrar();
    expect((await crear(u)).status).toBe(201);
    expect((await crear(u, { tipo: 'echeq', fechaCobro: '2026-12-01' })).status).toBe(201);
    expect((await crear(u, { tipo: 'fisico', estado: 'rechazado' })).status).toBe(201);
    // La importación de datos reenvía las fechas como las devuelve la API (ISO con hora).
    expect((await crear(u, { tipo: 'echeq', fechaCobro: '2026-12-01T03:00:00.000Z' })).status).toBe(201);
  });

  test('editar rechaza una fecha de cobro inválida', async () => {
    const u = await registrar();
    const { body: i } = await crear(u, { tipo: 'echeq', fechaCobro: '2026-12-01' });
    const res = await request(app).patch(`/api/ingresos/${i.id}`).set(u.auth).send({ fechaCobro: 'mañana' });
    expect(res.status).toBe(400);
  });
});

describe('ingresos y la cartera de cheques', () => {
  test('un echeq entra a la cartera y se sincroniza al editar y borrar', async () => {
    const u = await registrar();
    const { body: i } = await crear(u, { monto: 100000, tipo: 'echeq', fechaCobro: '2026-12-01' });
    let cartera = (await request(app).get('/api/cartera').set(u.auth)).body;
    expect(cartera).toHaveLength(1);

    await request(app).patch(`/api/ingresos/${i.id}`).set(u.auth).send({ monto: 150000 });
    cartera = (await request(app).get('/api/cartera').set(u.auth)).body;
    expect(Number(cartera[0].monto)).toBe(150000);

    await request(app).delete(`/api/ingresos/${i.id}`).set(u.auth);
    expect((await request(app).get('/api/cartera').set(u.auth)).body).toHaveLength(0);
  });

  test('no se puede cargar un ingreso en el lote de otro productor', async () => {
    const a = await registrar();
    const b = await registrar();
    expect((await crear(a, { loteId: b.loteId })).status).toBe(404);
  });
});
