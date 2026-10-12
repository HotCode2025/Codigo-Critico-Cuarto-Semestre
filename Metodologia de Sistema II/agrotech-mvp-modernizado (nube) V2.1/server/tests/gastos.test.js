const { app, request, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

async function crearGasto(u, extra = {}) {
  const res = await request(app).post('/api/gastos').set(u.auth)
    .send({ loteId: u.loteId, concepto: 'Insumos', monto: 1000, estado: 'pagado', ...extra });
  return res;
}

describe('crear gastos', () => {
  test('crea un gasto en un lote propio', async () => {
    const u = await registrar();
    const res = await crearGasto(u);
    expect(res.status).toBe(201);
    expect(Number(res.body.monto)).toBe(1000);
  });

  test('exige los campos obligatorios y fecha en los programados', async () => {
    const u = await registrar();
    expect((await crearGasto(u, { concepto: undefined })).status).toBe(400);
    expect((await crearGasto(u, { estado: 'programado' })).status).toBe(400);
    expect((await crearGasto(u, { estado: 'programado', fecha: '2026-12-01' })).status).toBe(201);
  });

  test('estado, monto y fecha inválidos responden 400', async () => {
    const u = await registrar();
    expect((await crearGasto(u, { estado: 'cualquiera' })).status).toBe(400);
    expect((await crearGasto(u, { monto: -50 })).status).toBe(400);
    expect((await crearGasto(u, { estado: 'programado', fecha: 'mañana' })).status).toBe(400);
  });

  test('no permite cargar en el lote de otro productor', async () => {
    const a = await registrar();
    const b = await registrar();
    const res = await crearGasto(a, { loteId: b.loteId });
    expect(res.status).toBe(404);
  });

  test('no permite cargar en un lote archivado', async () => {
    const u = await registrar();
    const lote2 = (await request(app).post('/api/lotes').set(u.auth).send({ nombre: 'Lote 2', area: 5, fincaId: (await request(app).get('/api/fincas').set(u.auth)).body[0].id })).body;
    expect((await request(app).patch(`/api/lotes/${lote2.id}/archivar`).set(u.auth)).status).toBe(200);
    expect((await crearGasto(u, { loteId: lote2.id })).status).toBe(404);
  });
});

describe('editar y borrar gastos', () => {
  test('edita monto y concepto', async () => {
    const u = await registrar();
    const { body: g } = await crearGasto(u);
    const res = await request(app).patch(`/api/gastos/${g.id}`).set(u.auth).send({ monto: 2500, concepto: 'Editado' });
    expect(res.status).toBe(200);
    expect(Number(res.body.monto)).toBe(2500);
    expect(res.body.concepto).toBe('Editado');
  });

  test('rechaza montos negativos', async () => {
    const u = await registrar();
    const { body: g } = await crearGasto(u);
    const res = await request(app).patch(`/api/gastos/${g.id}`).set(u.auth).send({ monto: -5 });
    expect(res.status).toBe(400);
  });

  test('no se puede editar, mover ni borrar el gasto de otro productor', async () => {
    const a = await registrar();
    const b = await registrar();
    const { body: g } = await crearGasto(a);
    expect((await request(app).patch(`/api/gastos/${g.id}`).set(b.auth).send({ monto: 1 })).status).toBe(404);
    expect((await request(app).delete(`/api/gastos/${g.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/gastos/${g.id}`).set(a.auth).send({ loteId: b.loteId })).status).toBe(404);
  });

  test('borra el gasto propio y un id inválido da 404', async () => {
    const u = await registrar();
    const { body: g } = await crearGasto(u);
    expect((await request(app).delete(`/api/gastos/${g.id}`).set(u.auth)).status).toBe(200);
    expect((await request(app).get('/api/gastos').set(u.auth)).body).toHaveLength(0);
    expect((await request(app).delete('/api/gastos/abc').set(u.auth)).status).toBe(404);
  });

  test('edición y borrado quedan en el historial', async () => {
    const u = await registrar();
    const { body: g } = await crearGasto(u);
    await request(app).patch(`/api/gastos/${g.id}`).set(u.auth).send({ monto: 5 });
    await request(app).delete(`/api/gastos/${g.id}`).set(u.auth);
    const tipos = (await request(app).get('/api/historial').set(u.auth)).body.map(h => h.tipo);
    expect(tipos).toEqual(expect.arrayContaining(['gasto_registrado', 'gasto_editado', 'gasto_eliminado']));
  });
});

describe('aislamiento entre productores', () => {
  test('cada productor lista solo sus gastos', async () => {
    const a = await registrar();
    const b = await registrar();
    await crearGasto(a);
    expect((await request(app).get('/api/gastos').set(a.auth)).body).toHaveLength(1);
    expect((await request(app).get('/api/gastos').set(b.auth)).body).toHaveLength(0);
  });
});
