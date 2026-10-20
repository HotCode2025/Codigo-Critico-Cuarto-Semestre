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
      responses: { 201: ok('Talonario cargado', ref('Talonario')), 400: E400, 401: E401 }
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
    { name: 'Historial' }
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas
  },
  paths
};
