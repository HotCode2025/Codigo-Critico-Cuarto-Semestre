// N8N simulado: el aviso de vencimiento se prueba sin mandar mensajes reales.
const mockNotificar = jest.fn(async () => ({ success: true }));
jest.mock('../src/services/n8n', () => ({
  notificarN8N: (...args) => mockNotificar(...args),
  notificarSistemaN8N: jest.fn(async () => ({ success: false }))
}));

const { app, request, registrar, cerrarDb } = require('./helpers');
const db = require('../src/db');
const { revisarCertificaciones, umbral } = require('../src/jobs/certificaciones-scheduler');

afterAll(cerrarDb);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const enDias = n => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const aplicacion = (u, extra = {}) => ({
  loteIds: [u.loteId],
  fecha: enDias(-2),
  tipo: 'aplicacion',
  producto: 'Insecticida de prueba',
  principioActivo: 'Principio X',
  dosis: 150,
  unidadDosis: 'cc/hl',
  motivo: 'Grafolita',
  operador: 'Juan Pérez',
  carenciaDias: 14,
  reingresoHoras: 24,
  ...extra
});
const cargar = (u, body) => request(app).post('/api/cuaderno').set(u.auth).send(body);
const certificar = (u, body) => request(app).post('/api/certificaciones').set(u.auth).send(body);

describe('cuaderno de campo', () => {
  test('cargar una aplicación en varios cuarteles y verla filtrada', async () => {
    const u = await registrar();
    const fincas = (await request(app).get('/api/fincas').set(u.auth)).body;
    const otro = (await request(app).post('/api/lotes').set(u.auth).send({ nombre: 'Malbec', fincaId: fincas[0].id }))
      .body;
    const res = await cargar(u, aplicacion(u, { loteIds: [u.loteId, otro.id] }));
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ tipo: 'aplicacion', carencia_dias: 14, dosis: '150.000' });

    await cargar(u, { loteIds: [u.loteId], fecha: enDias(-1), tipo: 'riego', cantidad: 6, unidadCantidad: 'h' });
    expect((await request(app).get(`/api/cuaderno?loteId=${otro.id}`).set(u.auth)).body).toHaveLength(1);
    expect((await request(app).get('/api/cuaderno?tipo=riego').set(u.auth)).body).toHaveLength(1);
    expect(
      (
        await request(app)
          .get(`/api/cuaderno?desde=${enDias(-1)}`)
          .set(u.auth)
      ).body
    ).toHaveLength(1);
  });

  test('carencia vigente: el cuartel no se puede cosechar hasta la fecha', async () => {
    const u = await registrar();
    await cargar(u, aplicacion(u, { fecha: enDias(-20), carenciaDias: 7 })); // ya terminó
    await cargar(u, aplicacion(u, { fecha: enDias(-2), carenciaDias: 14 }));
    const carencias = (await request(app).get('/api/cuaderno/carencias').set(u.auth)).body;
    expect(carencias).toHaveLength(1);
    expect(carencias[0]).toMatchObject({ lote_id: u.loteId, cuartel: 'Lote 1', carencia_dias: 14 });
    expect(String(carencias[0].cosecha_desde).slice(0, 10) >= enDias(11)).toBe(true);
  });

  test('editar y borrar; datos inválidos responden 400', async () => {
    const u = await registrar();
    const [r] = (await cargar(u, aplicacion(u))).body;
    expect((await request(app).patch(`/api/cuaderno/${r.id}`).set(u.auth).send({ dosis: 200 })).body.dosis).toBe(
      '200.000'
    );
    expect((await request(app).patch(`/api/cuaderno/${r.id}`).set(u.auth).send({ producto: '' })).status).toBe(400);
    expect((await request(app).delete(`/api/cuaderno/${r.id}`).set(u.auth)).status).toBe(200);

    expect((await cargar(u, aplicacion(u, { producto: '' }))).status).toBe(400); // aplicación sin producto
    expect((await cargar(u, aplicacion(u, { fecha: enDias(5) }))).status).toBe(400); // fecha futura
    expect((await cargar(u, aplicacion(u, { tipo: 'otra' }))).status).toBe(400);
    expect((await cargar(u, aplicacion(u, { carenciaDias: -1 }))).status).toBe(400);
    expect((await cargar(u, aplicacion(u, { loteIds: [] }))).status).toBe(400);
  });
});

