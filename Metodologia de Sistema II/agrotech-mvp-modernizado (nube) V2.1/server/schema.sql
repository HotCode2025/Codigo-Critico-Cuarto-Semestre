-- ============================================
-- AGROTECH MVP - ESQUEMA DE BASE DE DATOS (PostgreSQL)
-- Metodología de Sistemas II - UTN FRSR 2025/2026
-- ============================================

CREATE TABLE productores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(30),
  zona VARCHAR(60),
  cultivo_principal VARCHAR(60),
  reset_token_hash VARCHAR(64),
  reset_token_expira TIMESTAMPTZ,
  -- Hasta confirmar el email no se mandan avisos por email ni WhatsApp (ver migrations/001).
  email_verificado BOOLEAN NOT NULL DEFAULT false,
  verificacion_token_hash VARCHAR(64),
  verificacion_token_expira TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una finca agrupa varios lotes/cuarteles. Un productor puede tener varias fincas.
CREATE TABLE fincas (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  ubicacion VARCHAR(120),
  -- Ubicación para el pronóstico del clima (ver migrations/010)
  latitud NUMERIC(8,5) CHECK (latitud BETWEEN -90 AND 90),
  longitud NUMERIC(8,5) CHECK (longitud BETWEEN -180 AND 180),
  lugar VARCHAR(120),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lotes (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  finca_id INTEGER NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'blue',
  area NUMERIC(8,2) NOT NULL DEFAULT 0,
  cultivo VARCHAR(80),
  riego VARCHAR(30),
  malla_antigranizo BOOLEAN NOT NULL DEFAULT false,
  terreno VARCHAR(20),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gastos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  concepto VARCHAR(120) NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('pagado', 'programado')),
  fecha DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ingresos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  monto_neto NUMERIC(14,2),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('contado', 'transferencia', 'fisico', 'echeq')),
  estado VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (estado IN ('normal', 'rechazado')),
  con_descuento BOOLEAN NOT NULL DEFAULT false,
  costo_financiero NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_cobro DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cheques físicos/echeq pendientes de cobro (se generan al registrar un ingreso sin descuento)
CREATE TABLE cheques_cartera (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  ingreso_id INTEGER REFERENCES ingresos(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('fisico', 'echeq')),
  monto NUMERIC(14,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (estado IN ('normal', 'descontado', 'cobrado')),
  fecha_cobro DATE NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inversiones (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  ticker VARCHAR(20) NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'vendida')),
  monto_venta NUMERIC(14,2),
  fecha_venta TIMESTAMPTZ
);

CREATE TABLE historial_eventos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  tipo VARCHAR(40) NOT NULL,
  datos JSONB NOT NULL DEFAULT '{}',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE config_n8n (
  productor_id INTEGER PRIMARY KEY REFERENCES productores(id) ON DELETE CASCADE,
  webhook_url TEXT,
  habilitado BOOLEAN NOT NULL DEFAULT false,
  whatsapp_telefono VARCHAR(20),
  whatsapp_apikey VARCHAR(20),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Red de Productores: alertas colaborativas (plagas, clima, precios)
CREATE TABLE alertas_red (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('plaga', 'clima', 'precio', 'maquinaria', 'otro')),
  zona VARCHAR(60) NOT NULL,
  cultivo VARCHAR(40),
  descripcion TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'resuelta')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Red de Productores: ofertas de trueque (maquinaria / mano de obra / insumos)
CREATE TABLE trueques (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('maquinaria', 'mano_obra', 'insumo')),
  titulo VARCHAR(160) NOT NULL,
  descripcion TEXT,
  zona VARCHAR(60) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Envíos de materia prima a la fábrica o la bodega (ver migrations/002). El DTV-e se emite en
