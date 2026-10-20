# 0007. Cuaderno de campo como evidencia y certificaciones con checklist editable

- **Estado:** Aceptada
- **Fecha:** 2026-10-20

## Contexto

Las certificaciones (BPA, GlobalG.A.P., orgánica) abren mercados: las piden exportadores, cadenas de
supermercados y algunos compradores de producto elaborado. Para auditarlas, el certificador pide
registros de lo que se hizo en cada cuartel (aplicaciones, fertilización, riego, cosecha) y revisa un
checklist de requisitos. Cada norma y cada certificadora piden cosas distintas, y cambian entre
versiones.

Además, una aplicación fitosanitaria fija un **período de carencia**: no se puede cosechar ese cuartel
hasta que pase. Cosechar antes es un riesgo de residuos y de perder la certificación.

## Decisión

1. **La app no certifica: organiza lo que pide el certificador.** Registra la certificación
   (certificadora, número, alcance, vigencia, próxima auditoría y estado) y un enlace al documento.
2. **El checklist es una plantilla orientativa y editable**, no requisitos fijos en el código. Las
   plantillas resumen con palabras propias los temas de cada norma; no copian los puntos de control
   oficiales. El productor agrega los requisitos de su certificadora.
3. **El cuaderno de campo es la evidencia.** Los requisitos de registros se enlazan con un tipo de
   registro del cuaderno y muestran cuántos hay en los últimos 12 meses; si no hay, se marca.
4. **La carencia se calcula sola** desde las aplicaciones (fecha + días de carencia) y se avisa en el
   cuaderno y al cargar un envío de ese cuartel.
5. **Avisos por N8N** a 60 y 30 días del vencimiento y de la auditoría, una sola vez por umbral (se
   reprograman si cambia la fecha), y solo se dan por enviados si salieron.
6. **Las certificaciones vigentes que el productor elige** se muestran en su vitrina pública.

## Consecuencias

- El productor llega a la auditoría con los registros ordenados y un PDF del cuaderno.
- El porcentaje de cumplimiento depende de lo que el productor marque: es una ayuda, no una garantía.
- Los documentos (certificado, informes) quedan como enlace; subirlos a la nube necesita sumar un
  almacenamiento de archivos.
- El menú pasó de tener N8N a tener Campo: la configuración de N8N quedó en "Más".
