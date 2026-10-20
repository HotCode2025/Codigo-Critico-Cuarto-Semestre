# Changelog

Todos los cambios importantes de AgroTech quedan anotados acá.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/): `MAYOR.MENOR.PARCHE`.

- **MAYOR**: cambios que rompen algo (por ejemplo, la base o la API cambian de forma incompatible).
- **MENOR**: funciones nuevas que no rompen lo anterior.
- **PARCHE**: arreglos.

## [Sin publicar] — camino a v3.0.0

Lo que se construye para la práctica profesional (febrero 2027): envíos de materia prima con DTV-e
y remito R, simulador "¿vendo la fruta o la elaboro?" y vitrina pública con QR por lote.

### Agregado

- Envíos de materia prima (`envios.html`, `/api/envios`): cargar el envío (cuartel, kg, bins,
  fábrica o bodega, transportista, chofer y patentes), ficha para emitir el DTV-e en ARCA, registro
  del número y vencimiento del DTV-e y llegada con los kg del ticket de balanza. Un envío nunca se
  borra: se anula. Validación de CUIT y de patentes viejas y Mercosur. Requiere la migración
  `server/migrations/002-envios.sql`.
- Remito R por autoimpresor (`/api/remitos`): se activa al cargar el CAI de autoimpresor; se emite
  desde un envío con DTV-e, con numeración correlativa, controles de CAI y rango, y PDF con original
  y duplicado. Nunca se borra: se anula. Requiere `server/migrations/003-remitos.sql`.
- Ventas del producto elaborado (`ventas.html`): simulador "¿vendo la fruta o la elaboro?" con la
  plantilla de durazno en mitades x 820 g, agenda de compradores y vitrina pública con QR por lote
  (`vitrina.html`), cuyas consultas entran en la agenda. Requiere
  `server/migrations/004-comercial.sql`.
- Workflow de N8N: mensaje de WhatsApp y email para las consultas de la vitrina.
- Precios de insumos para el simulador: lectura de cotizaciones de proveedores (foto o PDF) con IA,
  revisión antes de guardar, lista propia con proveedor y fecha, y aviso de precios de más de 30
  días. Requiere `server/migrations/005-precios-insumos.sql`.

### Cambiado

- Se quitaron las plantillas de issue y de PR.

## [2.1.0] — entrega de Metodología de Sistemas II (2026-11-02)

### Agregado

- Base profesional del proyecto (fase 0 del plan v3):
  - ESLint + Prettier para backend y frontend, con `npm run lint` en la raíz del proyecto.
  - Documentación de la API con Swagger en `/api/docs` (OpenAPI 3, los 45 endpoints) y un test que
    falla si una ruta nueva queda sin documentar.
  - `docker-compose.yml`: Postgres, API, frontend y N8N con un solo comando.
  - El CI corre lint y tests en cada PR.
  - `CHANGELOG.md`, `CONTRIBUTING.md` y README v2.1 con el equipo y capturas.
  - Registro de decisiones de arquitectura (ADR): PostgreSQL, Vite y no React, y remito preimpreso
    y autoimpresor.
- Verificación del email al registrarse.
- Cambiar la contraseña desde la app.
- Descargar todos mis datos y eliminar la cuenta.
- Backups de la base: scripts de backup y verificación, y backup semanal automático con systemd.
- Editar y borrar gastos e ingresos; archivar y restaurar cuarteles.
- Detección de plagas en fotos de plantas con IA, desde la Red de Productores.
- Marcar cheques de la cartera como cobrados.
- Aviso de "Sin conexión" cuando no se pueden cargar los datos.
- Alerta por email cuando falla un workflow de N8N.
- Diseño para computadora: menú lateral, Inicio y Balance en grilla, login en dos paneles e íconos
  de línea en toda la interfaz (sin emojis).
- 84 tests de la API (jest + supertest) contra un Postgres real, corriendo en GitHub Actions.

### Cambiado

- Seguridad de la API: rate limit en login, registro, recuperación y endpoints de IA; helmet; CORS
  configurable por variable de entorno.
- Se quitó Dependabot: las dependencias se revisan a mano con `npm audit` antes de cada entrega.

### Arreglado

- La Red de Productores mostraba siempre "12 productores conectados", un número escrito fijo en la
  pantalla. Ahora muestra los productores reales de la red y de tu zona (`GET /api/red/resumen`).
- Validación de tipos, montos, fechas, textos largos e ids en todas las rutas: un dato inválido
  ahora responde 400 en vez de 500.
- El escaneo de facturas fallaba siempre por el límite de tamaño del JSON.
- WhatsApp ya no falla en silencio cuando N8N no puede enviar el mensaje.
- Se actualizaron dependencias para cerrar 3 vulnerabilidades de producción.

## [2.0.0] — 2026-09-17

Primera versión en la nube: los datos pasan de `localStorage` a una base propia.

### Agregado

- Backend Express + PostgreSQL con login por productor (JWT). Deploy en Render y Supabase.
- Varias fincas por productor y cuarteles con detalle agronómico (riego, malla antigranizo, terreno).
- Avisos por WhatsApp (WasenderAPI) y email vía N8N para todos los eventos financieros.
- Red de Productores: alertas y trueques con aviso a la zona; contactar una oferta por WhatsApp.
- Recuperación de contraseña por email.
- Escaneo de facturas con IA (Claude) que genera un gasto por cada ítem.
- Compra y venta de Obligaciones Negociables.
- Listados de gastos e ingresos en CSV y PDF.
- N8N habilitado por defecto para los productores nuevos.

### Arreglado

- La API fuerza `Cache-Control: no-store` y el service worker ya no cachea sus respuestas.
- Fechas y montos sin formato en los emails de N8N.
- Los emails de cada evento llegan al productor dueño, no al administrador.
- Importar backup siempre fallaba.

## [1.0.0]

MVP original: aplicación web (PWA) con los datos guardados en el navegador (`localStorage`).

[Sin publicar]: https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/compare/agrotech-v2.1.0...main
[2.1.0]: https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/compare/agrotech-v2.0.0...agrotech-v2.1.0
[2.0.0]: https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases/tag/agrotech-v2.0.0
