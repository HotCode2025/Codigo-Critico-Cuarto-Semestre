# 0002. Modernizar el frontend con Vite y no reescribirlo en React

- **Estado:** Aceptada (se implementa en la fase 1 del plan v3)
- **Fecha:** 2026-10-16

## Contexto

El frontend de AgroTech son 12 pantallas HTML con JavaScript sin framework. Funciona y está en uso,
pero muestra su origen académico:

- Cerca de 400 estilos escritos a mano dentro del HTML (`style="..."`).
- Versiones puestas a mano para forzar la recarga (`api.js?v=15`).
- Librerías (Chart.js, jsPDF) cargadas desde un CDN.
- La lista de archivos del service worker se mantiene a mano.

Para la práctica profesional se suman pantallas nuevas (envíos, simulador, vitrina) y conviene que
nazcan con una estructura moderna. La regla del plan es **modernizar sin reescribir**.

Opciones consideradas:

| Opción | A favor | En contra |
|--------|---------|-----------|
| **Vite sobre el código actual** | Se migra pantalla por pantalla; build, módulos y dependencias de npm; el código existente sigue valiendo | No trae componentes ni estado reactivo |
| Reescribir en React | Componentes, ecosistema grande, muy pedido en el mercado | Reescribir 12 pantallas que andan, con riesgo de romper la producción y sin tiempo para las funciones nuevas antes de febrero |
| Dejarlo como está | Cero esfuerzo | Las pantallas nuevas heredan los mismos problemas |

## Decisión

Usar **Vite** como herramienta de build sobre el código actual: CSS en clases dentro de `styles.css`,
JavaScript en módulos (`import`/`export`), librerías instaladas con npm y el service worker generado
en el build. **No** se reescribe en React.

Se hace en la **fase 1**, antes de las pantallas nuevas, para no pelear después con dos estructuras.

## Consecuencias

- El cambio entra por partes y cada PR deja la app funcionando, igual que hoy.
- Se terminan las versiones a mano y los archivos salen comprimidos.
- Las pantallas nuevas se escriben ya con módulos y sin estilos en línea.
- Mientras dure la migración, los HTML quedan fuera de Prettier (ver `.prettierignore`).
- Si en el futuro hiciera falta un framework, los módulos de Vite son el paso previo natural: esta
  decisión no lo cierra.
