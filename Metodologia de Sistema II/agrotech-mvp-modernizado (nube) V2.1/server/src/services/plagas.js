const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic();

const TIPOS_IMAGEN_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const PROMPT_DIAGNOSTICO = `Sos un asistente que ayuda a productores agropecuarios argentinos (vid, durazno, olivo, etc.) a revisar fotos de sus plantas en busca de signos de plaga o enfermedad.

Devolvé ÚNICAMENTE un JSON válido, sin texto adicional ni markdown, con esta forma exacta:
{"tieneProblema":boolean,"diagnostico":"string corto","descripcion":"string","tratamientoSugerido":"string o null"}

Reglas:
- "diagnostico" es un título corto (ej. "Posible oídio", "Hoja sana", "No se pudo determinar").
- "descripcion" son 2-3 frases describiendo lo que se ve en la imagen, en lenguaje simple.
- Si no hay signos claros de plaga o enfermedad, "tieneProblema" debe ser false y "tratamientoSugerido" null.
- "tratamientoSugerido", cuando aplica, es una orientación general (tipo de producto o principio activo, NUNCA una marca comercial) y SIEMPRE debe terminar con "Confirmá con un ingeniero agrónomo antes de aplicar cualquier producto."
- Si la imagen no muestra una planta o no se puede analizar, "tieneProblema" debe ser false y "diagnostico" debe decirlo.`;

function limpiarJSON(texto) {
  return texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
}

async function diagnosticarPlanta(imagenBase64, mediaType) {
  if (!TIPOS_IMAGEN_VALIDOS.includes(mediaType)) {
    throw Object.assign(new Error('Formato de imagen no soportado'), { status: 400 });
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: PROMPT_DIAGNOSTICO,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imagenBase64 } },
        { type: 'text', text: 'Revisá esta foto de la planta.' }
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

  return {
    tieneProblema: !!parseado.tieneProblema,
    diagnostico: String(parseado.diagnostico || '').slice(0, 120),
    descripcion: String(parseado.descripcion || '').slice(0, 500),
    tratamientoSugerido: parseado.tratamientoSugerido ? String(parseado.tratamientoSugerido).slice(0, 500) : null
  };
}

module.exports = { diagnosticarPlanta, Anthropic };
