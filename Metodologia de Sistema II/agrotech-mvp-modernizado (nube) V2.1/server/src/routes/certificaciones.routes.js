// Certificaciones del campo (BPA, GlobalG.A.P., orgánica...): qué tiene la finca, cuándo vence, qué
// falta para la próxima auditoría y qué evidencia la respalda. La app no certifica: organiza lo que
// pide el certificador. El checklist arranca de una plantilla orientativa y se edita.
const router = require('express').Router();
const db = require('../db');
const { PLANTILLAS, TIPOS } = require('../services/plantillasCertificacion');
const { errorFecha, errorOpcion, errorTexto, esIdValido, validarIdParam } = require('../services/validar');

const ESTADOS = ['en_tramite', 'vigente', 'vencida', 'suspendida'];
const EVIDENCIAS = [
  'aplicacion',
  'fertilizacion',
  'riego',
  'cosecha',
  'analisis_suelo',
  'analisis_agua',
  'analisis_foliar',
  'analisis_residuos'
];
const COLUMNAS = `id, tipo, nombre, certificador, numero, alcance, fecha_emision, vencimiento, proxima_auditoria, estado,
  documento_url, publica, notas, creado_en`;

router.param('id', validarIdParam);

const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });

function leerCertificacion(body, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  if (!parcial || viene('tipo')) {
    const e = errorOpcion(body.tipo, TIPOS, 'tipo');
    if (e) return { error: e };
    datos.tipo = body.tipo;
  }
  if (viene('estado')) {
    const e = errorOpcion(body.estado, ESTADOS, 'estado');
    if (e) return { error: e };
    datos.estado = body.estado;
  }
  for (const [campo, columna, max] of [
    ['nombre', 'nombre', 120],
    ['certificador', 'certificador', 120],
    ['numero', 'numero', 60],
    ['alcance', 'alcance', 300],
    ['documentoUrl', 'documento_url', 500],
    ['notas', 'notas', 1000]
  ]) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[columna] = (body[campo] || '').trim() || null;
  }
  if (datos.documento_url && !/^https?:\/\//i.test(datos.documento_url)) {
    return { error: 'El enlace al documento tiene que empezar con http:// o https://' };
  }
  for (const [campo, columna] of [
    ['fechaEmision', 'fecha_emision'],
    ['vencimiento', 'vencimiento'],
    ['proximaAuditoria', 'proxima_auditoria']
  ]) {
    if (!viene(campo)) continue;
    const e = errorFecha(body[campo], campo);
    if (e) return { error: e };
    datos[columna] = body[campo] || null;
  }
  if (datos.fecha_emision && datos.vencimiento && datos.vencimiento < datos.fecha_emision) {
    return { error: 'El vencimiento no puede ser anterior a la emisión' };
  }
  if (viene('publica')) datos.publica = !!body.publica;
  return { datos };
}

function leerRequisito(body, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  if (!parcial || viene('texto')) {
    if (!body.texto || !String(body.texto).trim()) return { error: 'texto es obligatorio' };
  }
  for (const [campo, max] of [
    ['texto', 300],
    ['area', 80],
    ['nota', 300]
  ]) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[campo] = (body[campo] || '').trim() || null;
  }
  if (viene('evidencia')) {
    if (body.evidencia) {
      const e = errorOpcion(body.evidencia, EVIDENCIAS, 'evidencia');
      if (e) return { error: e };
    }
    datos.evidencia = body.evidencia || null;
  }
  if (viene('cumplido')) datos.cumplido = !!body.cumplido;
  if (viene('orden')) {
    const n = Number(body.orden);
    if (!Number.isInteger(n) || n < 0) return { error: 'orden debe ser un entero de 0 o más' };
    datos.orden = n;
  }
  return { datos };
}

// Certificaciones con su checklist, el % de cumplimiento y la evidencia del cuaderno de los últimos 12 meses.
async function certificacionesDe(productorId, id = null) {
  const { rows: certificaciones } = await db.query(
    `SELECT ${COLUMNAS} FROM certificaciones WHERE productor_id = $1 ${id ? 'AND id = $2' : ''}
     ORDER BY (estado = 'vigente') DESC, vencimiento NULLS LAST, id`,
    id ? [productorId, id] : [productorId]
  );
  if (!certificaciones.length) return [];
  const [{ rows: requisitos }, { rows: evidencia }] = await Promise.all([
    db.query(
      `SELECT id, certificacion_id, orden, area, texto, cumplido, evidencia, nota FROM requisitos_certificacion
       WHERE certificacion_id = ANY($1) ORDER BY orden, id`,
      [certificaciones.map(c => c.id)]
    ),
    db.query(
      // Los análisis se cuentan por lo que se analizó (analisis_agua, analisis_suelo...).
      `SELECT CASE WHEN tipo = 'analisis' THEN 'analisis_' || analisis ELSE tipo END AS tipo,
              COUNT(*)::int AS registros, MAX(fecha) AS ultimo
       FROM cuaderno_campo
       WHERE productor_id = $1 AND fecha > ($2::date - INTERVAL '12 months') GROUP BY 1`,
      [productorId, hoy()]
    )
  ]);
  const porTipo = Object.fromEntries(evidencia.map(e => [e.tipo, e]));
  return certificaciones.map(c => {
    const lista = requisitos
      .filter(r => r.certificacion_id === c.id)
      .map(r => ({ ...r, registros: r.evidencia ? porTipo[r.evidencia] || { registros: 0, ultimo: null } : null }));
    const cumplidos = lista.filter(r => r.cumplido).length;
    return {
      ...c,
      requisitos: lista,
      cumplimiento: lista.length ? Math.round((cumplidos / lista.length) * 100) : null
    };
  });
}

