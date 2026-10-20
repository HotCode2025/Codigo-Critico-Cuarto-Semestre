// Pronóstico del clima por finca con Open-Meteo (https://open-meteo.com): gratis y sin clave, solo
// para uso no comercial (si AgroTech se vende, hay que pasar a su plan pago). Si Open-Meteo no
// responde (por ejemplo, porque limita las IPs compartidas de Render), se pide a MET Norway
// (https://api.met.no, gratis, uso comercial permitido, licencia CC BY 4.0). A los dos se les mandan
// solo las coordenadas de la finca. El pronóstico se guarda una hora en memoria para no pedirlo de más.
const PRONOSTICO_URL = 'https://api.open-meteo.com/v1/forecast';
const MET_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';
// MET Norway pide identificar la aplicación con un User-Agent y un contacto.
const USER_AGENT = 'AgroTech/2.1 github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre';
// Mendoza no tiene horario de verano: UTC-3 todo el año.
const OFFSET_HORAS = -3;
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const CACHE_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

const cache = new Map();

// Códigos WMO que usa Open-Meteo, en palabras.
function describir(codigo) {
  if (codigo === 0) return 'Despejado';
  if (codigo <= 2) return 'Algo nublado';
  if (codigo === 3) return 'Nublado';
  if (codigo === 45 || codigo === 48) return 'Niebla';
  if (codigo >= 51 && codigo <= 57) return 'Llovizna';
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return 'Lluvia';
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return 'Nieve';
  if (codigo === 95) return 'Tormenta';
  if (codigo === 96 || codigo === 99) return 'Tormenta con granizo';
  return 'Sin dato';
}

class ErrorClima extends Error {}

// `que` dice qué se estaba consultando, para el mensaje de error. El motivo real (código y
// respuesta del servicio) queda en el log del servidor.
async function pedir(url, que, headers = {}) {
  let res;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    console.error(`[clima] ${new URL(url).host} no respondió:`, err.message);
    throw new ErrorClima(`No se pudo consultar ${que}. Probá de nuevo en un rato.`);
  }
  if (!res.ok) {
    const cuerpo = typeof res.text === 'function' ? await res.text().catch(() => '') : '';
    console.error(`[clima] ${new URL(url).host} respondió ${res.status}:`, cuerpo.slice(0, 300));
    throw new ErrorClima(`No se pudo obtener ${que}: el servicio no respondió. Probá de nuevo en un rato.`);
  }
  return res.json();
}

async function diarioOpenMeteo(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max'
    ].join(','),
    timezone: 'America/Argentina/Mendoza',
    forecast_days: '7'
  });
  const datos = await pedir(`${PRONOSTICO_URL}?${params}`, 'el pronóstico');
  if (!datos.daily || !Array.isArray(datos.daily.time)) throw new ErrorClima('El pronóstico llegó incompleto.');
  return datos.daily;
}

// Símbolo de MET Norway → código WMO (el mismo que usa Open-Meteo). MET no pronostica granizo.
function codigoMet(simbolo) {
  const s = String(simbolo || '').replace(/_(day|night|polartwilight)$/, '');
  if (!s) return null;
  if (s.includes('thunder')) return 95;
  if (s.includes('snow') || s.includes('sleet')) return 71;
  if (s.includes('rain')) return 61;
  if (s === 'fog') return 45;
  if (s === 'cloudy') return 3;
  if (s === 'partlycloudy') return 2;
  if (s === 'fair') return 1;
  if (s === 'clearsky') return 0;
  return null;
}
// Para quedarse con lo más fuerte del día: tormenta > nieve > lluvia > niebla > nublado > despejado.
const GRAVEDAD = { 95: 6, 71: 5, 61: 4, 45: 3, 3: 2, 2: 1, 1: 0.5, 0: 0 };

