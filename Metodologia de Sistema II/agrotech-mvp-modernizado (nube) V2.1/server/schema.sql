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
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lotes (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'blue',
  area NUMERIC(8,2) NOT NULL DEFAULT 0,
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
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE INDEX idx_lotes_productor ON lotes(productor_id);
CREATE INDEX idx_gastos_productor ON gastos(productor_id);
CREATE INDEX idx_gastos_lote ON gastos(lote_id);
CREATE INDEX idx_ingresos_productor ON ingresos(productor_id);
CREATE INDEX idx_ingresos_lote ON ingresos(lote_id);
CREATE INDEX idx_cheques_productor ON cheques_cartera(productor_id);
CREATE INDEX idx_inversiones_productor ON inversiones(productor_id);
CREATE INDEX idx_historial_productor ON historial_eventos(productor_id, creado_en DESC);
CREATE INDEX idx_alertas_zona ON alertas_red(zona, estado);
CREATE INDEX idx_trueques_zona ON trueques(zona) WHERE activo;
