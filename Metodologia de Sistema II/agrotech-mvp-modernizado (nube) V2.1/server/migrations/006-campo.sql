-- Cuaderno de campo y certificaciones (BPA, GlobalG.A.P., orgánica...).
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 005.
-- Solo crea tablas nuevas: no toca datos existentes.
--
-- El cuaderno registra lo que se hace en cada cuartel (aplicaciones, fertilización, riego, labores,
-- cosecha) y es la evidencia que piden las certificaciones. La app no certifica: organiza lo que pide
-- el certificador.

CREATE TABLE IF NOT EXISTS cuaderno_campo (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  lote_id INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL
    CHECK (tipo IN ('aplicacion', 'fertilizacion', 'riego', 'poda', 'raleo', 'cosecha', 'labor')),
  -- Producto comercial (fitosanitario o fertilizante) o descripción de la labor
  producto VARCHAR(120),
  principio_activo VARCHAR(120),
  dosis NUMERIC(12,3) CHECK (dosis > 0),
  unidad_dosis VARCHAR(20),
  cantidad NUMERIC(12,2) CHECK (cantidad > 0),
  unidad_cantidad VARCHAR(20),
  motivo VARCHAR(160),
  operador VARCHAR(120),
  equipo VARCHAR(120),
  -- Aplicaciones: días que hay que esperar para cosechar y horas para volver a entrar al cuartel
  carencia_dias INTEGER CHECK (carencia_dias >= 0),
  reingreso_horas INTEGER CHECK (reingreso_horas >= 0),
  observaciones VARCHAR(500),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuaderno_productor ON cuaderno_campo(productor_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cuaderno_lote ON cuaderno_campo(lote_id, fecha DESC);

CREATE TABLE IF NOT EXISTS certificaciones (
  id SERIAL PRIMARY KEY,
  productor_id INTEGER NOT NULL REFERENCES productores(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('bpa', 'globalgap', 'organica', 'comercio_justo', 'otra')),
  nombre VARCHAR(120) NOT NULL,
  certificador VARCHAR(120),
  numero VARCHAR(60),
  alcance VARCHAR(300),
  fecha_emision DATE,
  vencimiento DATE,
  proxima_auditoria DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'en_tramite'
    CHECK (estado IN ('en_tramite', 'vigente', 'vencida', 'suspendida')),
  documento_url VARCHAR(500),
  -- Si se muestra en la vitrina pública (solo cuando está vigente)
  publica BOOLEAN NOT NULL DEFAULT false,
  notas VARCHAR(1000),
  -- Avisos por N8N ya enviados, para no repetirlos (se borran si cambia la fecha)
  aviso_vencimiento VARCHAR(10),
  aviso_auditoria VARCHAR(10),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificaciones_productor ON certificaciones(productor_id);

-- Checklist editable de cada certificación. `evidencia` enlaza el requisito con un tipo de registro
-- del cuaderno: la app muestra cuántos hay en los últimos 12 meses.
CREATE TABLE IF NOT EXISTS requisitos_certificacion (
  id SERIAL PRIMARY KEY,
  certificacion_id INTEGER NOT NULL REFERENCES certificaciones(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  area VARCHAR(80),
  texto VARCHAR(300) NOT NULL,
  cumplido BOOLEAN NOT NULL DEFAULT false,
  evidencia VARCHAR(20) CHECK (evidencia IN ('aplicacion', 'fertilizacion', 'riego', 'cosecha')),
  nota VARCHAR(300)
);

CREATE INDEX IF NOT EXISTS idx_requisitos_certificacion ON requisitos_certificacion(certificacion_id, orden);
