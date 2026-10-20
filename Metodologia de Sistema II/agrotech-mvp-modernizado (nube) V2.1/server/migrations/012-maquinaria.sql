-- Maquinaria, herramientas y bienes de uso: tractores, implementos, vehículos, escaleras, bins...
-- Lo que dura años y no se consume (lo que se gasta va en el stock). Con el service por fecha y los
-- vencimientos de seguro y patente/VTV, con aviso por N8N.
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 011.
-- Crea tablas nuevas y agrega dos columnas (vacías): no toca datos existentes.

CREATE TABLE IF NOT EXISTS bienes (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  finca_id INTEGER REFERENCES fincas(id) ON DELETE SET NULL,
  nombre VARCHAR(120) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'otro'
    CHECK (tipo IN ('tractor', 'implemento', 'vehiculo', 'herramienta', 'instalacion', 'otro')),
  marca VARCHAR(80),
  modelo VARCHAR(80),
  anio INTEGER CHECK (anio BETWEEN 1900 AND 2100),
  -- Número de serie, de motor o patente
  serie VARCHAR(60),
  -- Para lo que hay varios iguales (20 escaleras, 300 bins)
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
  estado VARCHAR(12) NOT NULL DEFAULT 'bueno' CHECK (estado IN ('bueno', 'reparacion', 'baja')),
  fecha_compra DATE,
  valor_compra NUMERIC(14,2) CHECK (valor_compra > 0),
  notas VARCHAR(500),
  -- Service por fecha: cada cuántos meses y cuándo fue el último
  service_cada_meses INTEGER CHECK (service_cada_meses BETWEEN 1 AND 60),
  ultimo_service DATE,
  seguro_vence DATE,
  patente_vence DATE,
  -- Fecha que ya se avisó por N8N (si la fecha cambia, se vuelve a avisar)
  aviso_service DATE,
  aviso_seguro DATE,
  aviso_patente DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bienes_productor ON bienes(productor_id);

-- Historial de services y arreglos de cada bien.
CREATE TABLE IF NOT EXISTS services_bien (
  id SERIAL PRIMARY KEY,
  bien_id INTEGER NOT NULL REFERENCES bienes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  descripcion VARCHAR(300) NOT NULL,
  taller VARCHAR(120),
  costo NUMERIC(14,2) CHECK (costo > 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_bien ON services_bien(bien_id, fecha DESC);

-- Los repuestos del stock pueden ser de un bien, y el costo de un service puede ir a Gastos
-- (el gasto se borra con el service).
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS bien_id INTEGER REFERENCES bienes(id) ON DELETE SET NULL;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS service_bien_id INTEGER REFERENCES services_bien(id) ON DELETE CASCADE;