-- ARCA: acá solo se guarda su número y vencimiento. Un envío nunca se borra: se anula.
CREATE TABLE envios (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  producto VARCHAR(60),
  kg NUMERIC(10,2) NOT NULL CHECK (kg > 0),
  bins INTEGER NOT NULL DEFAULT 0 CHECK (bins >= 0),
  destino_nombre VARCHAR(120) NOT NULL,
  destino_cuit VARCHAR(11),
  transportista_nombre VARCHAR(120),
  transportista_cuit VARCHAR(11),
  chofer VARCHAR(120),
  patente_camion VARCHAR(7),
  patente_acoplado VARCHAR(7),
  observaciones VARCHAR(500),
  estado VARCHAR(20) NOT NULL DEFAULT 'cargado'
    CHECK (estado IN ('cargado', 'dtv_registrado', 'entregado', 'anulado')),
  dtv_numero VARCHAR(40),
  dtv_vencimiento DATE,
  kg_balanza NUMERIC(10,2) CHECK (kg_balanza > 0),
  entregado_en TIMESTAMPTZ,
  anulado_motivo VARCHAR(200),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Remito R por autoimpresor (ver migrations/003). Sin talonario con CAI, el módulo está apagado.
CREATE TABLE talonarios_remito (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  punto_venta INTEGER NOT NULL CHECK (punto_venta BETWEEN 1 AND 99999),
  numero_desde INTEGER NOT NULL CHECK (numero_desde BETWEEN 1 AND 99999999),
  numero_hasta INTEGER NOT NULL CHECK (numero_hasta BETWEEN 1 AND 99999999),
  cai VARCHAR(14) NOT NULL CHECK (cai ~ '^[0-9]{14}$'),
  cai_vencimiento DATE NOT NULL,
  emisor_razon_social VARCHAR(120) NOT NULL,
  emisor_cuit VARCHAR(11) NOT NULL,
  emisor_domicilio VARCHAR(160) NOT NULL,
  emisor_condicion_iva VARCHAR(30) NOT NULL,
  emisor_iibb VARCHAR(30),
  emisor_inicio_actividades DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (numero_hasta >= numero_desde)
);

-- Un solo talonario activo por productor: al cargar un CAI nuevo, el anterior se desactiva.
CREATE UNIQUE INDEX idx_talonario_activo ON talonarios_remito(productor_id) WHERE activo;

CREATE TABLE remitos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  talonario_id INTEGER NOT NULL REFERENCES talonarios_remito(id) ON DELETE CASCADE,
  envio_id INTEGER NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  punto_venta INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  fecha DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'emitido' CHECK (estado IN ('emitido', 'anulado')),
  -- Copia de los datos tal como se imprimieron (emisor, destino, transporte, detalle y CAI).
  datos JSONB NOT NULL,
  anulado_motivo VARCHAR(200),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un número nunca se repite en el mismo punto de venta, aunque se cargue otra vez el mismo CAI.
  UNIQUE (productor_id, punto_venta, numero)
);

-- Un envío tiene a lo sumo un remito vigente (los anulados quedan como registro).
CREATE UNIQUE INDEX idx_remito_vigente_envio ON remitos(envio_id) WHERE estado = 'emitido';
CREATE INDEX idx_remitos_productor ON remitos(productor_id, numero DESC);

