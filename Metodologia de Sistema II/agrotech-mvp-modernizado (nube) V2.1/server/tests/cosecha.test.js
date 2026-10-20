const { app, request, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const enDias = n => {
  const d = new Date(`${hoy()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const api = (u, metodo, ruta, body) => {
  const r = request(app)[metodo](`/api/cosecha${ruta}`).set(u.auth);
  return body === undefined ? r : r.send(body);
};
const cosechero = async (u, nombre, extra = {}) => (await api(u, 'post', '/cosecheros', { nombre, ...extra })).body;
const tarja = (u, body) => api(u, 'post', '/tarjas', { fecha: enDias(-1), loteId: u.loteId, ...body });

describe('cosecha a destajo', () => {
  test('cosecheros: alta, DNI, baja y borrado', async () => {
    const u = await registrar();
    const juan = await cosechero(u, 'Juan Pérez', { dni: '30.123.456', telefono: '2622 123456' });
    expect(juan).toMatchObject({ nombre: 'Juan Pérez', dni: '30123456', activo: true });
    expect((await api(u, 'post', '/cosecheros', { nombre: 'X', dni: '123' })).status).toBe(400);
    expect((await api(u, 'post', '/cosecheros', { nombre: '' })).status).toBe(400);

    // Con tarjas no se borra: se da de baja.
    await api(u, 'put', '/tarifas', [{ modalidad: 'tacho', precio: 900, kgPorUnidad: 18 }]);
    await tarja(u, { modalidad: 'tacho', filas: [{ cosecheroId: juan.id, cantidad: 40 }] });
    expect((await api(u, 'delete', `/cosecheros/${juan.id}`)).status).toBe(409);
    expect((await api(u, 'patch', `/cosecheros/${juan.id}`, { activo: false })).body.activo).toBe(false);
    const sinTarjas = await cosechero(u, 'Pedro');
    expect((await api(u, 'delete', `/cosecheros/${sinTarjas.id}`)).status).toBe(200);
    expect((await api(u, 'get', '/cosecheros')).body.map(c => c.nombre)).toEqual(['Juan Pérez']);
  });

  test('tarja del día con la tarifa guardada; volver a cargarla la reemplaza y 0 la borra', async () => {
    const u = await registrar();
    const [a, b] = [await cosechero(u, 'Ana'), await cosechero(u, 'Beto')];
    // Sin tarifa ni precio no se puede cargar.
    expect((await tarja(u, { modalidad: 'tacho', filas: [{ cosecheroId: a.id, cantidad: 10 }] })).status).toBe(400);

    const tarifas = (await api(u, 'put', '/tarifas', [{ modalidad: 'tacho', precio: 1000 }])).body;
    expect(tarifas.find(t => t.modalidad === 'tacho')).toMatchObject({ precio: '1000.00', kg_por_unidad: 20 });

    const res = await tarja(u, {
      modalidad: 'tacho',
      filas: [
        { cosecheroId: a.id, cantidad: 50 },
        { cosecheroId: b.id, cantidad: 35 }
      ]
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ guardadas: 2, borradas: 0 });
    let lista = (await api(u, 'get', `/tarjas?fecha=${enDias(-1)}`)).body;
    expect(lista.find(t => t.cosechero === 'Ana')).toMatchObject({ importe: '50000.00', kg: '1000.00' });

    await tarja(u, {
      modalidad: 'tacho',
      filas: [
        { cosecheroId: a.id, cantidad: 52 },
        { cosecheroId: b.id, cantidad: 0 }
      ]
    });
    lista = (await api(u, 'get', `/tarjas?fecha=${enDias(-1)}`)).body;
    expect(lista).toHaveLength(1);
    expect(lista[0].cantidad).toBe('52.00');

    // Jornal con precio propio: no suma kilos.
    await tarja(u, { modalidad: 'jornal', precioUnidad: 25000, filas: [{ cosecheroId: b.id, cantidad: 0.5 }] });
    const jornal = (await api(u, 'get', `/tarjas?cosecheroId=${b.id}`)).body[0];
    expect(jornal).toMatchObject({ modalidad: 'jornal', importe: '12500.00', kg: null });
  });

  test('validaciones de la tarja', async () => {
    const u = await registrar();
    const otro = await registrar();
    const a = await cosechero(u, 'Ana');
    const ajeno = await cosechero(otro, 'Ajeno');
    const base = { modalidad: 'bin', precioUnidad: 20000 };
    expect((await tarja(u, { ...base, fecha: enDias(2), filas: [{ cosecheroId: a.id, cantidad: 1 }] })).status).toBe(
      400
    );
    expect((await tarja(u, { ...base, modalidad: 'cajon', filas: [{ cosecheroId: a.id, cantidad: 1 }] })).status).toBe(
      400
    );
    expect((await tarja(u, { ...base, filas: [] })).status).toBe(400);
    expect((await tarja(u, { ...base, filas: [{ cosecheroId: a.id, cantidad: -1 }] })).status).toBe(400);
    expect((await tarja(u, { ...base, modalidad: 'jornal', filas: [{ cosecheroId: a.id, cantidad: 3 }] })).status).toBe(
      400
    );
    expect(
      (
        await tarja(u, {
          ...base,
          filas: [
            { cosecheroId: a.id, cantidad: 1 },
            { cosecheroId: a.id, cantidad: 2 }
          ]
        })
      ).status
    ).toBe(400);
    expect((await tarja(u, { ...base, filas: [{ cosecheroId: ajeno.id, cantidad: 1 }] })).status).toBe(404);
    expect((await tarja(u, { ...base, loteId: otro.loteId, filas: [{ cosecheroId: a.id, cantidad: 1 }] })).status).toBe(
      404
    );
    expect((await api(u, 'get', '/tarjas?desde=2026-05-01&hasta=2026-01-01')).status).toBe(400);
  });

  test('liquidación, pago con gasto por cuartel y lo pagado queda bloqueado', async () => {
    const u = await registrar();
    const fincas = (await request(app).get('/api/fincas').set(u.auth)).body;
    const sur = (
      await request(app).post('/api/lotes').set(u.auth).send({ nombre: 'Sur', fincaId: fincas[0].id, area: 2 })
    ).body;
    const [a, b] = [await cosechero(u, 'Ana', { dni: '30123456' }), await cosechero(u, 'Beto')];
    await api(u, 'put', '/tarifas', [
      { modalidad: 'tacho', precio: 1000, kgPorUnidad: 20 },
      { modalidad: 'bin', precio: 20000, kgPorUnidad: 400 }
    ]);
    await tarja(u, { fecha: enDias(-3), modalidad: 'tacho', filas: [{ cosecheroId: a.id, cantidad: 40 }] });
    await tarja(u, { fecha: enDias(-2), modalidad: 'tacho', filas: [{ cosecheroId: a.id, cantidad: 30 }] });
    await tarja(u, {
      fecha: enDias(-2),
      loteId: sur.id,
      modalidad: 'bin',
      filas: [
        { cosecheroId: a.id, cantidad: 1 },
        { cosecheroId: b.id, cantidad: 2 }
      ]
    });

    const rango = `desde=${enDias(-7)}&hasta=${hoy()}`;
    const liq = (await api(u, 'get', `/liquidacion?${rango}`)).body;
    const ana = liq.cosecheros.find(c => c.nombre === 'Ana');
    expect(ana).toMatchObject({ dias: 2, tachos: '70.00', bins: '1.00', kg: '1800.00', importe: '90000.00' });
    expect(liq.totales).toEqual({ kg: 2600, importe: 130000, pagado: 0, pendiente: 130000 });

    const rend = (await api(u, 'get', `/rendimiento?${rango}`)).body;
    expect(rend.find(r => r.cuartel === 'Sur')).toMatchObject({ kg: '1200.00', kg_ha: '600' });

    // Paga solo a Ana: un gasto por cuartel.
    const pago = await api(u, 'post', '/liquidacion/pagar', { desde: enDias(-7), hasta: hoy(), cosecheroIds: [a.id] });
    expect(pago.body).toEqual({ tarjas: 3, importe: 90000, gastos: 2 });
    const gastos = (await request(app).get('/api/gastos').set(u.auth)).body;
    expect(
      gastos
        .filter(g => g.concepto.startsWith('Cosecha a destajo'))
        .map(g => Number(g.monto))
        .sort()
    ).toEqual([20000, 70000]);
    expect((await api(u, 'get', `/liquidacion?${rango}`)).body.totales).toMatchObject({
      pagado: 90000,
      pendiente: 40000
    });

    // Lo pagado no se cambia ni se borra.
    expect(
      (await tarja(u, { fecha: enDias(-3), modalidad: 'tacho', filas: [{ cosecheroId: a.id, cantidad: 41 }] })).status
    ).toBe(409);
    const pagada = (await api(u, 'get', `/tarjas?cosecheroId=${a.id}`)).body[0];
    expect((await api(u, 'delete', `/tarjas/${pagada.id}`)).status).toBe(409);

    // Pagar de nuevo no duplica; deshacer vuelve a pendiente.
    const resto = await api(u, 'post', '/liquidacion/pagar', {
      desde: enDias(-7),
      hasta: hoy(),
      registrarGasto: false
    });
    expect(resto.body).toEqual({ tarjas: 1, importe: 40000, gastos: 0 });
    expect(
      (await api(u, 'post', '/liquidacion/deshacer-pago', { desde: enDias(-7), hasta: hoy(), cosecheroIds: [b.id] }))
        .body
    ).toEqual({ tarjas: 1 });
    expect(
      (await api(u, 'post', '/liquidacion/pagar', { desde: enDias(-7), hasta: hoy(), fechaPago: enDias(3) })).status
    ).toBe(400);
  });

  test('la tarja cuenta como evidencia de cosecha en las certificaciones', async () => {
    const u = await registrar();
    const a = await cosechero(u, 'Ana');
    await tarja(u, { modalidad: 'kg', precioUnidad: 60, filas: [{ cosecheroId: a.id, cantidad: 800 }] });
    const cert = (await request(app).post('/api/certificaciones').set(u.auth).send({ tipo: 'bpa' })).body;
    expect(cert.requisitos.find(r => r.evidencia === 'cosecha').registros.registros).toBe(1);
  });

  test('cada productor ve solo lo suyo y se exporta en mis datos', async () => {
    const a = await registrar();
    const b = await registrar();
    const ana = await cosechero(a, 'Ana');
    await tarja(a, { modalidad: 'kg', precioUnidad: 60, filas: [{ cosecheroId: ana.id, cantidad: 100 }] });
    expect((await api(b, 'get', '/cosecheros')).body).toEqual([]);
    expect((await api(b, 'get', '/tarjas')).body).toEqual([]);
    expect((await api(b, 'patch', `/cosecheros/${ana.id}`, { nombre: 'X' })).status).toBe(404);
    const t = (await api(a, 'get', '/tarjas')).body[0];
    expect((await api(b, 'delete', `/tarjas/${t.id}`)).status).toBe(404);
    expect((await request(app).get('/api/cosecha/cosecheros')).status).toBe(401);

    const datos = (await request(app).get('/api/cuenta/exportar').set(a.auth)).body;
    expect(datos.cosecheros).toHaveLength(1);
    expect(datos.tarjas).toHaveLength(1);
  });
});
