const { app, request, emailUnico, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

describe('textos demasiado largos y de tipo incorrecto', () => {
  test('registro: nombre, teléfono y zona largos responden 400', async () => {
    const base = { nombre: 'Ana', email: emailUnico(), password: 'secreta123' };
    const registro = extra =>
      request(app)
        .post('/api/auth/register')
        .send({ ...base, email: emailUnico(), ...extra });
    expect((await registro({ nombre: 'N'.repeat(121) })).status).toBe(400);
    expect((await registro({ telefono: '1'.repeat(31) })).status).toBe(400);
    expect((await registro({ zona: 'Z'.repeat(61) })).status).toBe(400);
    expect((await registro({ nombre: { x: 1 } })).status).toBe(400);
    expect((await registro({ password: 123456789 })).status).toBe(400);
  });

  test('login y reset-password con valores que no son texto responden 400', async () => {
    expect((await request(app).post('/api/auth/login').send({ email: emailUnico(), password: 12345678 })).status).toBe(
      400
    );
    expect((await request(app).post('/api/auth/reset-password').send({ token: 'x', password: 12345678 })).status).toBe(
      400
    );
  });

  test('perfil: teléfono demasiado largo responde 400', async () => {
    const u = await registrar();
    expect(
      (
        await request(app)
          .put('/api/auth/perfil')
          .set(u.auth)
          .send({ telefono: '9'.repeat(31) })
      ).status
    ).toBe(400);
    expect((await request(app).put('/api/auth/perfil').set(u.auth).send({ telefono: '2614000000' })).status).toBe(200);
  });

  test('gastos: concepto de más de 120 caracteres responde 400 al crear y al editar', async () => {
    const u = await registrar();
    const largo = 'C'.repeat(121);
    expect(
      (
        await request(app)
          .post('/api/gastos')
          .set(u.auth)
          .send({ loteId: u.loteId, concepto: largo, monto: 10, estado: 'pagado' })
      ).status
    ).toBe(400);
    const { body: g } = await request(app)
      .post('/api/gastos')
      .set(u.auth)
      .send({ loteId: u.loteId, concepto: 'ok', monto: 10, estado: 'pagado' });
    expect((await request(app).patch(`/api/gastos/${g.id}`).set(u.auth).send({ concepto: largo })).status).toBe(400);
  });

  test('fincas y lotes: nombres largos y área inválida responden 400', async () => {
    const u = await registrar();
    const fincaId = (await request(app).get('/api/fincas').set(u.auth)).body[0].id;
    expect(
      (
        await request(app)
          .post('/api/fincas')
          .set(u.auth)
          .send({ nombre: 'F'.repeat(121) })
      ).status
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/fincas')
          .set(u.auth)
          .send({ nombre: 'Finca 2', ubicacion: 'U'.repeat(121) })
      ).status
    ).toBe(400);
    const lote = extra =>
      request(app)
        .post('/api/lotes')
        .set(u.auth)
        .send({ nombre: 'Lote', fincaId, ...extra });
    expect((await lote({ nombre: 'L'.repeat(121) })).status).toBe(400);
    expect((await lote({ cultivo: 'C'.repeat(81) })).status).toBe(400);
    expect((await lote({ area: 'mucha' })).status).toBe(400);
    expect((await lote({ area: -3 })).status).toBe(400);
    expect((await lote({ area: 99999999 })).status).toBe(400);
    expect((await lote({ fincaId: 'abc' })).status).toBe(404);
    expect((await lote({ area: 12.5 })).status).toBe(201);
  });
});