// MET Norway da el pronóstico por hora (y después cada 6 horas): se arma el resumen de cada día.
async function diarioMet(lat, lon) {
  const datos = await pedir(`${MET_URL}?lat=${lat}&lon=${lon}`, 'el pronóstico', { 'User-Agent': USER_AGENT });
  const serie = datos && datos.properties && datos.properties.timeseries;
  if (!Array.isArray(serie) || !serie.length) throw new ErrorClima('El pronóstico llegó incompleto.');
  const dias = new Map();
  const dia = fecha => {
    if (!dias.has(fecha))
      dias.set(fecha, { min: null, max: null, lluvia: 0, viento: null, rafagas: null, codigo: null });
    return dias.get(fecha);
  };
  const menor = (a, b) => (b === undefined || b === null ? a : a === null ? b : Math.min(a, b));
  const mayor = (a, b) => (b === undefined || b === null ? a : a === null ? b : Math.max(a, b));
  for (const t of serie) {
    const local = new Date(Date.parse(t.time) + OFFSET_HORAS * 3600000).toISOString().slice(0, 10);
    const d = dia(local);
    const ahora = (t.data.instant && t.data.instant.details) || {};
    const prox1 = t.data.next_1_hours;
    const prox6 = t.data.next_6_hours;
    d.min = menor(menor(d.min, ahora.air_temperature), prox6 && prox6.details.air_temperature_min);
    d.max = mayor(mayor(d.max, ahora.air_temperature), prox6 && prox6.details.air_temperature_max);
    if (ahora.wind_speed !== undefined) d.viento = mayor(d.viento, Math.round(ahora.wind_speed * 3.6));
    if (ahora.wind_speed_of_gust !== undefined)
      d.rafagas = mayor(d.rafagas, Math.round(ahora.wind_speed_of_gust * 3.6));
    // La lluvia se suma por hora mientras hay datos por hora, y cada 6 horas después.
    const lluvia = prox1 ? prox1.details.precipitation_amount : prox6 ? prox6.details.precipitation_amount : 0;
    d.lluvia += Number(lluvia || 0);
    const codigo = codigoMet(((prox1 || prox6 || {}).summary || {}).symbol_code);
    if (codigo !== null && (d.codigo === null || GRAVEDAD[codigo] > GRAVEDAD[d.codigo])) d.codigo = codigo;
  }
  const fechas = [...dias.keys()].sort().slice(0, 7);
  const de = campo => fechas.map(f => dias.get(f)[campo]);
  return {
    time: fechas,
    weather_code: de('codigo'),
    temperature_2m_min: de('min'),
    temperature_2m_max: de('max'),
    precipitation_sum: de('lluvia').map(l => Math.round(l * 10) / 10),
    precipitation_probability_max: fechas.map(() => null),
    wind_speed_10m_max: de('viento'),
    wind_gusts_10m_max: de('rafagas')
  };
}

// 7 días de pronóstico para unas coordenadas, con la fuente que respondió. `umbralHelada` marca los
// días con helada.
async function pronosticoConFuente(latitud, longitud, umbralHelada = 0) {
  const lat = Number(latitud).toFixed(2);
  const lon = Number(longitud).toFixed(2);
  const clave = `${lat},${lon}`;
  let guardado = cache.get(clave);
  if (!guardado || Date.now() - guardado.en > CACHE_MS) {
    let daily;
    let fuente = 'Open-Meteo';
    try {
      daily = await diarioOpenMeteo(lat, lon);
    } catch (err) {
      if (!(err instanceof ErrorClima)) throw err;
      daily = await diarioMet(lat, lon); // si este también falla, el error llega al productor
      fuente = 'MET Norway';
    }
    guardado = { en: Date.now(), daily, fuente };
    if (cache.size > 1000) cache.clear(); // cada finca es una entrada: esto no debería pasar
    cache.set(clave, guardado);
  }
  const d = guardado.daily;
  const valor = (campo, i) => (d[campo] && d[campo][i] !== undefined ? d[campo][i] : null);
  const dias = d.time.map((fecha, i) => {
    const codigo = valor('weather_code', i);
    const minima = valor('temperature_2m_min', i);
    return {
      fecha,
      codigo,
      descripcion: describir(codigo),
      minima,
      maxima: valor('temperature_2m_max', i),
      lluvia: valor('precipitation_sum', i),
      probLluvia: valor('precipitation_probability_max', i),
      viento: valor('wind_speed_10m_max', i),
      rafagas: valor('wind_gusts_10m_max', i),
      helada: minima !== null && minima <= Number(umbralHelada),
      granizo: codigo === 96 || codigo === 99,
      tormenta: codigo !== null && codigo >= 95
    };
  });
  return { dias, fuente: guardado.fuente };
}

async function pronostico(latitud, longitud, umbralHelada = 0) {
  return (await pronosticoConFuente(latitud, longitud, umbralHelada)).dias;
}

// Busca un lugar por nombre (en la Argentina) para ubicar la finca.
async function buscarLugar(texto) {
  const params = new URLSearchParams({ name: texto, count: '6', language: 'es', format: 'json', countryCode: 'AR' });
  const datos = await pedir(`${GEOCODING_URL}?${params}`, 'los lugares');
  // "Vista Flores, Tunuyán, Mendoza": sin "Departamento de" ni "Provincia de", y sin repetir.
  const corto = t => (t || '').replace(/^(Departamento|Partido|Provincia) de /i, '');
  return (datos.results || []).map(r => ({
    nombre: [...new Set([r.name, corto(r.admin2), corto(r.admin1)].filter(Boolean))].join(', '),
    latitud: r.latitude,
    longitud: r.longitude
  }));
}

const limpiarCache = () => cache.clear();

module.exports = { pronostico, pronosticoConFuente, buscarLugar, describir, codigoMet, ErrorClima, limpiarCache };
