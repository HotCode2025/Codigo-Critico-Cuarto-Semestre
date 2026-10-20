// N8N simulado: el aviso de stock bajo se prueba sin mandar mensajes reales.
const mockNotificar = jest.fn(async () => ({ success: true }));
jest.mock('../src/services/n8n', () => ({
  notificarN8N: (...args) => mockNotificar(...args),
  notificarSistemaN8N: jest.fn(async () => ({ success: false }))
}));

const { app, request, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const enDias = n => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const insumo = async (u, extra = {}) =>
  (
    await request(app)
      .post('/api/stock/insumos')
      .set(u.auth)
      .send({ nombre: 'Insecticida X', categoria: 'fitosanitario', unidad: 'l', stockMinimo: 5, ...extra })
  ).body;
const mover = (u, body) => request(app).post('/api/stock/movimientos').set(u.auth).send(body);
const stockDe = async (u, id) => (await request(app).get('/api/stock').set(u.auth)).body.find(i => i.id === id);
const avisosDe = u =>
  mockNotificar.mock.calls.filter(([id, evento]) => id === u.productor.id && evento === 'stock_bajo');

describe('stock de insumos', () => {
  test('compra, uso y ajuste por inventario', async () => {
    const u = await registrar();
    const i = await insumo(u);
    expect(i).toMatchObject({ nombre: 'Insecticida X', unidad: 'l', stock: '0', bajo: true });

    const compra = await mover(u, {
      insumoId: i.id,
      tipo: 'compra',
      cantidad: 20,
      precioTotal: 300000,
      proveedor: 'Agro SA'
    });
    expect(compra.status).toBe(201);
    expect(compra.body.insumo).toMatchObject({ stock: '20.000', ultimo_precio: '15000.0000', bajo: false });

    await mover(u, { insumoId: i.id, tipo: 'uso', cantidad: 3.5, nota: 'Prueba' });
    expect((await stockDe(u, i.id)).stock).toBe('16.500');
    const ajuste = await mover(u, { insumoId: i.id, tipo: 'ajuste', stockContado: 16 });
    expect(ajuste.body.movimiento.cantidad).toBe('-0.500');
    expect((await stockDe(u, i.id)).stock).toBe('16.000');

    const movs = (await request(app).get(`/api/stock/insumos/${i.id}/movimientos`).set(u.auth)).body;
    expect(movs.map(m => m.tipo)).toEqual(['ajuste', 'uso', 'compra']);
    expect((await request(app).delete(`/api/stock/movimientos/${movs[0].id}`).set(u.auth)).status).toBe(200);
    expect((await stockDe(u, i.id)).stock).toBe('16.500');
  });

  test('la compra puede guardar el precio en la lista de precios', async () => {
    const u = await registrar();
    const azucar = await insumo(u, { nombre: 'Azúcar', categoria: 'otro', unidad: 'kg', stockMinimo: null });
    await mover(u, { insumoId: azucar.id, tipo: 'compra', cantidad: 50, precioUnitario: 1100, guardarPrecio: true });
    const precios = (await request(app).get('/api/insumos/precios').set(u.auth)).body;
    expect(precios).toEqual([expect.objectContaining({ nombre: 'Azúcar', unidad: 'kg', precio: '1100.0000' })]);
  });

  test('validaciones', async () => {
    const u = await registrar();
    const i = await insumo(u);
    const post = body => request(app).post('/api/stock/insumos').set(u.auth).send(body);
    expect((await post({ nombre: 'X', unidad: 'cc' })).status).toBe(400);
    expect((await post({ nombre: '', unidad: 'kg' })).status).toBe(400);
    expect((await post({ nombre: 'insecticida x', unidad: 'l' })).status).toBe(409); // mismo nombre
    expect((await post({ nombre: 'Y', unidad: 'kg', stockMinimo: -1 })).status).toBe(400);
    expect((await mover(u, { insumoId: i.id, tipo: 'regalo', cantidad: 1 })).status).toBe(400);
    expect((await mover(u, { insumoId: i.id, tipo: 'compra', cantidad: 0 })).status).toBe(400);
    expect((await mover(u, { insumoId: i.id, tipo: 'compra', cantidad: 1, fecha: enDias(3) })).status).toBe(400);
    expect((await mover(u, { insumoId: i.id, tipo: 'compra', cantidad: 1, precioTotal: -5 })).status).toBe(400);
    expect((await mover(u, { insumoId: i.id, tipo: 'ajuste' })).status).toBe(400);
    expect((await mover(u, { insumoId: i.id, tipo: 'ajuste', stockContado: 0 })).status).toBe(400); // ya es 0

    // Con movimientos no se borra: se da de baja.
    await mover(u, { insumoId: i.id, tipo: 'compra', cantidad: 1 });
    expect((await request(app).delete(`/api/stock/insumos/${i.id}`).set(u.auth)).status).toBe(409);
    const baja = await request(app).patch(`/api/stock/insumos/${i.id}`).set(u.auth).send({ activo: false });
    expect(baja.body.activo).toBe(false);
    const sinMov = await insumo(u, { nombre: 'Sin usar' });
    expect((await request(app).delete(`/api/stock/insumos/${sinMov.id}`).set(u.auth)).status).toBe(200);
  });

  test('la aplicación del cuaderno descuenta en cada cuartel y borrarla lo devuelve', async () => {
    const u = await registrar();
    const fincas = (await request(app).get('/api/fincas').set(u.auth)).body;
    const otro = (await request(app).post('/api/lotes').set(u.auth).send({ nombre: 'Sur', fincaId: fincas[0].id }))
      .body;
    const i = await insumo(u, { stockMinimo: null });
    await mover(u, { insumoId: i.id, tipo: 'compra', cantidad: 10 });

    const registro = {
      loteIds: [u.loteId, otro.id],
      fecha: enDias(-1),
      tipo: 'aplicacion',
      producto: 'Insecticida X',
      insumoId: i.id,
      cantidadInsumo: 1.5
    };
    const res = await request(app).post('/api/cuaderno').set(u.auth).send(registro);
    expect(res.status).toBe(201);
    expect(res.body[0]).toMatchObject({ insumo_id: i.id, cantidad_insumo: '1.500' });
    expect((await stockDe(u, i.id)).stock).toBe('7.000');
    const movs = (await request(app).get(`/api/stock/insumos/${i.id}/movimientos`).set(u.auth)).body;
    expect(
      movs
        .filter(m => m.cuaderno_id)
        .map(m => m.cuartel)
        .sort()
    ).toEqual(['Lote 1', 'Sur']);
    // El uso del cuaderno no se borra desde el stock.
    const uso = movs.find(m => m.cuaderno_id);
    expect((await request(app).delete(`/api/stock/movimientos/${uso.id}`).set(u.auth)).status).toBe(409);

    // Editar la cantidad en el cuaderno corrige el stock.
    await request(app).patch(`/api/cuaderno/${res.body[0].id}`).set(u.auth).send({ cantidadInsumo: 2 });
    expect((await stockDe(u, i.id)).stock).toBe('6.500');
    await request(app).delete(`/api/cuaderno/${res.body[1].id}`).set(u.auth);
    expect((await stockDe(u, i.id)).stock).toBe('8.000');

    // Sin cantidad, en un riego, o con un insumo ajeno o dado de baja: no.
    const ajeno = await insumo(await registrar());
    const cargar = extra =>
      request(app)
        .post('/api/cuaderno')
        .set(u.auth)
        .send({ ...registro, ...extra });
    expect((await cargar({ cantidadInsumo: undefined })).status).toBe(400);
    expect((await cargar({ tipo: 'riego' })).status).toBe(400);
    expect((await cargar({ insumoId: ajeno.id })).status).toBe(404);
    await request(app).patch(`/api/stock/insumos/${i.id}`).set(u.auth).send({ activo: false });
    expect((await cargar({})).status).toBe(404);
    const [riego] = (
      await request(app)
        .post('/api/cuaderno')
        .set(u.auth)
        .send({ loteIds: [u.loteId], fecha: enDias(-1), tipo: 'riego', cantidad: 4 })
    ).body;
    expect((await request(app).patch(`/api/cuaderno/${riego.id}`).set(u.auth).send({ cantidadInsumo: 1 })).status).toBe(
      400
    );
  });

  test('aviso por N8N una sola vez al bajar del mínimo, y de nuevo después de reponer', async () => {
    const u = await registrar();
    const i = await insumo(u, { stockMinimo: 5 });
    mockNotificar.mockClear();
    await mover(u, { insumoId: i.id, tipo: 'compra', cantidad: 10 });
    expect(avisosDe(u)).toHaveLength(0);
    await mover(u, { insumoId: i.id, tipo: 'uso', cantidad: 6 });
    expect(avisosDe(u)).toHaveLength(1);
    expect(avisosDe(u)[0][2].insumos[0]).toMatchObject({ nombre: 'Insecticida X', stock: 4, minimo: 5 });
    await mover(u, { insumoId: i.id, tipo: 'uso', cantidad: 1 });
    expect(avisosDe(u)).toHaveLength(1); // no se repite
    await mover(u, { insumoId: i.id, tipo: 'compra', cantidad: 10 });
    await mover(u, { insumoId: i.id, tipo: 'uso', cantidad: 9 });
    expect(avisosDe(u)).toHaveLength(2);
  });

  test('cada productor ve solo lo suyo', async () => {
    const a = await registrar();
    const b = await registrar();
    const i = await insumo(a);
    expect((await request(app).get('/api/stock').set(b.auth)).body).toEqual([]);
    expect((await mover(b, { insumoId: i.id, tipo: 'compra', cantidad: 1 })).status).toBe(404);
    expect((await request(app).patch(`/api/stock/insumos/${i.id}`).set(b.auth).send({ nombre: 'Z' })).status).toBe(404);
    expect((await request(app).get(`/api/stock/insumos/${i.id}/movimientos`).set(b.auth)).body).toEqual([]);
    expect((await request(app).get('/api/stock')).status).toBe(401);
  });
});
