-- Remito R por autoimpresor (módulo 1 de la práctica profesional, segunda parte).
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 002.
-- Solo crea tablas nuevas: no toca datos existentes.
--
-- El remito solo se puede emitir con un talonario cargado: el CAI de autoimpresor que da ARCA al
-- habilitar al productor. Sin CAI, el módulo queda apagado. Un remito nunca se borra: se anula y su
-- número queda usado.

CREATE TABLE IF NOT EXISTS talonarios_remito (
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_talonario_activo ON talonarios_remito(productor_id) WHERE activo;

CREATE TABLE IF NOT EXISTS remitos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  talonario_id INTEGER NOT NULL REFERENCES talonarios_remito(id) ON DELETE CASCADE,
  envio_id INTEGER NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  fecha DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'emitido' CHECK (estado IN ('emitido', 'anulado')),
  -- Copia de los datos tal como se imprimieron (emisor, destino, transporte, detalle y CAI).
  datos JSONB NOT NULL,
  anulado_motivo VARCHAR(200),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (talonario_id, numero)
);

-- Un envío tiene a lo sumo un remito vigente (los anulados quedan como registro).
CREATE UNIQUE INDEX IF NOT EXISTS idx_remito_vigente_envio ON remitos(envio_id) WHERE estado = 'emitido';
CREATE INDEX IF NOT EXISTS idx_remitos_productor ON remitos(productor_id, numero DESC);
