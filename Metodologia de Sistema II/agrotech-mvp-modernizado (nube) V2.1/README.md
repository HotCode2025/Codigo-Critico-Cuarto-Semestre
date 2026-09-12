# 🌾 AgroTech MVP v2.0

**Metodología de Sistemas II — UTN FRSR 2025/2026**

> Startup innovadora y social de gestión financiera agrícola con integración N8N para automatización de workflows y red colaborativa de productores.

---

## 📋 Índice

1. [¿Qué es AgroTech?](#-qué-es-agrotech)
2. [El Problema](#-el-problema)
3. [Nuestra Solución — El MVP](#-nuestra-solución--el-mvp)
4. [Componente Social: Red de Productores](#-componente-social-red-de-productores)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Cómo usar](#-cómo-usar)
7. [Backend + Base de Datos](#-backend--base-de-datos)
8. [Integración N8N](#-integración-n8n)
9. [Datos de Prueba](#-datos-de-prueba)
10. [Tecnologías](#-tecnologías)
11. [Equipo](#-equipo)

---

## 🌱 ¿Qué es AgroTech?

AgroTech es una **startup innovadora y social** que nace para resolver la falta de herramientas digitales accesibles para pequeños y medianos productores agrícolas de Mendoza (San Rafael y Valle de Uco).

El producto es un **sistema de gestión financiera agrícola** que permite:
- Controlar ingresos y gastos por lote/cuartel
- Simular inversiones en Obligaciones Negociables (ONs)
- Gestionar cartera de cheques
- Recibir alertas de liquidez con proyección temporal
- **Conectarse con otros productores** mediante una red colaborativa

Todo funciona como **PWA** (Progressive Web App): se instala en el celular, funciona offline y sincroniza cuando hay conexión.

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
| **Inversiones ONs** | Simulador de compra de Obligaciones Negociables con proyección de rendimiento |
| **N8N** | Configuración de webhook para automatización de workflows |
| **Red de Productores** | Alertas colaborativas, trueque de maquinaria/mano de obra, precios compartidos |
| **Configuración** | Exportar/importar datos, cambio de tema, reinicio |

### Características técnicas

- 🎨 **Glassmorphism + Dark Mode**
- 📱 **Diseño mobile-first** con navbar inferior
- 📊 **Gráficos interactivos** con Chart.js
- 🤖 **Webhook N8N** con test de conexión
- 💾 **Exportar CSV/JSON**
- 📥 **Importar backup**
- 📴 **Funciona offline** (PWA con Service Worker)
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
├── pantalla2.html      # Carga de Gastos
├── pantalla3.html      # Registro de Ingresos
├── pantalla4.html      # Estado de Resultados
├── pantalla5.html      # Inversiones en ONs
├── pantalla6.html      # Integración N8N
├── pantalla7.html      # Configuración
├── pantalla8.html      # Red de Productores (componente social)
├── styles.css          # Estilos modernos (glassmorphism, dark mode)
├── api.js              # Cliente REST hacia server/ (fetch + JWT)
├── shared.js           # Motor central de datos y lógica (caché + API)
├── manifest.json       # Configuración PWA
├── sw.js               # Service Worker (offline)
├── server/             # Backend Express + PostgreSQL (ver sección siguiente)
└── icons/
    ├── icon-192.png    # Icono PWA (192x192)
    └── icon-512.png    # Icono PWA (512x512)
```

---

## 🚀 Cómo usar

> Desde la migración a base de datos, la app necesita el backend (`server/`) corriendo — ver [Backend + Base de Datos](#-backend--base-de-datos). Sin el backend levantado, `login.html` va a mostrar error de conexión.

### Servidor local
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
3. ¡Listo! Funciona offline

---

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
| `lotes` | Cuarteles/lotes por productor |
| `gastos` | Gastos pagados o programados por lote |
| `ingresos` | Ingresos por lote (efectivo, transferencia, cheque físico/echeq), con descuento opcional |
| `cheques_cartera` | Cheques pendientes de cobro (se generan automáticamente al registrar un ingreso en cheque) |
| `inversiones` | Compras de Obligaciones Negociables |
| `historial_eventos` | Auditoría de todos los movimientos (equivalente al historial de `shared.js`) |
| `config_n8n` | Webhook de N8N configurado por cada productor |
| `alertas_red` | Alertas colaborativas de la Red de Productores (plaga, clima, precio) |
| `trueques` | Ofertas de trueque de maquinaria/mano de obra/insumos |

El esquema completo está en [`server/schema.sql`](server/schema.sql).

### API

Backend en `server/` (Node + Express + PostgreSQL, sin ORM pesado — misma filosofía simple que el server de Mercado Pago de la Clase 04). Autenticación con JWT (`Authorization: Bearer <token>`).

| Recurso | Endpoints |
|---------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Lotes | `GET/POST /api/lotes` |
| Gastos | `GET/POST /api/gastos`, `GET /api/gastos/programados` |
| Ingresos | `GET/POST /api/ingresos` |
| Cartera | `GET /api/cartera`, `POST /api/cartera/sincronizar` |
| Inversiones | `GET/POST /api/inversiones` |
| Resumen | `GET /api/resumen`, `GET /api/resumen/proyeccion` |
| Config N8N | `GET/PUT /api/config/n8n`, `POST /api/config/n8n/test` |
| Red de Productores | `GET/POST /api/red/alertas`, `PATCH /api/red/alertas/:id/resolver`, `GET/POST /api/red/trueques` |
| Historial | `GET /api/historial` |

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

### Deploy

Ya está desplegado y probado en producción:

- **Backend (Render)**: https://agrotech-api-719u.onrender.com — Web Service Free, rama `arielmvp`, sin Root Directory (el path del repo tiene paréntesis, que Render no acepta ahí) — en su lugar, Build/Start Command hacen `cd "Metodologia de Sistema II/agrotech-mvp-modernizado (nube) V2.1/server" && npm install|start`. Variables: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN=*`.
  - ⚠️ Plan free: se duerme a los 15 min de inactividad, el primer request después puede tardar ~50s.
  - El esquema (`schema.sql`) no se aplica solo — hay que correr `npm run migrate` una vez apuntando `DATABASE_URL` a la base (se hizo manualmente desde la terminal local para este deploy).
- **Base de datos (Supabase)**: proyecto `agrotech`, región São Paulo. Conexión vía **Session Pooler** (no Direct — Direct es IPv6-only en el plan free y Render usa IPv4).

Para que el frontend (`index.html`, `pantalla*.html`) hable con el backend desplegado en vez de `localhost:3001`, hay que apuntar `api.js`:
```js
localStorage.setItem('agrotech_api_base', 'https://agrotech-api-719u.onrender.com/api')
```
(o cambiar `DEFAULT_BASE` directamente en `api.js` si el frontend también se despliega en algún lado fijo — pendiente).

## 🤖 Integración N8N

1. Instalá N8N (local o [n8n.io](https://n8n.io))
2. Importá `agrotech-n8n-cloud-workflow.json` (Workflows → Import from File)
3. Copiá la URL del nodo **Webhook AgroTech**
4. Andá a `pantalla6.html` → activá el toggle → pegá la URL
5. Probá con "Enviar Evento de Prueba"

El workflow separa automáticamente los eventos en dos ramas (nodo **Es Alerta Social**):
- `evento: "alerta_nueva"` (Red de Productores, `pantalla8.html`) → rama **WhatsApp**
- Cualquier otro evento (gastos, ingresos, inversiones, cheques) → rama **Email** (sin cambios)

### 📱 Configurar WhatsApp (CallMeBot)

El MVP usa **[CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/)** en vez de Twilio: es gratis, no pide tarjeta ni verificación de negocio, y cada productor consigue su propia API key en un solo paso. El nodo **Send WhatsApp** del workflow es un simple `HTTP Request` (GET) a `https://api.callmebot.com/whatsapp.php`, sin credenciales que configurar en N8N.

Cada productor, desde `pantalla6.html` → sección **WhatsApp (CallMeBot)**:

1. Agenda el contacto `+34 644 59 71 68`
2. Le manda por WhatsApp: `I allow callmebot to send me messages`
3. Recibe una respuesta con su **API key** (un número)
4. Carga su número (con código de país) y esa API key en la app, y guarda

El backend guarda `whatsapp_telefono`/`whatsapp_apikey` por productor (tabla `config_n8n`) y los manda en el payload del webhook (`whatsapp: { telefono, apikey }`); el nodo **Preparar WhatsApp** arma el mensaje y el `HTTP Request` lo dispara con esos datos. Si un productor no cargó su key todavía, el nodo tiene **On Error: Continue**, así que el workflow no se rompe — simplemente no llega el WhatsApp para ese evento.

> ⚠️ CallMeBot es un servicio no oficial pensado para uso personal/bajo volumen (mensajes de texto plano, sin plantillas). Para producción con muchos productores simultáneos conviene migrar a **WhatsApp Business Cloud API (Meta)**, que requiere verificación de negocio y plantillas aprobadas.

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
  "whatsapp": { "telefono": "+549261...", "apikey": "123456" }
}
```

---

## 📊 Datos de Prueba

Ya no se precargan datos de ejemplo (`demo-data.js` fue retirado): cada cuenta nueva arranca limpia, con un "Lote 1" por defecto, para reflejar el uso real multi-productor. Para probar la app rápido, registrá una cuenta en `login.html` y cargá un par de gastos/ingresos desde las pantallas correspondientes.

La sección "Red de Productores" (`pantalla8.html`) lista alertas y ofertas de intercambio reales vía `GET /api/red/alertas` y `GET /api/red/trueques` — no hay datos de ejemplo; para verla poblada registrá dos cuentas distintas y creá alertas/ofertas desde cada una.

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
| N8N (CallMeBot WhatsApp) | Automatización de workflows y alertas |
| Service Worker | Funcionamiento offline (PWA) |
| LocalStorage | Solo token de sesión y preferencia de tema |
| Manifest.json | Configuración de instalación como app |

---

## 👨‍💻 Equipo

**Materia:** Metodología de Sistemas II  
**Institución:** UTN — Facultad Regional San Rafael  
**Año:** 2025 / 2026

---

## 📜 Licencia

Proyecto académico desarrollado para la materia Metodología de Sistemas II de la UTN FRSR.

---

> *"La tecnología no reemplaza al productor, lo empodera."* — AgroTech 🌾
