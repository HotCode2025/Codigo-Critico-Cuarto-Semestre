// Pronóstico del clima por finca con Open-Meteo (https://open-meteo.com): gratis y sin clave, solo
// para uso no comercial (si AgroTech se vende, hay que pasar a su plan pago). Se le mandan solo las
// coordenadas de la finca. El pronóstico se guarda una hora en memoria para no pedirlo de más.
const PRONOSTICO_URL = 'https://api.open-meteo.com/v1/forecast';
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

// `que` dice qué se estaba consultando, para el mensaje de error.
async function pedir(url, que) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ErrorClima(`No se pudo consultar ${que}. Probá de nuevo en un rato.`);
  }
  if (!res.ok) throw new ErrorClima(`El servicio de ${que} no respondió. Probá de nuevo en un rato.`);
  return res.json();
}

// 7 días de pronóstico para unas coordenadas. `umbralHelada` marca los días con helada.
async function pronostico(latitud, longitud, umbralHelada = 0) {
  const lat = Number(latitud).toFixed(2);
  const lon = Number(longitud).toFixed(2);
  const clave = `${lat},${lon}`;
  let guardado = cache.get(clave);
  if (!guardado || Date.now() - guardado.en > CACHE_MS) {
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
    guardado = { en: Date.now(), daily: datos.daily };
    if (cache.size > 1000) cache.clear(); // cada finca es una entrada: esto no debería pasar
    cache.set(clave, guardado);
  }
  const d = guardado.daily;
  const valor = (campo, i) => (d[campo] && d[campo][i] !== undefined ? d[campo][i] : null);
  return d.time.map((fecha, i) => {
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

module.exports = { pronostico, buscarLugar, describir, ErrorClima, limpiarCache };
