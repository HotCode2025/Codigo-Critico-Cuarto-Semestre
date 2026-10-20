// Cada 6 horas revisa el pronóstico de los próximos 3 días de cada finca ubicada y avisa por N8N si
// viene una helada (mínima igual o menor al umbral del productor) o tormenta con granizo. Cada aviso
// (finca, día, tipo) se manda una sola vez, y solo se anota si salió. Solo se consulta el pronóstico
// de los productores que tienen N8N activo, para no pedirlo de más.
const db = require('../db');
const { notificarN8N } = require('../services/n8n');
const { pronostico } = require('../services/clima');

const INTERVALO_MS = 6 * 60 * 60 * 1000;
const DIAS = 3;

const fechaTexto = f => String(f).slice(0, 10).split('-').reverse().join('/');

async function revisarClima() {
  const { rows: fincas } = await db.query(
    `SELECT f.id, f.nombre, f.lugar, f.latitud, f.longitud, f.productor_id,
            COALESCE(cc.umbral_helada, 0) AS umbral_helada
     FROM fincas f
     JOIN config_n8n n ON n.productor_id = f.productor_id AND n.habilitado AND n.webhook_url IS NOT NULL
     LEFT JOIN config_clima cc ON cc.productor_id = f.productor_id
     WHERE f.latitud IS NOT NULL AND f.longitud IS NOT NULL AND COALESCE(cc.avisar, true)`
  );
  let avisos = 0;
  for (const f of fincas) {
    try {
      const dias = (await pronostico(f.latitud, f.longitud, Number(f.umbral_helada))).slice(0, DIAS);
      for (const d of dias) {
        for (const tipo of ['helada', 'granizo']) {
          if (!d[tipo]) continue;
          const { rows: ya } = await db.query(
            'SELECT 1 FROM avisos_clima WHERE finca_id = $1 AND fecha = $2 AND tipo = $3',
            [f.id, d.fecha, tipo]
          );
          if (ya.length) continue;
          const envio = await notificarN8N(f.productor_id, 'alerta_clima', {
            tipo,
            finca: f.nombre,
            lugar: f.lugar,
            fecha: d.fecha,
            fechaTexto: fechaTexto(d.fecha),
            minima: d.minima,
            maxima: d.maxima,
            umbral: Number(f.umbral_helada),
            descripcion: d.descripcion,
            texto:
              tipo === 'helada'
                ? `Pronóstico de helada en ${f.nombre} el ${fechaTexto(d.fecha)}: mínima de ${d.minima} °C.`
                : `Pronóstico de tormenta con granizo en ${f.nombre} el ${fechaTexto(d.fecha)}.`
          });
          if (envio && envio.success) {
            await db.query(
              'INSERT INTO avisos_clima (finca_id, fecha, tipo) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [f.id, d.fecha, tipo]
            );
            avisos += 1;
          }
        }
      }
    } catch (err) {
      console.error(`[clima-scheduler] Error con la finca ${f.id}:`, err.message);
    }
  }
  // Los avisos de días que ya pasaron no sirven más.
  await db.query("DELETE FROM avisos_clima WHERE fecha < CURRENT_DATE - INTERVAL '7 days'");
  return { fincas: fincas.length, avisos };
}

function iniciarSchedulerClima() {
  const correr = () => revisarClima().catch(err => console.error('[clima-scheduler]', err.message));
  setTimeout(correr, 60 * 1000);
  setInterval(correr, INTERVALO_MS);
}

module.exports = { iniciarSchedulerClima, revisarClima };
