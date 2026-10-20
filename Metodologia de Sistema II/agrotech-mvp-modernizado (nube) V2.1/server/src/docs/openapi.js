// Documentación de la API en formato OpenAPI 3. Se escribe a mano (no se genera desde comentarios)
// para que las rutas queden limpias; se ve en /api/docs y el JSON crudo en /api/docs/openapi.json.
// Si se agrega o cambia un endpoint, hay que actualizarlo acá: el test docs.test.js revisa que
// todas las rutas montadas en la app estén documentadas.

const { version } = require('../../package.json');

const ref = nombre => ({ $ref: `#/components/schemas/${nombre}` });
const json = schema => ({ 'application/json': { schema } });
const ok = (descripcion, schema) => ({ description: descripcion, content: json(schema) });
const lista = nombre => ({ type: 'array', items: ref(nombre) });
const cuerpo = (schema, requerido = true) => ({ required: requerido, content: json(schema) });

const error = descripcion => ({ description: descripcion, content: json(ref('Error')) });
const E400 = error('Datos inválidos');
const E401 = error('Falta el token o venció');
const E404 = error('No existe o es de otro productor');
const E429 = error('Demasiados intentos; esperá un rato');

const idPath = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const fincaIdQuery = {
  name: 'fincaId',
  in: 'query',
  required: false,
  schema: { type: 'integer', minimum: 1 },
  description: 'Filtra por finca'
};
const zonaQuery = {
  name: 'zona',
  in: 'query',
  required: false,
  schema: { type: 'string' },
  description: 'Filtra por zona'
};

const mensaje = { type: 'object', properties: { message: { type: 'string' } } };
const fecha = { type: 'string', format: 'date', example: '2026-11-15' };
const monto = { type: 'number', minimum: 0, exclusiveMinimum: true, example: 150000 };

// Campos que se cargan en un envío (alta y edición).
const envioCuerpo = {
  type: 'object',
  properties: {
    loteId: { type: 'integer', description: 'Cuartel de origen' },
    fecha,
    producto: { type: 'string', maxLength: 60 },
    kg: { type: 'number', minimum: 0, exclusiveMinimum: true, description: 'Kg estimados', example: 12000 },
    bins: { type: 'integer', minimum: 0 },
    destinoNombre: { type: 'string', maxLength: 120, description: 'Fábrica o bodega' },
    destinoCuit: { type: 'string', description: 'CUIT con dígito verificador válido', example: '30-71234567-1' },
    transportistaNombre: { type: 'string', maxLength: 120 },
    transportistaCuit: { type: 'string' },
    chofer: { type: 'string', maxLength: 120 },
    patenteCamion: { type: 'string', description: 'AAA123 o AA123BB', example: 'AB 123 CD' },
    patenteAcoplado: { type: 'string' },
    observaciones: { type: 'string', maxLength: 500 }
  }
};

const compradorCuerpo = {
  type: 'object',
  properties: {
    nombre: { type: 'string', maxLength: 120 },
    empresa: { type: 'string', maxLength: 120 },
    telefono: { type: 'string', maxLength: 30 },
    email: { type: 'string', format: 'email' },
    ciudad: { type: 'string', maxLength: 80 },
    interes: { type: 'string', maxLength: 160 },
    estado: { type: 'string', enum: ['a_contactar', 'contactado', 'cotizado', 'cerrado', 'descartado'] },
    productoId: { type: 'integer' },
    precioCotizado: { type: 'number' },
    notas: { type: 'string', maxLength: 1000 },
    ultimoContacto: fecha
  }
};
const productoCuerpo = {
  type: 'object',
  properties: {
    nombre: { type: 'string', maxLength: 120 },
    descripcion: { type: 'string', maxLength: 500 },
    presentacion: { type: 'string', maxLength: 80 },
    cantidadDisponible: { type: 'integer', minimum: 0 },
    unidadVenta: { type: 'string', maxLength: 40 },
    precio: { type: 'number', description: 'Vacío = a convenir' },
    lote: { type: 'string', maxLength: 40 },
    fechaElaboracion: fecha,
    fechaVencimiento: fecha,
    loteId: { type: 'integer', description: 'Cuartel de origen' },
    publicado: { type: 'boolean' }
  }
};
const slugPath = { name: 'slug', in: 'path', required: true, schema: { type: 'string' }, example: 'finca-los-alamos' };

const registroCuerpo = {
  type: 'object',
  properties: {
    loteIds: { type: 'array', items: { type: 'integer' }, description: 'Se crea un registro por cuartel' },
    fecha,
    tipo: { type: 'string', enum: ['aplicacion', 'fertilizacion', 'riego', 'poda', 'raleo', 'cosecha', 'labor'] },
    producto: { type: 'string', maxLength: 120, description: 'Obligatorio en las aplicaciones' },
    principioActivo: { type: 'string', maxLength: 120 },
    dosis: { type: 'number' },
    unidadDosis: { type: 'string', maxLength: 20 },
    cantidad: { type: 'number' },
    unidadCantidad: { type: 'string', maxLength: 20 },
    motivo: { type: 'string', maxLength: 160 },
    operador: { type: 'string', maxLength: 120 },
    equipo: { type: 'string', maxLength: 120 },
    carenciaDias: { type: 'integer', minimum: 0 },
    reingresoHoras: { type: 'integer', minimum: 0 },
    observaciones: { type: 'string', maxLength: 500 }
  }
};
const certificacionCuerpo = {
  type: 'object',
  properties: {
    tipo: { type: 'string', enum: ['bpa', 'globalgap', 'organica', 'comercio_justo', 'otra'] },
    nombre: { type: 'string', maxLength: 120 },
    certificador: { type: 'string', maxLength: 120 },
    numero: { type: 'string', maxLength: 60 },
    alcance: { type: 'string', maxLength: 300 },
    fechaEmision: fecha,
    vencimiento: fecha,
    proximaAuditoria: fecha,
    estado: { type: 'string', enum: ['en_tramite', 'vigente', 'vencida', 'suspendida'] },
    documentoUrl: { type: 'string', description: 'Enlace al certificado (por ejemplo, en Drive)' },
    publica: { type: 'boolean' },
    notas: { type: 'string', maxLength: 1000 }
  }
};
const requisitoCuerpo = {
  type: 'object',
  properties: {
    texto: { type: 'string', maxLength: 300 },
    area: { type: 'string', maxLength: 80 },
    cumplido: { type: 'boolean' },
    evidencia: { type: 'string', enum: ['aplicacion', 'fertilizacion', 'riego', 'cosecha'] },
    nota: { type: 'string', maxLength: 300 },
    orden: { type: 'integer', minimum: 0 }
  }
};
const requisitoPath = { name: 'requisito', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };

// Las rutas públicas son las de /api/auth salvo las que llevan requireAuth; el resto exige el token.
const publica = { security: [] };

