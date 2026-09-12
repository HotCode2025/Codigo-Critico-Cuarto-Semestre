const db = require('../db');

// Réplica de las fórmulas financieras que antes vivían en shared.js (localStorage),
// ahora calculadas contra la base de datos.
async function getResumen(productorId) {
  const [ingresosRes, gastosRes, invertidoRes, costoFinancieroRes, rechazadosRes] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(CASE WHEN con_descuento THEN monto_neto ELSE monto END), 0) AS total
       FROM ingresos WHERE productor_id = $1 AND estado = 'normal'`,
      [productorId]
    ),
    db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM gastos
       WHERE productor_id = $1 AND estado = 'pagado'`,
      [productorId]
    ),
    db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM inversiones WHERE productor_id = $1`,
      [productorId]
    ),
    db.query(
      `SELECT COALESCE(SUM(costo_financiero), 0) AS total FROM ingresos
       WHERE productor_id = $1 AND con_descuento = true`,
      [productorId]
    ),
    db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total FROM ingresos
       WHERE productor_id = $1 AND estado = 'rechazado'`,
      [productorId]
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

async function getProyeccionLiquidez(productorId) {
  const { saldoNeto } = await getResumen(productorId);

  const [chequesRes, gastosProgRes] = await Promise.all([
    db.query(
      `SELECT monto, fecha_cobro AS fecha FROM cheques_cartera
       WHERE productor_id = $1 AND estado = 'normal' AND fecha_cobro IS NOT NULL`,
      [productorId]
    ),
    db.query(
      `SELECT concepto, monto, fecha FROM gastos
       WHERE productor_id = $1 AND estado = 'programado' AND fecha IS NOT NULL`,
      [productorId]
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
