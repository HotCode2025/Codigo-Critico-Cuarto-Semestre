# 0008. Cosecha a destajo, stock de insumos y clima como módulos del campo, sin volverse un ERP

- **Estado:** Aceptada
- **Fecha:** 2026-10-20

## Contexto

Los ERP como Odoo traen módulos para el agro: inventario de insumos, trabajadores temporales con
pago a destajo, clima y recetas de cultivo. Un productor chico del Valle de Uco no usa un ERP: lo que
necesita es anotar la tarja de la cosecha, saber cuánto le queda de cada producto en el depósito y
enterarse a tiempo de una helada. Tampoco tiene que cargar dos veces lo mismo: lo que ya está en el
cuaderno de campo tiene que servir para el stock y para las certificaciones.

## Decisión

1. **Se toman tres ideas, no el ERP entero.** Cosecha a destajo, stock de insumos y clima por finca.
   Las recetas de cultivo quedan afuera: sirven más para cultivos extensivos que para frutales y viña.
2. **La cosecha es control interno, no liquidación de sueldos.** La tarja guarda por cosechero,
   cuartel y día lo que hizo (tacho, bin, kilo o jornal), copiando el precio y los kilos por unidad
   del momento. La liquidación marca lo pagado (que ya no se cambia) y lo puede cargar como gasto por
   cuartel. La pantalla y la planilla aclaran que no reemplaza RENATRE ni el recibo de sueldo.
3. **El stock es la suma de los movimientos.** No se guarda un "stock actual" que se pueda
   desincronizar: compras suman, usos restan y el ajuste por inventario registra la diferencia con lo
   contado. Las aplicaciones del cuaderno crean su uso enlazado al registro: si se borra el registro,
   el insumo vuelve solo.
4. **Lo que ya se cargó se reaprovecha.** La tarja cuenta como evidencia de cosecha en las
   certificaciones, la compra puede guardar su precio en la lista del simulador y el pago de la
   cosecha va al balance como gasto.
5. **El clima viene de Open-Meteo**, que es gratis, no pide clave y solo recibe las coordenadas de
   la finca, consultado desde el servidor y guardado una hora en memoria. El aviso de helada o
   granizo por N8N se manda una vez por finca y día, solo a quien tiene N8N activo.

## Consecuencias

- El productor carga la tarja y las aplicaciones una sola vez y obtiene la liquidación, el
  rendimiento por cuartel, el stock y la evidencia para el auditor.
- Open-Meteo es solo para uso no comercial: si AgroTech se vende, hay que pasar a su plan pago o a
  otro proveedor (el servicio está aislado en `server/src/services/clima.js`).
- El pronóstico es la temperatura a 2 m: la app recomienda confirmar con el SMN y Contingencias
  Climáticas antes de decidir la defensa.
- Un stock negativo es posible si faltan compras por cargar: se muestra en rojo para corregirlo con
  un ajuste, en vez de bloquear la carga del cuaderno.
- Tres migraciones nuevas (007, 008 y 009) que hay que correr en orden antes de desplegar.
