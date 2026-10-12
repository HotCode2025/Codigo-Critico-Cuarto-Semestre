const router = require('express').Router();
const { getResumen, getProyeccionLiquidez } = require('../services/resumen');
const { validarFiltrosId } = require('../services/validar');

router.use(validarFiltrosId('fincaId'));

router.get('/', async (req, res) => {
  res.json(await getResumen(req.productorId, req.query.fincaId || null));
});

router.get('/proyeccion', async (req, res) => {
  res.json(await getProyeccionLiquidez(req.productorId, req.query.fincaId || null));
});

module.exports = router;
