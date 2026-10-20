const { app, request, registrar, cerrarDb } = require('./helpers');
const db = require('../src/db');

afterAll(cerrarDb);

const enUnAnio = () => new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
const talonario = (extra = {}) => ({
  puntoVenta: 2,
  numeroDesde: 1,
  numeroHasta: 500,
  cai: '12345678901234',
  caiVencimiento: enUnAnio(),
  emisorRazonSocial: 'Finca Los Álamos de Ariel Mazara',
  emisorCuit: '20-12345678-6',
  emisorDomicilio: 'Ruta 143 km 5, San Rafael, Mendoza',
  emisorCondicionIva: 'monotributo',
  ...extra
});
const cargarTalonario = (u, extra) => request(app).post('/api/remitos/talonario').set(u.auth).send(talonario(extra));

// Un envío con el DTV-e ya registrado, listo para el remito.
async function envioConDtv(u, extra = {}) {
  const { body } = await request(app)
    .post('/api/envios')
    .set(u.auth)
    .send({
      loteId: u.loteId,
      fecha: '2026-12-15',
      kg: 12000,
      bins: 30,
      destinoNombre: 'Conservera del Valle S.A.',
      ...extra
    });
  await request(app).patch(`/api/envios/${body.id}/dtv`).set(u.auth).send({ numero: 'D1', vencimiento: '2026-12-16' });
  return body;
}
const emitir = (u, envioId, extra = {}) =>
  request(app)
    .post('/api/remitos')
    .set(u.auth)
    .send({ envioId, ...extra });

describe('remito apagado hasta cargar el CAI', () => {
  test('sin talonario no se puede emitir', async () => {
    const u = await registrar();
    expect((await request(app).get('/api/remitos/talonario').set(u.auth)).body).toEqual({ talonario: null });
    const envio = await envioConDtv(u);
    const res = await emitir(u, envio.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/CAI/);
  });

  test('el talonario valida CAI, rango, CUIT y vencimiento', async () => {
    const u = await registrar();
    expect((await cargarTalonario(u, { cai: '123' })).status).toBe(400);
    expect((await cargarTalonario(u, { numeroDesde: 10, numeroHasta: 5 })).status).toBe(400);
    expect((await cargarTalonario(u, { emisorCuit: '20-12345678-5' })).status).toBe(400);
    expect((await cargarTalonario(u, { caiVencimiento: '2020-01-01' })).status).toBe(400);
    expect((await cargarTalonario(u, { emisorCondicionIva: 'otra' })).status).toBe(400);
    expect((await cargarTalonario(u, { puntoVenta: 0 })).status).toBe(400);
    const ok = await cargarTalonario(u);
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ proximoNumero: 1, restantes: 500, avisos: [] });
  });
});

