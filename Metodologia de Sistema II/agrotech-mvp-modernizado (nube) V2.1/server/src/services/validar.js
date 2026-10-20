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

// CUIT: 11 dígitos con el dígito verificador de ARCA (módulo 11). Acepta guiones y espacios.
// Devuelve el CUIT limpio (solo dígitos) o null si no es válido.
function normalizarCuit(valor) {
  const cuit = String(valor).replace(/[\s-]/g, '');
  if (!/^\d{11}$/.test(cuit)) return null;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((s, p, i) => s + p * Number(cuit[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto;
  return verificador !== 10 && verificador === Number(cuit[10]) ? cuit : null;
}

// Patente argentina: formato viejo (AAA123) o Mercosur (AA123BB). Acepta minúsculas, espacios
// y guiones. Devuelve la patente en mayúsculas y sin separadores, o null si no es válida.
function normalizarPatente(valor) {
  const patente = String(valor).replace(/[\s-]/g, '').toUpperCase();
  return /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(patente) ? patente : null;
}

module.exports = {
  normalizarCuit,
  normalizarPatente,
  errorMonto,
  errorFecha,
  errorOpcion,
  errorTexto,
  errorArea,
  esIdValido,
  validarFiltrosId,
  validarIdParam
};