describe('certificaciones', () => {
  test('GlobalG.A.P. desde la plantilla: checklist, cumplimiento y evidencia del cuaderno', async () => {
    const u = await registrar();
    const plantillas = (await request(app).get('/api/certificaciones/plantillas').set(u.auth)).body;
    expect(plantillas.map(p => p.tipo)).toEqual(['bpa', 'globalgap', 'organica', 'comercio_justo', 'otra']);

    await cargar(u, aplicacion(u));
    await cargar(u, aplicacion(u, { fecha: enDias(-30) }));
    const res = await certificar(u, {
      tipo: 'globalgap',
      certificador: 'Certificadora de prueba',
      vencimiento: enDias(200)
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      nombre: 'GlobalG.A.P. (frutas y hortalizas)',
      estado: 'en_tramite',
      cumplimiento: 0
    });
    expect(res.body.requisitos.length).toBeGreaterThan(10);
    const conEvidencia = res.body.requisitos.find(r => r.evidencia === 'aplicacion');
    expect(conEvidencia.registros.registros).toBe(2);

    const id = res.body.id;
    const req0 = res.body.requisitos[0];
    await request(app)
      .patch(`/api/certificaciones/${id}/requisitos/${req0.id}`)
      .set(u.auth)
      .send({ cumplido: true, nota: 'Hecha en marzo' });
    const nuevo = await request(app)
      .post(`/api/certificaciones/${id}/requisitos`)
      .set(u.auth)
      .send({ texto: 'Requisito propio de la certificadora' });
    expect(nuevo.status).toBe(201);
    const lista = (await request(app).get('/api/certificaciones').set(u.auth)).body[0];
    expect(lista.requisitos.at(-1).texto).toBe('Requisito propio de la certificadora');
    expect(lista.cumplimiento).toBe(Math.round((1 / lista.requisitos.length) * 100));

    expect(
      (await request(app).delete(`/api/certificaciones/${id}/requisitos/${nuevo.body.id}`).set(u.auth)).status
    ).toBe(200);
    expect((await request(app).delete(`/api/certificaciones/${id}`).set(u.auth)).status).toBe(200);
    expect((await request(app).get('/api/certificaciones').set(u.auth)).body).toEqual([]);
  });

  test('validaciones', async () => {
    const u = await registrar();
    expect((await certificar(u, { tipo: 'iso9001' })).status).toBe(400);
    expect((await certificar(u, { tipo: 'bpa', documentoUrl: 'javascript:alert(1)' })).status).toBe(400);
    expect((await certificar(u, { tipo: 'bpa', fechaEmision: '2026-05-01', vencimiento: '2026-01-01' })).status).toBe(
      400
    );
    expect((await certificar(u, { tipo: 'bpa', estado: 'aprobada' })).status).toBe(400);
    const sinPlantilla = await certificar(u, { tipo: 'bpa', conPlantilla: false });
    expect(sinPlantilla.body).toMatchObject({ requisitos: [], cumplimiento: null });
  });

  test('aviso por N8N a 60 y a 30 días, sin repetirse, y vencida cuando pasa la fecha', async () => {
    expect([umbral(90), umbral(45), umbral(10), umbral(-1)]).toEqual([null, '60', '30', null]);
    const u = await registrar();
    const c = (await certificar(u, { tipo: 'bpa', estado: 'vigente', vencimiento: enDias(45) })).body;
    mockNotificar.mockClear();

    await revisarCertificaciones();
    const delProductor = () => mockNotificar.mock.calls.filter(([id]) => id === u.productor.id);
    expect(delProductor()).toHaveLength(1);
    expect(delProductor()[0][2]).toMatchObject({ que: 'vencimiento', dias: 45 });
    await revisarCertificaciones();
    expect(delProductor()).toHaveLength(1); // no se repite

    await request(app)
      .patch(`/api/certificaciones/${c.id}`)
      .set(u.auth)
      .send({ vencimiento: enDias(20) });
    await revisarCertificaciones();
    expect(delProductor()).toHaveLength(2); // la fecha cambió: vuelve a avisar, ahora a 30 días

    await db.query('UPDATE certificaciones SET vencimiento = $1 WHERE id = $2', [enDias(-1), c.id]);
    await revisarCertificaciones();
    expect((await request(app).get('/api/certificaciones').set(u.auth)).body[0].estado).toBe('vencida');
  });

  test('si N8N no está configurado, el aviso no se da por enviado', async () => {
    const u = await registrar();
    await certificar(u, { tipo: 'bpa', estado: 'vigente', vencimiento: enDias(40) });
    mockNotificar.mockImplementation(async () => ({ success: false }));
    await revisarCertificaciones();
    const { rows } = await db.query('SELECT aviso_vencimiento FROM certificaciones WHERE productor_id = $1', [
      u.productor.id
    ]);
    expect(rows[0].aviso_vencimiento).toBeNull();
    mockNotificar.mockImplementation(async () => ({ success: true }));
  });

  test('la vitrina muestra solo las certificaciones vigentes que el productor eligió', async () => {
    const u = await registrar();
    const slug = `vitrina-cert-${Date.now()}`;
    await request(app).put('/api/vitrina').set(u.auth).send({ nombrePublico: 'Finca', slug, publicada: true });
    await certificar(u, {
      tipo: 'globalgap',
      estado: 'vigente',
      publica: true,
      numero: 'GGN-123',
      vencimiento: enDias(100)
    });
    await certificar(u, { tipo: 'bpa', estado: 'vigente', publica: false });
    await certificar(u, { tipo: 'organica', estado: 'en_tramite', publica: true });
    const pagina = (await request(app).get(`/api/vitrina-publica/${slug}`)).body;
    expect(pagina.certificaciones).toEqual([expect.objectContaining({ tipo: 'globalgap', numero: 'GGN-123' })]);
    expect(pagina.certificaciones[0]).not.toHaveProperty('notas');
  });

  test('cada productor ve solo lo suyo', async () => {
    const a = await registrar();
    const b = await registrar();
    const c = (await certificar(a, { tipo: 'bpa' })).body;
    const [registro] = (await cargar(a, aplicacion(a))).body;
    expect(
      (await request(app).patch(`/api/certificaciones/${c.id}`).set(b.auth).send({ estado: 'vigente' })).status
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/certificaciones/${c.id}/requisitos/${c.requisitos[0].id}`)
          .set(b.auth)
          .send({ cumplido: true })
      ).status
    ).toBe(404);
    expect(
      (await request(app).post(`/api/certificaciones/${c.id}/requisitos`).set(b.auth).send({ texto: 'x' })).status
    ).toBe(404);
    expect((await request(app).delete(`/api/cuaderno/${registro.id}`).set(b.auth)).status).toBe(404);
    expect((await cargar(b, aplicacion(b, { loteIds: [a.loteId] }))).status).toBe(404);
    expect((await request(app).get('/api/cuaderno').set(b.auth)).body).toEqual([]);
    expect((await request(app).get('/api/certificaciones')).status).toBe(401);
  });
});
