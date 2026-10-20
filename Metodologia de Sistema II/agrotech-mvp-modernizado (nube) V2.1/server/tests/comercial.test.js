const { app, request, registrar, cerrarDb } = require('./helpers');
const { slugDe } = require('../src/routes/vitrina.routes');

afterAll(cerrarDb);

let contador = 0;
const vitrina = (extra = {}) => ({
  nombrePublico: 'Finca Prueba',
  slug: `finca-prueba-${Date.now()}-${++contador}`,
  descripcion: 'Duraznos de Valle de Uco',
  zona: 'Tunuyán',
  whatsapp: '2622000000',
  publicada: true,
  ...extra
});
const producto = (u, extra = {}) =>
  request(app)
    .post('/api/vitrina/productos')
    .set(u.auth)
    .send({
      nombre: 'Durazno en mitades JD',
      presentacion: 'Lata x 820 g',
      cantidadDisponible: 500,
      unidadVenta: 'cajas de 12',
      lote: 'L 17/FEB',
      fechaElaboracion: '2026-02-17',
      fechaVencimiento: '2029-02-17',
      loteId: u.loteId,
      ...extra
    });
const publico = ruta => request(app).get(`/api/vitrina-publica/${ruta}`);

describe('agenda de compradores', () => {
  test('alta, seguimiento y baja', async () => {
    const u = await registrar();
    const alta = await request(app).post('/api/compradores').set(u.auth).send({
      nombre: 'Distribuidora Andes',
      telefono: '2614000000',
      email: 'compras@andes.test',
      interes: 'Durazno 820 g'
    });
    expect(alta.status).toBe(201);
    expect(alta.body).toMatchObject({ estado: 'a_contactar', origen: 'manual' });

    const cotizado = await request(app)
      .patch(`/api/compradores/${alta.body.id}`)
      .set(u.auth)
      .send({ estado: 'cotizado', precioCotizado: 2500, ultimoContacto: '2026-10-20', notas: 'Pidió 200 cajas' });
    expect(cotizado.body).toMatchObject({ estado: 'cotizado', precio_cotizado: '2500.00', notas: 'Pidió 200 cajas' });

    expect((await request(app).get('/api/compradores?estado=cotizado').set(u.auth)).body).toHaveLength(1);
    expect((await request(app).delete(`/api/compradores/${alta.body.id}`).set(u.auth)).status).toBe(200);
    expect((await request(app).get('/api/compradores').set(u.auth)).body).toEqual([]);
  });

  test('datos inválidos responden 400', async () => {
    const u = await registrar();
    const post = body => request(app).post('/api/compradores').set(u.auth).send(body);
    expect((await post({})).status).toBe(400);
    expect((await post({ nombre: 'X', email: 'no-es-email' })).status).toBe(400);
    expect((await post({ nombre: 'X', estado: 'inventado' })).status).toBe(400);
    expect((await post({ nombre: 'X', precioCotizado: -1 })).status).toBe(400);
    expect((await post({ nombre: 'X', productoId: 999999 })).status).toBe(404);
    expect((await request(app).get('/api/compradores?estado=otro').set(u.auth)).status).toBe(400);
  });
});

