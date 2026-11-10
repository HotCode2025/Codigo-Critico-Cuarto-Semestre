# Repositorio del Equipo: Código Crítico 🚀

¡Bienvenid@s al repositorio oficial del equipo **Código Crítico** para el proyecto del Cuarto Semestre!

Este espacio es nuestra base de operaciones. Seguir las reglas y el flujo de trabajo establecidos es fundamental para mantener el orden, evitar conflictos y asegurar que colaboremos de manera eficiente.

---

## 📦 Entregas del Semestre

✅ **Semestre cerrado:** los 6 milestones están completos y todo quedó integrado en `main`. Versión final: [`v1.0.0`](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases/tag/v1.0.0).

- 📚 **[Wiki del equipo](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki)**: índice de carpetas e issues por área, el [equipo y la forma de trabajo](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki/Equipo) y el [flujo de trabajo con Git](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki/Flujo-de-trabajo-Git).
- 🏷️ **[Releases](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases)**: una por cada área entregada.

| Área | Wiki | Release |
| :--- | :--- | :--- |
| Python | [Python](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki/Python) | [`v1.0-python`](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases/tag/v1.0-python) |
| Java | [Java](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki/Java) | [`v1.0-java`](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases/tag/v1.0-java) |
| JavaScript | [JavaScript](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki/JavaScript) | [`v1.0-javascript`](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases/tag/v1.0-javascript) |
| Node.js | [Node](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki/Node) | [`v1.0-node`](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases/tag/v1.0-node) |
| Juego AVATAR | [Juego AVATAR](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki/Juego-Avatar) | [`v1.0-juego-avatar`](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases/tag/v1.0-juego-avatar) |
| Quiz | [Quiz](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/wiki/Quiz) | [`v1.0-quiz`](https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/releases/tag/v1.0-quiz) |

---

## 📜 Reglas de Oro (Innegociables)

> **1. La rama `main` es MUY IMPORTANTE.**
> Nadie, bajo ninguna circunstancia, debe subir cambios (`push`) directamente a la rama `main`. Esta rama solo debe contener versiones estables y probadas del proyecto. Todo el trabajo se realiza en ramas individuales.
>
> **2. SINCRONIZA antes de trabajar y ANTES de subir.**
> Para evitar conflictos y trabajar siempre sobre la última versión del código, haz `pull` de la rama `main` antes de empezar a programar y antes de subir tus propios cambios.

---

## Workflow de Desarrollo 💻

Este es el ciclo de trabajo que todos debemos seguir.

### 1. Configuración Inicial (Solo la primera vez)

Si es tu primera vez trabajando en este proyecto, sigue estos pasos para configurar tu entorno local.

``` bash
### 1. Clona el repositorio en una carpeta específica
git clone https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre

### 2. Entra en el directorio del proyecto
cd Codigo-Critico-Cuarto-Semestre

### 3. Crea y muévete a tu propia rama de trabajo. ¡Usa tu nombre o un identificador claro!
git checkout -b rama_tu_nombre
```

¡Listo! Ya tienes tu copia del proyecto y tu propia rama para trabajar sin afectar a los demás.

### 2. Ciclo de Trabajo Diario

Cada vez que vayas a trabajar en el proyecto, sigue estos pasos:

``` bash
### 1. Asegúrate de estar en tu rama
git checkout rama_tu_nombre

### 2. Trae los últimos cambios de la rama principal para evitar conflictos
git pull origin main

### 3. ¡A programar! Haz tus cambios, crea archivos, etc.

###    ... (aquí va tu magia) ...

### 4. Agrega tus cambios para que Git los rastree
git add .

### 5. Confirma los cambios con un mensaje DESCRIPTIVO
###    Mal mensaje: "cambios"
###    Buen mensaje: "feat: "Se realiza clase 3 de Programacion II Miercoles todos los ejercicios"

git commit -m "Un mensaje que explique claramente lo que hiciste"

### 6. Sube tus cambios a tu rama remota en el repositorio
git push origin rama_tu_nombre 
```

### 3. Integrar tus Cambios a `main` (Pull Request)

Cuando termines una tarea y quieras que tu código forme parte del proyecto principal, debes crear un **Pull Request** (PR).

1.  Ve a la página del repositorio en GitHub.
2.  Verás un aviso para "Compare & pull request" desde tu rama. Haz clic ahí.
3.  Escribe un título y una descripción clara de los cambios que realizaste.
4.  Asigna a uno o más compañeros de equipo como "Reviewers" (revisores).
5.  Una vez que tu PR sea revisado y aprobado, se podrá fusionar (`merge`) con la rama `main`.

---

## 🧰 Comandos Útiles

### Git

| Comando | Descripción |
| :--- | :--- |
| `git status` | Muestra el estado de tus archivos y cambios pendientes. |
| `git branch -a` | Lista todas las ramas (locales y remotas). |
| `git checkout nombre_rama`| Cambia a otra rama existente. |
| `git log` | Muestra el historial de commits. |

### Terminal (Manejo de Archivos)

| Comando | Descripción |
| :--- | :--- |
| `mkdir nombre_carpeta` | Crea una nueva carpeta. |
| `cd nombre_carpeta` | Entra en una carpeta. |
| `cd ..` | Vuelve al directorio anterior. |
| `ls` o `dir` | Lista los archivos y carpetas del directorio actual. |
| `rm archivo.txt` | Elimina un archivo. |
| `rm -rf nombre_carpeta`| ⚠️ **¡CUIDADO!** Elimina una carpeta y todo su contenido de forma permanente. |

---
  
¡A programar y a romperla, equipo! 💪
