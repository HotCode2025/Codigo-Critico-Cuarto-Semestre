// A dónde va la plata de una compra o de un service: a un cuartel, repartida entre los cuarteles por
// hectárea, unida a un gasto ya cargado o a ningún lado. Lo usan el stock y la maquinaria.
const { errorFecha, errorOpcion, esIdValido } = require('./validar');

const MODOS_GASTO = ['ninguno', 'cuartel', 'repartir', 'existente'];

const redondear = n => Math.round(n * 100) / 100;

// Reparte un total entre cuarteles según la superficie (si ninguno tiene superficie, en partes
// iguales). Los centavos que sobran van al último, así la suma da exacto.
function repartir(total, lotes) {
  const conArea = lotes.filter(l => Number(l.area) > 0);
  const base = conArea.length ? conArea : lotes;
  const peso = l => (conArea.length ? Number(l.area) : 1);
  const totalPeso = base.reduce((s, l) => s + peso(l), 0);
  let asignado = 0;
  return base.map((l, i) => {
    const monto = i === base.length - 1 ? redondear(total - asignado) : redondear((total * peso(l)) / totalPeso);
    asignado = redondear(asignado + monto);
    return { loteId: l.id, monto };
  });
}

// Valida a dónde va la plata de la compra: { modo, loteId, fincaId, gastoId, estado, vence }.
function leerGasto(g, modos = MODOS_GASTO) {
  if (!g || g.modo === undefined || g.modo === 'ninguno') return { modo: 'ninguno' };
  const e = errorOpcion(g.modo, modos, 'gasto.modo');
  if (e) return { error: e };
  if (g.modo === 'existente') {
    if (!esIdValido(g.gastoId)) return { error: 'Elegí el gasto que ya cargaste' };
    return { modo: 'existente', gastoId: Number(g.gastoId) };
  }
  const estado = g.estado || 'pagado';
  const eEstado = errorOpcion(estado, ['pagado', 'programado'], 'gasto.estado');
  if (eEstado) return { error: eEstado };
  if (estado === 'programado') {
    if (!g.vence) return { error: 'Poné cuándo vence el pago' };
    const eVence = errorFecha(g.vence, 'gasto.vence');
    if (eVence) return { error: eVence };
  }
  if (g.modo === 'cuartel' && !esIdValido(g.loteId)) return { error: 'Elegí el cuartel del gasto' };
  if (g.fincaId !== undefined && g.fincaId !== null && g.fincaId !== '' && !esIdValido(g.fincaId)) {
    return { error: 'fincaId no es válido' };
  }
  return {
    modo: g.modo,
    estado,
    vence: estado === 'programado' ? g.vence : null,
    loteId: g.modo === 'cuartel' ? Number(g.loteId) : null,
    fincaId: g.fincaId ? Number(g.fincaId) : null
  };
}

// Partes del gasto { loteId, monto } para el modo cuartel o repartir, o { status, error }.
async function partesDelGasto(cliente, productorId, gasto, total) {
  if (gasto.modo === 'cuartel') {
    const { rows } = await cliente.query('SELECT id FROM lotes WHERE id = $1 AND productor_id = $2 AND activo', [
      gasto.loteId,
      productorId
    ]);
    if (!rows[0]) return { status: 404, error: 'Cuartel no encontrado' };
    return { partes: [{ loteId: gasto.loteId, monto: redondear(total) }] };
  }
  const { rows: lotes } = await cliente.query(
    `SELECT id, area FROM lotes WHERE productor_id = $1 AND activo ${gasto.fincaId ? 'AND finca_id = $2' : ''} ORDER BY id`,
    gasto.fincaId ? [productorId, gasto.fincaId] : [productorId]
  );
  if (!lotes.length) return { status: 400, error: 'No hay cuarteles para repartir el gasto' };
  return { partes: repartir(total, lotes).filter(p => p.monto > 0) };
}

module.exports = { MODOS_GASTO, leerGasto, partesDelGasto, repartir, redondear };
