// La IA se reemplaza por un doble: los tests no llaman a Claude ni gastan créditos.
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {}
  class RateLimitError extends APIError {}
  function Anthropic() {
    return { messages: { create: mockCreate } };
  }
  Anthropic.APIError = APIError;
  Anthropic.RateLimitError = RateLimitError;
  return Anthropic;
});

const { app, request, registrar, cerrarDb } = require('./helpers');
const { normalizar } = require('../src/services/cotizaciones');

afterAll(cerrarDb);

const respuestaIA = json => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(json) }] });
const cotizacion = {
  proveedor: 'Distribuidora Cuyo S.A.',
  fecha: '2026-10-15',
  items: [
    {
      descripcion: 'Azúcar común tipo A',
      presentacion: 'Bolsa 50 kg',
      cantidad: 50,
      unidad: 'kg',
      precio: 55000,
      iva_incluido: false
    },
    {
      descripcion: 'Tapa 102 mm',
      presentacion: 'Caja x 1000',
      cantidad: 1000,
      unidad: 'un',
      precio: 120000,
      iva_incluido: null
    },
    { descripcion: 'Sin precio', presentacion: '', cantidad: 1, unidad: 'kg', precio: 0, iva_incluido: null }
  ]
};
const extraer = (u, body) => request(app).post('/api/insumos/extraer-cotizacion').set(u.auth).send(body);

describe('lectura de cotizaciones con IA', () => {
  beforeEach(() => mockCreate.mockReset());

  test('convierte cada presentación a precio por kg o por unidad y descarta lo que no tiene precio', () => {
    const r = normalizar(cotizacion);
    expect(r.proveedor).toBe('Distribuidora Cuyo S.A.');
    expect(r.fecha).toBe('2026-10-15');
    expect(r.items).toEqual([
      expect.objectContaining({
        descripcion: 'Azúcar común tipo A',
        unidad: 'kg',
        precio: 1100,
        precioPresentacion: 55000,
        ivaIncluido: false
      }),
      expect.objectContaining({ descripcion: 'Tapa 102 mm', unidad: 'un', precio: 120, ivaIncluido: null })
    ]);
    expect(normalizar({ proveedor: '', fecha: '15/10/2026', items: [] }).fecha).toBeNull();
  });

  test('foto: manda la imagen con salida estructurada y devuelve los precios', async () => {
    const u = await registrar();
    mockCreate.mockResolvedValue(respuestaIA(cotizacion));
    const res = await extraer(u, { archivoBase64: 'aGVsbG8=', mediaType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    const pedido = mockCreate.mock.calls[0][0];
    expect(pedido.output_config.format.type).toBe('json_schema');
    expect(pedido.messages[0].content[0]).toMatchObject({ type: 'image', source: { media_type: 'image/jpeg' } });
  });

  test('PDF: va como documento', async () => {
    const u = await registrar();
    mockCreate.mockResolvedValue(respuestaIA(cotizacion));
    await extraer(u, { archivoBase64: 'JVBERi0=', mediaType: 'application/pdf' });
    expect(mockCreate.mock.calls[0][0].messages[0].content[0]).toMatchObject({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf' }
    });
  });

  test('errores: formato no soportado, sin precios, rechazo de la IA y falla de la API', async () => {
    const Anthropic = require('@anthropic-ai/sdk');
    const u = await registrar();
    expect((await extraer(u, {})).status).toBe(400);
    expect((await extraer(u, { archivoBase64: 'x', mediaType: 'text/plain' })).status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();

    mockCreate.mockResolvedValueOnce(respuestaIA({ proveedor: '', fecha: '', items: [] }));
    expect((await extraer(u, { archivoBase64: 'x', mediaType: 'image/png' })).status).toBe(422);
    mockCreate.mockResolvedValueOnce({ stop_reason: 'refusal', content: [] });
    expect((await extraer(u, { archivoBase64: 'x', mediaType: 'image/png' })).status).toBe(422);
    mockCreate.mockRejectedValueOnce(new Anthropic.RateLimitError('lento'));
    expect((await extraer(u, { archivoBase64: 'x', mediaType: 'image/png' })).status).toBe(429);
    mockCreate.mockRejectedValueOnce(new Anthropic.APIError('caída'));
    expect((await extraer(u, { archivoBase64: 'x', mediaType: 'image/png' })).status).toBe(502);
  });
});

describe('lista de precios de insumos', () => {
  test('guardar varios a la vez, listarlos del más nuevo al más viejo y borrar', async () => {
    const u = await registrar();
    const res = await request(app)
      .post('/api/insumos/precios')
      .set(u.auth)
      .send({
        precios: [
          { nombre: 'Azúcar', unidad: 'kg', precio: 1000, proveedor: 'Viejo', fecha: '2026-09-01' },
          {
            nombre: 'Azúcar',
            unidad: 'kg',
            precio: 1100,
            presentacion: 'Bolsa 50 kg',
            precioPresentacion: 55000,
            proveedor: 'Distribuidora Cuyo S.A.',
            fecha: '2026-10-15',
            origen: 'ia',
            ivaIncluido: false
          },
          { nombre: 'Tapa 102 mm', unidad: 'un', precio: 120 }
        ]
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(3);

    const lista = (await request(app).get('/api/insumos/precios').set(u.auth)).body;
    expect(lista.map(p => p.proveedor)).toEqual([null, 'Distribuidora Cuyo S.A.', 'Viejo']); // la tapa es de hoy
    expect(lista[1]).toMatchObject({ precio: '1100.0000', origen: 'ia', iva_incluido: false });

    expect((await request(app).delete(`/api/insumos/precios/${lista[2].id}`).set(u.auth)).status).toBe(200);
    expect((await request(app).get('/api/insumos/precios').set(u.auth)).body).toHaveLength(2);
  });

  test('datos inválidos responden 400 y no guardan nada', async () => {
    const u = await registrar();
    const post = body => request(app).post('/api/insumos/precios').set(u.auth).send(body);
    expect((await post({ nombre: '', unidad: 'kg', precio: 1 })).status).toBe(400);
    expect((await post({ nombre: 'X', unidad: 'tonelada', precio: 1 })).status).toBe(400);
    expect((await post({ nombre: 'X', unidad: 'kg', precio: 0 })).status).toBe(400);
    expect((await post({ nombre: 'X', unidad: 'kg', precio: 1, fecha: '2099-01-01' })).status).toBe(400);
    expect(
      (
        await post({
          precios: [
            { nombre: 'Bien', unidad: 'kg', precio: 1 },
            { nombre: 'Mal', unidad: 'kg', precio: -1 }
          ]
        })
      ).status
    ).toBe(400);
    expect(
      (await post({ precios: Array.from({ length: 101 }, () => ({ nombre: 'X', unidad: 'kg', precio: 1 })) })).status
    ).toBe(400);
    expect((await request(app).get('/api/insumos/precios').set(u.auth)).body).toEqual([]);
  });

  test('cada productor ve solo sus precios', async () => {
    const a = await registrar();
    const b = await registrar();
    const [precio] = (
      await request(app).post('/api/insumos/precios').set(a.auth).send({ nombre: 'Azúcar', unidad: 'kg', precio: 1100 })
    ).body;
    expect((await request(app).get('/api/insumos/precios').set(b.auth)).body).toEqual([]);
    expect((await request(app).delete(`/api/insumos/precios/${precio.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).get('/api/insumos/precios')).status).toBe(401);
  });
});
