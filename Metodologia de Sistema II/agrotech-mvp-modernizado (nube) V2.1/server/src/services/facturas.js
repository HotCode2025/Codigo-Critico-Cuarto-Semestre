const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic();

const TIPOS_IMAGEN_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const PROMPT_EXTRACCION = `Sos un asistente que lee fotos de facturas o tickets de compra de un productor agropecuario argentino.

Devolvé ÚNICAMENTE un JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{"items":[{"concepto":"string","monto":number}]}

Reglas:
- Un ítem del array por cada producto o servicio distinto que figure en la factura (no agrupes todo en un solo total).
- "concepto" es una descripción corta y clara del producto o servicio (sin código de artículo ni SKU).
- "monto" es el importe en pesos argentinos de esa línea, como número (sin el símbolo $, sin separador de miles).
- No inventes ítems que no estén en la factura. Si un dato no se entiende bien, hacé tu mejor estimación.
- Si la imagen no es una factura o no se puede leer, devolvé {"items":[]}.`;

function limpiarJSON(texto) {
  return texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function extraerItemsFactura(imagenBase64, mediaType) {
  if (!TIPOS_IMAGEN_VALIDOS.includes(mediaType)) {
    throw Object.assign(new Error('Formato de imagen no soportado'), { status: 400 });
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system: PROMPT_EXTRACCION,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imagenBase64 } },
        { type: 'text', text: 'Extraé los ítems de gasto de esta factura.' }
      ]
    }]
  });

  const bloqueTexto = response.content.find(b => b.type === 'text');
  if (!bloqueTexto) {
    throw Object.assign(new Error('La IA no devolvió una respuesta de texto'), { status: 502 });
  }

  let parseado;
  try {
    parseado = JSON.parse(limpiarJSON(bloqueTexto.text));
  } catch {
    throw Object.assign(new Error('No se pudo interpretar la respuesta de la IA'), { status: 502 });
  }

  const items = Array.isArray(parseado.items)
    ? parseado.items
        .filter(it => it && it.concepto && Number.isFinite(Number(it.monto)) && Number(it.monto) > 0)
        .map(it => ({ concepto: String(it.concepto).trim().slice(0, 120), monto: Number(it.monto) }))
    : [];

  return items;
}

module.exports = { extraerItemsFactura, Anthropic };
