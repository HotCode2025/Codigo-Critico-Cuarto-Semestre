# 0009. La maquinaria va aparte del stock, sin amortización y con el service por fecha

- **Estado:** Aceptada
- **Fecha:** 2026-10-20

## Contexto

El productor quería registrar tractores, rastras de discos, escaleras y otras herramientas. El stock
de insumos no sirve para eso: está hecho para lo que se consume (entra, sale y se repone), y un
tractor o una escalera duran años. Las horas del tractor no se anotan en la finca, y la amortización
contable la lleva el contador.

## Decisión

1. **Los bienes de uso tienen su propia lista** (pestaña Máquinas), separada del stock: tipo, marca,
   modelo, año, serie o patente, finca, estado y **cantidad** para lo que hay varios iguales
   (escaleras, bins).
2. **El service es por fecha**, no por horas: cada cuántos meses y el último; el próximo se calcula.
   Cada service o arreglo queda en un historial y su costo puede ir a Gastos (por cuartel o repartido
   por hectárea, con el mismo reparto que las compras del stock).
3. **Sin amortización**: se guarda el valor de compra como dato, pero la app no calcula depreciación
   ni la lleva al balance.
4. **Avisos por N8N** antes del service y de los vencimientos de seguro y patente/VTV. Se guarda la
   fecha avisada, así un cambio de fecha (o un service nuevo) vuelve a avisar sin repetir.
5. **Se une con lo que ya existe**: los repuestos del stock se asignan a su máquina y el equipo de las
   aplicaciones del cuaderno se elige de la lista.

## Consecuencias

- Cada máquina muestra cuánto se le gastó en repuestos y services en el último año.
- Lo que se vende o se rompe conviene ponerlo "de baja" en vez de borrarlo, para no perder la historia.
- Si más adelante se anotan las horas, se puede sumar el service por horas sin cambiar lo demás.
