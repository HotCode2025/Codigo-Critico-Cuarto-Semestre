-- Lista de precios de insumos del productor (azúcar, latas, etiquetas...), para el simulador
-- "¿vendo la fruta o la elaboro?". Cada fila es un precio cotizado por un proveedor en una fecha:
-- se guarda el historial y el simulador usa el más reciente de cada insumo.
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 004.
-- Solo crea una tabla nueva: no toca datos existentes.

CREATE TABLE IF NOT EXISTS precios_insumos (
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

CREATE INDEX IF NOT EXISTS idx_precios_insumos_productor ON precios_insumos(productor_id, fecha DESC);
