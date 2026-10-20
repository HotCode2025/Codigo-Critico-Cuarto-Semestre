# 🌾 AgroTech MVP v2.1

**Metodología de Sistemas II — UTN FRSR 2025/2026** · Ariel Mazara y Agustina Zuniga

[![AgroTech - CI (lint + tests)](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/actions/workflows/agrotech-tests.yml/badge.svg)](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/actions/workflows/agrotech-tests.yml)

> Startup innovadora y social de gestión financiera agrícola con integración N8N para automatización de workflows y red colaborativa de productores.

## Novedades de la v2.1

- **Todo con un comando**: `docker compose up -d --build` levanta la base, la API, el frontend y N8N ([ver cómo](#-levantar-todo-con-docker)).
- **Documentación de la API** con Swagger en `/api/docs`: los 45 endpoints, con ejemplos y botón para probarlos.
- **Calidad de código**: ESLint + Prettier en backend y frontend, y el CI corre lint y tests en cada PR.
- **Proceso**: [CHANGELOG](CHANGELOG.md) con versiones semánticas, [guía para contribuir](CONTRIBUTING.md) y [registro de decisiones (ADR)](docs/adr/README.md).
- Además: verificación de email, cambio de contraseña, descarga y borrado de mis datos, backups, edición de gastos e ingresos, diagnóstico de plagas por foto y diseño para PC. El detalle está en el [CHANGELOG](CHANGELOG.md).

## Capturas

| Inicio (PC) | Estado de resultados (PC) |
|-------------|---------------------------|
| ![Inicio en computadora: caja disponible, flujo de caja proyectado y métricas](docs/capturas/inicio-pc.jpg) | ![Balance: resultado neto, composición y rendimiento por cuartel](docs/capturas/balance-pc.jpg) |

| Inicio (celular) | Cargar ingreso (celular) | Login (PC) |
|------------------|--------------------------|------------|
| <img src="docs/capturas/inicio-celular.jpg" alt="Inicio en el celular" width="230"> | <img src="docs/capturas/ingresos-celular.jpg" alt="Carga de un ingreso con cheque en el celular" width="230"> | ![Login en dos paneles](docs/capturas/login-pc.jpg) |

![Documentación de la API en Swagger](docs/capturas/swagger-pc.jpg)

<sub>Datos de ejemplo cargados en un entorno local con docker-compose.</sub>

---

## 📋 Índice

1. [¿Qué es AgroTech?](#-qué-es-agrotech)
2. [El Problema](#-el-problema)
3. [Nuestra Solución — El MVP](#-nuestra-solución--el-mvp)
4. [Componente Social: Red de Productores](#-componente-social-red-de-productores)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Cómo usar](#-cómo-usar)
7. [Levantar todo con Docker](#-levantar-todo-con-docker)
8. [Backend + Base de Datos](#-backend--base-de-datos)
9. [Documentación de la API (Swagger)](#-documentación-de-la-api-swagger)
10. [Tests de la API](#-tests-de-la-api)
11. [Calidad de código](#-calidad-de-código)
12. [Integración N8N](#-integración-n8n)
13. [Datos de Prueba](#-datos-de-prueba)
14. [Tecnologías](#-tecnologías)
15. [Hoja de ruta (v3)](#-hoja-de-ruta-v3)
16. [Equipo](#-equipo)

---

## 🌱 ¿Qué es AgroTech?

AgroTech es una **startup innovadora y social** que nace para resolver la falta de herramientas digitales accesibles para pequeños y medianos productores agrícolas de Mendoza (San Rafael y Valle de Uco).

El producto es un **sistema de gestión financiera agrícola** que permite:
- Controlar ingresos y gastos por lote/cuartel
- Simular inversiones en Obligaciones Negociables (ONs)
- Gestionar cartera de cheques
- Recibir alertas de liquidez con proyección temporal
- **Conectarse con otros productores** mediante una red colaborativa

Todo funciona como **PWA** (Progressive Web App): se instala en el celular y la interfaz abre aunque no haya señal. Para ver y guardar los datos hace falta conexión (ver [Limitaciones conocidas](#-limitaciones-conocidas)).

---

## 🎯 El Problema

Los productores agrícolas de Mendoza enfrentan diariamente:

| Problema | Consecuencia |
|----------|-------------|
| No llevan registro sistemático de gastos por lote | No saben cuánto cuesta producir cada cultivo |
| Dependen de Excel o papel para sus finanzas | Pérdida de datos, errores de cálculo |
| No proyectan su liquidez | Sorpresas de déficit de caja |
| No acceden fácilmente a inversiones como ONs | Dejan dinero parado sin rentabilizar |
| Están aislados de otros productores | No comparten alertas de plagas, precios ni maquinaria |
| La industria les paga con cheques a largo plazo | Dificultad para planificar el flujo de caja |

> *"Antes tenía todo en una libreta. Cuando se me mojó, perdí tres temporadas de datos."* — Productor de vid, San Rafael.

---

## 💡 Nuestra Solución — El MVP

AgroTech MVP es una **versión simplificada pero funcional** que permite validar la idea con el menor esfuerzo posible, siguiendo la metodología del Producto Mínimo Viable.

### Funcionalidades incluidas

| Pantalla | Función |
|----------|---------|
| **Dashboard** | Saldo disponible, margen bruto, gráfico de flujo de caja, métricas clave, alertas de liquidez |
| **Gastos** | Carga de gastos por lote, concepto, fecha y comprobante |
| **Ingresos** | Registro de ingresos con validación de auditoría (cheques, transferencias, efectivo) |
| **Balance** | Estado de resultados por lote y consolidado |
| **Inversiones ONs** | Simulador de compra de Obligaciones Negociables con proyección de rendimiento, y venta/liquidación (el dinero cobrado vuelve a la caja) |
| **N8N** | Configuración de webhook para automatización de workflows |
| **Red de Productores** | Alertas colaborativas, trueque de maquinaria/mano de obra, precios compartidos |
| **Configuración** | Exportar/importar datos, cambio de tema, reinicio |

### Características técnicas

- 🎨 **Glassmorphism + Dark Mode**
- 📱 **Diseño mobile-first** con navbar inferior
- 📊 **Gráficos interactivos** con Chart.js
- 🤖 **Webhook N8N** con test de conexión
- 💾 **Exportar CSV/JSON**, y listados detallados de gastos/ingresos en **CSV o PDF**
- 📥 **Importar backup**
- 📴 **La interfaz abre sin conexión** (PWA con Service Worker); los datos requieren internet
- 🔔 **Alertas de liquidez** con proyección a 10 meses
- 💰 **Simulador de inversiones** en ONs
- 🔒 **Validación de auditoría** en ingresos

---

## 🤝 Componente Social: Red de Productores

El diferenciador social de AgroTech es la **Red de Productores**, una funcionalidad que transforma la app de una herramienta individual a una **plataforma colaborativa**.

### ¿Qué permite?

| Función | Impacto Social |
|---------|---------------|
| **Alertas de plagas/enfermedades** | Un productor detecta oidio y alerta a todos los vecinos de la zona por WhatsApp (vía N8N), evitando pérdidas masivas |
| **Alertas climáticas** | Heladas, granizo o sequía — la comunidad se prepara en conjunto |
| **Precios de insumos** | Comparten precios de fertilizantes, fungicidas y maquinaria para negociar en grupo |
| **Trueque de maquinaria** | Un productor presta su tractor a cambio de jornales de poda — economía colaborativa rural |
| **Trueque de mano de obra** | Cuadrillas disponibles para cosecha, pagadas en especie o con trueque |

### Cobertura geográfica

- **San Rafael**: Norte, Sur, Este, Oeste, General Alvear
- **Valle de Uco**: Tunuyán, Tupungato, San Carlos, La Consulta, Vista Flores, Los Chacayes, El Cepillo

### Integración con N8N

Cuando un productor envía una alerta, N8N dispara automáticamente:

```json
{
  "app": "AgroTech",
  "version": "2.0.0",
  "timestamp": "2026-08-23T22:00:00Z",
  "evento": "alerta_nueva",
  "datos": {
    "tipo": "plaga",
    "zona": "San Rafael — Este",
    "cultivo": "Vid",
    "descripcion": "Oidio detectado en lote A"
  },
  "notificacion": "whatsapp"
}
```

Esto llega como mensaje de WhatsApp a todos los productores registrados en esa zona.

---

## 📁 Estructura del Proyecto

```
agrotech-mvp/
├── login.html          # Login / registro de productor
├── index.html          # Dashboard principal
├── gastos.html         # Carga de Gastos
├── ingresos.html       # Registro de Ingresos
├── balance.html        # Estado de Resultados
├── inversiones.html    # Inversiones en ONs
├── n8n.html            # Integración N8N
├── configuracion.html  # Configuración
├── red.html            # Red de Productores (componente social)
├── envios.html         # Envíos de materia prima con DTV-e y remito R
├── ventas.html         # Simulador, agenda de compradores y vitrina
├── campo.html          # Cuaderno de campo, cosecha, stock y certificaciones
├── campo-cosecha.js    # Pestaña Cosecha: tarja del día, liquidación y planilla
├── campo-stock.js      # Pestaña Stock: insumos, compras, usos y ajustes
├── clima.js            # Tarjeta del clima por finca en el Inicio
├── vitrina.html        # Vitrina pública (sin login), la que abre el QR
├── simulador.js        # Cuenta del simulador ¿vendo la fruta o la elaboro?
├── styles.css          # Estilos modernos (glassmorphism, dark mode)
├── api.js              # Cliente REST hacia server/ (fetch + JWT)
├── shared.js           # Motor central de datos y lógica (caché + API)
├── manifest.json       # Configuración PWA
├── sw.js               # Service Worker (caché de la interfaz)
├── icons.js            # Catálogo de íconos de línea (SVG)
├── server/             # Backend Express + PostgreSQL (ver sección siguiente)
│   ├── src/docs/openapi.js  # Documentación de la API (Swagger)
│   ├── tests/          # Tests de la API (jest + supertest)
│   └── Dockerfile      # Imagen de la API para docker-compose
├── scripts/            # Backups de la base
├── docker/nginx.conf   # Servidor del frontend en docker-compose
├── docker-compose.yml  # Base + API + frontend + N8N con un comando
├── eslint.config.js    # Reglas de ESLint
├── .prettierrc.json    # Formato de Prettier
├── package.json        # npm run lint (herramientas de calidad de código)
├── CHANGELOG.md        # Historial de versiones
├── CONTRIBUTING.md     # Ramas, commits, tests y PRs
├── docs/
│   ├── adr/            # Registro de decisiones de arquitectura
│   └── capturas/       # Capturas del README
└── icons/
    ├── icon-192.png    # Icono PWA (192x192)
    └── icon-512.png    # Icono PWA (512x512)
```

---

## 🚀 Cómo usar

> Desde la migración a base de datos, la app necesita el backend (`server/`) corriendo — ver [Backend + Base de Datos](#-backend--base-de-datos). Sin el backend levantado, `login.html` va a mostrar error de conexión.

### Con Docker (recomendado)
```bash
docker compose up -d --build
```
Abrí `http://localhost:8000` y creá una cuenta. Detalles en [Levantar todo con Docker](#-levantar-todo-con-docker).

### Servidor local (sin Docker)
```bash
# Terminal 1: backend (ver sección Backend + Base de Datos para el setup completo)
cd server && npm run dev

# Terminal 2: frontend estático
python -m http.server 8000
```
Abrí `http://localhost:8000` → te redirige a `login.html` → creá una cuenta.

### Opción 3: Instalar como PWA
1. Abrí en Chrome/Edge/Safari
2. Apretá "Agregar a pantalla de inicio"
3. ¡Listo! Queda como una app más del celular

---

## 🐳 Levantar todo con Docker

`docker-compose.yml` levanta los cuatro servicios de AgroTech en la PC. Solo hace falta Docker:

```bash
docker compose up -d --build     # levantar (la primera vez tarda un poco más)
docker compose logs -f api       # ver los logs de la API
docker compose down              # apagar (los datos quedan guardados)
docker compose down -v           # apagar y borrar la base para empezar de cero
```

| Servicio | Dirección | Qué es |
|----------|-----------|--------|
| `web` | http://localhost:8000 | El frontend, servido con nginx |
| `api` | http://localhost:3001 | El backend; la documentación está en `/api/docs` |
| `db` | `localhost:5433` | PostgreSQL 16 (usuario, clave y base: `agrotech`) |
| `n8n` | http://localhost:5678 | N8N para los avisos por WhatsApp y email |

- La base se crea sola con `server/schema.sql` la primera vez que arranca.
- El frontend detecta que corre en `localhost` y usa la API del puerto 3001 sin configurar nada.
- La IA y los webhooks de N8N son opcionales: se configuran copiando `.env.example` como `.env`.
- Si ya tenés otro N8N en el puerto 5678, poné `N8N_PORT=5679` en ese `.env`.
- Todos los puertos quedan atados a `127.0.0.1`: no se ven desde otras PCs de la red.
- Es para desarrollo y para la demo. Producción sigue en Render + Supabase.

## 🖥️ Diseño para computadora

En pantallas de 1024 px o más la app cambia de forma sin perder el diseño de celular (que sigue siendo el principal):

- **Inicio y Balance** usan una grilla de varias columnas (gráficos y tarjetas lado a lado) y la barra inferior pasa a ser un **menú lateral** con la marca, el ítem activo resaltado y íconos de línea.
- **Login, recuperar contraseña y confirmar email** se muestran en dos paneles: a la izquierda la foto del viñedo con el mensaje y los cuatro beneficios de la app, y a la derecha el formulario grande y centrado.
- **Íconos:** no queda ningún emoji en la interfaz. Se reemplazaron por íconos vectoriales de línea, que toman el color del tema, se ven nítidos en cualquier pantalla y funcionan en modo claro y oscuro. El menú, las tarjetas de métricas y los botones del encabezado llevan el SVG dentro del propio HTML; el resto sale de un catálogo único, `icons.js` (52 íconos al estilo [Lucide](https://lucide.dev), licencia ISC). En el HTML se usa `<span class="ico" data-icon="trash"></span>` y desde el código `AgroIcons.svg('trash')`; los elementos que se agregan después con `innerHTML` se completan solos.

## 🗄️ Backend + Base de Datos

El frontend (`index.html`, `pantalla*.html`) ya no usa `localStorage` para los datos financieros: habla con una **API REST propia (`server/`) + base de datos PostgreSQL**, con login por productor (JWT). Esto habilita un uso multi-productor real (varios productores, cada uno con sus propios datos, en vez de "un navegador = un productor").

- `api.js` — cliente REST (fetch + token JWT en `localStorage`) usado por `shared.js` y por `login.html`.
- `shared.js` — mantiene la misma API pública que antes (`getSaldoNeto()`, `addGasto()`, etc.) pero ahora lee de un caché en memoria poblado desde la API (`AgroTech.ready` es la promesa que indica que los datos ya cargaron). Las funciones que antes eran síncronas siguen siéndolo; las que escriben datos (`addGasto`, `addIngreso`, `addInversion`, `addLote`) ahora son `async`.
- `login.html` — pantalla nueva de login/registro (no existía autenticación antes).
- Sin sesión iniciada, cualquier pantalla redirige automáticamente a `login.html`.

Probado end-to-end (Postgres real vía Docker): registro → login → gastos → ingresos con cheque a plazo → proyección de liquidez → inversiones → balance → config de N8N → alerta a la Red de Productores → historial → logout → login nuevamente con los mismos datos persistidos.

**Pendiente / fuera de alcance de esta vuelta**: no hay import de backups (`importarDatos` devuelve un error claro) — la vía para cargar datos es siempre desde las pantallas.

### Modelo de datos

| Tabla | Qué guarda |
|-------|-----------|
| `productores` | Cuenta de cada productor (login con email + password) |
| `lotes` | Cuarteles/lotes por productor (`activo = false` los archiva sin perder su historia) |
| `gastos` | Gastos pagados o programados por lote |
| `ingresos` | Ingresos por lote (efectivo, transferencia, cheque físico/echeq), con descuento opcional |
| `cheques_cartera` | Cheques pendientes de cobro (se generan automáticamente al registrar un ingreso en cheque) |

> La alarma de "Depósitos Pendientes" en el dashboard (y el aviso por WhatsApp/email cada 30 min del `cheques-scheduler.js`) se basa en `cheques_cartera.estado = 'normal'`. Tocando el aviso se abre un modal con cada cheque y un botón **"Marcar cobrado"** (`PATCH /api/cartera/:id/cobrar`) que pasa el estado a `cobrado` — sin eso, antes no había forma de sacar un cheque ya presentado en el banco de la cartera pendiente, y la alarma no paraba nunca.
| `inversiones` | Compras de Obligaciones Negociables |
| `historial_eventos` | Auditoría de todos los movimientos (equivalente al historial de `shared.js`) |
| `config_n8n` | Webhook de N8N configurado por cada productor |
| `alertas_red` | Alertas colaborativas de la Red de Productores (plaga, clima, precio) |
| `trueques` | Ofertas de trueque de maquinaria/mano de obra/insumos |
| `talonarios_remito`, `remitos` | Talonario con el CAI de autoimpresor y remitos R emitidos (ver [migración 003](server/migrations/003-remitos.sql)) |
| `cuaderno_campo`, `certificaciones`, `requisitos_certificacion` | Cuaderno de campo por cuartel, certificaciones y su checklist (ver migraciones [006](server/migrations/006-campo.sql) y [007](server/migrations/007-analisis.sql), análisis de laboratorio) |
| `cosecheros`, `tarifas_cosecha`, `tarjas` | Cosecha a destajo: cosecheros, tarifas y tarja diaria (ver [migración 008](server/migrations/008-cosecha.sql)) |
| `insumos`, `movimientos_stock` | Stock de insumos y sus compras, usos y ajustes (ver [migración 009](server/migrations/009-stock.sql)) |
| `config_clima`, `avisos_clima` | Umbral de helada y avisos de clima ya mandados; la ubicación va en `fincas` (ver [migración 010](server/migrations/010-clima.sql)) |
| `precios_insumos` | Precios de insumos por proveedor y fecha, para el simulador (ver [migración 005](server/migrations/005-precios-insumos.sql)) |
| `compradores`, `vitrinas`, `productos_vitrina` | Agenda de compradores, vitrina pública y productos por lote (ver [migración 004](server/migrations/004-comercial.sql)) |
| `envios` | Envíos de materia prima a la fábrica o la bodega, con su DTV-e y los kg de balanza (ver [migración 002](server/migrations/002-envios.sql)) |

El esquema completo está en [`server/schema.sql`](server/schema.sql).

### API

Backend en `server/` (Node + Express + PostgreSQL, sin ORM pesado — misma filosofía simple que el server de Mercado Pago de la Clase 04). Autenticación con JWT (`Authorization: Bearer <token>`).

| Recurso | Endpoints |
|---------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `PUT /api/auth/password` |
| Mis datos | `GET /api/cuenta/exportar`, `DELETE /api/cuenta` |
| Lotes | `GET/POST /api/lotes` |
| Gastos | `GET/POST /api/gastos`, `GET /api/gastos/programados` |
| Ingresos | `GET/POST /api/ingresos` |
| Cartera | `GET /api/cartera`, `POST /api/cartera/sincronizar` |
| Inversiones | `GET/POST /api/inversiones`, `PATCH /api/inversiones/:id/vender` |
| Resumen | `GET /api/resumen`, `GET /api/resumen/proyeccion` |
| Config N8N | `GET/PUT /api/config/n8n`, `POST /api/config/n8n/test` |
| Red de Productores | `GET/POST /api/red/alertas`, `PATCH /api/red/alertas/:id/resolver`, `GET/POST /api/red/trueques`, `POST /api/red/trueques/:id/contactar` |
| Historial | `GET /api/historial` |
| Envíos | `GET/POST /api/envios`, `GET/PATCH /api/envios/:id`, `PATCH /api/envios/:id/dtv`, `PATCH /api/envios/:id/entregar`, `PATCH /api/envios/:id/anular` |
| Cuaderno de campo | `GET/POST /api/cuaderno`, `GET /api/cuaderno/carencias`, `PATCH/DELETE /api/cuaderno/:id` |
| Cosecha a destajo | `GET/POST /api/cosecha/cosecheros`, `PATCH/DELETE /api/cosecha/cosecheros/:id`, `GET/PUT /api/cosecha/tarifas`, `GET/POST /api/cosecha/tarjas`, `DELETE /api/cosecha/tarjas/:id`, `GET /api/cosecha/liquidacion`, `POST /api/cosecha/liquidacion/pagar`, `POST /api/cosecha/liquidacion/deshacer-pago`, `GET /api/cosecha/rendimiento` |
| Stock de insumos | `GET /api/stock`, `POST /api/stock/insumos`, `PATCH/DELETE /api/stock/insumos/:id`, `GET /api/stock/insumos/:id/movimientos`, `POST /api/stock/movimientos`, `DELETE /api/stock/movimientos/:id` |
| Clima | `GET /api/clima/fincas`, `PUT /api/clima/fincas/:id/ubicacion`, `GET /api/clima/buscar`, `GET /api/clima/pronostico`, `GET/PUT /api/clima/config` |
| Certificaciones | `GET /api/certificaciones/plantillas`, `GET/POST /api/certificaciones`, `PATCH/DELETE /api/certificaciones/:id`, `POST /api/certificaciones/:id/requisitos`, `PATCH/DELETE /api/certificaciones/:id/requisitos/:requisito` |
| Insumos | `GET/POST /api/insumos/precios`, `DELETE /api/insumos/precios/:id`, `POST /api/insumos/extraer-cotizacion` |
| Compradores | `GET/POST /api/compradores`, `PATCH/DELETE /api/compradores/:id` |
| Vitrina | `GET/PUT /api/vitrina`, `GET/POST /api/vitrina/productos`, `PATCH/DELETE /api/vitrina/productos/:id` |
| Vitrina pública (sin login) | `GET /api/vitrina-publica/:slug`, `GET /api/vitrina-publica/:slug/productos/:codigo`, `POST /api/vitrina-publica/:slug/consultas` |
| Remitos | `GET/POST /api/remitos/talonario`, `GET/POST /api/remitos`, `GET /api/remitos/:id`, `PATCH /api/remitos/:id/anular` |

La documentación completa de cada endpoint está en Swagger: ver [Documentación de la API](#-documentación-de-la-api-swagger).

Una diferencia clave respecto al modelo anterior: **el webhook de N8N ahora lo dispara el backend**, no el navegador — cada acción (`POST /api/gastos`, `/api/ingresos`, `/api/red/alertas`, etc.) notifica a N8N del lado del servidor si el productor tiene la integración habilitada. Esto es más confiable que el `fetch` desde el cliente (funciona aunque el productor cierre la app apenas guarda el dato).

### Cómo correrlo localmente

```bash
cd server
npm install
cp .env.example .env   # completá DATABASE_URL y JWT_SECRET
npm run migrate        # aplica server/schema.sql
npm run dev
```

Necesitás una base PostgreSQL. Para levantar una rápida en Docker:

```bash
docker run -d --name agrotech-pg -e POSTGRES_PASSWORD=agrotech -e POSTGRES_DB=agrotech -p 5432:5432 postgres:16-alpine
```

Y en `.env`: `DATABASE_URL=postgres://postgres:agrotech@localhost:5432/agrotech`.

### 🔄 Dependencias al día

Se probó Dependabot (PRs automáticos de actualización) y se descartó: para un proyecto de este tamaño generaba más trabajo y riesgo que beneficio (varios PRs a la vez, conflictos entre ellos y actualizaciones de versión mayor que pueden romper el backend). En su lugar:

- **Alertas de seguridad de GitHub** (Settings → Code security → Dependabot alerts): avisan solo cuando una dependencia tiene una vulnerabilidad conocida, sin abrir PRs.
- **Revisión manual** antes de cada entrega: `cd server && npm audit --omit=dev`. La última dio 0 vulnerabilidades en lo que se despliega.
- Los PRs que actualicen dependencias corren igual los tests automáticos del CI.

### 💾 Backups de la base

El plan gratuito de Supabase **no hace backups automáticos**, así que los hace el equipo a mano con dos scripts (solo necesitan Docker):

```bash
./scripts/backup-db.sh                       # pide la DATABASE_URL sin mostrarla y deja el .sql en ~/agrotech-backups
./scripts/verificar-backup.sh ruta/al.sql    # lo restaura en una base descartable y cuenta las filas de cada tabla
```

- Usá la cadena del **Session Pooler** (puerto 5432); la del puerto 6543 no sirve para `pg_dump`.
- Un backup que nunca se restauró es una suposición: `verificar-backup.sh` lo comprueba sin tocar producción.
- El archivo contiene emails y hashes de contraseñas: **no va al repo** (está en `.gitignore`) y conviene guardar una copia fuera de la PC, en una carpeta privada.
- Para restaurar en un proyecto nuevo de Supabase: `psql "$DATABASE_URL" < backup.sql`. El aviso `schema "public" already exists` es esperable y se puede ignorar.
- Hacelo antes de cada cambio grande en la base (por ejemplo una migración) y antes de cada presentación.

**Backup semanal automático (opcional).** `scripts/instalar-backup-semanal.sh` programa el backup todos los viernes a las 18:00 con un temporizador de systemd de tu usuario. Si la PC estaba apagada a esa hora, corre apenas se enciende; guarda los últimos 30 días y avisa con una notificación de escritorio si salió bien o mal.

```bash
mkdir -p ~/.config/agrotech && chmod 700 ~/.config/agrotech
read -r -s -p "Pegá la DATABASE_URL: " U; echo
(umask 077; printf '%s' "$U" > ~/.config/agrotech/db_url); unset U
./scripts/instalar-backup-semanal.sh            # instalar (también: --ver, --desinstalar)
```

La `DATABASE_URL` queda guardada en `~/.config/agrotech/db_url`; el script se niega a usarla si el archivo no es solo del usuario (`chmod 600`). Solo funciona con la PC encendida y Docker activo, y los backups se quedan en esa misma PC: hay que copiarlos a una carpeta privada de Drive.

### Deploy

Ya está desplegado y probado en producción:

- **Backend (Render)**: https://agrotech-api-719u.onrender.com — Web Service Free que se despliega solo desde `main` cada vez que se fusiona un PR, sin Root Directory (el path del repo tiene paréntesis, que Render no acepta ahí) — en su lugar, Build/Start Command hacen `cd "Metodologia de Sistema II/agrotech-mvp-modernizado (nube) V2.1/server" && npm install|start`. Variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (los dominios del frontend separados por coma; `*` lo deja abierto).
  - ⚠️ Plan free: se duerme a los 15 min de inactividad, el primer request después puede tardar ~50s.
  - El esquema (`schema.sql`) no se aplica solo — hay que correr `npm run migrate` una vez apuntando `DATABASE_URL` a la base (se hizo manualmente desde la terminal local para este deploy).
- **Frontend (Render)**: https://www.redagrotech.com.ar — Static Site `agrotech-frontend-d2qd.onrender.com`, que también se despliega solo desde `main` con cada PR fusionado. Sirve los archivos de esta carpeta tal cual, sin build.
  - Dominio: `www.redagrotech.com.ar` es un CNAME a `agrotech-frontend-d2qd.onrender.com` y `redagrotech.com.ar` apunta a la IP de Render.
  - La CDN de Render guarda el HTML unos 5 minutos (`s-maxage=300`): después de un deploy, el dominio puede tardar ese tiempo en mostrar lo nuevo. Para ver la versión nueva al instante: agregar `?v=algo` al final de la URL.
  - Render no lee el archivo `_headers` (es el formato de Netlify / Cloudflare Pages); los encabezados de caché se configuran en el panel del Static Site.
  - Los JS y CSS los guarda el service worker de la app: al cambiar `api.js` hay que subir el `?v=` en todos los HTML y el `CACHE_NAME` de `sw.js`, para que los celulares bajen la versión nueva.
- **Base de datos (Supabase)**: proyecto `agrotech`, región São Paulo. Conexión vía **Session Pooler** (no Direct — Direct es IPv6-only en el plan free y Render usa IPv4).

El frontend elige solo a qué API hablar (`api.js`): en `localhost` usa la local (`http://localhost:3001/api`) y en cualquier otro dominio usa la de Render. Para forzar otra, por ejemplo probar el frontend local contra producción:
```js
localStorage.setItem('agrotech_api_base', 'https://agrotech-api-719u.onrender.com/api')
```

## 📖 Documentación de la API (Swagger)

La API se documenta con **OpenAPI 3** y se puede explorar y probar desde el navegador con Swagger UI:

- Local: http://localhost:3001/api/docs
- Producción: https://agrotech-api-719u.onrender.com/api/docs
- La especificación en JSON está en `/api/docs/openapi.json` (sirve para importarla en Postman).

Para probar los endpoints protegidos: ejecutá `POST /auth/login`, copiá el `token` de la respuesta y pegalo en el botón **Authorize**.

La especificación se escribe a mano en [`server/src/docs/openapi.js`](server/src/docs/openapi.js), separada de las rutas. Para que no quede desactualizada, el test `docs.test.js` compara las rutas que monta la app con las documentadas: si alguien agrega un endpoint y no lo documenta, el CI falla.

## 🧪 Tests de la API

Hay 84 tests (jest + supertest) que ejercitan la API contra un Postgres real: registro y login, recuperación de contraseña, el límite de intentos, la autenticación de las rutas, el CRUD de gastos e ingresos con su aislamiento entre productores, inversiones, cartera de cheques, la Red de Productores, las cuentas del resumen financiero y que la documentación de Swagger esté completa.

```bash
docker run -d --name pg-agrotech-test -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:16-alpine
cd server
DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test
```

Los tests **se niegan a correr si `DATABASE_URL` no apunta a localhost**, para no escribir datos de prueba en Supabase. La primera vez aplican `schema.sql` solos. En GitHub, el workflow `.github/workflows/agrotech-tests.yml` los corre en cada PR que toque el proyecto (con un Postgres como servicio), junto con el lint.

## ✅ Calidad de código

El proyecto usa **ESLint** (errores y malas prácticas) y **Prettier** (formato), en el backend y en el frontend:

```bash
npm install        # una vez, en la carpeta del proyecto
npm run lint       # revisa todo, igual que el CI
npm run lint:fix   # arregla solo lo que se pueda
```

- La configuración está en `eslint.config.js` y `.prettierrc.json`, y sigue el estilo que ya tenía el código: comillas simples, punto y coma y sin coma final.
- Los HTML y los `.md` quedan fuera de Prettier por ahora: tienen CSS y JS escritos adentro, y se van a ordenar al pasar el frontend a Vite.
- El CI tiene dos trabajos en cada PR: **Lint** y **Tests de la API**. Los dos tienen que quedar en verde para fusionar.
- Ramas, formato de los commits y qué revisar antes de un PR: [CONTRIBUTING.md](CONTRIBUTING.md).

## 🤖 Integración N8N

1. Instalá N8N con Docker en tu PC y exponelo a internet con un túnel (Cloudflare Tunnel con dominio propio, o n8n.io como alternativa paga)
2. Importá `agrotech-n8n-alerta-fallas-workflow.json` **primero** y `agrotech-n8n-cloud-workflow.json` después (Workflows → Import from File). Activá los dos (ver "Aviso de fallas" más abajo)
3. Copiá la URL del nodo **Webhook AgroTech**
4. Andá a `n8n.html` → activá el toggle → pegá la URL
5. Probá con "Enviar Evento de Prueba"

> Si el backend tiene seteada `N8N_DEFAULT_WEBHOOK_URL`, **todo productor nuevo se registra con N8N ya habilitado** con esa URL — no hace falta que cada uno haga el paso 4 a mano. Esto surgió porque un compañero probó la app sin haber activado nunca la integración, y como no hay ningún error visible (solo se corta en silencio si no hay config), no era obvio qué estaba pasando.

El webhook dispara **dos ramas en paralelo** para cualquier evento (alertas de Red, trueques, gastos, ingresos, inversiones, cheques): **WhatsApp** y **Email**. El nodo **Preparar WhatsApp** arma un mensaje corto distinto según `evento` (alerta, trueque, gasto, ingreso, inversión, cheques, prueba de conexión), y **Preparar Emails** arma el email HTML detallado como antes — ambos corren siempre, no hace falta elegir uno.

### 🚨 Aviso de fallas

Un fallo de N8N no se ve desde la app (el backend solo dispara el webhook y sigue), así que se rompió una vez el SMTP de Gmail sin que nadie se enterara. Ahora hay dos defensas:

- **En la app:** si el servidor no responde, el dashboard muestra un banner "Sin conexión" con botón *Reintentar* en vez de mostrar `$0` como si todo estuviera bien.
- **En N8N:** el workflow `AgroTech - Alerta de fallas` (Error Trigger) manda un email al administrador cuando falla cualquier ejecución del workflow unificado. El nodo **Send WhatsApp** ya no falla en silencio: su salida de error corta la rama con un error explícito (`Avisar fallo WhatsApp`) y dispara la misma alerta. La rama del email sigue funcionando aunque WhatsApp falle.

Límites: la alerta sale por el mismo SMTP, así que si el que falla es el email no hay aviso por esa vía, y si la PC con N8N está apagada tampoco puede avisar nada. Para eso conviene un monitor externo gratuito (por ejemplo UptimeRobot) apuntando a `https://n8n.redagrotech.com.ar/healthz`. En el workflow unificado, `errorWorkflow` apunta al id `AgroAlertaFalla01`; si importás con otro id, elegilo en *Settings → Error workflow*.

> El email de cada evento le llega **al productor dueño del evento**, no siempre al administrador: `notificarN8N` suma el `email` del productor al payload del webhook, y el nodo **Send Email** lo usa como destinatario (con el email del admin como fallback si por algún motivo no vino). Antes estaba fijo al email del administrador para todos.

> En producción, N8N corre **self-hosted** en Docker sobre la propia PC del productor administrador, expuesto a internet con **Cloudflare Tunnel** apuntando a un subdominio propio (`n8n.redagrotech.com.ar`) — gratis y con URL fija para siempre, a diferencia de ngrok (URL random que cambia en cada reinicio) o de n8n.io Cloud (plan gratuito limitado a 50 ejecuciones/mes). La contra de este enfoque: el webhook solo funciona mientras esa PC esté encendida y con internet.

### ✏️ Editar, borrar y archivar

- **Gastos e ingresos** se pueden editar y borrar desde las listas "Gastos cargados" / "Ingresos cargados" (`PATCH`/`DELETE /api/gastos/:id` y `/api/ingresos/:id`). En un ingreso se edita cuartel, monto y fecha de cobro (tipo, estado y descuento no se cambian: se borra y se vuelve a cargar; un ingreso con descuento tampoco cambia de monto). Si es un cheque, la cartera se actualiza o se borra junto con el ingreso.
- **Cuarteles**: no se borran, se **archivan** (`PATCH /api/lotes/:id/archivar`), porque `gastos` e `ingresos` se borran en cascada con el lote. El cuartel archivado sale de las listas y de los formularios pero sigue sumando en el balance, y se restaura desde Balance. No se puede archivar el único cuartel activo de una finca.
- Estos cambios quedan en el historial (`gasto_editado`, `gasto_eliminado`, `ingreso_editado`, `ingreso_eliminado`, `lote_archivado`).
- **Migración (una vez, antes de desplegar)**: `ALTER TABLE lotes ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;`

### 🔒 Seguridad básica de la API

- **Rate limiting** (`server/src/middleware/rateLimit.js`): login 10 intentos cada 15 min por IP; registro 10 por hora; recuperación de contraseña 5 por hora (cada pedido manda un email); y los endpoints de IA (`extraer-factura`, `escanear-planta`) 20 por hora **por productor**, porque cada llamada gasta cuota de Anthropic. `trust proxy` está activado porque el servidor corre detrás del proxy de Render.
- **helmet** para los headers de seguridad y **CORS** restringido con `CORS_ORIGIN`.
- **Registro**: contraseña de al menos 6 caracteres y email validado y normalizado en minúsculas (`Ariel@x.com` y `ariel@x.com` son la misma cuenta; el login y la recuperación comparan sin distinguir mayúsculas).
- **Dueño del lote**: al cargar un gasto o un ingreso se verifica que el `loteId` sea del productor (`services/lotes.js`); si no, responde 404.

### ✉️ Verificación de email

Al registrarse, la cuenta queda **sin verificar** y N8N manda un email con un link (válido 24 horas; el token se guarda hasheado, como el de recuperación de contraseña). Mientras el email no esté confirmado:

- la app muestra un cartel con *Reenviar email* (hasta 5 por hora) y *Ahora no*;
- **no se mandan avisos por email ni WhatsApp** de esa cuenta, ni se la incluye entre los vecinos que reciben las alertas y ofertas de la Red de Productores. Así nadie puede recibir mensajes por un email o un teléfono que otra persona escribió al registrarse.

Todo lo demás funciona igual, y si N8N está caído el registro igual se completa (se puede pedir el reenvío después). Recuperar la contraseña por email también deja la cuenta verificada, porque prueba que el email es de quien lo usa.

Endpoints: `POST /api/auth/verificar-email`, `POST /api/auth/reenviar-verificacion` y `GET /api/auth/perfil`.

**Para desplegarlo (en este orden):**
1. Correr `server/migrations/001-verificar-email.sql` en el SQL Editor de Supabase. Solo agrega columnas con valor por defecto, así que el backend viejo sigue funcionando, y deja las cuentas existentes como verificadas.
2. Importar en N8N el workflow `agrotech-n8n-password-reset-workflow.json` actualizado: el mismo flujo que manda el email de recuperación ahora también arma el de verificación según el `evento` (y escapa el nombre, que lo escribe quien se registra). Sin `evento` sigue armando el de recuperación, así que es compatible con el backend viejo.
3. Recién ahí mergear el PR, para que Render y el frontend se desplieguen con la columna y el workflow ya listos.

### 🔑 Cambiar la contraseña

Desde **Más → Cuenta → Cambiar contraseña** (`PUT /api/auth/password`). Pide la contraseña actual (si no coincide responde 403 y no cierra la sesión), exige una nueva de entre 6 y 72 bytes distinta de la actual, descarta cualquier link de recuperación que hubiera quedado pendiente y deja el cambio en el historial. Tiene el mismo límite de intentos que el login.

Límite conocido: las sesiones ya abiertas en otros dispositivos siguen siendo válidas hasta que vence su token (30 días). Para cortarlas habría que guardar en la base cuándo se cambió la contraseña y comprobarlo en cada pedido.

### 🗂️ Mis datos: descargar y eliminar la cuenta

Desde **Más → Mis datos personales** el productor puede ejercer sus derechos sobre su información (acceso y supresión, previstos en la Ley 25.326 de Protección de Datos Personales):

- **Descargar todos mis datos** (`GET /api/cuenta/exportar`): un JSON con su perfil, fincas, cuarteles, gastos, ingresos, cartera de cheques, inversiones, historial, configuración de N8N y lo que publicó en la Red. Nunca incluye el hash de la contraseña ni los tokens de recuperación.
- **Eliminar mi cuenta** (`DELETE /api/cuenta`): pide la contraseña, borra la cuenta y, por `ON DELETE CASCADE`, todo lo que colgaba de ella, incluidas las alertas y ofertas que publicó en la Red de Productores. No se puede deshacer. Está limitado por intentos, igual que el login, para que nadie pueda adivinar la contraseña desde acá.

Un token ya emitido sigue siendo válido hasta que vence (30 días) aunque la cuenta se haya borrado, pero no da acceso a nada: las consultas devuelven listas vacías y las escrituras fallan porque la cuenta ya no existe. La app lo descarta sola al cerrar la sesión tras borrar la cuenta.

### Avisos por zona (Red de Productores)

Tanto una **alerta nueva** como una **oferta de trueque nueva** avisan por WhatsApp a los demás productores de esa misma zona (nunca al autor, que ya ve lo que acaba de publicar) — solo a quienes tengan su número cargado y N8N habilitado. El filtro por zona vive en `avisarZona()` (`server/src/routes/red.routes.js`), compartido entre `POST /api/red/alertas` y `POST /api/red/trueques`.

Además, el botón **"Contactar"** de una oferta de trueque (`POST /api/red/trueques/:id/contactar`) le manda un WhatsApp directo al autor de la oferta con el nombre y el teléfono del interesado — así se pueden coordinar sin salir de WhatsApp, sin necesidad de un chat dentro de la app. Requiere que el interesado tenga su propio número cargado (si no, el endpoint devuelve un error pidiéndoselo).

### 📱 Configurar WhatsApp (WasenderAPI, cuenta única)

El MVP usa **[WasenderAPI](https://wasenderapi.com/)** con una **única cuenta compartida** (la del administrador de la app): se vincula un solo WhatsApp por código QR (como WhatsApp Web), y desde esa sesión se le puede mandar un mensaje a **cualquier número**, igual que si se lo escribieras vos mismo desde tu celular — el destinatario no necesita registrarse en nada.

Cada productor carga **su número de teléfono** (con código de país) al registrarse, o después desde **Más → Cuenta**. El backend lo guarda en `productores.telefono` (fuente única — ya no vive en `config_n8n`) y `notificarN8N` lo suma al payload del webhook (`whatsapp: { telefono }`); el nodo **Preparar WhatsApp** arma el mensaje y el `HTTP Request` **Send WhatsApp** lo dispara usando la API key fija de WasenderAPI configurada una sola vez en el nodo (header `Authorization: Bearer <apikey>`, reemplazando el placeholder `PEGAR_TU_API_KEY_DE_WASENDER_ACA` por la key real directamente en N8N — nunca se sube al repo). Si un productor no cargó su teléfono todavía, el nodo tiene **On Error: Continue**, así que el workflow no se rompe — simplemente no llega el WhatsApp para ese evento.

> Se probó antes con **CallMeBot** (gratis, pero su bot público está sin cupo para altas nuevas — "the bot is currently full") y con la sandbox de **Twilio** (sin actividad en los logs pese a la activación correcta). También se evaluó que cada productor tuviera su propia cuenta de WasenderAPI, pero se descartó porque implicaba que cada uno pagara su propia suscripción; con una cuenta única alcanza con cargar el número.

> ⚠️ WasenderAPI vincula un WhatsApp personal por sesión (no es la API oficial de Meta), así que conviene un volumen de mensajes bajo/moderado y un único remitente para todos los productores. Para producción a mayor escala conviene migrar a **WhatsApp Business Cloud API (Meta)**, que requiere verificación de negocio y plantillas aprobadas pero permite mayor volumen.

### Payload que envía AgroTech (eventos financieros)
```json
{
  "app": "AgroTech",
  "version": "2.0.0",
  "timestamp": "2026-08-22T19:57:00Z",
  "evento": "gasto_registrado",
  "datos": { "loteId": "duraznos", "concepto": "Personal", "monto": 150000 },
  "resumen": {
    "saldoNeto": 2450000,
    "totalIngresos": 5200000,
    "totalGastos": 2750000,
    "resultadoNeto": 1800000
  }
}
```

### Payload de la Red de Productores (alertas)
```json
{
  "app": "AgroTech",
  "version": "2.0.0",
  "timestamp": "2026-08-23T22:00:00Z",
  "evento": "alerta_nueva",
  "datos": {
    "tipo": "plaga",
    "zona": "San Rafael — Este",
    "cultivo": "Vid",
    "descripcion": "Oidio detectado en lote A"
  },
  "resumen": { "saldoNeto": 2450000, "totalIngresos": 5200000, "totalGastos": 2750000, "resultadoNeto": 1800000 },
  "whatsapp": { "telefono": "+549261..." }
}
```

---

## 🚚 Envíos de materia prima

Primer módulo de la práctica profesional. El durazno que va a la fábrica viaja con el **DTV-e**: AgroTech arma la ficha con los datos del envío, el productor lo emite en ARCA y registra su número en la app.

1. **Cargar el envío** en `envios.html`: cuartel, fecha, producto, kg estimados, bins, fábrica o bodega (con CUIT), transportista, chofer y patentes.
2. **Ficha para el DTV-e**: un botón muestra (y copia) todos los datos que pide ARCA, para emitirlo sin volver a tipear.
3. **Registrar el DTV-e**: número y vencimiento. Si vence antes de entregar, la tarjeta lo marca como vencido.
4. **Llegada**: los kg del ticket de balanza; la app muestra la diferencia con lo estimado (en rojo si supera el 5 %).

Reglas (ver [ADR 0004](docs/adr/0004-envios-sin-borrar-y-bloqueados-tras-el-dtv.md)):
- AgroTech **nunca pide ni guarda la clave fiscal**: el DTV-e se emite en ARCA.
- Sin DTV-e registrado no se puede marcar como entregado.
- Solo se edita mientras está cargado; con el DTV-e registrado los datos ya se declararon en ARCA.
- Un envío **nunca se borra**: se anula con un motivo y queda en el historial.
- CUIT con dígito verificador y patentes en formato viejo (AAA123) o Mercosur (AA123BB).

### Remito R por autoimpresor

El remito R sale del mismo envío, **por autoimpresor**: AgroTech imprime el comprobante completo (original y duplicado) en hoja blanca. Ver [ADR 0005](docs/adr/0005-remito-por-autoimpresor-activado-con-el-cai.md).

- **Está apagado hasta cargar el CAI** de autoimpresor que tramita el contador ante ARCA: en `envios.html`, sección *Remito R*, se cargan el CAI (14 dígitos), su vencimiento, el punto de venta, el rango de números y los datos del emisor. Hasta entonces se sigue usando el talonario de imprenta.
- Se emite desde un envío **con el DTV-e registrado** y no lleva datos del DTV-e.
- Numeración correlativa en número y fecha; bloqueo con CAI vencido o rango agotado; aviso a 30 días del vencimiento o con 10 números o menos.
- Nunca se borra: se anula y el número queda usado. Un envío con remito vigente no se puede anular.
- **Membrete:** razón social, domicilio, CUIT, IIBB, inicio de actividades y condición frente al IVA se cargan con el CAI y se corrigen con *Editar datos del emisor*, sin tocar el CAI ni la numeración. Los remitos ya emitidos no cambian.
- Si se vuelve a cargar el mismo CAI, la numeración sigue desde el último número usado en ese punto de venta: un número nunca se repite.
- ⚠️ El diseño del PDF es una propuesta: **el contador tiene que revisarlo** antes de usarlo con validez fiscal.

> **Antes de desplegar**: correr una vez, en orden, las migraciones de `server/migrations/` que falten (002 envíos, 003 remitos, 004 ventas, 005 precios de insumos, 006 cuaderno y certificaciones, 007 análisis, 008 cosecha, 009 stock, 010 clima) en el SQL Editor de Supabase. Si el backend nuevo llega a producción sin las tablas, solo fallan los envíos y los remitos; el resto de la app sigue andando.

## 🛒 Ventas del producto elaborado

Módulos 2 y 3 de la práctica profesional, en `ventas.html` (menú **Ventas**), con tres pestañas:

### Simulador "¿vendo la fruta o la elaboro?"

Compara vender la materia prima a la industria o la bodega contra elaborarla a façon y vender el producto terminado:

- **Vender:** kg × precio por kg.
- **Elaborar:** unidades = kg aptos ÷ kg por unidad; resultado = venta − servicio de la fábrica − insumos − flete − comisión + fruta de descarte.
- Muestra qué conviene, por cuánto, el **precio mínimo por unidad** desde el que elaborar deja más y el costo por unidad. Baja un PDF para mostrarlo.
- Trae la plantilla **durazno en mitades en jarabe diluido x 820 g**, con el estándar de una carta oferta de elaboración a façon (0,82 kg de durazno de 1ra por lata, insumos por lata y servicio de elaboración y etiquetado). Todos los valores se editan; los precios de los insumos los carga el productor.
- La cuenta está en [`simulador.js`](simulador.js) y tiene tests con un caso calculado a mano.
- **Precios de los insumos:** con **Leer cotización (foto o PDF)** la IA (Claude Haiku 4.5, la misma que lee las facturas) lee la cotización o lista de precios de un proveedor, pasa cada presentación a precio por kg, unidad o litro (bolsa de 50 kg → $/kg) y propone a qué insumo corresponde. El productor revisa y corrige antes de guardar. También se pueden guardar los precios cargados a mano.
- Los precios quedan en una lista propia con proveedor y fecha; al abrir el simulador, los insumos sin precio toman el último guardado, y los de más de 30 días se marcan en ámbar.

### Agenda de compradores

Lista privada con contacto, interés, estado (a contactar, contactado, cotizado, venta cerrada, descartado), precio cotizado y notas. Los botones **WhatsApp** y **Email** abren el mensaje armado con el producto y el enlace a la vitrina, y anotan el contacto.

### Vitrina pública con QR por lote

- El productor arma su página (`vitrina.html?v=<dirección>`) y publica sus productos por lote: presentación, cantidad, precio (o "a convenir"), lote, elaboración, vencimiento y cuartel de origen.
- Cada lote tiene su **QR**: la app baja una hoja A4 con 4 etiquetas para imprimir. Al escanearlo se ve la trazabilidad del lote y un formulario de consulta.
- La consulta entra sola en la agenda (marcada "llegó por la vitrina") y avisa por N8N.
- Solo se ve lo que se publica: ningún dato financiero (ver [ADR 0006](docs/adr/0006-vitrina-publica-solo-lo-publicado.md)).

> Para que el aviso de N8N muestre la consulta con sus datos, hay que volver a importar `agrotech-n8n-cloud-workflow.json` (evento `consulta_vitrina`).

## 🌱 Campo: cuaderno, cosecha, stock y certificaciones

En `campo.html` (menú **Campo**), con cuatro pestañas. La configuración de N8N pasó a **Más**.

### Cuaderno de campo

- Registros por cuartel: **aplicaciones fitosanitarias** (producto, principio activo, dosis, plaga o enfermedad, operador, equipo, carencia y reingreso), fertilización, riego, poda, raleo, cosecha y otras labores. Un registro se puede cargar en varios cuarteles a la vez.
- **Análisis de laboratorio** de suelo, agua, hoja (foliar) o residuos en fruta: laboratorio, pH, conductividad, materia orgánica, resultado (apto o no) y enlace al informe. Cuentan como evidencia en los requisitos de análisis de las certificaciones.
- **Carencia:** con la fecha y los días de carencia, la app muestra qué cuarteles no se pueden cosechar todavía, y avisa al cargar un envío de ese cuartel.
- **PDF para el auditor**, con los filtros de cuartel y tipo.

### Certificaciones

- BPA, GlobalG.A.P., orgánica, comercio justo u otra: certificadora, número, alcance, emisión, vencimiento, próxima auditoría, estado y enlace al certificado.
- **Checklist editable** que arranca de una plantilla **orientativa** (no reemplaza el checklist oficial ni el de la certificadora), con el porcentaje de cumplimiento. Los requisitos de registros muestran la **evidencia del cuaderno** de los últimos 12 meses.
- **Avisos por N8N** a 60 y 30 días del vencimiento y de la auditoría (evento `certificacion_por_vencer`; hay que reimportar el workflow). La certificación vigente que pasó su fecha queda como vencida.
- Las certificaciones vigentes que elijas se muestran en tu **vitrina pública**.
- Ver [ADR 0007](docs/adr/0007-cuaderno-de-campo-y-certificaciones.md).

### Cosecha a destajo

- **Cosecheros** de la temporada (nombre, DNI opcional y teléfono). El que trabajó no se borra: se da de baja.
- **Tarja del día:** fecha, cuartel y modalidad (tacho, bin, kilo o jornal), y para cada cosechero cuánto hizo, con botones − y + para cargarlo en el celular. El precio y los kilos por tacho o bin quedan guardados como tarifa. Avisa si el cuartel está en carencia.
- **Liquidación** por período: días, tachos, bins, jornales, kilos, importe, pagado y pendiente por cosechero. Al pagar se marca lo pendiente y, si querés, se carga como **gasto por cuartel** (entra en el balance). Lo pagado ya no se cambia.
- **Planilla PDF** para que firme cada cosechero, y **kilos cosechados por cuartel** (y por hectárea).
- Cada día de tarja cuenta como evidencia de cosecha en las certificaciones.
- ⚠️ Es el control de la cosecha y de los pagos: **no reemplaza el registro de los trabajadores (RENATRE, alta temprana) ni el recibo de sueldo**, que hace el contador.

### Stock de insumos

- Insumos con categoría (fitosanitario, fertilizante, combustible, envase), unidad (litros, kilos o unidades), principio activo, carencia y **stock mínimo**.
- **Compras** (con el total de la factura y el proveedor; el precio por unidad puede ir a la lista de precios del simulador), **usos** y **ajustes por inventario** (se carga lo que se contó en el depósito).
- Al cargar una aplicación o fertilización en el cuaderno, se elige el insumo y lo usado en cada cuartel: **se descuenta solo**. Elegirlo completa producto, principio activo y carencia. Si se borra el registro, el insumo vuelve.
- Cuando un insumo llega al mínimo, **avisa por N8N** una sola vez (evento `stock_bajo`), y vuelve a avisar después de reponerlo.

## ⛅ Clima por finca

En el **Inicio**, para la finca activa:

- Se ubica la finca **buscando el lugar** (por ejemplo "Vista Flores") o con el **GPS del celular** estando en ella.
- **Pronóstico de 7 días**: máxima, mínima, lluvia, ráfagas y aviso de tormenta o granizo, con los días de helada marcados.
- **Aviso de helada por N8N:** cada 6 horas se revisan los próximos 3 días; si la mínima va a llegar al umbral que elijas (por defecto 0 °C) o se pronostica granizo, llega un aviso (evento `alerta_clima`), una sola vez por día y finca.
- El pronóstico sale de [Open-Meteo](https://open-meteo.com): gratis, sin clave y solo recibe las coordenadas de la finca. Es **solo para uso no comercial**: si AgroTech se vende, hay que pasar a su plan pago. Es la temperatura a 2 m; en el suelo puede ser más baja, así que conviene confirmarlo con el SMN y Contingencias Climáticas.
- Ver [ADR 0008](docs/adr/0008-cosecha-stock-y-clima.md).

## 📷 Escaneo de Facturas con IA

Desde `gastos.html` (Cargar Gasto), el botón **"Escanear factura"** abre la cámara del celular, le saca una foto al ticket/factura y la manda al backend. Ahí, `server/src/services/facturas.js` se la pasa a **Claude Haiku 4.5** (API de Anthropic, con visión) pidiéndole que devuelva un JSON con un ítem por cada producto o servicio distinto de la factura — porque pueden pertenecer a cuarteles distintos. El productor revisa la lista (puede editar concepto/monto, sacar ítems mal leídos) y le asigna un cuartel a cada uno antes de confirmar; ahí recién se crea un gasto por línea vía `POST /api/gastos`.

Requiere la variable de entorno `ANTHROPIC_API_KEY` (se saca gratis en [console.anthropic.com](https://console.anthropic.com), se paga por uso). El costo es bajísimo: con Haiku 4.5 una factura sale entre 0.2 y 0.3 centavos de dólar. La IA puede equivocarse (fotos borrosas, tickets térmicos desteñidos), por eso el flujo siempre pasa por la pantalla de revisión antes de guardar nada.

---

## 📊 Datos de Prueba

Ya no se precargan datos de ejemplo (`demo-data.js` fue retirado): cada cuenta nueva arranca limpia, con un "Lote 1" por defecto, para reflejar el uso real multi-productor. Para probar la app rápido, registrá una cuenta en `login.html` y cargá un par de gastos/ingresos desde las pantallas correspondientes.

La sección "Red de Productores" (`red.html`) lista alertas y ofertas de intercambio reales vía `GET /api/red/alertas` y `GET /api/red/trueques` — no hay datos de ejemplo; para verla poblada registrá dos cuentas distintas y creá alertas/ofertas desde cada una.

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|-----------|-----|
| HTML5 + CSS3 | Maquetado responsive, glassmorphism, PWA |
| Vanilla JavaScript | Lógica de negocio, consumo de la API |
| Node.js + Express | Backend REST (`server/`) |
| PostgreSQL | Base de datos (`server/schema.sql`) |
| JWT + bcrypt | Autenticación por productor |
| Chart.js | Gráficos de flujo de caja y métricas |
| jsPDF + jspdf-autotable | Listados de gastos/ingresos en PDF |
| N8N (WasenderAPI WhatsApp) | Automatización de workflows y alertas |
| Claude API (Anthropic, Haiku 4.5) | Lectura de facturas por foto (escaneo de gastos) |
| Service Worker | Caché de la interfaz para abrir la app sin conexión (PWA); los datos siempre van a la API |
| LocalStorage | Solo token de sesión y preferencia de tema |
| Manifest.json | Configuración de instalación como app |
| Docker + docker-compose | Entorno local completo con un comando |
| OpenAPI 3 + Swagger UI | Documentación de la API |
| ESLint + Prettier | Calidad y formato del código |
| GitHub Actions | CI: lint y tests en cada PR |

---

## ⚠️ Limitaciones conocidas

- **Sin conexión no se pueden ver ni guardar datos.** El Service Worker guarda en caché la interfaz (HTML, CSS y JS), así que la app abre sin señal, pero todas las llamadas a la API van siempre a la red (`sw.js`). Cargar un gasto o un ingreso sin conexión falla con un aviso. Hacerlo de verdad requeriría una cola de pendientes (IndexedDB + reintento), que no está implementada.
- **La API corre en Render (plan gratuito)**: se duerme tras un rato sin uso y el primer acceso puede tardar unos 30 a 50 segundos.
- **N8N corre en una PC propia**: si está apagada, no salen los avisos de WhatsApp ni los emails (la app sigue funcionando).
- **WhatsApp con WasenderAPI** usa un WhatsApp personal vinculado por QR (no la API oficial de Meta); sirve para un MVP con poco volumen.

---

## 🗺️ Hoja de ruta (v3)

AgroTech v3 pasa de las finanzas por lote a seguir la materia prima de la cosecha al producto final. Se presenta como práctica profesional en febrero de 2027 con un MVP de tres módulos:

1. **Envíos de materia prima**: preparar y seguir el DTV-e y emitir el remito R preimpreso, cargando el envío una sola vez. El DTV-e se emite en ARCA; AgroTech nunca guarda la clave fiscal.
2. **Simulador "¿vendo la fruta o la elaboro?"**: compara vender el durazno o la uva contra elaborarlos a façon (conservas y vino).
3. **Vitrina pública con QR por lote**: cada lote muestra de dónde viene el producto.

Lo demás (envases en comodato, cosecha, certificaciones, marca, viveros, compradores, Red AgroTech, uso sin conexión y frontend con Vite) es la visión del producto. Los cambios se van anotando en el [CHANGELOG](CHANGELOG.md).

---

## 👨‍💻 Equipo

| Integrante | Módulos de la práctica (v3) |
|------------|-----------------------------|
| **Ariel Mazara** | Envíos de materia prima (DTV-e y remito R) |
| **Agustina Zuniga** | Simulador de elaboración y vitrina pública con QR |

El cierre de la práctica (uso real, plan de pruebas, manual de usuario e informe) es de los dos. El reparto es una propuesta a confirmar.

**Materia:** Metodología de Sistemas II  
**Institución:** UTN — Facultad Regional San Rafael  
**Año:** 2025 / 2026

---

## 📜 Licencia

Proyecto académico desarrollado para la materia Metodología de Sistemas II de la UTN FRSR.

---

> *"La tecnología no reemplaza al productor, lo empodera."* — AgroTech 🌾