router.get('/plantillas', (req, res) => {
  res.json(
    Object.entries(PLANTILLAS).map(([tipo, p]) => ({
      tipo,
      nombre: p.nombre,
      aviso: p.aviso,
      requisitos: p.requisitos.length
    }))
  );
});

router.get('/', async (req, res) => {
  res.json(await certificacionesDe(req.productorId));
});

// Alta: copia el checklist de la plantilla del tipo (salvo que se pida en blanco con conPlantilla: false).
router.post('/', async (req, res) => {
  const { error, datos } = leerCertificacion(req.body);
  if (error) return res.status(400).json({ error });
  if (!datos.nombre) datos.nombre = PLANTILLAS[datos.tipo].nombre;
  const columnas = ['productor_id', ...Object.keys(datos)];
  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const { rows } = await cliente.query(
      `INSERT INTO certificaciones (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id`,
      [req.productorId, ...Object.values(datos)]
    );
    const id = rows[0].id;
    const plantilla = req.body.conPlantilla === false ? [] : PLANTILLAS[datos.tipo].requisitos;
    if (plantilla.length) {
      const valores = [];
      const tuplas = plantilla.map(([area, texto, evidencia], i) => {
        valores.push(id, i, area, texto, evidencia || null);
        const b = i * 5;
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
      });
      await cliente.query(
        `INSERT INTO requisitos_certificacion (certificacion_id, orden, area, texto, evidencia) VALUES ${tuplas.join(', ')}`,
        valores
      );
    }
    await cliente.query('COMMIT');
    res.status(201).json((await certificacionesDe(req.productorId, id))[0]);
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { error, datos } = leerCertificacion(req.body, true);
  if (error) return res.status(400).json({ error });
  // Si cambia una fecha, se vuelve a avisar por N8N cuando se acerque la nueva.
  if ('vencimiento' in datos) datos.aviso_vencimiento = null;
  if ('proxima_auditoria' in datos) datos.aviso_auditoria = null;
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  const { rows } = await db.query(
    `UPDATE certificaciones SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE id = $${columnas.length + 1} AND productor_id = $${columnas.length + 2} RETURNING id`,
    [...Object.values(datos), id, req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Certificación no encontrada' });
  res.json((await certificacionesDe(req.productorId, id))[0]);
});

router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('DELETE FROM certificaciones WHERE id = $1 AND productor_id = $2 RETURNING id', [
    Number(req.params.id),
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Certificación no encontrada' });
  res.json({ id: rows[0].id });
});

// ----- Checklist -----
async function certificacionPropia(id, productorId) {
  const { rows } = await db.query('SELECT 1 FROM certificaciones WHERE id = $1 AND productor_id = $2', [
    id,
    productorId
  ]);
  return rows.length > 0;
}

router.post('/:id/requisitos', async (req, res) => {
  const id = Number(req.params.id);
  if (!(await certificacionPropia(id, req.productorId)))
    return res.status(404).json({ error: 'Certificación no encontrada' });
  const { error, datos } = leerRequisito(req.body);
  if (error) return res.status(400).json({ error });
  if (datos.orden === undefined) {
    const { rows } = await db.query(
      'SELECT COALESCE(MAX(orden) + 1, 0) AS orden FROM requisitos_certificacion WHERE certificacion_id = $1',
      [id]
    );
    datos.orden = rows[0].orden;
  }
  const columnas = ['certificacion_id', ...Object.keys(datos)];
  const { rows } = await db.query(
    `INSERT INTO requisitos_certificacion (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING id, orden, area, texto, cumplido, evidencia, nota`,
    [id, ...Object.values(datos)]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id/requisitos/:requisito', async (req, res) => {
  if (!esIdValido(req.params.requisito)) return res.status(404).json({ error: 'Requisito no encontrado' });
  const { error, datos } = leerRequisito(req.body, true);
  if (error) return res.status(400).json({ error });
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  const { rows } = await db.query(
    `UPDATE requisitos_certificacion r SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     FROM certificaciones c
     WHERE r.id = $${columnas.length + 1} AND r.certificacion_id = $${columnas.length + 2}
       AND c.id = r.certificacion_id AND c.productor_id = $${columnas.length + 3}
     RETURNING r.id, r.orden, r.area, r.texto, r.cumplido, r.evidencia, r.nota`,
    [...Object.values(datos), Number(req.params.requisito), Number(req.params.id), req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Requisito no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id/requisitos/:requisito', async (req, res) => {
  if (!esIdValido(req.params.requisito)) return res.status(404).json({ error: 'Requisito no encontrado' });
  const { rows } = await db.query(
    `DELETE FROM requisitos_certificacion r USING certificaciones c
     WHERE r.id = $1 AND r.certificacion_id = $2 AND c.id = r.certificacion_id AND c.productor_id = $3 RETURNING r.id`,
    [Number(req.params.requisito), Number(req.params.id), req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Requisito no encontrado' });
  res.json({ id: rows[0].id });
});

module.exports = router;
