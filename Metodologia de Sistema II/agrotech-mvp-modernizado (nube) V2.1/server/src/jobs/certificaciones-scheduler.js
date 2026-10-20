// Avisa por N8N cuando se acerca el vencimiento o la próxima auditoría de una certificación: una vez
// a los 60 días y otra a los 30. Lo enviado se anota en la certificación para no repetir el aviso
// (si el productor cambia la fecha, se borra y vuelve a avisar). También pasa a "vencida" la
// certificación vigente cuya fecha ya pasó.
const db = require('../db');
const { notificarN8N } = require('../services/n8n');

const INTERVALO_MS = 6 * 60 * 60 * 1000;

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });

// '30' es más urgente que '60': solo se avisa si el umbral alcanzado todavía no se avisó.
function umbral(dias) {
  if (dias < 0) return null;
  if (dias <= 30) return '30';
  if (dias <= 60) return '60';
  return null;
}

async function revisarCertificaciones() {
  await db.query("UPDATE certificaciones SET estado = 'vencida' WHERE estado = 'vigente' AND vencimiento < $1::date", [
    hoy()
  ]);

  const { rows } = await db.query(
    `SELECT id, productor_id, tipo, nombre, vencimiento, proxima_auditoria, aviso_vencimiento, aviso_auditoria,
            (vencimiento - $1::date) AS dias_vencimiento, (proxima_auditoria - $1::date) AS dias_auditoria
     FROM certificaciones
     WHERE estado IN ('vigente', 'en_tramite')
       AND ((vencimiento BETWEEN $1::date AND $1::date + 60) OR (proxima_auditoria BETWEEN $1::date AND $1::date + 60))`,
    [hoy()]
  );

  for (const c of rows) {
    for (const [que, dias, columna, avisado] of [
      ['vencimiento', c.dias_vencimiento, 'aviso_vencimiento', c.aviso_vencimiento],
      ['auditoria', c.dias_auditoria, 'aviso_auditoria', c.aviso_auditoria]
    ]) {
      const u = dias === null ? null : umbral(dias);
      if (!u || avisado === u || (avisado === '30' && u === '60')) continue;
      try {
        const envio = await notificarN8N(c.productor_id, 'certificacion_por_vencer', {
          certificacion: c.nombre,
          tipo: c.tipo,
          que,
          fecha: que === 'vencimiento' ? c.vencimiento : c.proxima_auditoria,
          dias
        });
        // Solo se anota si salió: si el productor configura N8N más tarde, el aviso llega igual.
        if (envio && envio.success)
          await db.query(`UPDATE certificaciones SET ${columna} = $1 WHERE id = $2`, [u, c.id]);
      } catch (err) {
        console.error(`[certificaciones-scheduler] Error con la certificación ${c.id}:`, err.message);
      }
    }
  }
}

function iniciarSchedulerCertificaciones() {
  const correr = () => revisarCertificaciones().catch(err => console.error('[certificaciones-scheduler]', err.message));
  setTimeout(correr, 30 * 1000);
  setInterval(correr, INTERVALO_MS);
}

module.exports = { iniciarSchedulerCertificaciones, revisarCertificaciones, umbral };
