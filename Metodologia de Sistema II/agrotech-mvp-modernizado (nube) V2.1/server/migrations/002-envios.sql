-- Envíos de materia prima (módulo 1 de la práctica profesional).
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa.
-- Solo crea una tabla nueva: no toca datos existentes y el backend viejo la ignora.
--
-- Un envío se carga una sola vez y de esos datos salen el DTV-e (se emite en ARCA; acá solo se
-- registra su número y vencimiento) y, más adelante, el remito R. Un envío nunca se borra: se anula.

CREATE TABLE IF NOT EXISTS envios (
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

CREATE INDEX IF NOT EXISTS idx_envios_productor ON envios(productor_id, fecha DESC);
