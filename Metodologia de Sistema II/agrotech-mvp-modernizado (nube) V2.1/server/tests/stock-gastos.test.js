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

afterAll(cerrarDb);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const enDias = n => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const gasoil = async (u, extra = {}) =>
  (
    await request(app)
      .post('/api/stock/insumos')
      .set(u.auth)
      .send({ nombre: 'Gasoil', categoria: 'combustible', unidad: 'l', ...extra })
  ).body;
const comprar = (u, body) =>
  request(app)
    .post('/api/stock/movimientos')
    .set(u.auth)
    .send({ tipo: 'compra', ...body });
const gastosDe = async u => (await request(app).get('/api/gastos').set(u.auth)).body;

// Productor con dos cuarteles: Lote 1 (sin superficie: se le pone 3 ha) y Sur (1 ha).
async function conDosCuarteles() {
  const u = await registrar();
  const fincas = (await request(app).get('/api/fincas').set(u.auth)).body;
  const sur = (
    await request(app).post('/api/lotes').set(u.auth).send({ nombre: 'Sur', fincaId: fincas[0].id, area: 1 })
  ).body;
  const db = require('../src/db');
  await db.query('UPDATE lotes SET area = 3 WHERE id = $1', [u.loteId]);
  return { u, fincaId: fincas[0].id, surId: sur.id };
}

