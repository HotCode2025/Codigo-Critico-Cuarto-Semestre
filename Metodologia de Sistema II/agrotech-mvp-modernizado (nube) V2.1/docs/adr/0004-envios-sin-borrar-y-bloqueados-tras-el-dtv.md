# 0004. Los envíos no se borran y se bloquean al registrar el DTV-e

- **Estado:** Propuesta (a confirmar con Agustina y el contador)
- **Fecha:** 2026-10-20

## Contexto

El envío de materia prima es el dato del que salen el DTV-e (que se emite en ARCA) y, más adelante,
el remito R. Los dos son documentos con valor fiscal: si el envío cambia después de emitirlos, lo que
dice AgroTech deja de coincidir con lo declarado.

Además, la carga real sale de la finca: aunque un envío se cancele, conviene que quede el registro de
que existió y por qué no se hizo.

## Decisión

1. **Un envío nunca se borra.** Se anula con un motivo opcional y queda visible y en el historial.
2. **Solo se edita mientras está `cargado`.** Al registrar el DTV-e, los datos quedan fijos. Si algo
   cambió (otro camión, otros kg), se anula el envío y se carga uno nuevo.
3. **Sin DTV-e no hay entrega.** No se puede marcar como entregado un envío sin DTV-e registrado,
   porque la carga no puede viajar sin él.
4. El número y el vencimiento del DTV-e **se pueden corregir** mientras el envío no esté entregado,
   por si se tipeó mal.

## Consecuencias

- Lo que muestra AgroTech coincide con lo declarado en ARCA, y la historia de cada temporada queda
  completa (también lo que se canceló).
- Cambiar un dato después del DTV-e cuesta un paso más (anular y cargar de nuevo). Es intencional:
  en ARCA también habría que anular y emitir otro DTV-e.
- El remito R va a seguir la misma regla: se imprime con los datos del envío y nunca se borra.
