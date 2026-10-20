-- Análisis de laboratorio (suelo, agua, foliar y residuos) como un tipo más del cuaderno de campo,
-- y como evidencia de los requisitos de análisis de las certificaciones.
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 006.
-- Agrega columnas (vacías) al cuaderno y amplía dos listas de valores permitidos: no toca datos.

ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS analisis VARCHAR(10)
  CHECK (analisis IN ('suelo', 'agua', 'foliar', 'residuos'));
ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS laboratorio VARCHAR(120);
ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS ph NUMERIC(4,2) CHECK (ph BETWEEN 0 AND 14);
ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS conductividad NUMERIC(8,3) CHECK (conductividad >= 0);
ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS materia_organica NUMERIC(5,2)
  CHECK (materia_organica BETWEEN 0 AND 100);
-- Resultado según el laboratorio: apto / dentro de los límites (true), no apto (false) o sin dato
ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS apto BOOLEAN;
ALTER TABLE cuaderno_campo ADD COLUMN IF NOT EXISTS documento_url VARCHAR(500);

-- 'analisis' pasa a ser un tipo de registro válido, y un análisis tiene que decir qué se analizó.
ALTER TABLE cuaderno_campo DROP CONSTRAINT IF EXISTS cuaderno_campo_tipo_check;
ALTER TABLE cuaderno_campo ADD CONSTRAINT cuaderno_campo_tipo_check
  CHECK (tipo IN ('aplicacion', 'fertilizacion', 'riego', 'poda', 'raleo', 'cosecha', 'labor', 'analisis'));
ALTER TABLE cuaderno_campo DROP CONSTRAINT IF EXISTS cuaderno_campo_analisis_tipo_check;
ALTER TABLE cuaderno_campo ADD CONSTRAINT cuaderno_campo_analisis_tipo_check
  CHECK (tipo <> 'analisis' OR analisis IS NOT NULL);

-- Los requisitos de las certificaciones pueden pedir como evidencia un análisis de cada tipo.
ALTER TABLE requisitos_certificacion DROP CONSTRAINT IF EXISTS requisitos_certificacion_evidencia_check;
ALTER TABLE requisitos_certificacion ADD CONSTRAINT requisitos_certificacion_evidencia_check
  CHECK (evidencia IN ('aplicacion', 'fertilizacion', 'riego', 'cosecha',
    'analisis_suelo', 'analisis_agua', 'analisis_foliar', 'analisis_residuos'));
