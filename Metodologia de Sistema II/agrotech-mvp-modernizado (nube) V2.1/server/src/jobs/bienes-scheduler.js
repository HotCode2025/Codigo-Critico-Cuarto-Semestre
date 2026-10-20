// Cada 6 horas revisa la maquinaria y avisa por N8N cuando se acerca el service (15 días antes) o el
// vencimiento del seguro o de la patente/VTV (30 días antes), y cuando ya pasaron. Se guarda la fecha
// avisada: si el productor la cambia (o registra el service), se vuelve a avisar con la nueva.
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

const INTERVALO_MS = 6 * 60 * 60 * 1000;

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const fechaTexto = f => String(f).slice(0, 10).split('-').reverse().join('/');

const AVISOS = [
  { que: 'service', fecha: 'proximo_service', columna: 'aviso_service', antes: 15, texto: 'el service' },
  { que: 'seguro', fecha: 'seguro_vence', columna: 'aviso_seguro', antes: 30, texto: 'el seguro' },
  { que: 'patente', fecha: 'patente_vence', columna: 'aviso_patente', antes: 30, texto: 'la patente / VTV' }
];

async function revisarBienes() {
  const { rows } = await db.query(
    `SELECT id, productor_id, nombre, aviso_service, aviso_seguro, aviso_patente,
            to_char(seguro_vence, 'YYYY-MM-DD') AS seguro_vence, to_char(patente_vence, 'YYYY-MM-DD') AS patente_vence,
            to_char((ultimo_service + make_interval(months => service_cada_meses))::date, 'YYYY-MM-DD') AS proximo_service,
            to_char(aviso_service, 'YYYY-MM-DD') AS avisado_service, to_char(aviso_seguro, 'YYYY-MM-DD') AS avisado_seguro,
            to_char(aviso_patente, 'YYYY-MM-DD') AS avisado_patente
     FROM bienes WHERE estado <> 'baja'`
  );
  const hoyTexto = hoy();
  let avisos = 0;
  for (const b of rows) {
    for (const a of AVISOS) {
      const fecha = b[a.fecha];
      if (!fecha || b[`avisado_${a.que}`] === fecha) continue;
      const dias = Math.round((Date.parse(fecha) - Date.parse(hoyTexto)) / 86400000);
      if (dias > a.antes) continue;
      try {
        const envio = await notificarN8N(b.productor_id, 'aviso_maquinaria', {
          bien: b.nombre,
          que: a.que,
          fecha,
          fechaTexto: fechaTexto(fecha),
          dias,
          texto:
            dias < 0
              ? `${b.nombre}: ${a.texto} venció el ${fechaTexto(fecha)}.`
              : `${b.nombre}: ${a.texto} vence el ${fechaTexto(fecha)} (en ${dias} días).`
        });
        if (envio && envio.success) {
          await db.query(`UPDATE bienes SET ${a.columna} = $1 WHERE id = $2`, [fecha, b.id]);
          avisos += 1;
        }
      } catch (err) {
        console.error(`[bienes-scheduler] Error con el bien ${b.id}:`, err.message);
      }
    }
  }
  return { avisos };
}

function iniciarSchedulerBienes() {
  const correr = () => revisarBienes().catch(err => console.error('[bienes-scheduler]', err.message));
  setTimeout(correr, 90 * 1000);
  setInterval(correr, INTERVALO_MS);
}

module.exports = { iniciarSchedulerBienes, revisarBienes };
