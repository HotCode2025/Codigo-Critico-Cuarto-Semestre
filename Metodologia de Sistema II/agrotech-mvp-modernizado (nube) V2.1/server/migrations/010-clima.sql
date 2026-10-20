-- Clima por finca: ubicación de cada finca (para pedir el pronóstico), umbral de helada del
-- productor y los avisos de helada o granizo ya mandados por N8N (para no repetirlos).
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 009.
-- Agrega columnas (vacías) a fincas y crea tablas nuevas: no toca datos existentes.
--
-- El pronóstico sale de Open-Meteo (gratis, sin clave, solo para uso no comercial): recibe solo las
-- coordenadas de la finca, nunca datos del productor.

ALTER TABLE fincas ADD COLUMN IF NOT EXISTS latitud NUMERIC(8,5) CHECK (latitud BETWEEN -90 AND 90);
ALTER TABLE fincas ADD COLUMN IF NOT EXISTS longitud NUMERIC(8,5) CHECK (longitud BETWEEN -180 AND 180);
-- Nombre del lugar elegido al ubicarla (ej: "Tunuyán, Mendoza")
ALTER TABLE fincas ADD COLUMN IF NOT EXISTS lugar VARCHAR(120);

CREATE TABLE IF NOT EXISTS config_clima (
  productor_id INTEGER PRIMARY KEY REFERENCES productores(id) ON DELETE CASCADE,
  -- Se avisa si la mínima pronosticada es igual o menor (°C)
  umbral_helada NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (umbral_helada BETWEEN -15 AND 10),
  avisar BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS avisos_clima (
  finca_id INTEGER NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('helada', 'granizo')),
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (finca_id, fecha, tipo)
);