describe('compras del stock unidas a los gastos', () => {
  test('repartida por hectárea: un gasto por cuartel que suma exacto', async () => {
    const { u, fincaId, surId } = await conDosCuarteles();
    const i = await gasoil(u);
    const res = await comprar(u, {
      insumoId: i.id,
      cantidad: 200,
      precioTotal: 100000.01,
      fecha: enDias(-1),
      gasto: { modo: 'repartir', fincaId }
    });
    expect(res.status).toBe(201);
    expect(res.body.gastos).toHaveLength(2);
    const gastos = (await gastosDe(u)).filter(g => g.movimiento_stock_id === res.body.movimiento.id);
    const porCuartel = Object.fromEntries(gastos.map(g => [g.lote_id, Number(g.monto)]));
    expect(porCuartel[u.loteId]).toBe(75000.01);
    expect(porCuartel[surId]).toBe(25000);
    expect(gastos[0]).toMatchObject({ concepto: 'Gasoil (repartido por ha)', estado: 'pagado' });
    expect(String(gastos[0].fecha).slice(0, 10)).toBe(enDias(-1));

    const mov = (await request(app).get(`/api/stock/insumos/${i.id}/movimientos`).set(u.auth)).body[0];
    expect(mov).toMatchObject({ gastos: 2, importe_gastos: '100000.01' });
  });

  test('a un cuartel, a pagar más adelante', async () => {
    const { u, surId } = await conDosCuarteles();
    const i = await gasoil(u);
    await comprar(u, {
      insumoId: i.id,
      cantidad: 100,
      precioUnitario: 1200,
      gasto: { modo: 'cuartel', loteId: surId, estado: 'programado', vence: enDias(30) }
    });
    const [g] = await gastosDe(u);
    expect(g).toMatchObject({ lote_id: surId, monto: '120000.00', estado: 'programado', concepto: 'Gasoil' });
  });

  test('unida a un gasto que ya estaba cargado, sin duplicarlo; el precio sale del gasto', async () => {
    const u = await registrar();
    const i = await gasoil(u);
    const gasto = (
      await request(app)
        .post('/api/gastos')
        .set(u.auth)
        .send({ loteId: u.loteId, concepto: 'Gasoil YPF', monto: 96000, estado: 'pagado' })
    ).body;
    const res = await comprar(u, { insumoId: i.id, cantidad: 80, gasto: { modo: 'existente', gastoId: gasto.id } });
    expect(res.status).toBe(201);
    expect(res.body.movimiento.precio_unitario).toBe('1200');
    expect(await gastosDe(u)).toHaveLength(1);
    expect((await gastosDe(u))[0].movimiento_stock_id).toBe(res.body.movimiento.id);
    // El mismo gasto no se une a otra compra.
    expect(
      (await comprar(u, { insumoId: i.id, cantidad: 1, gasto: { modo: 'existente', gastoId: gasto.id } })).status
    ).toBe(409);
    // Borrar la compra no borra un gasto que ya existía: solo lo desvincula.
    const borrado = await request(app).delete(`/api/stock/movimientos/${res.body.movimiento.id}`).set(u.auth);
    expect(borrado.body.gastosBorrados).toBe(0);
    expect((await gastosDe(u))[0]).toMatchObject({ id: gasto.id, movimiento_stock_id: null });
  });

  test('corregir una compra vieja cargada dos veces: se une a su gasto', async () => {
    const u = await registrar();
    const i = await gasoil(u);
    const compra = (await comprar(u, { insumoId: i.id, cantidad: 50, precioTotal: 60000 })).body.movimiento;
    const gasto = (
      await request(app)
        .post('/api/gastos')
        .set(u.auth)
        .send({ loteId: u.loteId, concepto: 'Gasoil', monto: 60000, estado: 'pagado' })
    ).body;
    const unir = body => request(app).post(`/api/stock/movimientos/${compra.id}/gasto`).set(u.auth).send(body);
    expect((await unir({ modo: 'ninguno' })).status).toBe(400);
    expect((await unir({ modo: 'existente', gastoId: gasto.id })).status).toBe(200);
    expect((await unir({ modo: 'repartir' })).status).toBe(409); // ya tiene su gasto
    expect(await gastosDe(u)).toHaveLength(1);

    // Una compra sin gasto se lo puede armar después; al borrar la compra se borra ese gasto.
    const otra = (await comprar(u, { insumoId: i.id, cantidad: 10, precioTotal: 12000 })).body.movimiento;
    await request(app)
      .post(`/api/stock/movimientos/${otra.id}/gasto`)
      .set(u.auth)
      .send({ modo: 'cuartel', loteId: u.loteId });
    expect(await gastosDe(u)).toHaveLength(2);
    expect((await request(app).delete(`/api/stock/movimientos/${otra.id}`).set(u.auth)).body.gastosBorrados).toBe(1);
    expect(await gastosDe(u)).toHaveLength(1);
  });

  test('validaciones', async () => {
    const u = await registrar();
    const otro = await registrar();
    const i = await gasoil(u);
    const gastoAjeno = (
      await request(app)
        .post('/api/gastos')
        .set(otro.auth)
        .send({ loteId: otro.loteId, concepto: 'X', monto: 10, estado: 'pagado' })
    ).body;
    // Sin precio no se puede armar el gasto.
    expect((await comprar(u, { insumoId: i.id, cantidad: 10, gasto: { modo: 'repartir' } })).status).toBe(400);
    expect((await comprar(u, { insumoId: i.id, cantidad: 10, precioTotal: 5, gasto: { modo: 'otro' } })).status).toBe(
      400
    );
    expect(
      (
        await comprar(u, {
          insumoId: i.id,
          cantidad: 10,
          precioTotal: 5,
          gasto: { modo: 'cuartel', loteId: otro.loteId }
        })
      ).status
    ).toBe(404);
    expect(
      (await comprar(u, { insumoId: i.id, cantidad: 10, gasto: { modo: 'existente', gastoId: gastoAjeno.id } })).status
    ).toBe(404);
    expect(
      (
        await comprar(u, {
          insumoId: i.id,
          cantidad: 10,
          precioTotal: 5,
          gasto: { modo: 'cuartel', loteId: u.loteId, estado: 'programado' }
        })
      ).status
    ).toBe(400); // falta el vencimiento
    expect(
      (
        await request(app)
          .post('/api/stock/movimientos')
          .set(u.auth)
          .send({ insumoId: i.id, tipo: 'uso', cantidad: 1, gasto: { modo: 'repartir' } })
      ).status
    ).toBe(400);
    // Si algo falla, no queda ni la compra ni el gasto a medias.
    const movs = (await request(app).get(`/api/stock/insumos/${i.id}/movimientos`).set(u.auth)).body;
    expect(movs).toEqual([]);
    expect(await gastosDe(u)).toEqual([]);
  });

  test('repuestos por máquina', async () => {
    const u = await registrar();
    const filtro = await gasoil(u, {
      nombre: 'Filtro de aceite',
      categoria: 'repuesto',
      unidad: 'un',
      maquina: 'Tractor'
    });
    const correa = await gasoil(u, { nombre: 'Correa', categoria: 'repuesto', unidad: 'un', maquina: 'tractor' });
    const pico = await gasoil(u, { nombre: 'Pico', categoria: 'repuesto', unidad: 'un', maquina: 'Pulverizadora' });
    expect(filtro).toMatchObject({ categoria: 'repuesto', maquina: 'Tractor' });
    await comprar(u, { insumoId: filtro.id, cantidad: 2, precioTotal: 30000 });
    await comprar(u, { insumoId: correa.id, cantidad: 1, precioTotal: 45000 });
    await comprar(u, { insumoId: pico.id, cantidad: 4, precioTotal: 8000 });
    const maquinas = (await request(app).get('/api/stock/maquinas').set(u.auth)).body;
    expect(maquinas.map(m => [m.maquina.toLowerCase(), m.insumos, m.importe])).toEqual([
      ['tractor', 2, '75000.00'],
      ['pulverizadora', 1, '8000.00']
    ]);
  });

  test('la factura leída con IA trae cantidad y unidad cuando figuran', async () => {
    const u = await registrar();
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            items: [
              { concepto: 'Gasoil grado 2', monto: 240000, cantidad: 200, unidad: 'l' },
              { concepto: 'Servicio de flete', monto: 15000, cantidad: null, unidad: null },
              { concepto: 'Raro', monto: 100, cantidad: 3, unidad: 'docena' }
            ]
          })
        }
      ]
    });
    const res = await request(app)
      .post('/api/gastos/extraer-factura')
      .set(u.auth)
      .send({ imagenBase64: 'aGVsbG8=', mediaType: 'image/jpeg' });
    expect(res.body.items).toEqual([
      { concepto: 'Gasoil grado 2', monto: 240000, cantidad: 200, unidad: 'l' },
      { concepto: 'Servicio de flete', monto: 15000, cantidad: null, unidad: null },
      { concepto: 'Raro', monto: 100, cantidad: null, unidad: null }
    ]);
  });
});
