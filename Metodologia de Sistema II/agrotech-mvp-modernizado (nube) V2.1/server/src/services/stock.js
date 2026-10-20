// Stock de insumos: el stock de cada insumo es la suma de sus movimientos (compras +, usos −,
// ajustes ±). Lo usan las rutas de stock y el cuaderno de campo, que descuenta lo aplicado.
const db = require('../db');
const { notificarN8N } = require('./n8n');

// Insumos del productor con su stock, el último precio de compra y si está bajo el mínimo.
async function insumosConStock(productorId, id = null) {
  const { rows } = await db.query(
    `SELECT i.id, i.nombre, i.categoria, i.unidad, i.principio_activo, i.carencia_dias, i.stock_minimo, i.activo, i.maquina,
            COALESCE(SUM(m.cantidad), 0) AS stock,
            (SELECT precio_unitario FROM movimientos_stock
             WHERE insumo_id = i.id AND tipo = 'compra' AND precio_unitario IS NOT NULL
             ORDER BY fecha DESC, id DESC LIMIT 1) AS ultimo_precio,
            MAX(m.fecha) AS ultimo_movimiento
     FROM insumos i LEFT JOIN movimientos_stock m ON m.insumo_id = i.id
     WHERE i.productor_id = $1 ${id ? 'AND i.id = $2' : ''}
     GROUP BY i.id ORDER BY i.activo DESC, i.nombre`,
    id ? [productorId, id] : [productorId]
  );
  return rows.map(r => ({
    ...r,
    bajo: r.stock_minimo !== null && Number(r.stock) <= Number(r.stock_minimo)
  }));
}

// Avisa por N8N una sola vez cuando un insumo queda en el mínimo o debajo, y rearma el aviso
// cuando se repone. Si N8N no está configurado, el aviso queda pendiente para la próxima vez.
async function avisarStockBajo(productorId) {
  const insumos = await insumosConStock(productorId);
  const { rows: avisados } = await db.query('SELECT id FROM insumos WHERE productor_id = $1 AND aviso_stock', [
    productorId
  ]);
  const yaAvisado = new Set(avisados.map(r => r.id));
  const repuestos = insumos.filter(i => !i.bajo && yaAvisado.has(i.id)).map(i => i.id);
  if (repuestos.length) await db.query('UPDATE insumos SET aviso_stock = false WHERE id = ANY($1)', [repuestos]);

  const nuevos = insumos.filter(i => i.bajo && i.activo && !yaAvisado.has(i.id));
  if (!nuevos.length) return { avisados: 0 };
  const envio = await notificarN8N(productorId, 'stock_bajo', {
    insumos: nuevos.map(i => ({
      nombre: i.nombre,
      unidad: i.unidad,
      stock: Number(i.stock),
      minimo: Number(i.stock_minimo)
    })),
    texto: nuevos
      .map(i => `${i.nombre}: quedan ${Number(i.stock)} ${i.unidad} (mínimo ${Number(i.stock_minimo)})`)
      .join('\n')
  });
  if (envio && envio.success) {
    await db.query('UPDATE insumos SET aviso_stock = true WHERE id = ANY($1)', [nuevos.map(i => i.id)]);
    return { avisados: nuevos.length };
  }
  return { avisados: 0 };
}

// No frena la respuesta si N8N falla: el aviso se reintenta en el próximo movimiento.
async function avisarStockBajoSinFallar(productorId) {
  try {
    await avisarStockBajo(productorId);
  } catch (err) {
    console.error('[stock] No se pudo revisar el stock bajo:', err.message);
  }
}

module.exports = { insumosConStock, avisarStockBajo, avisarStockBajoSinFallar };