describe('vitrina pública con QR por lote', () => {
  test('el slug se arma solo, sin tildes ni espacios', () => {
    expect(slugDe('  Finca Los Álamos de Tunuyán ')).toBe('finca-los-alamos-de-tunuyan');
  });

  test('publicar la vitrina y un producto: se ve por su dirección y por el código del QR', async () => {
    const u = await registrar();
    expect((await request(app).get('/api/vitrina').set(u.auth)).body).toBeNull();
    const datos = vitrina();
    const v = await request(app).put('/api/vitrina').set(u.auth).send(datos);
    expect(v.status).toBe(200);
    expect(v.body.slug).toBe(datos.slug);
    const p = await producto(u);
    expect(p.status).toBe(201);
    expect(p.body.codigo).toMatch(/^[A-HJ-KM-NP-Z2-9]{8}$/);

    const pagina = await publico(datos.slug);
    expect(pagina.status).toBe(200);
    expect(pagina.body).toMatchObject({ nombre_publico: 'Finca Prueba', zona: 'Tunuyán' });
    expect(pagina.body.productos[0]).toMatchObject({
      nombre: 'Durazno en mitades JD',
      cuartel: 'Lote 1',
      lote: 'L 17/FEB'
    });

    const qr = await publico(`${datos.slug}/productos/${p.body.codigo.toLowerCase()}`);
    expect(qr.status).toBe(200);
    expect(qr.body.producto).toMatchObject({ presentacion: 'Lata x 820 g' });
  });

  test('no publica nada que el productor no haya publicado, ni datos internos', async () => {
    const u = await registrar();
    const datos = vitrina({ publicada: false });
    await request(app).put('/api/vitrina').set(u.auth).send(datos);
    const p = (await producto(u)).body;
    expect((await publico(datos.slug)).status).toBe(404);

    await request(app)
      .put('/api/vitrina')
      .set(u.auth)
      .send({ ...datos, publicada: true });
    await request(app).patch(`/api/vitrina/productos/${p.id}`).set(u.auth).send({ publicado: false });
    const pagina = (await publico(datos.slug)).body;
    expect(pagina.productos).toEqual([]);
    expect(pagina).not.toHaveProperty('productor_id');
    expect((await publico(`${datos.slug}/productos/${p.codigo}`)).status).toBe(404);
  });

  test('la consulta desde la vitrina entra en la agenda del productor', async () => {
    const u = await registrar();
    const datos = vitrina();
    await request(app).put('/api/vitrina').set(u.auth).send(datos);
    const p = (await producto(u)).body;
    const enviar = body => request(app).post(`/api/vitrina-publica/${datos.slug}/consultas`).send(body);

    expect((await enviar({ nombre: 'Ana', mensaje: 'Hola' })).status).toBe(400); // sin teléfono ni email
    expect((await enviar({ nombre: 'Ana', email: 'mal', mensaje: 'Hola' })).status).toBe(400);
    const robot = await enviar({ nombre: 'Bot', email: 'bot@x.test', mensaje: 'spam', web: 'http://spam' });
    expect(robot.status).toBe(201);

    const ok = await enviar({
      nombre: 'Ana Gómez',
      empresa: 'Almacén Natural',
      email: 'ana@almacen.test',
      mensaje: '¿Precio por 50 cajas?',
      codigo: p.codigo
    });
    expect(ok.status).toBe(201);
    const agenda = (await request(app).get('/api/compradores').set(u.auth)).body;
    expect(agenda).toHaveLength(1); // el robot no entró
    expect(agenda[0]).toMatchObject({
      nombre: 'Ana Gómez',
      origen: 'vitrina',
      estado: 'a_contactar',
      producto_id: p.id,
      interes: 'Durazno en mitades JD',
      notas: '¿Precio por 50 cajas?'
    });
  });

  test('validaciones de la vitrina y de los productos', async () => {
    const a = await registrar();
    const b = await registrar();
    const datos = vitrina();
    await request(app).put('/api/vitrina').set(a.auth).send(datos);
    expect((await request(app).put('/api/vitrina').set(b.auth).send(datos)).status).toBe(409); // dirección ocupada
    expect(
      (
        await request(app)
          .put('/api/vitrina')
          .set(b.auth)
          .send(vitrina({ nombrePublico: '' }))
      ).status
    ).toBe(400);
    expect(
      (
        await request(app)
          .put('/api/vitrina')
          .set(b.auth)
          .send(vitrina({ slug: '¡¡' }))
      ).status
    ).toBe(400);
    expect(
      (
        await request(app)
          .put('/api/vitrina')
          .set(b.auth)
          .send(vitrina({ email: 'x' }))
      ).status
    ).toBe(400);

    expect((await producto(a, { nombre: '' })).status).toBe(400);
    expect((await producto(a, { cantidadDisponible: -1 })).status).toBe(400);
    expect((await producto(a, { precio: 0 })).status).toBe(400);
    expect((await producto(a, { fechaVencimiento: '2020-01-01' })).status).toBe(400);
    expect((await producto(a, { loteId: b.loteId })).status).toBe(404);
  });
});

describe('compradores y vitrina: cada productor ve solo lo suyo', () => {
  test('no se puede editar ni borrar lo de otro', async () => {
    const a = await registrar();
    const b = await registrar();
    const c = (await request(app).post('/api/compradores').set(a.auth).send({ nombre: 'Cliente de A' })).body;
    await request(app).put('/api/vitrina').set(a.auth).send(vitrina());
    const p = (await producto(a)).body;

    expect((await request(app).patch(`/api/compradores/${c.id}`).set(b.auth).send({ estado: 'cerrado' })).status).toBe(
      404
    );
    expect((await request(app).delete(`/api/compradores/${c.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).patch(`/api/vitrina/productos/${p.id}`).set(b.auth).send({ nombre: 'X' })).status).toBe(
      404
    );
    expect((await request(app).delete(`/api/vitrina/productos/${p.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).get('/api/compradores').set(b.auth)).body).toEqual([]);
    expect((await request(app).get('/api/vitrina/productos').set(b.auth)).body).toEqual([]);
  });

  test('las rutas privadas piden token; la vitrina pública no', async () => {
    expect((await request(app).get('/api/compradores')).status).toBe(401);
    expect((await request(app).get('/api/vitrina')).status).toBe(401);
    expect((await publico('no-existe-esta-vitrina')).status).toBe(404);
  });
});
