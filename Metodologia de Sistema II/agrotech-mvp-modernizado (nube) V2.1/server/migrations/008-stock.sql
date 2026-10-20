-- Stock de insumos: fitosanitarios, fertilizantes, combustible, envases... Las compras suman, las
-- aplicaciones y fertilizaciones del cuaderno de campo descuentan solas y un ajuste corrige contra
-- lo que se contó en el depósito. Avisa por N8N cuando un insumo baja del mínimo.
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 007.
-- Crea tablas nuevas y agrega dos columnas (vacías) al cuaderno de campo: no toca datos existentes.

CREATE TABLE IF NOT EXISTS insumos (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(20) NOT NULL DEFAULT 'otro'
    CHECK (categoria IN ('fitosanitario', 'fertilizante', 'combustible', 'envase', 'otro')),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_insumos_nombre ON insumos(productor_id, lower(nombre));

-- Cada entrada (+) o salida (−) de un insumo. El stock es la suma.
CREATE TABLE IF NOT EXISTS movimientos_stock (
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

CREATE INDEX IF NOT EXISTS idx_movimientos_stock_insumo ON movimientos_stock(insumo_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_stock_cuaderno ON movimientos_stock(cuaderno_id);

-- El cuaderno guarda qué insumo del stock se usó y cuánto en ese cuartel.
ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS insumo_id INTEGER REFERENCES insumos(id) ON DELETE SET NULL;
ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS cantidad_insumo NUMERIC(14,3) CHECK (cantidad_insumo > 0);