-- Venta del producto elaborado (ver migrations/004).
-- Página pública del productor. Nada de lo financiero se publica: solo lo que se carga acá.
CREATE TABLE vitrinas (
  productor_id INTEGER PRIMARY KEY REFERENCES productores(id) ON DELETE CASCADE,
  slug VARCHAR(60) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre_publico VARCHAR(120) NOT NULL,
  descripcion VARCHAR(500),
  zona VARCHAR(60),
  whatsapp VARCHAR(30),
  email VARCHAR(160),
  publicada BOOLEAN NOT NULL DEFAULT false,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Producto terminado por lote. El código va en el QR de la etiqueta.
CREATE TABLE productos_vitrina (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  codigo VARCHAR(12) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(500),
  presentacion VARCHAR(80),
  cantidad_disponible INTEGER CHECK (cantidad_disponible >= 0),
  unidad_venta VARCHAR(40),
  precio NUMERIC(14,2) CHECK (precio > 0),
  lote VARCHAR(40),
  fecha_elaboracion DATE,
  fecha_vencimiento DATE,
  lote_id INTEGER REFERENCES lotes(id) ON DELETE SET NULL,
  publicado BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agenda privada de compradores. Las consultas que llegan desde la vitrina entran acá solas.
CREATE TABLE compradores (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  empresa VARCHAR(120),
  telefono VARCHAR(30),
  email VARCHAR(160),
  ciudad VARCHAR(80),
  interes VARCHAR(160),
  estado VARCHAR(20) NOT NULL DEFAULT 'a_contactar'
    CHECK (estado IN ('a_contactar', 'contactado', 'cotizado', 'cerrado', 'descartado')),
  origen VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'vitrina')),
  producto_id INTEGER REFERENCES productos_vitrina(id) ON DELETE SET NULL,
  precio_cotizado NUMERIC(14,2) CHECK (precio_cotizado > 0),
  notas VARCHAR(1000),
  ultimo_contacto DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_productos_vitrina_productor ON productos_vitrina(productor_id);
CREATE INDEX idx_compradores_productor ON compradores(productor_id, creado_en DESC);

-- Precios de insumos para el simulador (ver migrations/005).
CREATE TABLE precios_insumos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  unidad VARCHAR(10) NOT NULL CHECK (unidad IN ('kg', 'un', 'l')),
  -- Precio por unidad (por kg, por unidad o por litro), ya dividido por la presentación.
  precio NUMERIC(16,4) NOT NULL CHECK (precio > 0),
  presentacion VARCHAR(80),
  precio_presentacion NUMERIC(14,2) CHECK (precio_presentacion > 0),
  proveedor VARCHAR(120),
  fecha DATE NOT NULL,
  iva_incluido BOOLEAN,
  origen VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'ia')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_precios_insumos_productor ON precios_insumos(productor_id, fecha DESC);

-- Cuaderno de campo y certificaciones (ver migrations/006).
CREATE TABLE cuaderno_campo (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL
    CHECK (tipo IN ('aplicacion', 'fertilizacion', 'riego', 'poda', 'raleo', 'cosecha', 'labor', 'analisis')),
  -- Producto comercial (fitosanitario o fertilizante) o descripción de la labor
  producto VARCHAR(120),
  principio_activo VARCHAR(120),
  dosis NUMERIC(12,3) CHECK (dosis > 0),
  unidad_dosis VARCHAR(20),
  cantidad NUMERIC(12,2) CHECK (cantidad > 0),
  unidad_cantidad VARCHAR(20),
  motivo VARCHAR(160),
  operador VARCHAR(120),
  equipo VARCHAR(120),
  -- Aplicaciones: días que hay que esperar para cosechar y horas para volver a entrar al cuartel
  carencia_dias INTEGER CHECK (carencia_dias >= 0),
  reingreso_horas INTEGER CHECK (reingreso_horas >= 0),
  -- Análisis de laboratorio (ver migrations/007): qué se analizó, dónde, los valores y el informe
  analisis VARCHAR(10) CHECK (analisis IN ('suelo', 'agua', 'foliar', 'residuos')),
  laboratorio VARCHAR(120),
  ph NUMERIC(4,2) CHECK (ph BETWEEN 0 AND 14),
  conductividad NUMERIC(8,3) CHECK (conductividad >= 0),
  materia_organica NUMERIC(5,2) CHECK (materia_organica BETWEEN 0 AND 100),
  -- Resultado según el laboratorio: apto / dentro de los límites (true), no apto (false) o sin dato
  apto BOOLEAN,
  documento_url VARCHAR(500),
  observaciones VARCHAR(500),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cuaderno_campo_analisis_tipo_check CHECK (tipo <> 'analisis' OR analisis IS NOT NULL)
);

CREATE INDEX idx_cuaderno_productor ON cuaderno_campo(productor_id, fecha DESC);
CREATE INDEX idx_cuaderno_lote ON cuaderno_campo(lote_id, fecha DESC);