const schemas = {
  Error: { type: 'object', properties: { error: { type: 'string', example: 'Lote no encontrado' } } },
  Productor: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      nombre: { type: 'string' },
      email: { type: 'string', format: 'email' },
      zona: { type: 'string', nullable: true },
      telefono: { type: 'string', nullable: true },
      emailVerificado: { type: 'boolean' }
    }
  },
  Sesion: { type: 'object', properties: { token: { type: 'string' }, productor: ref('Productor') } },
  Finca: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      nombre: { type: 'string' },
      ubicacion: { type: 'string', nullable: true },
      creado_en: { type: 'string', format: 'date-time' },
      lotes: { type: 'integer', description: 'Cantidad de cuarteles' }
    }
  },
  Lote: {
    type: 'object',
    description: 'Cuartel de una finca',
    properties: {
      id: { type: 'integer' },
      finca_id: { type: 'integer' },
      nombre: { type: 'string' },
      color: { type: 'string', enum: ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'teal'] },
      area: { type: 'number', description: 'Hectáreas' },
      cultivo: { type: 'string', nullable: true },
      riego: { type: 'string', enum: ['goteo', 'aspersion', 'surco', 'ninguno'], nullable: true },
      malla_antigranizo: { type: 'boolean' },
      terreno: { type: 'string', enum: ['propio', 'arrendado'], nullable: true },
      activo: { type: 'boolean', description: 'false = archivado' }
    }
  },
  Gasto: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      lote_id: { type: 'integer' },
      concepto: { type: 'string' },
      monto: { type: 'string', description: 'NUMERIC de Postgres, llega como texto', example: '150000.00' },
      estado: { type: 'string', enum: ['pagado', 'programado'] },
      fecha: { type: 'string', format: 'date-time', nullable: true }
    }
  },
  Ingreso: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      lote_id: { type: 'integer' },
      monto: { type: 'string', example: '800000.00' },
      monto_neto: { type: 'string', nullable: true, description: 'Lo cobrado si se descontó el cheque' },
      tipo: { type: 'string', enum: ['contado', 'transferencia', 'fisico', 'echeq'] },
      estado: { type: 'string', enum: ['normal', 'rechazado'] },
      con_descuento: { type: 'boolean' },
      costo_financiero: { type: 'string' },
      fecha_cobro: { type: 'string', format: 'date-time', nullable: true }
    }
  },
  Cheque: {
    type: 'object',
    description: 'Cheque en cartera (se crea solo al registrar un ingreso en cheque)',
    properties: {
      id: { type: 'integer' },
      tipo: { type: 'string', enum: ['fisico', 'echeq'] },
      monto: { type: 'string' },
      estado: { type: 'string', enum: ['normal', 'descontado', 'cobrado'] },
      fecha: { type: 'string', format: 'date-time', description: 'Fecha de cobro' }
    }
  },
  Inversion: {
    type: 'object',
    description: 'Compra de Obligaciones Negociables',
    properties: {
      id: { type: 'integer' },
      ticker: { type: 'string', example: 'YMCXO' },
      monto: { type: 'string' },
      fecha: { type: 'string', format: 'date-time' },
      estado: { type: 'string', enum: ['activa', 'vendida'] },
      monto_venta: { type: 'string', nullable: true },
      fecha_venta: { type: 'string', format: 'date-time', nullable: true }
    }
  },
  Resumen: {
    type: 'object',
    properties: {
      totalIngresos: { type: 'number' },
      totalGastos: { type: 'number' },
      totalInvertido: { type: 'number' },
      totalRecuperadoVentas: { type: 'number' },
      margenBruto: { type: 'number' },
      saldoNeto: { type: 'number' },
      resultadoNeto: { type: 'number' }
    }
  },
  Proyeccion: {
    type: 'object',
    description: 'Saldo proyectado con cheques a cobrar y gastos programados',
    properties: {
      saldoNeto: { type: 'number' },
      eventos: { type: 'array', items: { type: 'object' } },
      ruptura: { type: 'object', nullable: true, description: 'Primer día en que el saldo quedaría negativo' }
    }
  },
  ConfigN8N: {
    type: 'object',
    properties: { webhookUrl: { type: 'string', format: 'uri', nullable: true }, habilitado: { type: 'boolean' } }
  },
  Alerta: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      tipo: { type: 'string', enum: ['plaga', 'clima', 'precio', 'maquinaria', 'otro'] },
      zona: { type: 'string' },
      cultivo: { type: 'string', nullable: true },
      descripcion: { type: 'string' },
      estado: { type: 'string', enum: ['pendiente', 'resuelta'] },
      creado_en: { type: 'string', format: 'date-time' },
      autor: { type: 'string' }
    }
  },
  Trueque: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      tipo: { type: 'string', enum: ['maquinaria', 'mano_obra', 'insumo'] },
      titulo: { type: 'string' },
      descripcion: { type: 'string', nullable: true },
      zona: { type: 'string' },
      creado_en: { type: 'string', format: 'date-time' },
      autor: { type: 'string' }
    }
  },
  Notificacion: {
    type: 'object',
    description: 'Resultado del aviso a los productores de la zona',
    properties: { success: { type: 'boolean' }, avisados: { type: 'integer' } }
  },
  Evento: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      tipo: { type: 'string', example: 'gasto_registrado' },
      datos: { type: 'object' },
      fecha: { type: 'string', format: 'date-time' }
    }
  },
  Envio: {
    type: 'object',
    description: 'Envío de materia prima a la fábrica o la bodega',
    properties: {
      id: { type: 'integer' },
      lote_id: { type: 'integer', description: 'Cuartel de origen' },
      fecha: { type: 'string', format: 'date-time' },
      producto: { type: 'string', nullable: true, example: 'Durazno para industria' },
      kg: { type: 'string', description: 'Kg estimados (NUMERIC, llega como texto)', example: '12000.00' },
      bins: { type: 'integer' },
      destino_nombre: { type: 'string', example: 'Conservera del Valle S.A.' },
      destino_cuit: { type: 'string', nullable: true, example: '30712345671' },
      transportista_nombre: { type: 'string', nullable: true },
      transportista_cuit: { type: 'string', nullable: true },
      chofer: { type: 'string', nullable: true },
      patente_camion: { type: 'string', nullable: true, example: 'AB123CD' },
      patente_acoplado: { type: 'string', nullable: true, example: 'ABC123' },
      observaciones: { type: 'string', nullable: true },
      estado: { type: 'string', enum: ['cargado', 'dtv_registrado', 'entregado', 'anulado'] },
      dtv_numero: { type: 'string', nullable: true, description: 'Número del DTV-e emitido en ARCA' },
      dtv_vencimiento: { type: 'string', format: 'date-time', nullable: true },
      kg_balanza: { type: 'string', nullable: true, description: 'Kg del ticket de balanza en destino' },
      entregado_en: { type: 'string', format: 'date-time', nullable: true },
      anulado_motivo: { type: 'string', nullable: true },
      creado_en: { type: 'string', format: 'date-time' }
    }
  },
  Remito: {
    type: 'object',
    description: 'Remito R emitido por autoimpresor. `datos` es la copia de lo que se imprimió.',
    properties: {
      id: { type: 'integer' },
      envio_id: { type: 'integer' },
      numero: { type: 'integer', example: 1 },
      fecha: { type: 'string', format: 'date-time' },
      estado: { type: 'string', enum: ['emitido', 'anulado'] },
      datos: {
        type: 'object',
        description: 'Punto de venta, número, fecha, CAI, emisor, destino, transporte y detalle'
      },
      anulado_motivo: { type: 'string', nullable: true },
      creado_en: { type: 'string', format: 'date-time' }
    }
  },
  Talonario: {
    type: 'object',
    properties: {
      talonario: { type: 'object', nullable: true, description: 'null mientras no se cargue el CAI' },
      proximoNumero: { type: 'integer' },
      restantes: { type: 'integer' },
      diasParaVencer: { type: 'integer' },
      avisos: { type: 'array', items: { type: 'string' }, example: ['El CAI vence en 12 día(s).'] }
    }
  },
  Comprador: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      nombre: { type: 'string' },
      empresa: { type: 'string', nullable: true },
      telefono: { type: 'string', nullable: true },
      email: { type: 'string', nullable: true },
      ciudad: { type: 'string', nullable: true },
      interes: { type: 'string', nullable: true, example: 'Durazno en mitades x 820 g' },
      estado: { type: 'string', enum: ['a_contactar', 'contactado', 'cotizado', 'cerrado', 'descartado'] },
      origen: { type: 'string', enum: ['manual', 'vitrina'] },
      producto_id: { type: 'integer', nullable: true },
      precio_cotizado: { type: 'string', nullable: true },
      notas: { type: 'string', nullable: true },
      ultimo_contacto: { type: 'string', format: 'date-time', nullable: true },
      creado_en: { type: 'string', format: 'date-time' }
    }
  },
  Vitrina: {
    type: 'object',
    properties: {
      slug: { type: 'string', example: 'finca-los-alamos', description: 'Dirección pública' },
      nombre_publico: { type: 'string' },
      descripcion: { type: 'string', nullable: true },
      zona: { type: 'string', nullable: true },
      whatsapp: { type: 'string', nullable: true },
      email: { type: 'string', nullable: true },
      publicada: { type: 'boolean' }
    }
  },
  ProductoVitrina: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      codigo: { type: 'string', example: 'K7Q2M9XP', description: 'Va en el QR de la etiqueta' },
      nombre: { type: 'string' },
      descripcion: { type: 'string', nullable: true },
      presentacion: { type: 'string', nullable: true, example: 'Lata x 820 g' },
      cantidad_disponible: { type: 'integer', nullable: true },
      unidad_venta: { type: 'string', nullable: true, example: 'cajas de 12' },
      precio: { type: 'string', nullable: true, description: 'Vacío = a convenir' },
      lote: { type: 'string', nullable: true },
      fecha_elaboracion: { type: 'string', format: 'date-time', nullable: true },
      fecha_vencimiento: { type: 'string', format: 'date-time', nullable: true },
      lote_id: { type: 'integer', nullable: true, description: 'Cuartel de origen' },
      publicado: { type: 'boolean' }
    }
  },
  PrecioInsumo: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      nombre: { type: 'string', example: 'Azúcar' },
      unidad: { type: 'string', enum: ['kg', 'un', 'l'] },
      precio: { type: 'string', description: 'Precio por kg, por unidad o por litro', example: '1100.0000' },
      presentacion: { type: 'string', nullable: true, example: 'Bolsa 50 kg' },
      precio_presentacion: { type: 'string', nullable: true, example: '55000.00' },
      proveedor: { type: 'string', nullable: true },
      fecha: { type: 'string', format: 'date-time' },
      iva_incluido: { type: 'boolean', nullable: true },
      origen: { type: 'string', enum: ['manual', 'ia'] },
      creado_en: { type: 'string', format: 'date-time' }
    }
  },
  RegistroCampo: {
    type: 'object',
    description: 'Registro del cuaderno de campo de un cuartel',
    properties: {
      id: { type: 'integer' },
      lote_id: { type: 'integer' },
      fecha: { type: 'string', format: 'date-time' },
      tipo: { type: 'string', enum: ['aplicacion', 'fertilizacion', 'riego', 'poda', 'raleo', 'cosecha', 'labor'] },
      producto: { type: 'string', nullable: true },
      principio_activo: { type: 'string', nullable: true },
      dosis: { type: 'string', nullable: true },
      unidad_dosis: { type: 'string', nullable: true, example: 'cc/hl' },
      cantidad: { type: 'string', nullable: true, description: 'Volumen de caldo, horas de riego, kg cosechados...' },
      unidad_cantidad: { type: 'string', nullable: true },
      motivo: { type: 'string', nullable: true, example: 'Grafolita' },
      operador: { type: 'string', nullable: true },
      equipo: { type: 'string', nullable: true },
      carencia_dias: { type: 'integer', nullable: true },
      reingreso_horas: { type: 'integer', nullable: true },
      observaciones: { type: 'string', nullable: true }
    }
  },
  Certificacion: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      tipo: { type: 'string', enum: ['bpa', 'globalgap', 'organica', 'comercio_justo', 'otra'] },
      nombre: { type: 'string' },
      certificador: { type: 'string', nullable: true },
      numero: { type: 'string', nullable: true },
      alcance: { type: 'string', nullable: true },
      fecha_emision: { type: 'string', format: 'date-time', nullable: true },
      vencimiento: { type: 'string', format: 'date-time', nullable: true },
      proxima_auditoria: { type: 'string', format: 'date-time', nullable: true },
      estado: { type: 'string', enum: ['en_tramite', 'vigente', 'vencida', 'suspendida'] },
      documento_url: { type: 'string', nullable: true },
      publica: { type: 'boolean', description: 'Se muestra en la vitrina mientras está vigente' },
      cumplimiento: { type: 'integer', nullable: true, description: '% de requisitos cumplidos' },
      requisitos: { type: 'array', items: ref('Requisito') }
    }
  },
  Requisito: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      orden: { type: 'integer' },
      area: { type: 'string', nullable: true },
      texto: { type: 'string' },
      cumplido: { type: 'boolean' },
      evidencia: { type: 'string', nullable: true, enum: ['aplicacion', 'fertilizacion', 'riego', 'cosecha'] },
      nota: { type: 'string', nullable: true },
      registros: {
        type: 'object',
        nullable: true,
        description: 'Registros del cuaderno de ese tipo en los últimos 12 meses',
        properties: { registros: { type: 'integer' }, ultimo: { type: 'string', nullable: true } }
      }
    }
  },
  Imagen: {
    type: 'object',
    required: ['imagenBase64'],
    properties: {
      imagenBase64: { type: 'string', description: 'Foto en base64, sin el prefijo data:' },
      mediaType: { type: 'string', example: 'image/jpeg' }
    }
  }
};

