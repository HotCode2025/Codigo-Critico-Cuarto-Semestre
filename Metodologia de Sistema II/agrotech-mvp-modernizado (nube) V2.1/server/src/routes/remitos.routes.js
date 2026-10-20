// Remito R por autoimpresor.
//
// Solo funciona con un talonario cargado: el CAI de autoimpresor que ARCA le da al productor al
// habilitarlo. Sin CAI el módulo queda apagado, porque un remito impreso por la app sin esa
// habilitación no tiene validez. El remito se emite desde un envío con el DTV-e ya registrado
// (primero el DTV-e, después el remito) y no lleva datos del DTV-e. Nunca se borra: se anula y su
// número queda usado.
const router = require('express').Router();
const db = require('../db');
const { errorFecha, errorOpcion, errorTexto, normalizarCuit, validarIdParam } = require('../services/validar');

const CONDICIONES_IVA = ['responsable_inscripto', 'monotributo', 'exento'];
const AVISO_DIAS = 30;
const AVISO_NUMEROS = 10;

router.param('id', validarIdParam);

// La fecha del remito es la de Argentina, no la del servidor (Render corre en UTC: después de las
// 21 h, en UTC ya es el día siguiente).
const hoy = () => new Date().toLocaleDateString('sv', { timeZone: 'America/Argentina/Buenos_Aires' });
const fechaTexto = f => (f instanceof Date ? f.toISOString().slice(0, 10) : String(f).slice(0, 10));
const diasEntre = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);

async function registrarEvento(cliente, productorId, tipo, datos) {
  await cliente.query('INSERT INTO historial_eventos (productor_id, tipo, datos) VALUES ($1, $2, $3)', [
    productorId,
    tipo,
    JSON.stringify(datos)
  ]);
}

async function talonarioActivo(cliente, productorId, bloquear = false) {
  const { rows } = await cliente.query(
    `SELECT * FROM talonarios_remito WHERE productor_id = $1 AND activo ${bloquear ? 'FOR UPDATE' : ''}`,
    [productorId]
  );
  return rows[0];
}

// Último número y fecha usados en un punto de venta, sumando todos los talonarios: si se vuelve a
// cargar el mismo CAI (por ejemplo para corregir un dato), la numeración sigue y no se repite.
async function ultimoUsado(cliente, productorId, puntoVenta) {
  const { rows } = await cliente.query(
    'SELECT MAX(numero) AS ultimo, MAX(fecha) AS ultima_fecha FROM remitos WHERE productor_id = $1 AND punto_venta = $2',
    [productorId, puntoVenta]
  );
  return { ultimo: rows[0].ultimo || 0, ultimaFecha: rows[0].ultima_fecha ? fechaTexto(rows[0].ultima_fecha) : null };
}

// Próximo número del talonario y fecha del último remito (para la correlatividad).
async function estadoNumeracion(cliente, talonario) {
  const { ultimo, ultimaFecha } = await ultimoUsado(cliente, talonario.productor_id, talonario.punto_venta);
  return { proximoNumero: Math.max(talonario.numero_desde, ultimo + 1), ultimaFecha };
}

// Datos del emisor (el membrete del remito). Devuelve { error } o { datos } con las columnas.
function leerEmisor(b) {
  const cuit = b.emisorCuit ? normalizarCuit(b.emisorCuit) : null;
  if (!cuit) return { error: 'emisorCuit no es un CUIT válido' };
  if (
    !b.emisorRazonSocial ||
    !String(b.emisorRazonSocial).trim() ||
    !b.emisorDomicilio ||
    !String(b.emisorDomicilio).trim()
  ) {
    return { error: 'emisorRazonSocial y emisorDomicilio son obligatorios' };
  }
  const error =
    errorFecha(b.emisorInicioActividades, 'emisorInicioActividades') ||
    errorOpcion(b.emisorCondicionIva, CONDICIONES_IVA, 'emisorCondicionIva') ||
    errorTexto(b.emisorRazonSocial, 120, 'emisorRazonSocial') ||
    errorTexto(b.emisorDomicilio, 160, 'emisorDomicilio') ||
    errorTexto(b.emisorIibb, 30, 'emisorIibb');
  if (error) return { error };
  return {
    datos: {
      emisor_razon_social: b.emisorRazonSocial.trim(),
      emisor_cuit: cuit,
      emisor_domicilio: b.emisorDomicilio.trim(),
      emisor_condicion_iva: b.emisorCondicionIva,
      emisor_iibb: (b.emisorIibb || '').trim() || null,
      emisor_inicio_actividades: b.emisorInicioActividades || null
    }
  };
}

