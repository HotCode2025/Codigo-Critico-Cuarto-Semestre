const { app, request, registrar, cerrarDb } = require('./helpers');
const { normalizarCuit, normalizarPatente } = require('../src/services/validar');

afterAll(cerrarDb);

const datosEnvio = (u, extra = {}) => ({
  loteId: u.loteId,
  fecha: '2026-12-15',
  producto: 'Durazno para industria',
  kg: 12000,
  bins: 30,
  destinoNombre: 'Conservera del Valle S.A.',
  destinoCuit: '30-71234567-1',
  transportistaNombre: 'Transportes Atuel',
  chofer: 'Juan Pérez',
  patenteCamion: 'ab 123 cd',
  patenteAcoplado: 'abc-123',
  ...extra
});
const cargar = (u, extra) => request(app).post('/api/envios').set(u.auth).send(datosEnvio(u, extra));
const accion = (u, id, ruta, body = {}) => request(app).patch(`/api/envios/${id}/${ruta}`).set(u.auth).send(body);

describe('validaciones de CUIT y patente', () => {
  test('CUIT: acepta guiones y revisa el dígito verificador', () => {
    expect(normalizarCuit('20-12345678-6')).toBe('20123456786');
    expect(normalizarCuit('30712345671')).toBe('30712345671');
    expect(normalizarCuit('20-12345678-5')).toBeNull();
    expect(normalizarCuit('2012345678')).toBeNull();
    expect(normalizarCuit('abc')).toBeNull();
  });

  test('patente: formato viejo y Mercosur, en mayúsculas y sin separadores', () => {
    expect(normalizarPatente('abc 123')).toBe('ABC123');
    expect(normalizarPatente('AB-123-CD')).toBe('AB123CD');
    expect(normalizarPatente('A123BCD')).toBeNull();
    expect(normalizarPatente('ABCD12')).toBeNull();
  });
});

describe('envíos: el recorrido completo', () => {
  test('cargar → registrar DTV-e → entregar con los kg de balanza', async () => {
    const u = await registrar();
    const alta = await cargar(u);
    expect(alta.status).toBe(201);
    expect(alta.body).toMatchObject({
      estado: 'cargado',
      kg: '12000.00',
      bins: 30,
      destino_cuit: '30712345671',
      patente_camion: 'AB123CD',
      patente_acoplado: 'ABC123'
    });
    const id = alta.body.id;

    const dtv = await accion(u, id, 'dtv', { numero: ' 123456789 ', vencimiento: '2026-12-16' });
    expect(dtv.status).toBe(200);
    expect(dtv.body).toMatchObject({ estado: 'dtv_registrado', dtv_numero: '123456789' });

    const llegada = await accion(u, id, 'entregar', { kgBalanza: 11850 });
    expect(llegada.status).toBe(200);
    expect(llegada.body).toMatchObject({ estado: 'entregado', kg_balanza: '11850.00' });
    expect(llegada.body.entregado_en).toBeTruthy();

    const lista = await request(app).get('/api/envios?estado=entregado').set(u.auth);
    expect(lista.body.map(e => e.id)).toEqual([id]);
  });

  test('queda en el historial y en la descarga de mis datos', async () => {
    const u = await registrar();
    await cargar(u);
    const historial = (await request(app).get('/api/historial').set(u.auth)).body;
    expect(historial.some(e => e.tipo === 'envio_cargado')).toBe(true);
    const datos = (await request(app).get('/api/cuenta/exportar').set(u.auth)).body;
    expect(datos.envios).toHaveLength(1);
  });
});

describe('envíos: reglas', () => {
  test('sin DTV-e no se puede entregar', async () => {
    const u = await registrar();
    const { body } = await cargar(u);
    const res = await accion(u, body.id, 'entregar', { kgBalanza: 11000 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/DTV-e/);
  });

  test('solo se edita mientras está cargado', async () => {
    const u = await registrar();
    const { body } = await cargar(u);
    const edicion = await request(app).patch(`/api/envios/${body.id}`).set(u.auth).send({ kg: 9000, chofer: '' });
    expect(edicion.status).toBe(200);
    expect(edicion.body).toMatchObject({ kg: '9000.00', chofer: null });

    await accion(u, body.id, 'dtv', { numero: 'A1', vencimiento: '2026-12-16' });
    expect((await request(app).patch(`/api/envios/${body.id}`).set(u.auth).send({ kg: 1 })).status).toBe(409);
  });

  test('anular deja el registro y no se puede anular dos veces ni un entregado', async () => {
    const u = await registrar();
    const a = (await cargar(u)).body;
    const anulado = await accion(u, a.id, 'anular', { motivo: 'Se rompió el camión' });
    expect(anulado.status).toBe(200);
    expect(anulado.body).toMatchObject({ estado: 'anulado', anulado_motivo: 'Se rompió el camión' });
    expect((await accion(u, a.id, 'anular')).status).toBe(409);
    expect((await accion(u, a.id, 'dtv', { numero: 'X', vencimiento: '2026-12-16' })).status).toBe(409);

    const b = (await cargar(u)).body;
    await accion(u, b.id, 'dtv', { numero: 'B2', vencimiento: '2026-12-16' });
    await accion(u, b.id, 'entregar', { kgBalanza: 12000 });
    expect((await accion(u, b.id, 'anular')).status).toBe(409);
  });

  test('datos inválidos responden 400', async () => {
    const u = await registrar();
    expect((await cargar(u, { kg: 0 })).status).toBe(400);
    expect((await cargar(u, { bins: 2.5 })).status).toBe(400);
    expect((await cargar(u, { fecha: '15/12/2026' })).status).toBe(400);
    expect((await cargar(u, { destinoNombre: '' })).status).toBe(400);
    expect((await cargar(u, { destinoCuit: '30-71234567-9' })).status).toBe(400);
    expect((await cargar(u, { patenteCamion: 'XYZ' })).status).toBe(400);
    expect((await cargar(u, { observaciones: 'x'.repeat(501) })).status).toBe(400);
    expect((await request(app).post('/api/envios').set(u.auth).send({ loteId: u.loteId })).status).toBe(400);
    expect((await request(app).get('/api/envios?estado=perdido').set(u.auth)).status).toBe(400);

    const { body } = await cargar(u);
    expect((await accion(u, body.id, 'dtv', { numero: 'A1' })).status).toBe(400);
    expect((await accion(u, body.id, 'entregar', { kgBalanza: -5 })).status).toBe(400);
  });
});

describe('envíos: cada productor ve solo los suyos', () => {
  test('no se puede ver, editar ni cargar contra el cuartel de otro', async () => {
    const a = await registrar();
    const b = await registrar();
    const { body } = await cargar(a);

    expect((await request(app).get(`/api/envios/${body.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/envios/${body.id}`).set(b.auth).send({ kg: 1 })).status).toBe(404);
    expect((await accion(b, body.id, 'dtv', { numero: 'X', vencimiento: '2026-12-16' })).status).toBe(404);
    expect((await accion(b, body.id, 'anular')).status).toBe(404);
    expect((await request(app).get('/api/envios').set(b.auth)).body).toEqual([]);
    expect((await cargar(b, { loteId: a.loteId })).status).toBe(404);
    expect((await request(app).get('/api/envios/abc').set(a.auth)).status).toBe(404);
  });

  test('sin token responde 401', async () => {
    expect((await request(app).get('/api/envios')).status).toBe(401);
  });
});