const paths = {
  // ---------- Auth ----------
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Crear una cuenta',
      description: 'Crea el productor con una finca y un cuartel iniciales y manda el email de verificación.',
      ...publica,
      requestBody: cuerpo({
        type: 'object',
        required: ['nombre', 'email', 'password'],
        properties: {
          nombre: { type: 'string', maxLength: 120 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          telefono: { type: 'string', maxLength: 30 },
          zona: { type: 'string', maxLength: 60 },
          cultivoPrincipal: { type: 'string', maxLength: 60 }
        }
      }),
      responses: { 201: ok('Cuenta creada', ref('Sesion')), 400: E400, 409: error('El email ya existe'), 429: E429 }
    }
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Iniciar sesión',
      ...publica,
      requestBody: cuerpo({
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } }
      }),
      responses: {
        200: ok('Token JWT (30 días)', ref('Sesion')),
        400: E400,
        401: error('Email o contraseña incorrectos'),
        429: E429
      }
    }
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Pedir el link para recuperar la contraseña',
      description: 'Responde lo mismo exista o no la cuenta, para no revelar qué emails están registrados.',
      ...publica,
      requestBody: cuerpo({ type: 'object', required: ['email'], properties: { email: { type: 'string' } } }),
      responses: { 200: ok('Respuesta genérica', mensaje), 400: E400, 429: E429 }
    }
  },
  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Poner una contraseña nueva con el token del email',
      ...publica,
      requestBody: cuerpo({
        type: 'object',
        required: ['token', 'password'],
        properties: { token: { type: 'string' }, password: { type: 'string', minLength: 6 } }
      }),
      responses: { 200: ok('Contraseña actualizada', mensaje), 400: error('Token inválido o vencido'), 429: E429 }
    }
  },
  '/auth/verificar-email': {
    post: {
      tags: ['Auth'],
      summary: 'Confirmar el email con el token del link',
      ...publica,
      requestBody: cuerpo({ type: 'object', required: ['token'], properties: { token: { type: 'string' } } }),
      responses: { 200: ok('Email confirmado', mensaje), 400: error('Token inválido o vencido'), 429: E429 }
    }
  },
  '/auth/reenviar-verificacion': {
    post: {
      tags: ['Auth'],
      summary: 'Reenviar el email de verificación',
      responses: {
        200: ok('Enviado, o la cuenta ya estaba verificada', {
          type: 'object',
          properties: { yaVerificado: { type: 'boolean' }, message: { type: 'string' } }
        }),
        401: E401,
        429: E429
      }
    }
  },
  '/auth/perfil': {
    get: {
      tags: ['Auth'],
      summary: 'Datos del productor logueado',
      responses: { 200: ok('Perfil', ref('Productor')), 401: E401 }
    },
    put: {
      tags: ['Auth'],
      summary: 'Actualizar el teléfono (WhatsApp)',
      requestBody: cuerpo({ type: 'object', properties: { telefono: { type: 'string', maxLength: 30 } } }),
      responses: { 200: ok('Perfil actualizado', ref('Productor')), 400: E400, 401: E401 }
    }
  },
  '/auth/password': {
    put: {
      tags: ['Auth'],
      summary: 'Cambiar la contraseña',
      requestBody: cuerpo({
        type: 'object',
        required: ['passwordActual', 'passwordNueva'],
        properties: { passwordActual: { type: 'string' }, passwordNueva: { type: 'string', minLength: 6 } }
      }),
      responses: {
        200: ok('Contraseña actualizada', mensaje),
        400: E400,
        401: E401,
        403: error('La contraseña actual no es correcta'),
        429: E429
      }
    }
  },

  // ---------- Mis datos ----------
  '/cuenta/exportar': {
    get: {
      tags: ['Mis datos'],
      summary: 'Descargar todos mis datos en JSON',
      responses: { 200: ok('Todas las tablas del productor', { type: 'object' }), 401: E401 }
    }
  },
  '/cuenta': {
    delete: {
      tags: ['Mis datos'],
      summary: 'Eliminar la cuenta y todos sus datos',
      requestBody: cuerpo({ type: 'object', required: ['password'], properties: { password: { type: 'string' } } }),
      responses: {
        200: ok('Cuenta eliminada', mensaje),
        400: E400,
        401: E401,
        403: error('Contraseña incorrecta'),
        429: E429
      }
    }
  },

  // ---------- Fincas y lotes ----------
  '/fincas': {
    get: {
      tags: ['Fincas y cuarteles'],
      summary: 'Listar fincas',
      responses: { 200: ok('Fincas', lista('Finca')), 401: E401 }
    },
    post: {
      tags: ['Fincas y cuarteles'],
      summary: 'Crear una finca',
      requestBody: cuerpo({
        type: 'object',
        required: ['nombre'],
        properties: { nombre: { type: 'string' }, ubicacion: { type: 'string' } }
      }),
      responses: { 201: ok('Finca creada', ref('Finca')), 400: E400, 401: E401 }
    }
  },
  '/lotes': {
    get: {
      tags: ['Fincas y cuarteles'],
      summary: 'Listar cuarteles',
      parameters: [fincaIdQuery],
      responses: { 200: ok('Cuarteles', lista('Lote')), 400: E400, 401: E401 }
    },
    post: {
      tags: ['Fincas y cuarteles'],
      summary: 'Crear un cuartel',
      requestBody: cuerpo({
        type: 'object',
        required: ['nombre', 'fincaId'],
        properties: {
          nombre: { type: 'string' },
          fincaId: { type: 'integer' },
          area: { type: 'number', description: 'Hectáreas' },
          color: schemas.Lote.properties.color,
          cultivo: { type: 'string' },
          riego: schemas.Lote.properties.riego,
          mallaAntigranizo: { type: 'boolean' },
          terreno: schemas.Lote.properties.terreno
        }
      }),
      responses: { 201: ok('Cuartel creado', ref('Lote')), 400: E400, 401: E401, 404: E404 }
    }
  },
  '/lotes/{id}/archivar': {
    patch: {
      tags: ['Fincas y cuarteles'],
      summary: 'Archivar un cuartel (conserva su historia)',
      parameters: [idPath],
      responses: {
        200: ok('Archivado', { type: 'object', properties: { id: { type: 'integer' }, activo: { type: 'boolean' } } }),
        401: E401,
        404: E404,
        409: error('Es el único cuartel activo de la finca')
      }
    }
  },
  '/lotes/{id}/restaurar': {
    patch: {
      tags: ['Fincas y cuarteles'],
      summary: 'Volver a activar un cuartel archivado',
      parameters: [idPath],
      responses: {
        200: ok('Restaurado', { type: 'object', properties: { id: { type: 'integer' }, activo: { type: 'boolean' } } }),
        401: E401,
        404: E404
      }
    }
  },

  // ---------- Gastos ----------
  '/gastos': {
    get: {
      tags: ['Gastos'],
      summary: 'Listar gastos',
      parameters: [
        fincaIdQuery,
        { name: 'loteId', in: 'query', schema: { type: 'integer' } },
        { name: 'estado', in: 'query', schema: { type: 'string', enum: ['pagado', 'programado'] } }
      ],
      responses: { 200: ok('Gastos, del más nuevo al más viejo', lista('Gasto')), 400: E400, 401: E401 }
    },
    post: {
      tags: ['Gastos'],
      summary: 'Registrar un gasto',
      description: 'Si el productor tiene N8N habilitado, el backend avisa por WhatsApp/email.',
      requestBody: cuerpo({
        type: 'object',
        required: ['loteId', 'concepto', 'monto', 'estado'],
        properties: {
          loteId: { type: 'integer' },
          concepto: { type: 'string', maxLength: 120 },
          monto,
          estado: { type: 'string', enum: ['pagado', 'programado'] },
          fecha: { ...fecha, description: 'Obligatoria si el gasto es programado' }
        }
      }),
      responses: { 201: ok('Gasto creado', ref('Gasto')), 400: E400, 401: E401, 404: E404 }
    }
  },
  '/gastos/programados': {
    get: {
      tags: ['Gastos'],
      summary: 'Gastos programados (a pagar), por fecha',
      responses: { 200: ok('Gastos programados', lista('Gasto')), 401: E401 }
    }
  },
  '/gastos/{id}': {
    patch: {
      tags: ['Gastos'],
      summary: 'Editar un gasto',
      parameters: [idPath],
      requestBody: cuerpo({
        type: 'object',
        properties: {
          loteId: { type: 'integer' },
          concepto: { type: 'string' },
          monto,
          estado: { type: 'string', enum: ['pagado', 'programado'] },
          fecha
        }
      }),
      responses: { 200: ok('Gasto editado', ref('Gasto')), 400: E400, 401: E401, 404: E404 }
    },
    delete: {
      tags: ['Gastos'],
      summary: 'Borrar un gasto',
      parameters: [idPath],
      responses: {
        200: ok('Borrado', { type: 'object', properties: { id: { type: 'integer' } } }),
        401: E401,
        404: E404
      }
    }
  },
  '/gastos/extraer-factura': {
    post: {
      tags: ['Gastos'],
      summary: 'Leer una factura por foto con IA (Claude)',
      requestBody: cuerpo(ref('Imagen')),
      responses: {
        200: ok('Ítems detectados', {
          type: 'object',
          properties: { items: { type: 'array', items: { type: 'object' } } }
        }),
        400: E400,
        401: E401,
        422: error('No se detectaron ítems'),
        429: E429,
        502: error('Falló la IA')
      }
    }
  },

  // ---------- Ingresos ----------
  '/ingresos': {
    get: {
      tags: ['Ingresos'],
      summary: 'Listar ingresos',
      parameters: [fincaIdQuery],
      responses: { 200: ok('Ingresos', lista('Ingreso')), 400: E400, 401: E401 }
    },
    post: {
      tags: ['Ingresos'],
      summary: 'Registrar un ingreso',
      description: 'Si es un cheque (físico o echeq) se agrega solo a la cartera de cheques.',
      requestBody: cuerpo({
        type: 'object',
        required: ['loteId', 'monto', 'tipo'],
        properties: {
          loteId: { type: 'integer' },
          monto,
          tipo: { type: 'string', enum: ['contado', 'transferencia', 'fisico', 'echeq'] },
          estado: { type: 'string', enum: ['normal', 'rechazado'], default: 'normal' },
          conDescuento: { type: 'boolean', description: 'El cheque se descontó en el banco' },
          montoNeto: { type: 'number', description: 'Lo cobrado al descontarlo' },
          fechaCobro: fecha
        }
      }),
      responses: { 201: ok('Ingreso creado', ref('Ingreso')), 400: E400, 401: E401, 404: E404 }
    }
  },
  '/ingresos/{id}': {
    patch: {
      tags: ['Ingresos'],
      summary: 'Editar un ingreso',
      parameters: [idPath],
      requestBody: cuerpo({
        type: 'object',
        properties: { loteId: { type: 'integer' }, monto, fechaCobro: fecha }
      }),
      responses: {
        200: ok('Ingreso editado', ref('Ingreso')),
        400: E400,
        401: E401,
        404: E404,
        409: error('Un ingreso con descuento no puede cambiar de monto')
      }
    },
    delete: {
      tags: ['Ingresos'],
      summary: 'Borrar un ingreso (y su cheque en cartera)',
      parameters: [idPath],
      responses: {
        200: ok('Borrado', { type: 'object', properties: { id: { type: 'integer' } } }),
        401: E401,
        404: E404
      }
    }
  },

  // ---------- Cartera ----------
  '/cartera': {
    get: {
      tags: ['Cartera de cheques'],
      summary: 'Cheques en cartera',
      responses: { 200: ok('Cheques', lista('Cheque')), 401: E401 }
    }
  },
  '/cartera/sincronizar': {
    post: {
      tags: ['Cartera de cheques'],
      summary: 'Mandar a N8N los cheques pendientes de cobro',
      responses: { 200: ok('Resultado del envío', { type: 'object' }), 401: E401 }
    }
  },
  '/cartera/{id}/cobrar': {
    patch: {
      tags: ['Cartera de cheques'],
      summary: 'Marcar un cheque como cobrado',
      parameters: [idPath],
      responses: { 200: ok('Cheque cobrado', ref('Cheque')), 401: E401, 404: error('No existe o ya estaba cobrado') }
    }
  },

  // ---------- Inversiones ----------
  '/inversiones': {
    get: {
      tags: ['Inversiones'],
      summary: 'Listar inversiones',
      responses: { 200: ok('Inversiones', lista('Inversion')), 401: E401 }
    },
    post: {
      tags: ['Inversiones'],
      summary: 'Registrar la compra de una ON',
      requestBody: cuerpo({
        type: 'object',
        required: ['ticker', 'monto'],
        properties: { ticker: { type: 'string' }, monto }
      }),
      responses: { 201: ok('Inversión creada', ref('Inversion')), 400: E400, 401: E401 }
    }
  },
  '/inversiones/{id}/vender': {
    patch: {
      tags: ['Inversiones'],
      summary: 'Registrar la venta de una ON',
      parameters: [idPath],
      requestBody: cuerpo({ type: 'object', required: ['montoVenta'], properties: { montoVenta: monto } }),
      responses: { 200: ok('Vendida', ref('Inversion')), 400: E400, 401: E401, 404: error('No existe o ya se vendió') }
    }
  },

  // ---------- Resumen ----------
  '/resumen': {
    get: {
      tags: ['Resumen'],
      summary: 'Totales del estado de resultados',
      parameters: [fincaIdQuery],
      responses: { 200: ok('Resumen', ref('Resumen')), 400: E400, 401: E401 }
    }
  },
  '/resumen/proyeccion': {
    get: {
      tags: ['Resumen'],
      summary: 'Proyección de liquidez',
      parameters: [fincaIdQuery],
      responses: { 200: ok('Proyección', ref('Proyeccion')), 400: E400, 401: E401 }
    }
  },

  // ---------- Config N8N ----------
  '/config/n8n': {
    get: {
      tags: ['N8N'],
      summary: 'Ver la configuración del webhook',
      responses: { 200: ok('Config', ref('ConfigN8N')), 401: E401 }
    },
    put: {
      tags: ['N8N'],
      summary: 'Guardar la configuración del webhook',
      requestBody: cuerpo(ref('ConfigN8N')),
      responses: { 200: ok('Config guardada', ref('ConfigN8N')), 401: E401 }
    }
  },
  '/config/n8n/test': {
    post: {
      tags: ['N8N'],
      summary: 'Mandar un evento de prueba al webhook',
      responses: { 200: ok('Resultado del envío', { type: 'object' }), 401: E401 }
    }
  },

  // ---------- Red de Productores ----------
  '/red/resumen': {
    get: {
      tags: ['Red de Productores'],
      summary: 'Cantidad de productores en la red y en mi zona',
      description: 'Solo devuelve cantidades, ningún dato de otros productores.',
      responses: {
        200: ok('Resumen de la red', {
          type: 'object',
          properties: {
            productores: { type: 'integer', description: 'Productores registrados en AgroTech' },
            zona: { type: 'string', nullable: true, description: 'Zona del productor que consulta' },
            enTuZona: { type: 'integer', description: 'Productores de esa zona, incluido el que consulta' }
          }
        }),
        401: E401
      }
    }
  },
  '/red/alertas': {
    get: {
      tags: ['Red de Productores'],
      summary: 'Alertas de la red',
      parameters: [zonaQuery],
      responses: { 200: ok('Alertas', lista('Alerta')), 401: E401 }
    },
    post: {
      tags: ['Red de Productores'],
      summary: 'Publicar una alerta y avisar a la zona',
      requestBody: cuerpo({
        type: 'object',
        required: ['tipo', 'zona', 'descripcion'],
        properties: {
          tipo: schemas.Alerta.properties.tipo,
          zona: { type: 'string' },
          cultivo: { type: 'string' },
          descripcion: { type: 'string' }
        }
      }),
      responses: {
        201: ok('Alerta creada', {
          type: 'object',
          properties: { alerta: ref('Alerta'), notificacion: ref('Notificacion') }
        }),
        400: E400,
        401: E401
      }
    }
  },
  '/red/escanear-planta': {
    post: {
      tags: ['Red de Productores'],
      summary: 'Diagnosticar una plaga por foto con IA',
      requestBody: cuerpo(ref('Imagen')),
      responses: {
        200: ok('Diagnóstico', { type: 'object' }),
        400: E400,
        401: E401,
        429: E429,
        502: error('Falló la IA')
      }
    }
  },
  '/red/alertas/{id}/resolver': {
    patch: {
      tags: ['Red de Productores'],
      summary: 'Marcar una alerta propia como resuelta',
      parameters: [idPath],
      responses: {
        200: ok('Resuelta', { type: 'object', properties: { id: { type: 'integer' }, estado: { type: 'string' } } }),
        401: E401,
        404: E404
      }
    }
  },
  '/red/trueques': {
    get: {
      tags: ['Red de Productores'],
      summary: 'Ofertas de trueque',
      parameters: [zonaQuery],
      responses: { 200: ok('Ofertas', lista('Trueque')), 401: E401 }
    },
    post: {
      tags: ['Red de Productores'],
      summary: 'Publicar una oferta de trueque',
      requestBody: cuerpo({
        type: 'object',
        required: ['tipo', 'titulo', 'zona'],
        properties: {
          tipo: schemas.Trueque.properties.tipo,
          titulo: { type: 'string' },
          descripcion: { type: 'string' },
          zona: { type: 'string' }
        }
      }),
      responses: {
        201: ok('Oferta creada', {
          type: 'object',
          properties: { trueque: ref('Trueque'), notificacion: ref('Notificacion') }
        }),
        400: E400,
        401: E401
      }
    }
  },
  '/red/trueques/{id}/contactar': {
    post: {
      tags: ['Red de Productores'],
      summary: 'Avisar por WhatsApp al autor de una oferta',
      parameters: [idPath],
      responses: {
        200: ok('Aviso enviado', {
          type: 'object',
          properties: { success: { type: 'boolean' }, autor: { type: 'string' } }
        }),
        400: error('Es una oferta propia o falta tu teléfono'),
        401: E401,
        404: E404
      }
    }
  },

  // ---------- Envíos ----------
  '/envios': {
    get: {
      tags: ['Envíos'],
      summary: 'Listar envíos, del más nuevo al más viejo',
      parameters: [
        {
          name: 'estado',
          in: 'query',
          schema: { type: 'string', enum: ['cargado', 'dtv_registrado', 'entregado', 'anulado'] }
        },
        { name: 'loteId', in: 'query', schema: { type: 'integer' } }
      ],
      responses: { 200: ok('Envíos', lista('Envio')), 400: E400, 401: E401 }
    },
    post: {
      tags: ['Envíos'],
      summary: 'Cargar un envío',
      description: 'Queda en estado `cargado`. Con estos datos se emite después el DTV-e en ARCA.',
      requestBody: cuerpo({ ...envioCuerpo, required: ['loteId', 'fecha', 'kg', 'destinoNombre'] }),
      responses: { 201: ok('Envío cargado', ref('Envio')), 400: E400, 401: E401, 404: E404 }
    }
  },
  '/envios/{id}': {
    get: {
      tags: ['Envíos'],
      summary: 'Ver un envío',
      parameters: [idPath],
      responses: { 200: ok('Envío', ref('Envio')), 401: E401, 404: E404 }
    },
    patch: {
      tags: ['Envíos'],
      summary: 'Editar un envío (solo mientras está cargado)',
      description:
        'Con el DTV-e registrado los datos ya se declararon en ARCA: si cambió algo, se anula y se carga de nuevo.',
      parameters: [idPath],
      requestBody: cuerpo(envioCuerpo),
      responses: {
        200: ok('Envío editado', ref('Envio')),
        400: E400,
        401: E401,
        404: E404,
        409: error('El envío ya no está cargado')
      }
    }
  },
  '/envios/{id}/dtv': {
    patch: {
      tags: ['Envíos'],
      summary: 'Registrar el DTV-e emitido en ARCA',
      description: 'AgroTech no emite el DTV-e ni pide la clave fiscal: solo guarda su número y vencimiento.',
      parameters: [idPath],
      requestBody: cuerpo({
        type: 'object',
        required: ['numero', 'vencimiento'],
        properties: { numero: { type: 'string', maxLength: 40 }, vencimiento: fecha }
      }),
      responses: {
        200: ok('DTV-e registrado', ref('Envio')),
        400: E400,
        401: E401,
        404: E404,
        409: error('El envío está entregado o anulado')
      }
    }
  },
  '/envios/{id}/entregar': {
    patch: {
      tags: ['Envíos'],
      summary: 'Marcar la llegada con los kg del ticket de balanza',
      parameters: [idPath],
      requestBody: cuerpo({
        type: 'object',
        required: ['kgBalanza'],
        properties: { kgBalanza: { type: 'number', minimum: 0, exclusiveMinimum: true } }
      }),
      responses: {
        200: ok('Entregado', ref('Envio')),
        400: E400,
        401: E401,
        404: E404,
        409: error('Falta el DTV-e o el envío ya está cerrado')
      }
    }
  },
  '/envios/{id}/anular': {
    patch: {
      tags: ['Envíos'],
      summary: 'Anular un envío (nunca se borra)',
      parameters: [idPath],
      requestBody: cuerpo({ type: 'object', properties: { motivo: { type: 'string', maxLength: 200 } } }, false),
      responses: {
        200: ok('Anulado', ref('Envio')),
        400: E400,
        401: E401,
        404: E404,
        409: error('El envío ya está entregado o anulado')
      }
    }
  },

  // ---------- Remitos ----------
  '/remitos/talonario': {
    get: {
      tags: ['Remitos'],
      summary: 'Talonario vigente (CAI de autoimpresor) y su estado',
      description: 'Devuelve `talonario: null` mientras no se cargue el CAI: el remito está apagado.',
      responses: { 200: ok('Talonario', ref('Talonario')), 401: E401 }
    },
    post: {
      tags: ['Remitos'],
      summary: 'Cargar el CAI de autoimpresor (activa el remito)',
      description: 'Si había un talonario, queda inactivo y el nuevo pasa a ser el vigente.',
      requestBody: cuerpo({
        type: 'object',
        required: [
          'puntoVenta',
          'numeroDesde',
          'numeroHasta',
          'cai',
          'caiVencimiento',
          'emisorRazonSocial',
          'emisorCuit',
          'emisorDomicilio',
          'emisorCondicionIva'
        ],
        properties: {
          puntoVenta: { type: 'integer', minimum: 1, maximum: 99999, example: 2 },
          numeroDesde: { type: 'integer', minimum: 1, example: 1 },
          numeroHasta: { type: 'integer', example: 500 },
          cai: { type: 'string', pattern: '^[0-9]{14}$', example: '12345678901234' },
          caiVencimiento: fecha,
          emisorRazonSocial: { type: 'string', maxLength: 120 },
          emisorCuit: { type: 'string', example: '20-12345678-6' },
          emisorDomicilio: { type: 'string', maxLength: 160 },
          emisorCondicionIva: { type: 'string', enum: ['responsable_inscripto', 'monotributo', 'exento'] },
          emisorIibb: { type: 'string', maxLength: 30 },
          emisorInicioActividades: fecha
        }
      }),
      responses: {
        201: ok('Talonario cargado', ref('Talonario')),
        400: E400,
        401: E401,
        409: error('El rango ya se usó en ese punto de venta')
      }
    },
    patch: {
      tags: ['Remitos'],
      summary: 'Corregir los datos del emisor (membrete) sin tocar el CAI',
      description: 'Vale para los remitos que se emitan desde ahora; los ya emitidos guardan su copia.',
      requestBody: cuerpo({
        type: 'object',
        required: ['emisorRazonSocial', 'emisorCuit', 'emisorDomicilio', 'emisorCondicionIva'],
        properties: {
          emisorRazonSocial: { type: 'string', maxLength: 120 },
          emisorCuit: { type: 'string', example: '20-12345678-6' },
          emisorDomicilio: { type: 'string', maxLength: 160, example: 'Calle 1 123, Tunuyán, Mendoza' },
          emisorCondicionIva: { type: 'string', enum: ['responsable_inscripto', 'monotributo', 'exento'] },
          emisorIibb: { type: 'string', maxLength: 30 },
          emisorInicioActividades: fecha
        }
      }),
      responses: {
        200: ok('Membrete actualizado', ref('Talonario')),
        400: E400,
        401: E401,
        404: error('Todavía no se cargó el CAI')
      }
    }
  },
  '/remitos': {
    get: {
      tags: ['Remitos'],
      summary: 'Listar remitos',
      responses: { 200: ok('Remitos', lista('Remito')), 401: E401 }
    },
    post: {
      tags: ['Remitos'],
      summary: 'Emitir el remito R de un envío',
      description:
        'El envío tiene que tener el DTV-e registrado. Toma el próximo número del talonario y controla CAI vigente, rango y fecha correlativa.',
      requestBody: cuerpo({
        type: 'object',
        required: ['envioId'],
        properties: {
          envioId: { type: 'integer' },
          fecha: { ...fecha, description: 'Por defecto, hoy (hora argentina)' },
          destinoDomicilio: { type: 'string', maxLength: 160 },
          destinoCondicionIva: { type: 'string', enum: ['responsable_inscripto', 'monotributo', 'exento'] }
        }
      }),
      responses: {
        201: ok('Remito emitido', ref('Remito')),
        400: E400,
        401: E401,
        404: E404,
        409: error('Sin CAI, CAI vencido, rango agotado, fecha anterior, envío sin DTV-e o con remito vigente')
      }
    }
  },
  '/remitos/{id}': {
    get: {
      tags: ['Remitos'],
      summary: 'Ver un remito',
      parameters: [idPath],
      responses: { 200: ok('Remito', ref('Remito')), 401: E401, 404: E404 }
    }
  },
  '/remitos/{id}/anular': {
    patch: {
      tags: ['Remitos'],
      summary: 'Anular un remito (el número queda usado)',
      parameters: [idPath],
      requestBody: cuerpo({ type: 'object', properties: { motivo: { type: 'string', maxLength: 200 } } }, false),
      responses: { 200: ok('Anulado', ref('Remito')), 400: E400, 401: E401, 404: error('No existe o ya está anulado') }
    }
  },

  // ---------- Compradores ----------
  '/compradores': {
    get: {
      tags: ['Compradores'],
      summary: 'Agenda de compradores',
      parameters: [
        {
          name: 'estado',
          in: 'query',
          schema: { type: 'string', enum: ['a_contactar', 'contactado', 'cotizado', 'cerrado', 'descartado'] }
        }
      ],
      responses: { 200: ok('Compradores', lista('Comprador')), 400: E400, 401: E401 }
    },
    post: {
      tags: ['Compradores'],
      summary: 'Agregar un comprador',
      requestBody: cuerpo({ ...compradorCuerpo, required: ['nombre'] }),
      responses: { 201: ok('Comprador agregado', ref('Comprador')), 400: E400, 401: E401, 404: E404 }
    }
  },
  '/compradores/{id}': {
    patch: {
      tags: ['Compradores'],
      summary: 'Editar un comprador (estado, cotización, notas)',
      parameters: [idPath],
      requestBody: cuerpo(compradorCuerpo),
      responses: { 200: ok('Comprador editado', ref('Comprador')), 400: E400, 401: E401, 404: E404 }
    },
    delete: {
      tags: ['Compradores'],
      summary: 'Borrar un comprador de la agenda',
      parameters: [idPath],
      responses: {
        200: ok('Borrado', { type: 'object', properties: { id: { type: 'integer' } } }),
        401: E401,
        404: E404
      }
    }
  },

  // ---------- Vitrina (privada) ----------
  '/vitrina': {
    get: {
      tags: ['Vitrina'],
      summary: 'Mi vitrina (null si todavía no la armé)',
      responses: { 200: ok('Vitrina', ref('Vitrina')), 401: E401 }
    },
    put: {
      tags: ['Vitrina'],
      summary: 'Crear o actualizar mi vitrina',
      description: 'El slug se arma solo desde el nombre si no se manda. `publicada: false` la oculta.',
      requestBody: cuerpo({
        type: 'object',
        required: ['nombrePublico'],
        properties: {
          nombrePublico: { type: 'string', maxLength: 120 },
          slug: { type: 'string', maxLength: 60 },
          descripcion: { type: 'string', maxLength: 500 },
          zona: { type: 'string', maxLength: 60 },
          whatsapp: { type: 'string', maxLength: 30 },
          email: { type: 'string', format: 'email' },
          publicada: { type: 'boolean' }
        }
      }),
      responses: {
        200: ok('Vitrina guardada', ref('Vitrina')),
        400: E400,
        401: E401,
        409: error('Esa dirección ya la usa otro productor')
      }
    }
  },
  '/vitrina/productos': {
    get: {
      tags: ['Vitrina'],
      summary: 'Mis productos por lote',
      responses: { 200: ok('Productos', lista('ProductoVitrina')), 401: E401 }
    },
    post: {
      tags: ['Vitrina'],
      summary: 'Publicar un producto (se genera su código para el QR)',
      requestBody: cuerpo({ ...productoCuerpo, required: ['nombre'] }),
      responses: { 201: ok('Producto creado', ref('ProductoVitrina')), 400: E400, 401: E401, 404: E404 }
    }
  },
  '/vitrina/productos/{id}': {
    patch: {
      tags: ['Vitrina'],
      summary: 'Editar un producto o despublicarlo',
      parameters: [idPath],
      requestBody: cuerpo(productoCuerpo),
      responses: { 200: ok('Producto editado', ref('ProductoVitrina')), 400: E400, 401: E401, 404: E404 }
    },
    delete: {
      tags: ['Vitrina'],
      summary: 'Borrar un producto (su QR deja de funcionar)',
      parameters: [idPath],
      responses: {
        200: ok('Borrado', { type: 'object', properties: { id: { type: 'integer' } } }),
        401: E401,
        404: E404
      }
    }
  },

  // ---------- Vitrina pública (sin login) ----------
  '/vitrina-publica/{slug}': {
    get: {
      tags: ['Vitrina pública'],
      summary: 'Página pública del productor con sus productos',
      ...publica,
      parameters: [slugPath],
      responses: {
        200: ok('Vitrina', {
          allOf: [ref('Vitrina'), { type: 'object', properties: { productos: lista('ProductoVitrina') } }]
        }),
        404: error('No existe o no está publicada')
      }
    }
  },
  '/vitrina-publica/{slug}/productos/{codigo}': {
    get: {
      tags: ['Vitrina pública'],
      summary: 'Lo que abre el QR: trazabilidad del lote',
      ...publica,
      parameters: [slugPath, { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: ok('Producto', {
          type: 'object',
          properties: { vitrina: ref('Vitrina'), producto: ref('ProductoVitrina') }
        }),
        404: E404
      }
    }
  },
  '/vitrina-publica/{slug}/consultas': {
    post: {
      tags: ['Vitrina pública'],
      summary: 'Mandar una consulta al productor',
      description: 'Entra en su agenda de compradores y le llega un aviso por N8N. Máximo 5 por hora por conexión.',
      ...publica,
      parameters: [slugPath],
      requestBody: cuerpo({
        type: 'object',
        required: ['nombre', 'mensaje'],
        properties: {
          nombre: { type: 'string', maxLength: 120 },
          empresa: { type: 'string', maxLength: 120 },
          telefono: { type: 'string', maxLength: 30 },
          email: { type: 'string', format: 'email' },
          ciudad: { type: 'string', maxLength: 80 },
          mensaje: { type: 'string', maxLength: 1000 },
          codigo: { type: 'string', description: 'Código del producto, si consulta por uno' }
        }
      }),
      responses: {
        201: ok('Consulta enviada', { type: 'object', properties: { ok: { type: 'boolean' } } }),
        400: E400,
        404: error('Vitrina no encontrada'),
        429: E429
      }
    }
  },

  // ---------- Precios de insumos ----------
  '/insumos/precios': {
    get: {
      tags: ['Insumos'],
      summary: 'Mi lista de precios de insumos (del más nuevo al más viejo)',
      responses: { 200: ok('Precios', lista('PrecioInsumo')), 401: E401 }
    },
    post: {
      tags: ['Insumos'],
      summary: 'Guardar uno o varios precios',
      description: 'Manda un precio suelto o `{ precios: [...] }` (hasta 100). La fecha por defecto es hoy.',
      requestBody: cuerpo({
        type: 'object',
        properties: {
          precios: {
            type: 'array',
            items: {
              type: 'object',
              required: ['nombre', 'unidad', 'precio'],
              properties: {
                nombre: { type: 'string', maxLength: 120 },
                unidad: { type: 'string', enum: ['kg', 'un', 'l'] },
                precio: { type: 'number', description: 'Por kg, unidad o litro' },
                presentacion: { type: 'string', maxLength: 80 },
                precioPresentacion: { type: 'number' },
                proveedor: { type: 'string', maxLength: 120 },
                fecha,
                ivaIncluido: { type: 'boolean' },
                origen: { type: 'string', enum: ['manual', 'ia'] }
              }
            }
          }
        }
      }),
      responses: { 201: ok('Precios guardados', lista('PrecioInsumo')), 400: E400, 401: E401 }
    }
  },
  '/insumos/precios/{id}': {
    delete: {
      tags: ['Insumos'],
      summary: 'Borrar un precio',
      parameters: [idPath],
      responses: {
        200: ok('Borrado', { type: 'object', properties: { id: { type: 'integer' } } }),
        401: E401,
        404: E404
      }
    }
  },
  '/insumos/extraer-cotizacion': {
    post: {
      tags: ['Insumos'],
      summary: 'Leer una cotización (foto o PDF) con IA',
      description:
        'Devuelve los precios por kg, unidad o litro para revisar. No guarda nada. Acepta JPG, PNG, WebP y PDF.',
      requestBody: cuerpo({
        type: 'object',
        required: ['archivoBase64', 'mediaType'],
        properties: {
          archivoBase64: { type: 'string', description: 'Archivo en base64, sin el prefijo data:' },
          mediaType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] }
        }
      }),
      responses: {
        200: ok('Precios leídos', {
          type: 'object',
          properties: {
            proveedor: { type: 'string', nullable: true },
            fecha: { type: 'string', nullable: true },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  descripcion: { type: 'string' },
                  presentacion: { type: 'string', nullable: true },
                  unidad: { type: 'string', enum: ['kg', 'un', 'l'] },
                  precioPresentacion: { type: 'number' },
                  precio: { type: 'number', description: 'Por kg, unidad o litro' },
                  ivaIncluido: { type: 'boolean', nullable: true }
                }
              }
            }
          }
        }),
        400: E400,
        401: E401,
        422: error('No se encontraron precios'),
        429: E429,
        502: error('Falló la IA')
      }
    }
  },

  // ---------- Cuaderno de campo ----------
  '/cuaderno': {
    get: {
      tags: ['Cuaderno de campo'],
      summary: 'Registros del cuaderno (hasta 1000, del más nuevo al más viejo)',
      parameters: [
        { name: 'loteId', in: 'query', schema: { type: 'integer' } },
        {
          name: 'tipo',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['aplicacion', 'fertilizacion', 'riego', 'poda', 'raleo', 'cosecha', 'labor']
          }
        },
        { name: 'desde', in: 'query', schema: fecha },
        { name: 'hasta', in: 'query', schema: fecha }
      ],
      responses: { 200: ok('Registros', lista('RegistroCampo')), 400: E400, 401: E401 }
    },
    post: {
      tags: ['Cuaderno de campo'],
      summary: 'Cargar un registro en uno o varios cuarteles',
      description: 'La fecha no puede ser futura. En las aplicaciones el producto es obligatorio.',
      requestBody: cuerpo({ ...registroCuerpo, required: ['loteIds', 'fecha', 'tipo'] }),
      responses: { 201: ok('Registros creados', lista('RegistroCampo')), 400: E400, 401: E401, 404: E404 }
    }
  },
  '/cuaderno/carencias': {
    get: {
      tags: ['Cuaderno de campo'],
      summary: 'Cuarteles dentro del período de carencia (no se pueden cosechar)',
      responses: {
        200: ok('Carencias vigentes', {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lote_id: { type: 'integer' },
              cuartel: { type: 'string' },
              producto: { type: 'string' },
              fecha: { type: 'string', format: 'date-time' },
              carencia_dias: { type: 'integer' },
              cosecha_desde: { type: 'string', format: 'date-time' }
            }
          }
        }),
        401: E401
      }
    }
  },
  '/cuaderno/{id}': {
    patch: {
      tags: ['Cuaderno de campo'],
      summary: 'Editar un registro',
      parameters: [idPath],
      requestBody: cuerpo(registroCuerpo),
      responses: { 200: ok('Registro editado', ref('RegistroCampo')), 400: E400, 401: E401, 404: E404 }
    },
    delete: {
      tags: ['Cuaderno de campo'],
      summary: 'Borrar un registro',
      parameters: [idPath],
      responses: {
        200: ok('Borrado', { type: 'object', properties: { id: { type: 'integer' } } }),
        401: E401,
        404: E404
      }
    }
  },

  // ---------- Certificaciones ----------
  '/certificaciones/plantillas': {
    get: {
      tags: ['Certificaciones'],
      summary: 'Plantillas de checklist disponibles (orientativas)',
      responses: { 200: ok('Plantillas', { type: 'array', items: { type: 'object' } }), 401: E401 }
    }
  },
  '/certificaciones': {
    get: {
      tags: ['Certificaciones'],
      summary: 'Mis certificaciones con su checklist, cumplimiento y evidencia',
      responses: { 200: ok('Certificaciones', lista('Certificacion')), 401: E401 }
    },
    post: {
      tags: ['Certificaciones'],
      summary: 'Agregar una certificación (copia el checklist de la plantilla del tipo)',
      requestBody: cuerpo({
        ...certificacionCuerpo,
        required: ['tipo'],
        properties: {
          ...certificacionCuerpo.properties,
          conPlantilla: { type: 'boolean', description: 'false = sin checklist inicial' }
        }
      }),
      responses: { 201: ok('Certificación creada', ref('Certificacion')), 400: E400, 401: E401 }
    }
  },
  '/certificaciones/{id}': {
    patch: {
      tags: ['Certificaciones'],
      summary: 'Editar una certificación',
      description: 'Si cambia el vencimiento o la próxima auditoría, el aviso por N8N vuelve a programarse.',
      parameters: [idPath],
      requestBody: cuerpo(certificacionCuerpo),
      responses: { 200: ok('Certificación editada', ref('Certificacion')), 400: E400, 401: E401, 404: E404 }
    },
    delete: {
      tags: ['Certificaciones'],
      summary: 'Borrar una certificación y su checklist',
      parameters: [idPath],
      responses: {
        200: ok('Borrada', { type: 'object', properties: { id: { type: 'integer' } } }),
        401: E401,
        404: E404
      }
    }
  },
  '/certificaciones/{id}/requisitos': {
    post: {
      tags: ['Certificaciones'],
      summary: 'Agregar un requisito al checklist',
      parameters: [idPath],
      requestBody: cuerpo({ ...requisitoCuerpo, required: ['texto'] }),
      responses: { 201: ok('Requisito agregado', ref('Requisito')), 400: E400, 401: E401, 404: E404 }
    }
  },
  '/certificaciones/{id}/requisitos/{requisito}': {
    patch: {
      tags: ['Certificaciones'],
      summary: 'Editar un requisito o marcarlo cumplido',
      parameters: [idPath, requisitoPath],
      requestBody: cuerpo(requisitoCuerpo),
      responses: { 200: ok('Requisito editado', ref('Requisito')), 400: E400, 401: E401, 404: E404 }
    },
    delete: {
      tags: ['Certificaciones'],
      summary: 'Quitar un requisito del checklist',
      parameters: [idPath, requisitoPath],
      responses: {
        200: ok('Quitado', { type: 'object', properties: { id: { type: 'integer' } } }),
        401: E401,
        404: E404
      }
    }
  },

  // ---------- Historial ----------
  '/historial': {
    get: {
      tags: ['Historial'],
      summary: 'Auditoría de movimientos del productor',
      responses: { 200: ok('Eventos', lista('Evento')), 401: E401 }
    }
  }
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'AgroTech API',
    version,
    description:
      'API REST de AgroTech: gestión financiera por lote para productores de San Rafael y Valle de Uco.\n\n' +
      'Para probar los endpoints protegidos: `POST /auth/login`, copiá el `token` y pegalo en **Authorize**.'
  },
  servers: [{ url: '/api', description: 'Este servidor' }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Registro, login y contraseña' },
    { name: 'Mis datos' },
    { name: 'Fincas y cuarteles' },
    { name: 'Gastos' },
    { name: 'Ingresos' },
    { name: 'Cartera de cheques' },
    { name: 'Inversiones' },
    { name: 'Resumen' },
    { name: 'N8N', description: 'Avisos por WhatsApp y email' },
    { name: 'Red de Productores' },
    { name: 'Envíos', description: 'Envíos de materia prima con DTV-e' },
    { name: 'Remitos', description: 'Remito R por autoimpresor (se activa con el CAI)' },
    { name: 'Compradores', description: 'Agenda privada de compradores del producto elaborado' },
    { name: 'Vitrina', description: 'Mi página pública y mis productos por lote' },
    { name: 'Vitrina pública', description: 'Sin login: lo que ven los compradores y el QR' },
    { name: 'Cuaderno de campo', description: 'Aplicaciones, fertilización, riego, labores y cosecha por cuartel' },
    { name: 'Certificaciones', description: 'BPA, GlobalG.A.P. y otras: vencimientos, auditorías y checklist' },
    { name: 'Insumos', description: 'Precios de insumos para el simulador (a mano o leyendo una cotización con IA)' },
    { name: 'Historial' }
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas
  },
  paths
};
