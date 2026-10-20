-- Compras del stock unidas a los gastos, y repuestos de maquinaria.
--
-- Correr UNA vez en Supabase (SQL Editor) ANTES de desplegar el backend que la usa, después de la 010.
-- Agrega columnas (vacías) y amplía una lista de valores permitidos: no toca datos existentes.
--
-- Una compra se carga una sola vez, en Stock, y la app arma el gasto (en un cuartel o repartido por
-- hectárea), o se une a un gasto que ya estaba cargado. Así el gasoil o un repuesto no quedan dos veces.

-- Gasto que salió de una compra del stock. `creado_por_stock`: lo creó la compra (se borra con ella);
-- si es false, era un gasto que ya existía y solo se desvincula.
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS movimiento_stock_id INTEGER
  REFERENCES movimientos_stock(id) ON DELETE SET NULL;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS creado_por_stock BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_gastos_movimiento_stock ON gastos(movimiento_stock_id);

-- Repuestos (filtros, correas, cubiertas...) y para qué máquina son.
ALTER TABLE insumos DROP CONSTRAINT IF EXISTS insumos_categoria_check;
ALTER TABLE insumos ADD CONSTRAINT insumos_categoria_check
  CHECK (categoria IN ('fitosanitario', 'fertilizante', 'combustible', 'repuesto', 'envase', 'otro'));
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS maquina VARCHAR(80);
