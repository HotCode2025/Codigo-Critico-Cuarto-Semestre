# 0003. Remito R: talonario preimpreso primero, autoimpresor después

- **Estado:** Reemplazada por [0005](0005-remito-por-autoimpresor-activado-con-el-cai.md)
- **Fecha:** 2026-10-16

## Contexto

El durazno que va a la fábrica viaja con dos documentos: el **DTV-e** y el **remito R**. Hoy el
productor usa un **talonario preimpreso** de imprenta autorizada (hojas sueltas, original y
duplicado): la imprenta ya imprimió los datos del emisor, la letra R, el CAI, su vencimiento y la
numeración. A mano se completan solo los datos del envío.

El remito tiene **validez fiscal**, así que un error no es solo de la app: es un documento mal emitido.

Hay dos formas de que AgroTech imprima remitos:

| Modalidad | Quién imprime el formulario | Qué imprime AgroTech |
|-----------|-----------------------------|----------------------|
| **Talonario preimpreso** | La imprenta autorizada | Solo los datos variables, alineados a cada casillero |
| **Autoimpresor** | Nadie: hoja en blanco | El remito completo, con CAI y numeración |

El autoimpresor es más cómodo, pero requiere que ARCA habilite al productor como autoimpresor y le
asigne un CAI para eso. Sin esa habilitación, un remito completo impreso por la app **no vale**.

## Decisión

1. Para la práctica se implementa el **talonario preimpreso**, que es lo que el productor usa hoy:
   AgroTech imprime solo los datos variables sobre la hoja de imprenta.
2. El **autoimpresor** queda diseñado pero apagado: solo se activa si se carga un **CAI de
   autoimpresor**. Es parte de la visión del producto.
3. El remito **no lleva datos del DTV-e**. Los dos documentos se vinculan solo dentro de AgroTech,
   porque nacen de los mismos datos del envío. Orden: primero el DTV-e (se emite en ARCA), después
   el remito.
4. AgroTech **nunca pide ni guarda la clave fiscal** del productor.

## Consecuencias

- Hace falta **calibrar la impresión**: cada impresora corre unos milímetros el papel. Se guarda la
  posición de cada campo, un desfase general y se ofrece una impresión de prueba.
- El talonario se carga en la app (punto de venta, rango de números, CAI de 14 dígitos y
  vencimiento) para controlar numeración correlativa, bloquear con CAI vencido o rango agotado y
  avisar antes del vencimiento.
- Un remito nunca se borra: pasa por emitido → entregado → anulado, y una hoja trabada se inutiliza
  dejando el número registrado.
- Antes de programarlo, las reglas se confirman con el contador (datos obligatorios del remito R,
  si al caso le corresponde remito electrónico y si la uva necesita documentación del INV).
- Pasar a autoimpresor más adelante no cambia los datos del envío: solo cambia qué se imprime.
