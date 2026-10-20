// Agenda privada de compradores del producto elaborado. Cada productor ve solo los suyos. Las
// consultas que llegan desde la vitrina pública entran acá con origen 'vitrina'.
const router = require('express').Router();
const db = require('../db');
const { errorFecha, errorOpcion, errorTexto, esIdValido, validarIdParam } = require('../services/validar');

const ESTADOS = ['a_contactar', 'contactado', 'cotizado', 'cerrado', 'descartado'];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLUMNAS = `id, nombre, empresa, telefono, email, ciudad, interes, estado, origen, producto_id, precio_cotizado,
  notas, ultimo_contacto, creado_en`;

router.param('id', validarIdParam);

// Valida los campos que vienen y los devuelve con el nombre de la columna. `parcial` es para editar.
async function leerComprador(body, productorId, parcial = false) {
  const datos = {};
  const viene = c => body[c] !== undefined;
  if (!parcial || viene('nombre')) {
    if (!body.nombre || !String(body.nombre).trim()) return { error: 'nombre es obligatorio' };
  }
  const textos = [
    ['nombre', 120],
    ['empresa', 120],
    ['telefono', 30],
    ['email', 160],
    ['ciudad', 80],
    ['interes', 160],
    ['notas', 1000]
  ];
  for (const [campo, max] of textos) {
    if (!viene(campo)) continue;
    const e = errorTexto(body[campo], max, campo);
    if (e) return { error: e };
    datos[campo] = (body[campo] || '').trim() || null;
  }
  if (datos.email && !EMAIL_VALIDO.test(datos.email)) return { error: 'El email no es válido' };
  if (viene('estado')) {
    const e = errorOpcion(body.estado, ESTADOS, 'estado');
    if (e) return { error: e };
    datos.estado = body.estado;
  }
  if (viene('ultimoContacto')) {
    const e = errorFecha(body.ultimoContacto, 'ultimoContacto');
    if (e) return { error: e };
    datos.ultimo_contacto = body.ultimoContacto || null;
  }
  if (viene('precioCotizado')) {
    if (body.precioCotizado === null || body.precioCotizado === '') datos.precio_cotizado = null;
    else {
      const n = Number(body.precioCotizado);
      if (!Number.isFinite(n) || n <= 0) return { error: 'precioCotizado debe ser un número mayor a 0' };
      datos.precio_cotizado = n;
    }
  }
  if (viene('productoId')) {
    if (!body.productoId) datos.producto_id = null;
    else {
      const { rows } = esIdValido(body.productoId)
        ? await db.query('SELECT 1 FROM productos_vitrina WHERE id = $1 AND productor_id = $2', [
            Number(body.productoId),
            productorId
          ])
        : { rows: [] };
      if (!rows.length) return { error: 'Producto no encontrado', status: 404 };
      datos.producto_id = Number(body.productoId);
    }
  }
  return { datos };
}

router.get('/', async (req, res) => {
  const params = [req.productorId];
  let filtro = '';
  if (req.query.estado) {
    const e = errorOpcion(req.query.estado, ESTADOS, 'estado');
    if (e) return res.status(400).json({ error: e });
    params.push(req.query.estado);
    filtro = 'AND estado = $2';
  }
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} FROM compradores WHERE productor_id = $1 ${filtro} ORDER BY creado_en DESC, id DESC`,
    params
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { error, status, datos } = await leerComprador(req.body, req.productorId);
  if (error) return res.status(status || 400).json({ error });
  const columnas = ['productor_id', ...Object.keys(datos)];
  const { rows } = await db.query(
    `INSERT INTO compradores (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING ${COLUMNAS}`,
    [req.productorId, ...Object.values(datos)]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', async (req, res) => {
  const { error, status, datos } = await leerComprador(req.body, req.productorId, true);
  if (error) return res.status(status || 400).json({ error });
  const columnas = Object.keys(datos);
  if (!columnas.length) return res.status(400).json({ error: 'No hay nada para actualizar' });
  const { rows } = await db.query(
    `UPDATE compradores SET ${columnas.map((c, i) => `${c} = $${i + 1}`).join(', ')}
     WHERE id = $${columnas.length + 1} AND productor_id = $${columnas.length + 2} RETURNING ${COLUMNAS}`,
    [...Object.values(datos), Number(req.params.id), req.productorId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Comprador no encontrado' });
  res.json(rows[0]);
});

// Un contacto de la agenda no es un documento: se puede borrar.
router.delete('/:id', async (req, res) => {
  const { rows } = await db.query('DELETE FROM compradores WHERE id = $1 AND productor_id = $2 RETURNING id', [
    Number(req.params.id),
    req.productorId
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Comprador no encontrado' });
  res.json({ id: rows[0].id });
});

module.exports = router;
module.exports.ESTADOS = ESTADOS;
module.exports.EMAIL_VALIDO = EMAIL_VALIDO;
