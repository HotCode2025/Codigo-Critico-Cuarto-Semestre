// Plantillas de checklist para arrancar una certificación. Son ORIENTATIVAS: resumen, con palabras
// propias, los temas que suelen pedir estas normas; no reemplazan el checklist oficial ni el de la
// certificadora, que cambian entre versiones. Al crear la certificación se copian y se editan.
// `evidencia` enlaza el requisito con un tipo de registro del cuaderno de campo.

const PLANTILLAS = {
  bpa: {
    nombre: 'Buenas Prácticas Agrícolas (BPA)',
    aviso: 'Orientativa: completala con lo que pida el SENASA o tu certificadora.',
    requisitos: [
      [
        'Registros',
        'Registro de cada aplicación de fitosanitarios (producto, dosis, cuartel, fecha y aplicador)',
        'aplicacion'
      ],
      ['Registros', 'Registro de las fertilizaciones', 'fertilizacion'],
      ['Registros', 'Registro de riego', 'riego'],
      ['Registros', 'Trazabilidad: cada cosecha identificada con cuartel y fecha', 'cosecha'],
      ['Fitosanitarios', 'Usar solo productos registrados en el SENASA para el cultivo'],
      ['Fitosanitarios', 'Respetar el período de carencia antes de cosechar'],
      ['Fitosanitarios', 'Depósito de agroquímicos ordenado, ventilado, señalizado y con llave'],
      ['Fitosanitarios', 'Triple lavado de envases vacíos y entrega en un centro de acopio'],
      ['Fitosanitarios', 'Equipo de aplicación calibrado y en buen estado'],
      ['Personal', 'Aplicadores capacitados y con elementos de protección personal'],
      ['Personal', 'Higiene en cosecha: baños, lavado de manos y envases limpios'],
      ['Agua', 'Análisis del agua usada para riego y aplicaciones', 'analisis_agua'],
      ['Administración', 'Inscripción en el RENSPA al día']
    ]
  },
  globalgap: {
    nombre: 'GlobalG.A.P. (frutas y hortalizas)',
    aviso:
      'Orientativa: los puntos de control oficiales los define la versión vigente de la norma; usá el checklist de tu certificadora.',
    requisitos: [
      ['Gestión', 'Autoevaluación o inspección interna anual'],
      ['Gestión', 'Mapa de la finca con los cuarteles identificados'],
      ['Gestión', 'Evaluación de riesgos del sitio (suelo, agua, vecinos, historia del terreno)'],
      ['Trazabilidad', 'Producto identificado y separado por cuartel y fecha de cosecha', 'cosecha'],
      ['Trazabilidad', 'Procedimiento de retiro de producto probado al menos una vez al año'],
      ['Trazabilidad', 'Procedimiento para recibir y responder reclamos'],
      ['Personal', 'Capacitación del personal, primeros auxilios y elementos de protección'],
      ['Personal', 'Higiene en cosecha y manipulación del producto'],
      ['Suelo y nutrición', 'Análisis de suelo o foliar para decidir la fertilización', 'analisis_suelo'],
      ['Suelo y nutrición', 'Registros de fertilización con la cantidad y el método', 'fertilizacion'],
      ['Agua', 'Origen del agua, evaluación de riesgo y registros de riego', 'riego'],
      ['Agua', 'Análisis del agua según el riesgo evaluado', 'analisis_agua'],
      ['Protección del cultivo', 'Manejo integrado de plagas documentado'],
      [
        'Protección del cultivo',
        'Registros de aplicaciones con la justificación técnica y el responsable',
        'aplicacion'
      ],
      [
        'Protección del cultivo',
        'Carencias respetadas y límites de residuos del país de destino; análisis de residuos',
        'analisis_residuos'
      ],
      ['Protección del cultivo', 'Almacenamiento seguro de fitosanitarios y manejo de envases vacíos'],
      ['Material de propagación', 'Origen de las plantas documentado (vivero)']
    ]
  },
  organica: {
    nombre: 'Producción orgánica',
    aviso: 'Orientativa: los requisitos los fija la normativa de producción orgánica y tu certificadora.',
    requisitos: [
      ['Manejo', 'Plan de manejo orgánico de la finca'],
      ['Manejo', 'Solo insumos permitidos para producción orgánica', 'aplicacion'],
      ['Manejo', 'Período de conversión cumplido en los cuarteles certificados'],
      ['Registros', 'Registro de fertilizaciones y enmiendas', 'fertilizacion'],
      ['Registros', 'Separación y trazabilidad de la cosecha orgánica', 'cosecha']
    ]
  },
  comercio_justo: {
    nombre: 'Comercio justo / sustentabilidad',
    aviso: 'Cargá los requisitos de tu certificadora.',
    requisitos: []
  },
  otra: { nombre: 'Otra certificación', aviso: 'Cargá los requisitos de tu certificadora.', requisitos: [] }
};

module.exports = { PLANTILLAS, TIPOS: Object.keys(PLANTILLAS) };