function resumenTalonario(talonario, { proximoNumero }) {
  const restantes = Math.max(0, talonario.numero_hasta - proximoNumero + 1);
  const diasParaVencer = diasEntre(hoy(), fechaTexto(talonario.cai_vencimiento));
  const avisos = [];
  if (diasParaVencer < 0) avisos.push('El CAI está vencido: pedí uno nuevo al contador.');
  else if (diasParaVencer <= AVISO_DIAS) avisos.push(`El CAI vence en ${diasParaVencer} día(s).`);
  if (restantes === 0) avisos.push('Se terminaron los números del talonario: cargá un CAI nuevo.');
  else if (restantes <= AVISO_NUMEROS) avisos.push(`Quedan ${restantes} número(s) en el talonario.`);
  return { talonario, proximoNumero, restantes, diasParaVencer, avisos };
}

router.get('/talonario', async (req, res) => {
  const talonario = await talonarioActivo(db, req.productorId);
  if (!talonario) return res.json({ talonario: null });
  res.json(resumenTalonario(talonario, await estadoNumeracion(db, talonario)));
});

// Cargar el talonario con el CAI de autoimpresor. Si ya había uno, queda inactivo (sus remitos se
// conservan) y el nuevo pasa a ser el vigente.
router.post('/talonario', async (req, res) => {
  const b = req.body;
  const puntoVenta = Number(b.puntoVenta);
  const desde = Number(b.numeroDesde);
  const hasta = Number(b.numeroHasta);
  const cai = String(b.cai || '').replace(/\s/g, '');

  if (!Number.isInteger(puntoVenta) || puntoVenta < 1 || puntoVenta > 99999) {
    return res.status(400).json({ error: 'puntoVenta debe ser un número entre 1 y 99999' });
  }
  if (![desde, hasta].every(n => Number.isInteger(n) && n >= 1 && n <= 99999999) || hasta < desde) {
    return res.status(400).json({ error: 'El rango de números no es válido (desde y hasta entre 1 y 99999999)' });
  }
  if (!/^\d{14}$/.test(cai)) return res.status(400).json({ error: 'El CAI debe tener 14 dígitos' });
  if (!b.caiVencimiento) return res.status(400).json({ error: 'caiVencimiento es obligatorio' });
  const errorVto = errorFecha(b.caiVencimiento, 'caiVencimiento');
  if (errorVto) return res.status(400).json({ error: errorVto });
  if (fechaTexto(b.caiVencimiento) < hoy()) return res.status(400).json({ error: 'El CAI ya está vencido' });
  const { error, datos: emisor } = leerEmisor(b);
  if (error) return res.status(400).json({ error });

  const { ultimo } = await ultimoUsado(db, req.productorId, puntoVenta);
  if (hasta <= ultimo) {
    return res.status(409).json({
      error: `En el punto de venta ${puntoVenta} ya se usaron los números hasta el ${ultimo}: el rango de este CAI ya está usado`
    });
  }

  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('UPDATE talonarios_remito SET activo = false WHERE productor_id = $1 AND activo', [
      req.productorId
    ]);
    const { rows } = await cliente.query(
      `INSERT INTO talonarios_remito (productor_id, punto_venta, numero_desde, numero_hasta, cai, cai_vencimiento,
         emisor_razon_social, emisor_cuit, emisor_domicilio, emisor_condicion_iva, emisor_iibb, emisor_inicio_actividades)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        req.productorId,
        puntoVenta,
        desde,
        hasta,
        cai,
        b.caiVencimiento,
        emisor.emisor_razon_social,
        emisor.emisor_cuit,
        emisor.emisor_domicilio,
        emisor.emisor_condicion_iva,
        emisor.emisor_iibb,
        emisor.emisor_inicio_actividades
      ]
    );
    await registrarEvento(cliente, req.productorId, 'talonario_remito_cargado', {
      id: rows[0].id,
      punto_venta: puntoVenta,
      numero_desde: desde,
      numero_hasta: hasta
    });
    await cliente.query('COMMIT');
    res.status(201).json(resumenTalonario(rows[0], await estadoNumeracion(db, rows[0])));
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
});

// Corregir el membrete (razón social, domicilio, CUIT, IIBB, IVA, inicio de actividades) sin tocar
// el CAI ni la numeración. Vale para los remitos que se emitan desde ahora: los ya emitidos guardan
// una copia de cómo se imprimieron.
router.patch('/talonario', async (req, res) => {
  const { error, datos } = leerEmisor(req.body);
  if (error) return res.status(400).json({ error });
  const columnas = Object.keys(datos);
  const { rows } = await db.query(
    `UPDATE talonarios_remito SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE productor_id = $${columnas.length + 1} AND activo RETURNING *`,
    [...Object.values(datos), req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Todavía no cargaste el CAI de autoimpresor' });
  await registrarEvento(db, req.productorId, 'talonario_remito_emisor_editado', { id: rows[0].id, ...datos });
  res.json(resumenTalonario(rows[0], await estadoNumeracion(db, rows[0])));
});

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT r.id, r.envio_id, r.numero, r.fecha, r.estado, r.datos, r.anulado_motivo, r.creado_en
     FROM remitos r WHERE r.productor_id = $1 ORDER BY r.creado_en DESC, r.id DESC`,
    [req.productorId]
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, envio_id, numero, fecha, estado, datos, anulado_motivo, creado_en
     FROM remitos WHERE id = $1 AND productor_id = $2`,
    [Number(req.params.id), req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Remito no encontrado' });
  res.json(rows[0]);
});

// Emitir el remito de un envío. El número se toma dentro de una transacción con el talonario
// bloqueado, para que dos emisiones a la vez nunca reciban el mismo número.
router.post('/', async (req, res) => {
  const { envioId } = req.body;
  const fecha = req.body.fecha || hoy();
  if (!envioId) return res.status(400).json({ error: 'envioId es obligatorio' });
  const errorEntrada =
    errorFecha(fecha) ||
    errorTexto(req.body.destinoDomicilio, 160, 'destinoDomicilio') ||
    (req.body.destinoCondicionIva
      ? errorOpcion(req.body.destinoCondicionIva, CONDICIONES_IVA, 'destinoCondicionIva')
      : null);
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });

  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    const talonario = await talonarioActivo(cliente, req.productorId, true);
    if (!talonario) {
      await cliente.query('ROLLBACK');
      return res.status(409).json({ error: 'El remito se activa cuando cargues el CAI de autoimpresor' });
    }

    const { rows: envios } = await cliente.query(
      `SELECT e.*, l.nombre AS lote_nombre, t.descripcion AS bins_descripcion, t.marca AS bins_marca,
              t.fabrica_nombre AS bins_fabrica
       FROM envios e JOIN lotes l ON l.id = e.lote_id LEFT JOIN tipos_bin t ON t.id = e.tipo_bin_id
       WHERE e.id = $1 AND e.productor_id = $2`,
      [Number(envioId), req.productorId]
    );
    const envio = envios[0];
    const rechazar = async (status, error) => {
      await cliente.query('ROLLBACK');
      return res.status(status).json({ error });
    };
    if (!envio) return rechazar(404, 'Envío no encontrado');
    if (envio.estado === 'cargado') return rechazar(409, 'Primero registrá el DTV-e del envío, después el remito');
    if (envio.estado === 'anulado') return rechazar(409, 'El envío está anulado');
    const { rows: vigentes } = await cliente.query(
      "SELECT numero FROM remitos WHERE envio_id = $1 AND estado = 'emitido'",
      [envio.id]
    );
    if (vigentes.length) return rechazar(409, 'Este envío ya tiene un remito vigente: anulalo para emitir otro');

    const { proximoNumero, ultimaFecha } = await estadoNumeracion(cliente, talonario);
    if (fechaTexto(fecha) > fechaTexto(talonario.cai_vencimiento)) {
      return rechazar(409, 'El CAI está vencido para esa fecha: pedí uno nuevo al contador');
    }
    if (proximoNumero > talonario.numero_hasta) {
      return rechazar(409, 'Se terminaron los números del talonario: cargá un CAI nuevo');
    }
    if (ultimaFecha && fechaTexto(fecha) < ultimaFecha) {
      return rechazar(409, `La fecha no puede ser anterior a la del último remito (${ultimaFecha})`);
    }

    const datos = {
      puntoVenta: talonario.punto_venta,
      numero: proximoNumero,
      fecha: fechaTexto(fecha),
      cai: talonario.cai,
      caiVencimiento: fechaTexto(talonario.cai_vencimiento),
      emisor: {
        razonSocial: talonario.emisor_razon_social,
        cuit: talonario.emisor_cuit,
        domicilio: talonario.emisor_domicilio,
        condicionIva: talonario.emisor_condicion_iva,
        iibb: talonario.emisor_iibb,
        inicioActividades: talonario.emisor_inicio_actividades ? fechaTexto(talonario.emisor_inicio_actividades) : null
      },
      destino: {
        nombre: envio.destino_nombre,
        cuit: envio.destino_cuit,
        domicilio: (req.body.destinoDomicilio || '').trim() || null,
        condicionIva: req.body.destinoCondicionIva || null
      },
      transporte: {
        nombre: envio.transportista_nombre,
        cuit: envio.transportista_cuit,
        chofer: envio.chofer,
        patenteCamion: envio.patente_camion,
        patenteAcoplado: envio.patente_acoplado
      },
      detalle: {
        producto: envio.producto,
        origen: envio.lote_nombre,
        kg: Number(envio.kg),
        bins: envio.bins,
        // Ej: "Bins plásticos Wenco marca Ava, en comodato de Fábrica X"
        binsDescripcion: envio.bins_descripcion
          ? `${envio.bins_descripcion}${envio.bins_marca ? ` marca ${envio.bins_marca}` : ''}, en comodato de ${envio.bins_fabrica}`.slice(
              0,
              160
            )
          : null
      }
    };

    const { rows } = await cliente.query(
      `INSERT INTO remitos (productor_id, talonario_id, envio_id, punto_venta, numero, fecha, datos)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, envio_id, numero, fecha, estado, datos, anulado_motivo, creado_en`,
      [req.productorId, talonario.id, envio.id, talonario.punto_venta, proximoNumero, fecha, JSON.stringify(datos)]
    );
    await registrarEvento(cliente, req.productorId, 'remito_emitido', {
      id: rows[0].id,
      envio_id: envio.id,
      numero: proximoNumero
    });
    await cliente.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
});

router.patch('/:id/anular', async (req, res) => {
  const errorEntrada = errorTexto(req.body.motivo, 200, 'motivo');
  if (errorEntrada) return res.status(400).json({ error: errorEntrada });
  const { rows } = await db.query(
    `UPDATE remitos SET estado = 'anulado', anulado_motivo = $1
     WHERE id = $2 AND productor_id = $3 AND estado = 'emitido'
     RETURNING id, envio_id, numero, fecha, estado, datos, anulado_motivo, creado_en`,
    [(req.body.motivo || '').trim() || null, Number(req.params.id), req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Remito no encontrado o ya anulado' });
  await registrarEvento(db, req.productorId, 'remito_anulado', { id: rows[0].id, numero: rows[0].numero });
  res.json(rows[0]);
});

module.exports = router;
