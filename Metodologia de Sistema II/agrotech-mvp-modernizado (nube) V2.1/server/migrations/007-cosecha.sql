-- Cosecha a destajo: cosecheros de la temporada, tarja diaria (tachos, bins, kilos o jornales por
-- cosechero y cuartel) y liquidación de lo que hay que pagar.
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 006.
-- Solo crea tablas nuevas: no toca datos existentes.
--
-- Sirve para llevar el control de la cosecha y de los pagos. No reemplaza el registro de los
-- trabajadores (RENATRE, alta temprana) ni el recibo de sueldo: eso lo hace el contador.

CREATE TABLE IF NOT EXISTS cosecheros (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  dni VARCHAR(12),
  telefono VARCHAR(30),
  -- Los que ya no trabajan se dan de baja (no se borran si tienen tarjas)
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cosecheros_productor ON cosecheros(productor_id);

-- Precio por defecto de cada modalidad y kilos que entran en un tacho o un bin.
CREATE TABLE IF NOT EXISTS tarifas_cosecha (
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  modalidad VARCHAR(10) NOT NULL CHECK (modalidad IN ('tacho', 'bin', 'kg', 'jornal')),
  precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  kg_por_unidad NUMERIC(8,2) CHECK (kg_por_unidad > 0),
  PRIMARY KEY (productor_id, modalidad)
);

-- Tarja: lo que hizo cada cosechero en un cuartel en un día. El precio y los kilos por unidad se
-- copian al cargarla, así un cambio de tarifa no altera lo que ya se trabajó.
CREATE TABLE IF NOT EXISTS tarjas (
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

CREATE INDEX IF NOT EXISTS idx_tarjas_productor ON tarjas(productor_id, fecha DESC);
