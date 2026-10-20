// N8N y Open-Meteo simulados: no se manda ningún mensaje ni se consulta el pronóstico real.
const mockNotificar = jest.fn(async () => ({ success: true }));
jest.mock('../src/services/n8n', () => ({
  notificarN8N: (...args) => mockNotificar(...args),
  notificarSistemaN8N: jest.fn(async () => ({ success: false }))
}));

const { app, request, registrar, cerrarDb } = require('./helpers');
const db = require('../src/db');
const { revisarClima } = require('../src/jobs/clima-scheduler');
const { limpiarCache } = require('../src/services/clima');

const fetchOriginal = global.fetch;
afterAll(async () => {
  global.fetch = fetchOriginal;
  await cerrarDb();
});

const DIAS = ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'];
const respuesta = cuerpo => ({ ok: true, json: async () => cuerpo });
// Mínimas: 5, -1.5 (helada), 8... y tormenta con granizo el tercer día.
function pronosticoFalso() {
  return {
    daily: {
      time: DIAS,
      weather_code: [0, 3, 96, 61, 2, 0, 1],
      temperature_2m_min: [5, -1.5, 8, 9, 4, 6, 7],
      temperature_2m_max: [22, 18, 25, 20, 21, 23, 24],
      precipitation_sum: [0, 0, 12, 4, 0, 0, 0],
      precipitation_probability_max: [0, 5, 80, 60, 10, 0, 0],
      wind_speed_10m_max: [10, 8, 30, 15, 12, 9, 11],
      wind_gusts_10m_max: [20, 15, 70, 30, 25, 18, 22]
    }
  };
}
let pedidos = [];
beforeEach(() => {
  limpiarCache();
  pedidos = [];
  global.fetch = jest.fn(async url => {
    pedidos.push(String(url));
    if (String(url).includes('geocoding-api')) {
      return respuesta({
        results: [
          {
            name: 'Tunuyán',
            admin2: 'Departamento de Tunuyán',
            admin1: 'Provincia de Mendoza',
            latitude: -33.57,
            longitude: -69.02
          }
        ]
      });
    }
    return respuesta(pronosticoFalso());
  });
});

async function fincaUbicada(u) {
  const finca = (await request(app).get('/api/fincas').set(u.auth)).body[0];
  await request(app)
    .put(`/api/clima/fincas/${finca.id}/ubicacion`)
    .set(u.auth)
    .send({ latitud: -33.5712345, longitud: -69.0198765, lugar: 'Tunuyán, Mendoza' });
  return finca;
}

