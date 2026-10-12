const { app, request, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

const crear = (u, extra = {}) => request(app).post('/api/inversiones').set(u.auth).send({ ticker: 'GGAL', monto: 50000, ...extra });

describe('inversiones', () => {
  test('crea y vende una inversión, y el resumen lo refleja', async () => {
    const u = await registrar();
    const { body: inv, status } = await crear(u);
    expect(status).toBe(201);
    expect((await request(app).get('/api/resumen').set(u.auth)).body.totalInvertido).toBe(50000);

    const venta = await request(app).patch(`/api/inversiones/${inv.id}/vender`).set(u.auth).send({ montoVenta: 60000 });
    expect(venta.status).toBe(200);
    expect((await request(app).get('/api/resumen').set(u.auth)).body.totalRecuperadoVentas).toBe(60000);
    expect((await request(app).patch(`/api/inversiones/${inv.id}/vender`).set(u.auth).send({ montoVenta: 1 })).status).toBe(404);
  });

  test('monto inválido o ticker demasiado largo responden 400 (antes 500)', async () => {
    const u = await registrar();
    expect((await crear(u, { monto: -10 })).status).toBe(400);
    expect((await crear(u, { monto: 'abc' })).status).toBe(400);
    expect((await crear(u, { ticker: 'X'.repeat(21) })).status).toBe(400);
  });

  test('un id que no es número responde 404 (antes 500)', async () => {
    const u = await registrar();
    expect((await request(app).patch('/api/inversiones/abc/vender').set(u.auth).send({ montoVenta: 5 })).status).toBe(404);
    expect((await request(app).patch('/api/inversiones/99999999999/vender').set(u.auth).send({ montoVenta: 5 })).status).toBe(404);
  });

  test('no se puede vender la inversión de otro productor', async () => {
    const a = await registrar();
    const b = await registrar();
    const { body: inv } = await crear(a);
    expect((await request(app).patch(`/api/inversiones/${inv.id}/vender`).set(b.auth).send({ montoVenta: 5 })).status).toBe(404);
  });
});

describe('cartera', () => {
  test('cobrar un cheque con id inválido responde 404', async () => {
    const u = await registrar();
    expect((await request(app).patch('/api/cartera/abc/cobrar').set(u.auth)).status).toBe(404);
  });

  test('cobrar un cheque propio lo saca de pendientes y no se puede cobrar dos veces', async () => {
    const u = await registrar();
    await request(app).post('/api/ingresos').set(u.auth).send({ loteId: u.loteId, monto: 1000, tipo: 'echeq', fechaCobro: '2026-12-01' });
    const [cheque] = (await request(app).get('/api/cartera').set(u.auth)).body;
    expect((await request(app).patch(`/api/cartera/${cheque.id}/cobrar`).set(u.auth)).status).toBe(200);
    expect((await request(app).patch(`/api/cartera/${cheque.id}/cobrar`).set(u.auth)).status).toBe(404);
  });
});
