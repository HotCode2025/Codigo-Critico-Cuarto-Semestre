# 🌾 AgroTech MVP v2.0

**Metodología de Sistemas II — UTN FRSR 2025/2026**

Sistema de gestión financiera agrícola con integración N8N para automatización de workflows.

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

1. Instalá N8N (local o n8n.io)
2. Creá un Workflow nuevo
3. Agregá un nodo **Webhook** (método POST)
4. Copiá la URL del webhook
5. Andá a `pantalla6.html` → activá el toggle → pegá la URL
6. Probá con "Enviar Evento de Prueba"

### Payload que envía AgroTech:
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

---

## ✨ Características

- 🎨 **Glassmorphism + Dark Mode**
- 📱 **Diseño mobile-first** con navbar inferior
- 📊 **Gráficos interactivos** con Chart.js
- 🤖 **Webhook N8N** con test de conexión
- 💾 **Exportar CSV/JSON**
- 📥 **Importar backup**
- 📴 **Funciona offline** (PWA)
- 🔔 **Alertas de liquidez** con proyección
- 💰 **Simulador de inversiones** en ONs
- 🔒 **Validación de auditoría** en ingresos

---

## 👨‍💻 Autor

Materia: Metodología de Sistemas II  
Institución: UTN — Facultad Regional San Rafael  
Año: 2025 / 2026
