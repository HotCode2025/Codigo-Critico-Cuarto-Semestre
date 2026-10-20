// N8N simulado: los avisos de la maquinaria se prueban sin mandar mensajes reales.
const mockNotificar = jest.fn(async () => ({ success: true }));
jest.mock('../src/services/n8n', () => ({
  notificarN8N: (...args) => mockNotificar(...args),
  notificarSistemaN8N: jest.fn(async () => ({ success: false }))
}));

const { app, request, registrar, cerrarDb } = require('./helpers');
const { revisarBienes } = require('../src/jobs/bienes-scheduler');

afterAll(cerrarDb);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const enDias = n => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const hace = meses => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - meses);
  return d.toISOString().slice(0, 10);
};
const crear = (u, body) => request(app).post('/api/bienes').set(u.auth).send(body);
const tractor = { nombre: 'Tractor Deutz A-55', tipo: 'tractor', marca: 'Deutz', modelo: 'A-55', anio: 1985 };

describe('maquinaria y bienes de uso', () => {
  test('alta de tractor y de herramientas con cantidad; próximo service por fecha', async () => {
    const u = await registrar();
    const fincas = (await request(app).get('/api/fincas').set(u.auth)).body;
    const res = await crear(u, { ...tractor, fincaId: fincas[0].id, serviceCadaMeses: 6, ultimoService: '2026-03-15' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      nombre: 'Tractor Deutz A-55',
      finca: fincas[0].nombre,
      cantidad: 1,
      estado: 'bueno'
    });
    expect(String(res.body.proximo_service).slice(0, 10)).toBe('2026-09-15');

    const escaleras = (await crear(u, { nombre: 'Escaleras de cosecha', tipo: 'herramienta', cantidad: 20 })).body;
    expect(escaleras).toMatchObject({ cantidad: 20, proximo_service: null });
    const lista = (await request(app).get('/api/bienes').set(u.auth)).body;
    expect(lista.map(b => b.nombre).sort()).toEqual(['Escaleras de cosecha', 'Tractor Deutz A-55']);

    const baja = await request(app)
      .patch(`/api/bienes/${escaleras.id}`)
      .set(u.auth)
      .send({ estado: 'baja', cantidad: 18 });
    expect(baja.body).toMatchObject({ estado: 'baja', cantidad: 18 });
    expect((await request(app).get('/api/bienes').set(u.auth)).body.at(-1).nombre).toBe('Escaleras de cosecha'); // de baja al final
  });

  test('validaciones', async () => {
    const u = await registrar();
    const otro = await registrar();
    const fincaAjena = (await request(app).get('/api/fincas').set(otro.auth)).body[0];
    expect((await crear(u, { tipo: 'tractor' })).status).toBe(400);
    expect((await crear(u, { nombre: 'X', tipo: 'avion' })).status).toBe(400);
    expect((await crear(u, { nombre: 'X', anio: 1800 })).status).toBe(400);
    expect((await crear(u, { nombre: 'X', cantidad: 0 })).status).toBe(400);
    expect((await crear(u, { nombre: 'X', serviceCadaMeses: 100 })).status).toBe(400);
    expect((await crear(u, { nombre: 'X', ultimoService: enDias(10) })).status).toBe(400);
    expect((await crear(u, { nombre: 'X', seguroVence: 'mañana' })).status).toBe(400);
    expect((await crear(u, { nombre: 'X', fincaId: fincaAjena.id })).status).toBe(404);
  });

  test('service con costo repartido en Gastos; borrarlo vuelve al anterior y borra su gasto', async () => {
    const u = await registrar();
    const t = (await crear(u, { ...tractor, serviceCadaMeses: 6, ultimoService: hace(8) })).body;
    const service = (desc, fecha, extra = {}) =>
      request(app)
        .post(`/api/bienes/${t.id}/services`)
        .set(u.auth)
        .send({ descripcion: desc, fecha, ...extra });

    const r = await service('Cambio de aceite y filtros', enDias(-2), {
      taller: 'Taller Tunuyán',
      costo: 180000,
      gasto: { modo: 'repartir' }
    });
    expect(r.status).toBe(201);
    expect(r.body.gastos).toHaveLength(1);
    expect(String(r.body.bien.ultimo_service).slice(0, 10)).toBe(enDias(-2));
    const gastos = (await request(app).get('/api/gastos').set(u.auth)).body;
    expect(gastos[0]).toMatchObject({ concepto: 'Service Tractor Deutz A-55', monto: '180000.00' });

    // Uno más viejo no cambia el último service.
    await service('Cambio de cubierta', hace(3));
    let bien = (await request(app).get('/api/bienes').set(u.auth)).body[0];
    expect(String(bien.ultimo_service).slice(0, 10)).toBe(enDias(-2));
    expect(bien.gasto_services).toBe('180000.00');

    const historial = (await request(app).get(`/api/bienes/${t.id}/services`).set(u.auth)).body;
    expect(historial.map(s => s.descripcion)).toEqual(['Cambio de aceite y filtros', 'Cambio de cubierta']);
    expect(historial[0].gastos).toBe(1);
    await request(app).delete(`/api/bienes/${t.id}/services/${historial[0].id}`).set(u.auth);
    bien = (await request(app).get('/api/bienes').set(u.auth)).body[0];
    expect(String(bien.ultimo_service).slice(0, 10)).toBe(hace(3));
    expect((await request(app).get('/api/gastos').set(u.auth)).body).toEqual([]);

    expect((await service('', enDias(-1))).status).toBe(400);
    expect((await service('X', enDias(3))).status).toBe(400);
    expect((await service('X', enDias(-1), { gasto: { modo: 'repartir' } })).status).toBe(400); // sin costo
    expect((await service('X', enDias(-1), { costo: 10, gasto: { modo: 'existente', gastoId: 1 } })).status).toBe(400);
  });

  test('repuestos del stock unidos al bien', async () => {
    const u = await registrar();
    const t = (await crear(u, tractor)).body;
    const filtro = (
      await request(app)
        .post('/api/stock/insumos')
        .set(u.auth)
        .send({ nombre: 'Filtro de aire', categoria: 'repuesto', unidad: 'un', bienId: t.id })
    ).body;
    expect(filtro).toMatchObject({ bien_id: t.id, maquina: 'Tractor Deutz A-55' });
    await request(app)
      .post('/api/stock/movimientos')
      .set(u.auth)
      .send({ insumoId: filtro.id, tipo: 'compra', cantidad: 2, precioTotal: 50000 });
    expect((await request(app).get('/api/bienes').set(u.auth)).body[0].gasto_repuestos).toBe('50000.00');
    const maquinas = (await request(app).get('/api/stock/maquinas').set(u.auth)).body;
    expect(maquinas[0]).toMatchObject({ maquina: 'Tractor Deutz A-55', bien_id: t.id, importe: '50000.00' });

    const otro = await registrar();
    const ajeno = (await crear(otro, tractor)).body;
    expect(
      (
        await request(app)
          .post('/api/stock/insumos')
          .set(u.auth)
          .send({ nombre: 'Correa', unidad: 'un', bienId: ajeno.id })
      ).status
    ).toBe(404);
    // Borrar el bien deja el repuesto en el stock, sin bien.
    await request(app).delete(`/api/bienes/${t.id}`).set(u.auth);
    const stock = (await request(app).get('/api/stock').set(u.auth)).body;
    expect(stock[0]).toMatchObject({ nombre: 'Filtro de aire', bien_id: null });
  });

  test('avisos por N8N: service, seguro y patente, una vez por fecha', async () => {
    const u = await registrar();
    const t = (
      await crear(u, {
        ...tractor,
        serviceCadaMeses: 6,
        ultimoService: hace(6),
        seguroVence: enDias(20),
        patenteVence: enDias(90)
      })
    ).body;
    await crear(u, { nombre: 'Vieja', seguroVence: enDias(5), estado: 'baja' }); // de baja: no avisa
    mockNotificar.mockClear();
    await revisarBienes();
    const avisos = () =>
      mockNotificar.mock.calls.filter(([id, evento]) => id === u.productor.id && evento === 'aviso_maquinaria');
    expect(
      avisos()
        .map(c => c[2].que)
        .sort()
    ).toEqual(['seguro', 'service']);
    expect(avisos().find(c => c[2].que === 'seguro')[2]).toMatchObject({ bien: 'Tractor Deutz A-55', dias: 20 });
    await revisarBienes();
    expect(avisos()).toHaveLength(2); // no se repite

    // Registrar el service mueve la fecha: el próximo es en 6 meses y no avisa todavía.
    await request(app)
      .post(`/api/bienes/${t.id}/services`)
      .set(u.auth)
      .send({ descripcion: 'Service completo', fecha: hoy() });
    // Renovar el seguro con una fecha cercana vuelve a avisar.
    await request(app)
      .patch(`/api/bienes/${t.id}`)
      .set(u.auth)
      .send({ seguroVence: enDias(10) });
    await revisarBienes();
    expect(avisos().map(c => c[2].que)).toEqual(expect.arrayContaining(['seguro', 'service', 'seguro']));
    expect(avisos()).toHaveLength(3);
  });

  test('cada productor ve solo lo suyo y sale en mis datos', async () => {
    const a = await registrar();
    const b = await registrar();
    const t = (await crear(a, tractor)).body;
    await request(app).post(`/api/bienes/${t.id}/services`).set(a.auth).send({ descripcion: 'Engrase' });
    expect((await request(app).get('/api/bienes').set(b.auth)).body).toEqual([]);
    expect((await request(app).patch(`/api/bienes/${t.id}`).set(b.auth).send({ nombre: 'X' })).status).toBe(404);
    expect((await request(app).get(`/api/bienes/${t.id}/services`).set(b.auth)).status).toBe(404);
    expect(
      (await request(app).post(`/api/bienes/${t.id}/services`).set(b.auth).send({ descripcion: 'X' })).status
    ).toBe(404);
    expect((await request(app).delete(`/api/bienes/${t.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).get('/api/bienes')).status).toBe(401);
    const datos = (await request(app).get('/api/cuenta/exportar').set(a.auth)).body;
    expect(datos.maquinaria[0].services).toHaveLength(1);
  });
});
