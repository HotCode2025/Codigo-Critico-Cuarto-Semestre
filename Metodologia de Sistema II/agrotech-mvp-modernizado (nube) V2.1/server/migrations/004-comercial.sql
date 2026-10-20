-- Venta del producto elaborado: agenda de compradores y vitrina pública con QR por lote
-- (módulos 2 y 3 de la práctica profesional).
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 003.
-- Solo crea tablas nuevas: no toca datos existentes.

-- Página pública del productor. Nada de lo financiero se publica: solo lo que se carga acá.
CREATE TABLE IF NOT EXISTS vitrinas (
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
CREATE TABLE IF NOT EXISTS productos_vitrina (
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
CREATE TABLE IF NOT EXISTS compradores (
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

CREATE INDEX IF NOT EXISTS idx_productos_vitrina_productor ON productos_vitrina(productor_id);
CREATE INDEX IF NOT EXISTS idx_compradores_productor ON compradores(productor_id, creado_en DESC);