describe('filtros por query con valores inválidos', () => {
  test('?fincaId=abc o ?loteId=abc responden 400 en vez de 500', async () => {
    const u = await registrar();
    for (const ruta of [
      '/api/gastos?loteId=abc',
      '/api/gastos?fincaId=abc',
      '/api/ingresos?fincaId=abc',
      '/api/lotes?fincaId=abc',
      '/api/resumen?fincaId=abc',
      '/api/resumen/proyeccion?fincaId=99999999999'
    ]) {
      const res = await request(app).get(ruta).set(u.auth);
      expect([ruta, res.status]).toEqual([ruta, 400]);
    }
  });

  test('con filtros válidos o sin filtro siguen funcionando', async () => {
    const u = await registrar();
    const fincaId = (await request(app).get('/api/fincas').set(u.auth)).body[0].id;
    expect((await request(app).get(`/api/gastos?fincaId=${fincaId}&loteId=${u.loteId}`).set(u.auth)).status).toBe(200);
    expect((await request(app).get(`/api/resumen?fincaId=${fincaId}`).set(u.auth)).status).toBe(200);
    expect((await request(app).get('/api/lotes').set(u.auth)).status).toBe(200);
  });

  test('cargar un gasto en un lote con id gigante responde 404', async () => {
    const u = await registrar();
    const res = await request(app)
      .post('/api/gastos')
      .set(u.auth)
      .send({ loteId: 99999999999, concepto: 'x', monto: 1, estado: 'pagado' });
    expect(res.status).toBe(404);
  });
});

describe('archivar y restaurar cuarteles', () => {
  async function conSegundoLote() {
    const u = await registrar();
    const fincaId = (await request(app).get('/api/fincas').set(u.auth)).body[0].id;
    const { body: lote2 } = await request(app)
      .post('/api/lotes')
      .set(u.auth)
      .send({ nombre: 'Lote 2', area: 5, fincaId });
    return { u, fincaId, lote2 };
  }

  test('archivar conserva los gastos e ingresos del cuartel en el resumen', async () => {
    const { u, lote2 } = await conSegundoLote();
    await request(app)
      .post('/api/gastos')
      .set(u.auth)
      .send({ loteId: lote2.id, concepto: 'x', monto: 700, estado: 'pagado' });
    await request(app).post('/api/ingresos').set(u.auth).send({ loteId: lote2.id, monto: 2000, tipo: 'contado' });
    expect((await request(app).patch(`/api/lotes/${lote2.id}/archivar`).set(u.auth)).status).toBe(200);
    expect(
      await request(app)
        .get('/api/resumen')
        .set(u.auth)
        .then(r => r.body)
    ).toMatchObject({ totalGastos: 700, totalIngresos: 2000 });
    expect((await request(app).get('/api/gastos').set(u.auth)).body).toHaveLength(1);
  });

  test('archivar dos veces es idempotente y se puede restaurar', async () => {
    const { u, lote2 } = await conSegundoLote();
    await request(app).patch(`/api/lotes/${lote2.id}/archivar`).set(u.auth);
    expect((await request(app).patch(`/api/lotes/${lote2.id}/archivar`).set(u.auth)).body.activo).toBe(false);
    const res = await request(app).patch(`/api/lotes/${lote2.id}/restaurar`).set(u.auth);
    expect(res.body.activo).toBe(true);
    expect(
      (
        await request(app)
          .post('/api/gastos')
          .set(u.auth)
          .send({ loteId: lote2.id, concepto: 'x', monto: 1, estado: 'pagado' })
      ).status
    ).toBe(201);
  });

  test('no se archiva el único cuartel activo ni el de otro productor, y un id inválido da 404', async () => {
    const { u, fincaId } = await conSegundoLote();
    const otro = await registrar();
    const lotes = (await request(app).get('/api/lotes').set(u.auth)).body;
    await request(app).patch(`/api/lotes/${lotes[1].id}/archivar`).set(u.auth);
    expect((await request(app).patch(`/api/lotes/${lotes[0].id}/archivar`).set(u.auth)).status).toBe(409);
    expect((await request(app).patch(`/api/lotes/${lotes[0].id}/archivar`).set(otro.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/lotes/${lotes[0].id}/restaurar`).set(otro.auth)).status).toBe(404);
    expect((await request(app).patch('/api/lotes/abc/archivar').set(u.auth)).status).toBe(404);
    expect(fincaId).toBeDefined();
  });

  test('la finca cuenta solo los cuarteles activos', async () => {
    const { u, lote2 } = await conSegundoLote();
    expect((await request(app).get('/api/fincas').set(u.auth)).body[0].lotes).toBe(2);
    await request(app).patch(`/api/lotes/${lote2.id}/archivar`).set(u.auth);
    expect((await request(app).get('/api/fincas').set(u.auth)).body[0].lotes).toBe(1);
  });
});
