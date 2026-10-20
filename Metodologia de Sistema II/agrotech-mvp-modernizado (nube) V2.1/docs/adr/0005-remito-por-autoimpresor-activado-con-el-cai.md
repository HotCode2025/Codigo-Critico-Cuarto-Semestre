# 0005. Remito R por autoimpresor, activado con el CAI

- **Estado:** Aceptada (reemplaza a la [0003](0003-remito-preimpreso-y-autoimpresor.md))
- **Fecha:** 2026-10-20

## Contexto

La [ADR 0003](0003-remito-preimpreso-y-autoimpresor.md) proponía empezar por el talonario
preimpreso de imprenta y dejar el autoimpresor para después. Al revisar el plan, el productor decidió
ir directo al **autoimpresor**: el contador va a tramitar ante ARCA la habilitación y el CAI de
autoimpresor.

Sin esa habilitación, un remito impreso entero por la app no tiene validez fiscal. Mientras el CAI
no llegue, el productor sigue usando el talonario de imprenta.

## Decisión

1. **El remito R se hace por autoimpresor:** AgroTech imprime el comprobante completo en hoja blanca
   (emisor, letra R, número, destinatario, transporte, detalle, CAI y su vencimiento), con original y
   duplicado.
2. **El módulo queda apagado hasta cargar el talonario:** punto de venta, rango de números, CAI de
   14 dígitos, vencimiento y datos del emisor. Sin talonario no se puede emitir.
3. **Primero el DTV-e, después el remito:** solo se emite desde un envío con el DTV-e registrado, y el
   remito no lleva datos del DTV-e.
4. **Controles:** numeración correlativa en número y fecha, bloqueo con CAI vencido o rango agotado,
   aviso 30 días antes del vencimiento o con 10 números o menos.
5. **Nunca se borra:** se anula y el número queda usado. El remito guarda una copia de lo que se
   imprimió, así que un cambio posterior en el envío o en el talonario no lo altera.
6. **Un CAI nuevo reemplaza al anterior:** el talonario viejo queda inactivo y sus remitos se conservan.

## Consecuencias

- No hace falta calibrar la impresión sobre una hoja preimpresa (lo más delicado de la ADR 0003).
- El diseño del PDF es una propuesta: **antes de usarlo, el contador tiene que revisarlo** contra la
  normativa vigente (datos obligatorios, ubicación del CAI y el código del comprobante, que hoy figura
  como "COD. 91").
- Si al caso le corresponde remito electrónico, este remito en papel no alcanza; el contador lo
  confirma junto con el CAI.
- El modo talonario preimpreso queda fuera del MVP. Si se necesitara, se suma como otra forma de
  imprimir los mismos datos del remito.
