const db = require('../db');

// Réplica de las fórmulas financieras que antes vivían en shared.js (localStorage),
// ahora calculadas contra la base de datos. fincaId es opcional: si se pasa, ingresos
// y gastos se filtran a esa finca (via join con lotes). Inversiones y cheques en
// cartera no están atados a un lote/finca puntual, así que se mantienen a nivel
// productor sin importar la finca seleccionada.
async function getResumen(productorId, fincaId) {
  const params = fincaId ? [productorId, fincaId] : [productorId];
  const joinIngresos = fincaId ? 'JOIN lotes l ON l.id = i.lote_id' : '';
  const filtroIngresos = fincaId ? 'AND l.finca_id = $2' : '';
  const joinGastos = fincaId ? 'JOIN lotes l ON l.id = g.lote_id' : '';
  const filtroGastos = fincaId ? 'AND l.finca_id = $2' : '';

  const [ingresosRes, gastosRes, invertidoRes, costoFinancieroRes, rechazadosRes] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(CASE WHEN i.con_descuento THEN i.monto_neto ELSE i.monto END), 0) AS total
       FROM ingresos i ${joinIngresos}
       WHERE i.productor_id = $1 AND i.estado = 'normal' ${filtroIngresos}`,
      params
    ),
    db.query(
      `SELECT COALESCE(SUM(g.monto), 0) AS total FROM gastos g ${joinGastos}
       WHERE g.productor_id = $1 AND g.estado = 'pagado' ${filtroGastos}`,
      params
    ),
    db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM inversiones WHERE productor_id = $1`,
      [productorId]
    ),
    db.query(
      `SELECT COALESCE(SUM(i.costo_financiero), 0) AS total FROM ingresos i ${joinIngresos}
       WHERE i.productor_id = $1 AND i.con_descuento = true ${filtroIngresos}`,
      params
    ),
    db.query(
      `SELECT COALESCE(SUM(i.monto), 0) AS total FROM ingresos i ${joinIngresos}
       WHERE i.productor_id = $1 AND i.estado = 'rechazado' ${filtroIngresos}`,
      params
    )
  ]);

  const totalIngresos = Number(ingresosRes.rows[0].total);
  const totalGastos = Number(gastosRes.rows[0].total);
  const totalInvertido = Number(invertidoRes.rows[0].total);
  const costoFinanciero = Number(costoFinancieroRes.rows[0].total);
  const chequesRechazados = Number(rechazadosRes.rows[0].total);

  const margenBruto = totalIngresos - totalGastos;
  const saldoNeto = totalIngresos - totalGastos - totalInvertido;
  const resultadoNeto = margenBruto - costoFinanciero - chequesRechazados;

  return { totalIngresos, totalGastos, totalInvertido, margenBruto, saldoNeto, resultadoNeto };
}

async function getProyeccionLiquidez(productorId, fincaId) {
  const { saldoNeto } = await getResumen(productorId, fincaId);

  const params = fincaId ? [productorId, fincaId] : [productorId];
  const joinCheques = fincaId ? 'JOIN ingresos i ON i.id = c.ingreso_id JOIN lotes l ON l.id = i.lote_id' : '';
  const filtroCheques = fincaId ? 'AND l.finca_id = $2' : '';
  const joinGastos = fincaId ? 'JOIN lotes l ON l.id = g.lote_id' : '';
  const filtroGastos = fincaId ? 'AND l.finca_id = $2' : '';

  const [chequesRes, gastosProgRes] = await Promise.all([
    db.query(
      `SELECT c.monto, c.fecha_cobro AS fecha FROM cheques_cartera c ${joinCheques}
       WHERE c.productor_id = $1 AND c.estado = 'normal' AND c.fecha_cobro IS NOT NULL ${filtroCheques}`,
      params
    ),
    db.query(
      `SELECT g.concepto, g.monto, g.fecha FROM gastos g ${joinGastos}
       WHERE g.productor_id = $1 AND g.estado = 'programado' AND g.fecha IS NOT NULL ${filtroGastos}`,
      params
    )
  ]);

  const eventos = [
    ...chequesRes.rows.map(c => ({
      fecha: c.fecha, monto: Number(c.monto), tipo: 'ingreso', desc: 'Cheque a cobrar', icono: '🏦'
    })),
    ...gastosProgRes.rows.map(g => ({
      fecha: g.fecha, monto: -Number(g.monto), tipo: 'gasto', desc: g.concepto, icono: '💸'
    }))
  ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let simulacion = saldoNeto;
  let ruptura = null;
  for (const evt of eventos) {
    simulacion += evt.monto;
    if (simulacion < 0 && evt.tipo === 'gasto' && !ruptura) {
      ruptura = { fecha: evt.fecha, saldo: simulacion };
      break;
    }
  }

  return { saldoNeto, eventos, ruptura };
}

module.exports = { getResumen, getProyeccionLiquidez };
