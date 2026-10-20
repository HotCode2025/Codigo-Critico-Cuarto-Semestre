const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { loginLimiter } = require('../middleware/rateLimit');

// Derecho de acceso: todo lo que AgroTech guarda del productor, en un JSON descargable.
// Nunca incluye el hash de la contraseña ni los tokens de recuperación.
router.get('/exportar', async (req, res) => {
  const id = req.productorId;
  const consulta = async sql => (await db.query(sql, [id])).rows;

  const [
    perfil,
    fincas,
    lotes,
    gastos,
    ingresos,
    cartera,
    inversiones,
    historial,
    configN8n,
    alertas,
    trueques,
    envios,
    talonarios,
    remitos,
    vitrina,
    productosVitrina,
    compradores,
    preciosInsumos,
    cuaderno,
    certificaciones,
    requisitos,
    cosecheros,
    tarifasCosecha,
    tarjas,
    insumos,
    movimientosStock
  ] = await Promise.all([
    consulta('SELECT id, nombre, email, telefono, zona, cultivo_principal, creado_en FROM productores WHERE id = $1'),
    consulta('SELECT * FROM fincas WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM lotes WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM gastos WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM ingresos WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM cheques_cartera WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM inversiones WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM historial_eventos WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT webhook_url, habilitado, actualizado_en FROM config_n8n WHERE productor_id = $1'),
    consulta('SELECT * FROM alertas_red WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM trueques WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM envios WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM talonarios_remito WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM remitos WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM vitrinas WHERE productor_id = $1'),
    consulta('SELECT * FROM productos_vitrina WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM compradores WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM precios_insumos WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM cuaderno_campo WHERE productor_id = $1 ORDER BY fecha, id'),
    consulta('SELECT * FROM certificaciones WHERE productor_id = $1 ORDER BY id'),
    consulta(
      'SELECT r.* FROM requisitos_certificacion r JOIN certificaciones c ON c.id = r.certificacion_id WHERE c.productor_id = $1 ORDER BY r.id'
    ),
    consulta('SELECT * FROM cosecheros WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM tarifas_cosecha WHERE productor_id = $1 ORDER BY modalidad'),
    consulta('SELECT * FROM tarjas WHERE productor_id = $1 ORDER BY fecha, id'),
    consulta('SELECT * FROM insumos WHERE productor_id = $1 ORDER BY id'),
    consulta('SELECT * FROM movimientos_stock WHERE productor_id = $1 ORDER BY fecha, id')
  ]);

  const hoy = new Date().toISOString().slice(0, 10);
  res.set('Content-Disposition', `attachment; filename="agrotech-mis-datos-${hoy}.json"`);
  res.json({
    exportadoEn: new Date().toISOString(),
    perfil: perfil[0],
    fincas,
    lotes,
    gastos,
    ingresos,
    carteraCheques: cartera,
    inversiones,
    historial,
    configuracionN8n: configN8n[0] || null,
    alertasPublicadas: alertas,
    truequesPublicados: trueques,
    envios,
    talonariosRemito: talonarios,
    remitos,
    vitrina: vitrina[0] || null,
    productosVitrina,
    compradores,
    preciosInsumos,
    cuadernoDeCampo: cuaderno,
    certificaciones: certificaciones.map(c => ({
      ...c,
      requisitos: requisitos.filter(r => r.certificacion_id === c.id)
    })),
    cosecheros,
    tarifasCosecha,
    tarjas,
    insumos,
    movimientosStock
  });
});

// Derecho de supresión: borra la cuenta y, por ON DELETE CASCADE, todo lo que colgaba de ella
// (fincas, cuarteles, gastos, ingresos, cartera, inversiones, historial, configuración,
// alertas y trueques publicados). No se puede deshacer, por eso pide la contraseña.
// Responde 403 (no 401) si la contraseña no coincide, para que el cliente no cierre la sesión.
router.delete('/', loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Ingresá tu contraseña para confirmar' });
  }

  const { rows } = await db.query('SELECT password_hash FROM productores WHERE id = $1', [req.productorId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (!(await bcrypt.compare(password, rows[0].password_hash))) {
    return res.status(403).json({ error: 'La contraseña no es correcta' });
  }

  await db.query('DELETE FROM productores WHERE id = $1', [req.productorId]);
  res.json({ message: 'Tu cuenta y todos tus datos fueron eliminados' });
});

module.exports = router;
