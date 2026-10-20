const { app, request, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const enDias = n => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const CUIT_FABRICA = '30-71234567-1';
const tipo = (u, body = {}) =>
  request(app)
    .post('/api/bins/tipos')
    .set(u.auth)
    .send({
      fabricaNombre: 'Conservera Ava',
      fabricaCuit: CUIT_FABRICA,
      descripcion: 'Bins plásticos Wenco',
      marca: 'Ava',
      ...body
    });
const mover = (u, body) => request(app).post('/api/bins/movimientos').set(u.auth).send(body);
const envio = (u, body) =>
  request(app)
    .post('/api/envios')
    .set(u.auth)
    .send({ loteId: u.loteId, fecha: enDias(-1), kg: 12000, destinoNombre: 'Conservera Ava', ...body });
const saldo = async (u, id) => (await request(app).get('/api/bins').set(u.auth)).body.find(t => t.id === id);

describe('bins en comodato', () => {
  test('la fábrica trae vacíos, vuelven llenos con el envío y retira los que sobran', async () => {
    const u = await registrar();
    const ava = (await tipo(u)).body;
    expect(ava).toMatchObject({ fabrica_cuit: '30712345671', saldo: 0 });

    await mover(u, {
      tipoBinId: ava.id,
      tipo: 'entrega',
      cantidad: 60,
      fecha: enDias(-5),
      remitoFabrica: '0001-00000123'
    });
    // El envío a esa fábrica (por CUIT) toma sus bins solo.
    const e1 = (await envio(u, { bins: 30, destinoCuit: CUIT_FABRICA })).body;
    expect(e1.tipo_bin_id).toBe(ava.id);
    // Por nombre también, si no tiene CUIT.
    const e2 = (await envio(u, { bins: 20, destinoNombre: 'conservera ava ' })).body;
    expect(e2.tipo_bin_id).toBe(ava.id);
    expect(await saldo(u, ava.id)).toMatchObject({ entregados: 60, enviados: 50, saldo: 10 });

    // Anular un envío devuelve sus bins a la cuenta.
    await request(app).patch(`/api/envios/${e2.id}/anular`).set(u.auth).send({ motivo: 'Se cargó dos veces' });
    expect((await saldo(u, ava.id)).saldo).toBe(30);

    await mover(u, { tipoBinId: ava.id, tipo: 'rotura', cantidad: 2, nota: 'Se rompieron en el cuartel' });
    await mover(u, { tipoBinId: ava.id, tipo: 'retiro', cantidad: 25 });
    expect(await saldo(u, ava.id)).toMatchObject({ retirados: 25, rotos: 2, saldo: 3 });
    // Al contarlos había 4: el ajuste corrige la diferencia.
    const ajuste = await mover(u, { tipoBinId: ava.id, tipo: 'ajuste', binsContados: 4 });
    expect(ajuste.body.movimiento.cantidad).toBe(1);
    expect(ajuste.body.bins.saldo).toBe(4);

    const historial = (await request(app).get(`/api/bins/tipos/${ava.id}/movimientos`).set(u.auth)).body;
    expect(historial.map(m => m.tipo)).toEqual(
      expect.arrayContaining(['entrega', 'envio', 'retiro', 'rotura', 'ajuste'])
    );
    expect(historial.find(m => m.tipo === 'envio' && m.estado_envio === 'anulado')).toBeTruthy();
  });

  test('cada fábrica tiene sus bins; si hay dos opciones el envío no elige solo', async () => {
    const u = await registrar();
    const ava = (await tipo(u)).body;
    const fenix = (
      await tipo(u, {
        fabricaNombre: 'Fábrica Fénix',
        fabricaCuit: '',
        descripcion: 'Bins plásticos verdes',
        marca: 'Fénix',
        color: 'Verde'
      })
    ).body;
    const aFenix = (await envio(u, { bins: 10, destinoNombre: 'Fábrica Fénix' })).body;
    expect(aFenix.tipo_bin_id).toBe(fenix.id);
    // Elegido a mano gana; sin bins no se asigna.
    const elegido = (await envio(u, { bins: 5, destinoNombre: 'Otra', tipoBinId: ava.id })).body;
    expect(elegido.tipo_bin_id).toBe(ava.id);
    expect((await envio(u, { bins: 0, destinoCuit: CUIT_FABRICA })).body.tipo_bin_id).toBeNull();

    await tipo(u, { descripcion: 'Bins de madera' }); // la misma fábrica con dos tipos
    expect((await envio(u, { bins: 8, destinoCuit: CUIT_FABRICA })).body.tipo_bin_id).toBeNull();
  });

  test('el remito describe los bins de la fábrica', async () => {
    const u = await registrar();
    const ava = (await tipo(u)).body;
    const e = (await envio(u, { bins: 30, destinoCuit: CUIT_FABRICA })).body;
    await request(app)
      .patch(`/api/envios/${e.id}/dtv`)
      .set(u.auth)
      .send({ numero: 'DTV-1', vencimiento: enDias(3) });
    await request(app)
      .post('/api/remitos/talonario')
      .set(u.auth)
      .send({
        puntoVenta: 2,
        numeroDesde: 1,
        numeroHasta: 500,
        cai: '12345678901234',
        caiVencimiento: enDias(300),
        emisorRazonSocial: 'Finca de prueba',
        emisorCuit: '20-12345678-6',
        emisorDomicilio: 'Tunuyán, Mendoza',
        emisorCondicionIva: 'monotributo'
      });
    const remito = await request(app).post('/api/remitos').set(u.auth).send({ envioId: e.id });
    expect(remito.status).toBe(201);
    expect(remito.body.datos.detalle).toMatchObject({
      bins: 30,
      binsDescripcion: 'Bins plásticos Wenco marca Ava, en comodato de Conservera Ava'
    });
    expect(ava.id).toBeTruthy();
  });

  test('validaciones y baja', async () => {
    const u = await registrar();
    const otro = await registrar();
    const ava = (await tipo(u)).body;
    const ajeno = (await tipo(otro)).body;
    expect((await tipo(u, { fabricaNombre: '' })).status).toBe(400);
    expect((await tipo(u, { fabricaCuit: '123' })).status).toBe(400);
    expect((await mover(u, { tipoBinId: ava.id, tipo: 'regalo', cantidad: 1 })).status).toBe(400);
    expect((await mover(u, { tipoBinId: ava.id, tipo: 'entrega', cantidad: 2.5 })).status).toBe(400);
    expect((await mover(u, { tipoBinId: ava.id, tipo: 'entrega', cantidad: 1, fecha: enDias(2) })).status).toBe(400);
    expect((await mover(u, { tipoBinId: ava.id, tipo: 'ajuste', binsContados: 0 })).status).toBe(400); // ya es 0
    expect((await mover(u, { tipoBinId: ajeno.id, tipo: 'entrega', cantidad: 1 })).status).toBe(404);
    expect((await envio(u, { bins: 3, tipoBinId: ajeno.id })).status).toBe(404);

    await mover(u, { tipoBinId: ava.id, tipo: 'entrega', cantidad: 10 });
    expect((await request(app).delete(`/api/bins/tipos/${ava.id}`).set(u.auth)).status).toBe(409);
    expect(
      (await request(app).patch(`/api/bins/tipos/${ava.id}`).set(u.auth).send({ activo: false })).body.activo
    ).toBe(false);
    const sinUso = (await tipo(u, { descripcion: 'Otros' })).body;
    expect((await request(app).delete(`/api/bins/tipos/${sinUso.id}`).set(u.auth)).status).toBe(200);
    expect((await request(app).get('/api/bins').set(otro.auth)).body.map(t => t.id)).toEqual([ajeno.id]);
    const datos = (await request(app).get('/api/cuenta/exportar').set(u.auth)).body;
    expect(datos.binsEnComodato[0].movimientos).toHaveLength(1);
  });
});
