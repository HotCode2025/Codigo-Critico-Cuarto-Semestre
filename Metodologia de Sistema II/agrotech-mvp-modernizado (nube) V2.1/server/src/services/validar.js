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
  if (typeof valor !== 'string') return `${campo} debe ser texto`;
  return valor.trim().length > max ? `${campo} no puede superar los ${max} caracteres` : null;
}

// Un id (de lote, finca...) tiene que ser un entero positivo que entre en un int4 de Postgres.
function esIdValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 && n <= 2147483647;
}

// Filtros opcionales de la query (?fincaId=1&loteId=2): si vienen, tienen que ser ids válidos.
function validarFiltrosId(...campos) {
  return (req, res, next) => {
    for (const campo of campos) {
      const valor = req.query[campo];
      if (valor !== undefined && valor !== '' && !esIdValido(valor)) {
        return res.status(400).json({ error: `${campo} debe ser un número válido` });
      }
    }
    next();
  };
}

function errorArea(area) {
  if (area === undefined || area === null || area === '') return null;
  const n = Number(area);
  return Number.isFinite(n) && n > 0 && n < 1000000 ? null : 'area debe ser un número mayor a 0 y menor a 1.000.000';
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

module.exports = {
  errorMonto,
  errorFecha,
  errorOpcion,
  errorTexto,
  errorArea,
  esIdValido,
  validarFiltrosId,
  validarIdParam
};