describe('clima por finca', () => {
  test('buscar el lugar, ubicar la finca y ver el pronóstico', async () => {
    const u = await registrar();
    const lugares = (await request(app).get('/api/clima/buscar?q=Tunuyán').set(u.auth)).body;
    expect(lugares[0]).toEqual({ nombre: 'Tunuyán, Mendoza', latitud: -33.57, longitud: -69.02 });
    expect(pedidos[0]).toContain('countryCode=AR');
    expect((await request(app).get('/api/clima/buscar?q=a').set(u.auth)).status).toBe(400);

    const finca = (await request(app).get('/api/fincas').set(u.auth)).body[0];
    expect((await request(app).get(`/api/clima/pronostico?fincaId=${finca.id}`).set(u.auth)).status).toBe(409);
    await fincaUbicada(u);
    const { fincas } = (await request(app).get('/api/clima/fincas').set(u.auth)).body;
    expect(fincas[0]).toMatchObject({ latitud: '-33.57123', lugar: 'Tunuyán, Mendoza' });

    const res = await request(app).get(`/api/clima/pronostico?fincaId=${finca.id}`).set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.dias).toHaveLength(7);
    expect(res.body.dias[1]).toMatchObject({ minima: -1.5, helada: true, descripcion: 'Nublado' });
    expect(res.body.dias[2]).toMatchObject({ granizo: true, tormenta: true, descripcion: 'Tormenta con granizo' });
    expect(res.body.dias[0].helada).toBe(false);
    // Solo las coordenadas (redondeadas) viajan a Open-Meteo.
    expect(pedidos.at(-1)).toContain('latitude=-33.57');

    // Con umbral de 5 °C también cuenta el primer día; el pronóstico se reusa sin volver a pedirlo.
    const antes = pedidos.length;
    await request(app).put('/api/clima/config').set(u.auth).send({ umbralHelada: 5 });
    const otra = (await request(app).get(`/api/clima/pronostico?fincaId=${finca.id}`).set(u.auth)).body;
    expect(otra.dias[0].helada).toBe(true);
    expect(pedidos.length).toBe(antes);
  });

  test('si Open-Meteo no responde, el pronóstico sale de MET Norway', async () => {
    const u = await registrar();
    const finca = await fincaUbicada(u);
    const hora = (iso, temp, simbolo, lluvia, extra = {}) => ({
      time: iso,
      data: {
        instant: { details: { air_temperature: temp, wind_speed: 5, wind_speed_of_gust: 12 } },
        next_1_hours: { summary: { symbol_code: simbolo }, details: { precipitation_amount: lluvia } },
        ...extra
      }
    });
    const met = {
      properties: {
        timeseries: [
          // 21/10 en Mendoza (UTC-3): de las 03:00Z del 21 a las 02:00Z del 22
          hora('2026-10-21T09:00:00Z', -2, 'clearsky_night', 0),
          hora('2026-10-21T18:00:00Z', 19, 'rainandthunder_day', 3.5),
          hora('2026-10-22T02:00:00Z', 10, 'cloudy', 0.5),
          // 22/10, ya cada 6 horas
          {
            time: '2026-10-22T12:00:00Z',
            data: {
              instant: { details: { air_temperature: 8, wind_speed: 2 } },
              next_6_hours: {
                summary: { symbol_code: 'partlycloudy_day' },
                details: { air_temperature_min: 4, air_temperature_max: 22, precipitation_amount: 1 }
              }
            }
          }
        ]
      }
    };
    global.fetch = jest.fn(async (url, opciones) => {
      pedidos.push(String(url));
      if (String(url).includes('open-meteo')) return { ok: false, status: 429, text: async () => 'Too many requests' };
      expect(opciones.headers['User-Agent']).toMatch(/AgroTech/);
      return respuesta(met);
    });
    const res = await request(app).get(`/api/clima/pronostico?fincaId=${finca.id}`).set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe('MET Norway');
    expect(res.body.dias[0]).toMatchObject({
      fecha: '2026-10-21',
      minima: -2,
      maxima: 19,
      lluvia: 4,
      viento: 18,
      rafagas: 43,
      descripcion: 'Tormenta',
      helada: true,
      tormenta: true,
      granizo: false
    });
    expect(res.body.dias[1]).toMatchObject({
      fecha: '2026-10-22',
      minima: 4,
      maxima: 22,
      lluvia: 1,
      descripcion: 'Algo nublado'
    });
  });

  test('validaciones y errores de Open-Meteo', async () => {
    const u = await registrar();
    const finca = (await request(app).get('/api/fincas').set(u.auth)).body[0];
    const ubicar = body => request(app).put(`/api/clima/fincas/${finca.id}/ubicacion`).set(u.auth).send(body);
    expect((await ubicar({ latitud: 120, longitud: 0 })).status).toBe(400);
    expect((await ubicar({ latitud: 'x', longitud: 0 })).status).toBe(400);
    expect((await request(app).put('/api/clima/config').set(u.auth).send({ umbralHelada: 30 })).status).toBe(400);

    await fincaUbicada(u);
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 }));
    const caido = await request(app).get(`/api/clima/pronostico?fincaId=${finca.id}`).set(u.auth);
    expect(caido.status).toBe(502);
    expect(caido.body.error).toMatch(/pronóstico/);
    global.fetch = jest.fn(async () => {
      throw new Error('sin red');
    });
    expect((await request(app).get('/api/clima/buscar?q=Tunuyán').set(u.auth)).status).toBe(502);

    expect((await ubicar({ latitud: null, longitud: null })).body.latitud).toBeNull();
  });

  test('aviso de helada y granizo por N8N, una sola vez por día', async () => {
    const u = await registrar();
    const finca = await fincaUbicada(u);
    // Solo se revisan los productores con N8N activo.
    await db.query(
      `INSERT INTO config_n8n (productor_id, webhook_url, habilitado) VALUES ($1, 'https://n8n.example/webhook', true)`,
      [u.productor.id]
    );
    mockNotificar.mockClear();
    await revisarClima();
    const delProductor = () =>
      mockNotificar.mock.calls.filter(([id, evento]) => id === u.productor.id && evento === 'alerta_clima');
    expect(
      delProductor()
        .map(c => c[2].tipo)
        .sort()
    ).toEqual(['granizo', 'helada']);
    expect(delProductor().find(c => c[2].tipo === 'helada')[2]).toMatchObject({
      finca: finca.nombre,
      fechaTexto: '22/10/2026',
      minima: -1.5
    });
    await revisarClima();
    expect(delProductor()).toHaveLength(2); // no se repite

    // Apagado, no avisa.
    await db.query('DELETE FROM avisos_clima WHERE finca_id = $1', [finca.id]);
    await request(app).put('/api/clima/config').set(u.auth).send({ avisar: false });
    await revisarClima();
    expect(delProductor()).toHaveLength(2);
  });

  test('cada productor ve solo lo suyo', async () => {
    const a = await registrar();
    const b = await registrar();
    const finca = await fincaUbicada(a);
    expect((await request(app).get(`/api/clima/pronostico?fincaId=${finca.id}`).set(b.auth)).status).toBe(404);
    expect(
      (await request(app).put(`/api/clima/fincas/${finca.id}/ubicacion`).set(b.auth).send({ latitud: 0, longitud: 0 }))
        .status
    ).toBe(404);
    expect((await request(app).get('/api/clima/config')).status).toBe(401);
  });
});
