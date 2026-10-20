# 0006. La vitrina pública muestra solo lo publicado y las consultas van a la agenda

- **Estado:** Aceptada
- **Fecha:** 2026-10-20

## Contexto

Para vender el producto elaborado, el productor necesita que los compradores lo encuentren y le
escriban. AgroTech guarda datos privados (gastos, ingresos, cheques, inversiones) que nunca deben
quedar a la vista. La vitrina es la primera parte de AgroTech que ve gente sin cuenta: tiene que ser
imposible que se filtre algo que el productor no decidió mostrar.

## Decisión

1. **Una vitrina por productor**, con dirección propia (`vitrina.html?v=<slug>`). Arranca **sin
   publicar**: nadie la ve hasta que el productor lo marca.
2. **Solo se muestra lo que se carga en la vitrina:** nombre público, descripción, zona, el WhatsApp y
   el email que el productor elige (pueden ser distintos de los de su cuenta) y los productos que
   publica. Las consultas públicas leen solo las tablas `vitrinas` y `productos_vitrina` (y el
   nombre y cultivo del cuartel de origen): nunca las tablas financieras.
3. **Cada producto por lote tiene un código** de 8 caracteres sin letras que se confunden, que va en el
   QR de la etiqueta. El QR abre la trazabilidad del lote: cuartel, zona, elaboración y vencimiento.
4. **Las consultas entran en la agenda privada de compradores** con origen "vitrina", y avisan al
   productor por N8N. El formulario tiene un límite de 5 consultas por hora por conexión y un campo
   trampa contra robots.
5. Un producto se puede **ocultar** sin perder su QR, o borrar (y su QR deja de funcionar).

## Consecuencias

- El productor controla qué es público, producto por producto.
- La vitrina no necesita login ni cuenta del comprador: alcanza con escanear la etiqueta.
- El aviso por N8N necesita el workflow actualizado (`agrotech-n8n-cloud-workflow.json`, evento
  `consulta_vitrina`); con el workflow viejo llega igual, pero como un evento genérico.
- Más adelante (Red AgroTech) la vitrina puede sumarse a un catálogo de varios productores sin
  cambiar esta regla.
