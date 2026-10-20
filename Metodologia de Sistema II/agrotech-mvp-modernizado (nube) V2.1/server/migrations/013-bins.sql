-- Bins en comodato: los envases que presta cada fábrica para cosechar. La fábrica los trae vacíos,
-- vuelven llenos con cada envío (que ya guarda cuántos bins salen y el remito los imprime) y la
-- fábrica retira los vacíos que sobran. El saldo dice cuántos bins de cada fábrica hay en la finca.
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 012.
-- Crea tablas nuevas y agrega una columna (vacía) a envios: no toca datos existentes.

-- Los bins de cada fábrica (ej: "Bins plásticos Wenco, marca Ava").
CREATE TABLE IF NOT EXISTS tipos_bin (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  fabrica_nombre VARCHAR(120) NOT NULL,
  fabrica_cuit VARCHAR(11),
  descripcion VARCHAR(120) NOT NULL,
  marca VARCHAR(60),
  color VARCHAR(40),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tipos_bin_productor ON tipos_bin(productor_id);

-- Entregas de vacíos (+), retiros de vacíos (−), rotos o perdidos (−) y ajustes por conteo (±).
-- Los que vuelven llenos salen de los envíos.
CREATE TABLE IF NOT EXISTS movimientos_bins (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  tipo_bin_id INTEGER NOT NULL REFERENCES tipos_bin(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrega', 'retiro', 'rotura', 'ajuste')),
  cantidad INTEGER NOT NULL CHECK (cantidad <> 0),
  -- Número del remito o la nota con que la fábrica trajo o retiró los bins
  remito_fabrica VARCHAR(40),
  nota VARCHAR(300),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_bins ON movimientos_bins(tipo_bin_id, fecha DESC);

-- De qué fábrica son los bins que salen en el envío.
ALTER TABLE envios ADD COLUMN IF NOT EXISTS tipo_bin_id INTEGER REFERENCES tipos_bin(id) ON DELETE SET NULL;