CREATE TABLE certificaciones (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('bpa', 'globalgap', 'organica', 'comercio_justo', 'otra')),
  nombre VARCHAR(120) NOT NULL,
  certificador VARCHAR(120),
  numero VARCHAR(60),
  alcance VARCHAR(300),
  fecha_emision DATE,
  vencimiento DATE,
  proxima_auditoria DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'en_tramite'
    CHECK (estado IN ('en_tramite', 'vigente', 'vencida', 'suspendida')),
  documento_url VARCHAR(500),
  -- Si se muestra en la vitrina pública (solo cuando está vigente)
  publica BOOLEAN NOT NULL DEFAULT false,
  notas VARCHAR(1000),
  -- Avisos por N8N ya enviados, para no repetirlos (se borran si cambia la fecha)
  aviso_vencimiento VARCHAR(10),
  aviso_auditoria VARCHAR(10),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificaciones_productor ON certificaciones(productor_id);

-- Checklist editable de cada certificación. `evidencia` enlaza el requisito con un tipo de registro
-- del cuaderno: la app muestra cuántos hay en los últimos 12 meses.
CREATE TABLE requisitos_certificacion (
  id SERIAL PRIMARY KEY,
  certificacion_id INTEGER NOT NULL REFERENCES certificaciones(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  area VARCHAR(80),
  texto VARCHAR(300) NOT NULL,
  cumplido BOOLEAN NOT NULL DEFAULT false,
  evidencia VARCHAR(20) CHECK (evidencia IN ('aplicacion', 'fertilizacion', 'riego', 'cosecha',
    'analisis_suelo', 'analisis_agua', 'analisis_foliar', 'analisis_residuos')),
  nota VARCHAR(300)
);

CREATE INDEX idx_requisitos_certificacion ON requisitos_certificacion(certificacion_id, orden);

CREATE INDEX idx_fincas_productor ON fincas(productor_id);
CREATE INDEX idx_lotes_productor ON lotes(productor_id);
CREATE INDEX idx_lotes_finca ON lotes(finca_id);
CREATE INDEX idx_gastos_productor ON gastos(productor_id);
CREATE INDEX idx_gastos_lote ON gastos(lote_id);
CREATE INDEX idx_ingresos_productor ON ingresos(productor_id);
CREATE INDEX idx_ingresos_lote ON ingresos(lote_id);
CREATE INDEX idx_cheques_productor ON cheques_cartera(productor_id);
CREATE INDEX idx_inversiones_productor ON inversiones(productor_id);
CREATE INDEX idx_historial_productor ON historial_eventos(productor_id, creado_en DESC);
CREATE INDEX idx_alertas_zona ON alertas_red(zona, estado);
CREATE INDEX idx_trueques_zona ON trueques(zona) WHERE activo;
CREATE INDEX idx_envios_productor ON envios(productor_id, fecha DESC);

-- Cosecha a destajo (ver migrations/008). Control de la cosecha y los pagos: no reemplaza RENATRE ni el recibo.
CREATE TABLE cosecheros (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  dni VARCHAR(12),
  telefono VARCHAR(30),
  -- Los que ya no trabajan se dan de baja (no se borran si tienen tarjas)
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cosecheros_productor ON cosecheros(productor_id);

-- Precio por defecto de cada modalidad y kilos que entran en un tacho o un bin.
CREATE TABLE tarifas_cosecha (
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  modalidad VARCHAR(10) NOT NULL CHECK (modalidad IN ('tacho', 'bin', 'kg', 'jornal')),
  precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  kg_por_unidad NUMERIC(8,2) CHECK (kg_por_unidad > 0),
  PRIMARY KEY (productor_id, modalidad)
);

-- Tarja: lo que hizo cada cosechero en un cuartel en un día. El precio y los kilos por unidad se
-- copian al cargarla, así un cambio de tarifa no altera lo que ya se trabajó.
CREATE TABLE tarjas (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  -- Sin CASCADE: un cosechero con tarjas no se puede borrar (se da de baja)
  cosechero_id INTEGER NOT NULL REFERENCES cosecheros(id),
  lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  modalidad VARCHAR(10) NOT NULL CHECK (modalidad IN ('tacho', 'bin', 'kg', 'jornal')),
  -- Tachos, bins, kilos o jornales (1 = día completo, 0,5 = medio día)
  cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
  precio_unidad NUMERIC(12,2) NOT NULL CHECK (precio_unidad >= 0),
  kg_por_unidad NUMERIC(8,2) CHECK (kg_por_unidad > 0),
  -- Fecha en que se le pagó; null = pendiente
  pagado_en DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cosechero_id, lote_id, fecha, modalidad)
);

CREATE INDEX idx_tarjas_productor ON tarjas(productor_id, fecha DESC);

-- Stock de insumos (ver migrations/009).
CREATE TABLE insumos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(20) NOT NULL DEFAULT 'otro'
    CHECK (categoria IN ('fitosanitario', 'fertilizante', 'combustible', 'repuesto', 'envase', 'otro')),
  -- Repuestos: para qué máquina son (tractor, pulverizadora...) (ver migrations/011)
  maquina VARCHAR(80),
  -- Las mismas unidades que la lista de precios, para poder guardar ahí el precio de cada compra
  unidad VARCHAR(10) NOT NULL CHECK (unidad IN ('kg', 'l', 'un')),
  -- Para completar solo el cuaderno al elegir el insumo en una aplicación
  principio_activo VARCHAR(120),
  carencia_dias INTEGER CHECK (carencia_dias >= 0),
  stock_minimo NUMERIC(14,3) CHECK (stock_minimo >= 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  -- Ya se avisó por N8N que está bajo el mínimo (se borra cuando se repone)
  aviso_stock BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_insumos_nombre ON insumos(productor_id, lower(nombre));

-- Cada entrada (+) o salida (−) de un insumo. El stock es la suma.
CREATE TABLE movimientos_stock (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  insumo_id INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('compra', 'uso', 'ajuste')),
  cantidad NUMERIC(14,3) NOT NULL CHECK (cantidad <> 0),
  -- Compras: precio por kg, litro o unidad, y a quién se le compró
  precio_unitario NUMERIC(16,4) CHECK (precio_unitario > 0),
  proveedor VARCHAR(120),
  -- Usos cargados desde el cuaderno: si se borra el registro, el insumo vuelve al stock
  cuaderno_id INTEGER REFERENCES cuaderno_campo(id) ON DELETE CASCADE,
  nota VARCHAR(300),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimientos_stock_insumo ON movimientos_stock(insumo_id, fecha DESC);
CREATE INDEX idx_movimientos_stock_cuaderno ON movimientos_stock(cuaderno_id);

-- El cuaderno guarda qué insumo del stock se usó y cuánto en ese cuartel.
ALTER TABLE cuaderno_campo ADD COLUMN insumo_id INTEGER REFERENCES insumos(id) ON DELETE SET NULL;
ALTER TABLE cuaderno_campo ADD COLUMN cantidad_insumo NUMERIC(14,3) CHECK (cantidad_insumo > 0);

-- Clima por finca (ver migrations/010): umbral de helada y avisos ya mandados.
CREATE TABLE config_clima (
  productor_id INTEGER PRIMARY KEY REFERENCES productores(id) ON DELETE CASCADE,
  -- Se avisa si la mínima pronosticada es igual o menor (°C)
  umbral_helada NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (umbral_helada BETWEEN -15 AND 10),
  avisar BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE avisos_clima (
  finca_id INTEGER NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('helada', 'granizo')),
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (finca_id, fecha, tipo)
);

-- Gasto que salió de una compra del stock (ver migrations/011). creado_por_stock: lo creó la compra y
-- se borra con ella; si es false, era un gasto que ya existía y solo se desvincula.
ALTER TABLE gastos ADD COLUMN movimiento_stock_id INTEGER REFERENCES movimientos_stock(id) ON DELETE SET NULL;
ALTER TABLE gastos ADD COLUMN creado_por_stock BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX idx_gastos_movimiento_stock ON gastos(movimiento_stock_id);
