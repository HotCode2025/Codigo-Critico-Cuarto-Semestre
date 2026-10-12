// Validaciones de entrada compartidas: devuelven un mensaje de error o null.
// Sin ellas, un valor inválido llega hasta un CHECK de Postgres y la API responde 500 en vez de 400.

function errorMonto(monto) {
  const n = Number(monto);
  return Number.isFinite(n) && n > 0 ? null : 'El monto debe ser un número mayor a 0';
}

function errorFecha(fecha, campo = 'fecha') {
  if (fecha === undefined || fecha === null || fecha === '') return null;
  // Acepta AAAA-MM-DD y también el ISO con hora (así devuelve la API las fechas, y así las reenvía la importación).
  const valida = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(fecha) && !Number.isNaN(Date.parse(fecha));
  return valida ? null : `${campo} debe tener formato AAAA-MM-DD`;
}

function errorOpcion(valor, opciones, campo) {
  return opciones.includes(valor) ? null : `${campo} debe ser uno de: ${opciones.join(', ')}`;
}

function errorTexto(valor, max, campo) {
  if (valor === undefined || valor === null) return null;
  return String(valor).trim().length > max ? `${campo} no puede superar los ${max} caracteres` : null;
}

// Para router.param('id', ...): un id que no es un entero positivo de Postgres (int4) no
// puede existir, así que se responde 404 en vez de dejar que la consulta falle con un 500.
function validarIdParam(req, res, next, id) {
  const n = Number(id);
  if (!/^\d+$/.test(id) || n <= 0 || n > 2147483647) {
    return res.status(404).json({ error: 'No encontrado' });
  }
  next();
}

module.exports = { errorMonto, errorFecha, errorOpcion, errorTexto, validarIdParam };
