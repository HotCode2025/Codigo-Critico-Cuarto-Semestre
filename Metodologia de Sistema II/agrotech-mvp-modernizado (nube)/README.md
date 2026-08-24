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
7. [Integración N8N](#-integración-n8n)
8. [Datos de Prueba](#-datos-de-prueba)
9. [Tecnologías](#-tecnologías)
10. [Equipo](#-equipo)

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
├── index.html          # Dashboard principal
├── pantalla2.html      # Carga de Gastos
├── pantalla3.html      # Registro de Ingresos
├── pantalla4.html      # Estado de Resultados
├── pantalla5.html      # Inversiones en ONs
├── pantalla6.html      # Integración N8N
├── pantalla7.html      # Configuración
├── pantalla8.html      # Red de Productores (componente social)
├── styles.css          # Estilos modernos (glassmorphism, dark mode)
├── shared.js           # Motor central de datos y lógica
├── demo-data.js        # Datos de prueba
├── manifest.json       # Configuración PWA
├── sw.js               # Service Worker (offline)
└── icons/
    ├── icon-192.png    # Icono PWA (192x192)
    └── icon-512.png    # Icono PWA (512x512)
```

---

## 🚀 Cómo usar

### Opción 1: Abrir directamente
1. Descomprimí el ZIP
2. Abrí `index.html` en cualquier navegador
3. Los datos de prueba se cargan automáticamente

### Opción 2: Servidor local (recomendado)
```bash
cd agrotech-mvp
python -m http.server 8000
# O con Node:
npx serve .
```
Luego abrí `http://localhost:8000`

### Opción 3: Instalar como PWA
1. Abrí en Chrome/Edge/Safari
2. Apretá "Agregar a pantalla de inicio"
3. ¡Listo! Funciona offline

---

## 🤖 Integración N8N

1. Instalá N8N (local o [n8n.io](https://n8n.io))
2. Creá un Workflow nuevo
3. Agregá un nodo **Webhook** (método POST)
4. Copiá la URL del webhook
5. Andá a `pantalla6.html` → activá el toggle → pegá la URL
6. Probá con "Enviar Evento de Prueba"

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
  "notificacion": "whatsapp"
}
```

---

## 📊 Datos de Prueba Incluidos

| Concepto | Valor |
|----------|-------|
| Ingresos Duraznos | $2.850.000 |
| Ingresos Vid | $4.200.000 |
| Ingresos Olivos | $950.000 |
| Gastos Duraznos | $1.620.000 |
| Gastos Vid | $2.380.000 |
| Gastos Olivos | $580.000 |
| Inversiones ONs | $850.000 |
| Cheques en cartera | 3 documentos |
| Gastos programados | 4 eventos |
| Productores en la red | 12 |
| Alertas activas | 3 |
| Ofertas de trueque | 2 |

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|-----------|-----|
| HTML5 + CSS3 | Maquetado responsive, glassmorphism, PWA |
| Vanilla JavaScript | Lógica de negocio, manejo de estado local |
| Chart.js | Gráficos de flujo de caja y métricas |
| N8N | Automatización de workflows y notificaciones |
| Service Worker | Funcionamiento offline (PWA) |
| LocalStorage | Persistencia de datos en el navegador |
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