describe('emisión del remito', () => {
  test('numeración correlativa y copia de los datos del envío y del emisor', async () => {
    const u = await registrar();
    await cargarTalonario(u, { numeroDesde: 41 });
    const e1 = await envioConDtv(u, { patenteCamion: 'AB123CD', chofer: 'Juan Pérez' });
    const e2 = await envioConDtv(u);

    const r1 = await emitir(u, e1.id, { destinoDomicilio: 'Parque Industrial, San Rafael' });
    expect(r1.status).toBe(201);
    expect(r1.body).toMatchObject({ numero: 41, estado: 'emitido' });
    expect(r1.body.datos).toMatchObject({
      puntoVenta: 2,
      cai: '12345678901234',
      emisor: { cuit: '20123456786', condicionIva: 'monotributo' },
      destino: { nombre: 'Conservera del Valle S.A.', domicilio: 'Parque Industrial, San Rafael' },
      transporte: { patenteCamion: 'AB123CD', chofer: 'Juan Pérez' },
      detalle: { kg: 12000, bins: 30 }
    });
    expect((await emitir(u, e2.id)).body.numero).toBe(42);

    const estado = (await request(app).get('/api/remitos/talonario').set(u.auth)).body;
    expect(estado).toMatchObject({ proximoNumero: 43, restantes: 458 });
  });

  test('primero el DTV-e, después el remito; y un solo remito vigente por envío', async () => {
    const u = await registrar();
    await cargarTalonario(u);
    const { body: sinDtv } = await request(app)
      .post('/api/envios')
      .set(u.auth)
      .send({ loteId: u.loteId, fecha: '2026-12-15', kg: 1000, destinoNombre: 'Bodega' });
    expect((await emitir(u, sinDtv.id)).status).toBe(409);

    const envio = await envioConDtv(u);
    const r = (await emitir(u, envio.id)).body;
    expect((await emitir(u, envio.id)).status).toBe(409);

    // El envío no se anula con un remito vigente; anulando el remito, el número queda usado.
    expect((await request(app).patch(`/api/envios/${envio.id}/anular`).set(u.auth).send({})).status).toBe(409);
    const anulado = await request(app)
      .patch(`/api/remitos/${r.id}/anular`)
      .set(u.auth)
      .send({ motivo: 'Error de tipeo' });
    expect(anulado.body).toMatchObject({ estado: 'anulado', anulado_motivo: 'Error de tipeo' });
    expect((await request(app).patch(`/api/remitos/${r.id}/anular`).set(u.auth).send({})).status).toBe(404);
    expect((await emitir(u, envio.id)).body.numero).toBe(r.numero + 1);
  });

  test('bloquea con rango agotado, CAI vencido para la fecha o fecha anterior a la del último', async () => {
    const u = await registrar();
    await cargarTalonario(u, { numeroDesde: 1, numeroHasta: 2, caiVencimiento: enUnAnio() });
    const avisos = (await request(app).get('/api/remitos/talonario').set(u.auth)).body.avisos;
    expect(avisos.join(' ')).toMatch(/Quedan 2/);

    const hoy = new Date().toISOString().slice(0, 10);
    await emitir(u, (await envioConDtv(u)).id, { fecha: enUnAnio() });
    expect((await emitir(u, (await envioConDtv(u)).id, { fecha: hoy })).status).toBe(409); // fecha anterior
    expect((await emitir(u, (await envioConDtv(u)).id, { fecha: '2099-01-01' })).status).toBe(409); // CAI vencido
    expect((await emitir(u, (await envioConDtv(u)).id, { fecha: enUnAnio() })).body.numero).toBe(2);
    const agotado = await emitir(u, (await envioConDtv(u)).id, { fecha: enUnAnio() });
    expect(agotado.status).toBe(409);
    expect(agotado.body.error).toMatch(/números/);
  });

  test('dos emisiones al mismo tiempo reciben números distintos', async () => {
    const u = await registrar();
    await cargarTalonario(u);
    const envios = await Promise.all([envioConDtv(u), envioConDtv(u), envioConDtv(u)]);
    const remitos = await Promise.all(envios.map(e => emitir(u, e.id)));
    expect(remitos.map(r => r.status)).toEqual([201, 201, 201]);
    expect(remitos.map(r => r.body.numero).sort()).toEqual([1, 2, 3]);
  });

  test('un CAI nuevo reemplaza al anterior y conserva sus remitos', async () => {
    const u = await registrar();
    await cargarTalonario(u);
    await emitir(u, (await envioConDtv(u)).id);
    const nuevo = await cargarTalonario(u, { cai: '99999999999999', numeroDesde: 501, numeroHasta: 1000 });
    expect(nuevo.body).toMatchObject({ proximoNumero: 501 });
    expect((await request(app).get('/api/remitos').set(u.auth)).body).toHaveLength(1);
    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS n FROM talonarios_remito WHERE productor_id = $1 AND activo',
      [u.productor.id]
    );
    expect(rows[0].n).toBe(1);
  });
});

describe('remitos: cada productor ve solo los suyos', () => {
  test('no se puede emitir con el envío de otro ni ver o anular su remito', async () => {
    const a = await registrar();
    const b = await registrar();
    await cargarTalonario(a);
    await cargarTalonario(b);
    const envioA = await envioConDtv(a);
    const remitoA = (await emitir(a, envioA.id)).body;

    expect((await emitir(b, envioA.id)).status).toBe(404);
    expect((await request(app).get(`/api/remitos/${remitoA.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/remitos/${remitoA.id}/anular`).set(b.auth).send({})).status).toBe(404);
    expect((await request(app).get('/api/remitos').set(b.auth)).body).toEqual([]);
  });

  test('sin token responde 401', async () => {
    expect((await request(app).get('/api/remitos/talonario')).status).toBe(401);
  });
});
