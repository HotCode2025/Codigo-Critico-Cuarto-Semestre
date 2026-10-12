const { app, request, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

const resumen = async (u) => (await request(app).get('/api/resumen').set(u.auth)).body;

describe('resumen financiero', () => {
  test('arranca en cero', async () => {
    const u = await registrar();
    expect(await resumen(u)).toMatchObject({ totalIngresos: 0, totalGastos: 0, saldoNeto: 0 });
  });

  test('suma solo gastos pagados (los programados no cuentan todavía)', async () => {
    const u = await registrar();
    const gasto = (extra) => request(app).post('/api/gastos').set(u.auth).send({ loteId: u.loteId, concepto: 'x', ...extra });
    await gasto({ monto: 1000, estado: 'pagado' });
    await gasto({ monto: 500, estado: 'programado', fecha: '2026-12-01' });
    expect((await resumen(u)).totalGastos).toBe(1000);
  });

  test('saldo neto = ingresos - gastos', async () => {
    const u = await registrar();
    await request(app).post('/api/ingresos').set(u.auth).send({ loteId: u.loteId, monto: 5000, tipo: 'fisico', estado: 'normal' });
    await request(app).post('/api/gastos').set(u.auth).send({ loteId: u.loteId, concepto: 'x', monto: 1200, estado: 'pagado' });
    expect(await resumen(u)).toMatchObject({ totalIngresos: 5000, totalGastos: 1200, saldoNeto: 3800, margenBruto: 3800 });
  });

  test('refleja las ediciones y los borrados', async () => {
    const u = await registrar();
    const { body: g } = await request(app).post('/api/gastos').set(u.auth).send({ loteId: u.loteId, concepto: 'x', monto: 1000, estado: 'pagado' });
    await request(app).patch(`/api/gastos/${g.id}`).set(u.auth).send({ monto: 2500 });
    expect((await resumen(u)).totalGastos).toBe(2500);
    await request(app).delete(`/api/gastos/${g.id}`).set(u.auth);
    expect((await resumen(u)).totalGastos).toBe(0);
  });

  test('un cheque rechazado no suma como ingreso', async () => {
    const u = await registrar();
    await request(app).post('/api/ingresos').set(u.auth).send({ loteId: u.loteId, monto: 8000, tipo: 'echeq', estado: 'rechazado' });
    expect((await resumen(u)).totalIngresos).toBe(0);
  });

  test('no mezcla datos de otros productores', async () => {
    const a = await registrar();
    const b = await registrar();
    await request(app).post('/api/gastos').set(a.auth).send({ loteId: a.loteId, concepto: 'x', monto: 999, estado: 'pagado' });
    expect((await resumen(b)).totalGastos).toBe(0);
  });
});
