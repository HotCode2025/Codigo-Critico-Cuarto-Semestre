# 🐍 Entornos Virtuales en Python — Guía completa

> Clase 8-A · Python en Entorno Profesional · Parte 5
> Tema: **Entorno virtual en Python explicado a fondo** (teoría + práctica)

---

## 📑 Índice

1. [¿Qué es un entorno virtual?](#1-qué-es-un-entorno-virtual)
2. [¿Para qué sirve? El problema que resuelve](#2-para-qué-sirve-el-problema-que-resuelve)
3. [¿Cómo funciona por dentro?](#3-cómo-funciona-por-dentro)
4. [Requisitos previos](#4-requisitos-previos)
5. [Crear un entorno virtual](#5-crear-un-entorno-virtual)
6. [Activar y desactivar el entorno](#6-activar-y-desactivar-el-entorno)
7. [Instalar dependencias con pip](#7-instalar-dependencias-con-pip)
8. [El archivo `requirements.txt`](#8-el-archivo-requirementstxt)
9. [Reproducir el proyecto en otra computadora](#9-reproducir-el-proyecto-en-otra-computadora)
10. [Entorno virtual y Git (`.gitignore`)](#10-entorno-virtual-y-git-gitignore)
11. [Usarlo en VS Code](#11-usarlo-en-vs-code)
12. [Estructura recomendada de un proyecto](#12-estructura-recomendada-de-un-proyecto)
13. [Flujo de trabajo completo (paso a paso)](#13-flujo-de-trabajo-completo-paso-a-paso)
14. [Errores comunes y soluciones](#14-errores-comunes-y-soluciones)
15. [Herramientas alternativas](#15-herramientas-alternativas)
16. [Buenas prácticas](#16-buenas-prácticas)
17. [Chuleta de comandos](#17-chuleta-de-comandos)

---

## 1. ¿Qué es un entorno virtual?

Un **entorno virtual** (*virtual environment* o **venv**) es una **carpeta aislada** que contiene:

- Una copia (o enlace) del **intérprete de Python**.
- Su propio **`pip`** (gestor de paquetes).
- Su propia carpeta **`site-packages`**, donde se instalan las librerías.

Dicho simple: es una **"burbuja"** donde viven las librerías de **un solo proyecto**, sin mezclarse con las de otros proyectos ni con el Python global del sistema.

```
Tu computadora
│
├── Python global (del sistema)
│     └── site-packages/   ← librerías globales (¡mejor no tocar!)
│
├── proyecto_tienda/
│     └── .venv/           ← Django 5.0, Pillow, requests 2.31
│
└── proyecto_datos/
      └── .venv/           ← pandas, numpy, matplotlib, requests 2.25
```

Cada proyecto tiene **sus propias dependencias y sus propias versiones**.

---

## 2. ¿Para qué sirve? El problema que resuelve

### ❌ Sin entorno virtual

Si instalás todo con `pip install` en el Python global:

| Problema | Ejemplo |
|---|---|
| **Conflicto de versiones** | El proyecto A necesita `requests==2.25` y el B `requests==2.31`. Solo puede haber una instalada globalmente → uno de los dos se rompe. |
| **"En mi máquina funciona"** | No sabés exactamente qué librerías (y qué versiones) usa tu proyecto, así que otra persona no puede replicarlo. |
| **Ensuciar el sistema** | Se acumulan cientos de paquetes que ya no usás. En Linux/macOS incluso podés romper herramientas del sistema que dependen de Python. |
| **Permisos** | Instalar globalmente a veces exige `sudo` / administrador. |

### ✅ Con entorno virtual

- **Aislamiento:** cada proyecto tiene sus librerías y versiones exactas.
- **Reproducibilidad:** con un `requirements.txt` cualquiera recrea el mismo entorno.
- **Limpieza:** si algo se rompe, borrás la carpeta `.venv` y la volvés a crear.
- **Sin permisos de administrador:** todo se instala dentro de la carpeta del proyecto.
- **Profesionalismo:** es el estándar en la industria; cualquier proyecto serio lo usa.

> 💡 **Para qué "englobar" las dependencias:** el entorno virtual agrupa *todas* las librerías que tu proyecto necesita en un solo lugar, para que el proyecto sea **autocontenido, portable y predecible**.

---

## 3. ¿Cómo funciona por dentro?

Cuando creás un entorno, Python genera una estructura así:

**Windows**
```
.venv/
├── Include/
├── Lib/
│   └── site-packages/      ← acá se instalan tus librerías
├── Scripts/
│   ├── activate            ← activador (Git Bash)
│   ├── activate.bat        ← activador (CMD)
│   ├── Activate.ps1        ← activador (PowerShell)
│   ├── python.exe
│   └── pip.exe
└── pyvenv.cfg              ← configuración del entorno
```

**Linux / macOS**
```
.venv/
├── bin/
│   ├── activate
│   ├── python -> python3
│   └── pip
├── include/
├── lib/
│   └── python3.X/
│       └── site-packages/
└── pyvenv.cfg
```

### ¿Qué hace "activar"?

Activar el entorno **modifica la variable `PATH`** de tu terminal para que la carpeta `Scripts/` (Windows) o `bin/` (Linux/macOS) del entorno quede **primera**. Entonces, cuando escribís `python` o `pip`, se usan **los del entorno** y no los globales.

El archivo `pyvenv.cfg` indica qué Python "base" se usó para crear el entorno:

```ini
home = C:\Users\usuario\AppData\Local\Programs\Python\Python312
include-system-site-packages = false
version = 3.12.4
```

`include-system-site-packages = false` significa que el entorno **no ve** las librerías globales: está totalmente aislado.

---

## 4. Requisitos previos

Verificá que tenés Python instalado (3.3+ ya incluye `venv`):

```bash
# Windows
python --version
py --version

# Linux / macOS
python3 --version
```

> 🐧 En Debian/Ubuntu puede que necesites instalar el módulo:
> ```bash
> sudo apt install python3-venv
> ```

---

## 5. Crear un entorno virtual

Ubicate en la carpeta de tu proyecto y ejecutá:

```bash
# Windows
python -m venv .venv

# Linux / macOS
python3 -m venv .venv
```

Desglose del comando:

| Parte | Significado |
|---|---|
| `python` | El intérprete con el que se crea el entorno (define la versión de Python). |
| `-m venv` | Ejecuta el módulo `venv` de la librería estándar. |
| `.venv` | Nombre de la carpeta del entorno. `.venv` es la convención más usada (también se ve `venv` o `env`). |

### Elegir una versión específica de Python (Windows)

Si tenés varias versiones instaladas:

```bash
py -3.12 -m venv .venv
py -3.11 -m venv .venv
py --list          # muestra las versiones instaladas
```

---

## 6. Activar y desactivar el entorno

### Activar

| Sistema / Terminal | Comando |
|---|---|
| Windows – **CMD** | `.venv\Scripts\activate.bat` |
| Windows – **PowerShell** | `.venv\Scripts\Activate.ps1` |
| Windows – **Git Bash** | `source .venv/Scripts/activate` |
| **Linux / macOS** (bash/zsh) | `source .venv/bin/activate` |

Cuando está activo, el prompt muestra el nombre del entorno:

```
(.venv) C:\proyectos\mi_app>
```

### Verificar que estás usando el Python del entorno

```bash
# Windows
where python

# Linux / macOS
which python
```

La primera ruta debe apuntar a la carpeta `.venv`. También podés hacerlo desde Python:

```python
import sys
print(sys.prefix)       # ruta del entorno activo
print(sys.executable)   # ruta del intérprete en uso
```

### Desactivar

```bash
deactivate
```

### Eliminar un entorno

No hay comando especial: simplemente **borrás la carpeta**.

```bash
# Windows (PowerShell)
Remove-Item -Recurse -Force .venv

# Linux / macOS
rm -rf .venv
```

---

## 7. Instalar dependencias con pip

Con el entorno **activado**:

```bash
# Actualizar pip (recomendado al crear el entorno)
python -m pip install --upgrade pip

# Instalar un paquete
pip install requests

# Instalar una versión exacta
pip install requests==2.31.0

# Instalar con rango de versiones
pip install "django>=5.0,<6.0"

# Instalar varios a la vez
pip install pandas numpy matplotlib

# Ver lo instalado
pip list

# Ver detalle de un paquete (versión, dependencias, ubicación)
pip show requests

# Desinstalar
pip uninstall requests
```

> 💡 **Tip:** usar `python -m pip ...` en vez de `pip ...` garantiza que el `pip` corresponde al Python que estás usando. Es la forma más segura.

---

## 8. El archivo `requirements.txt`

Es el archivo que **"engloba" todas las dependencias** del proyecto. Es la "lista de compras" que le dice a cualquiera qué instalar para que tu proyecto funcione.

### Generarlo automáticamente

```bash
pip freeze > requirements.txt
```

`pip freeze` lista **todos** los paquetes instalados en el entorno con su versión exacta:

```txt
certifi==2024.7.4
charset-normalizer==3.3.2
idna==3.7
requests==2.32.3
urllib3==2.2.2
```

### Escribirlo a mano (alternativa más limpia)

Muchos equipos prefieren listar solo las dependencias **directas** (las que vos instalaste a propósito), sin las sub-dependencias:

```txt
# requirements.txt
requests>=2.31,<3.0
pandas==2.2.2
python-dotenv
```

### Operadores de versión

| Operador | Significado | Ejemplo |
|---|---|---|
| `==` | Versión exacta | `pandas==2.2.2` |
| `>=` | Mayor o igual | `requests>=2.31` |
| `<` / `<=` | Menor / menor o igual | `django<6.0` |
| `~=` | Compatible (misma versión "menor") | `flask~=3.0` → `>=3.0, <4.0` |
| `!=` | Excluir una versión | `numpy!=1.25.0` |

### Separar dependencias de desarrollo

Para herramientas que solo usás al programar (tests, linters, formateadores):

```txt
# requirements-dev.txt
-r requirements.txt      # incluye las de producción
pytest
black
ruff
```

```bash
pip install -r requirements-dev.txt
```

---

## 9. Reproducir el proyecto en otra computadora

Este es el objetivo final de todo: que **otra persona (o vos en otra PC)** pueda levantar el proyecto idéntico.

```bash
# 1. Clonar el proyecto
git clone https://github.com/usuario/mi_proyecto.git
cd mi_proyecto

# 2. Crear el entorno
python -m venv .venv

# 3. Activarlo
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux / macOS

# 4. Instalar todas las dependencias de una vez
pip install -r requirements.txt

# 5. ¡Listo! Ejecutar
python main.py
```

---

## 10. Entorno virtual y Git (`.gitignore`)

⚠️ **La carpeta `.venv` NUNCA se sube al repositorio.**

Motivos:
- Pesa mucho (cientos de MB).
- Contiene rutas absolutas de **tu** máquina → no funciona en otra.
- Depende del sistema operativo (un venv de Windows no sirve en Linux).

Lo que **sí** se sube es el `requirements.txt`.

```gitignore
# .gitignore

# Entornos virtuales
.venv/
venv/
env/

# Caché de Python
__pycache__/
*.pyc

# Variables de entorno (claves, contraseñas)
.env
```

> 🧠 Regla de oro: **se versiona la receta (`requirements.txt`), no la torta (`.venv`).**

---

## 11. Usarlo en VS Code

1. Abrí la carpeta del proyecto en VS Code.
2. Presioná `Ctrl + Shift + P` → **"Python: Select Interpreter"**.
3. Elegí el que dice `.venv` (por ejemplo `Python 3.12 ('.venv': venv)`).
4. Abrí una terminal nueva (`Ctrl + ñ` o `` Ctrl + ` ``): VS Code activa el entorno automáticamente.

VS Code también detecta la carpeta `.venv` sola y suele preguntarte si querés usarla.

Opcional — fijarlo en la configuración del proyecto (`.vscode/settings.json`):

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/Scripts/python.exe"
}
```
*(En Linux/macOS: `${workspaceFolder}/.venv/bin/python`)*

---

## 12. Estructura recomendada de un proyecto

```
mi_proyecto/
├── .venv/                  ← entorno virtual (ignorado por Git)
├── src/
│   └── mi_proyecto/
│       ├── __init__.py
│       └── main.py
├── tests/
│   └── test_main.py
├── .env                    ← variables secretas (ignorado por Git)
├── .gitignore
├── requirements.txt        ← dependencias de producción
├── requirements-dev.txt    ← dependencias de desarrollo
└── README.md
```

---

## 13. Flujo de trabajo completo (paso a paso)

```bash
# 1. Crear la carpeta del proyecto
mkdir mi_proyecto
cd mi_proyecto

# 2. Crear el entorno virtual
python -m venv .venv

# 3. Activarlo
.venv\Scripts\activate              # Windows
# source .venv/bin/activate         # Linux / macOS

# 4. Actualizar pip
python -m pip install --upgrade pip

# 5. Instalar lo que necesita el proyecto
pip install requests python-dotenv

# 6. Guardar las dependencias
pip freeze > requirements.txt

# 7. Crear el .gitignore
echo .venv/ > .gitignore

# 8. Programar...
python main.py

# 9. Cada vez que instales algo nuevo → actualizar requirements.txt
pip install pandas
pip freeze > requirements.txt

# 10. Al terminar
deactivate
```

### Ejemplo de prueba (`main.py`)

```python
import sys
import requests

print("Python en uso:", sys.executable)

respuesta = requests.get("https://api.github.com")
print("Código de estado:", respuesta.status_code)
```

Si lo ejecutás **sin** activar el entorno y `requests` no está instalado globalmente, vas a ver `ModuleNotFoundError`. Con el entorno activado, funciona. Esa es la prueba del aislamiento.

---

## 14. Errores comunes y soluciones

### 🔴 PowerShell: "la ejecución de scripts está deshabilitada en este sistema"

Windows bloquea `Activate.ps1` por política de seguridad. Solución (solo para tu usuario):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

O usá CMD con `.venv\Scripts\activate.bat`.

### 🔴 `ModuleNotFoundError: No module named 'xxx'`

- ¿Activaste el entorno? Mirá si aparece `(.venv)` en el prompt.
- ¿VS Code tiene seleccionado el intérprete del `.venv`?
- ¿Instalaste el paquete **con el entorno activo**?

### 🔴 `'python' no se reconoce como un comando`

Python no está en el `PATH`. Reinstalalo marcando **"Add Python to PATH"**, o usá el lanzador `py`.

### 🔴 `error: externally-managed-environment` (Linux / macOS reciente)

El sistema no te deja instalar paquetes globalmente con pip. **Justamente la solución es usar un entorno virtual**:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install lo_que_necesites
```

### 🔴 Moví o renombré la carpeta del proyecto y el entorno dejó de funcionar

Los entornos guardan rutas absolutas, así que **no son movibles**. Borrá `.venv` y recrealo:

```bash
rm -rf .venv                      # o borrarla desde el explorador
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

---

## 15. Herramientas alternativas

`venv` viene incluido en Python y es lo que hay que dominar primero. Existen otras herramientas que construyen sobre la misma idea:

| Herramienta | Qué aporta | Cuándo usarla |
|---|---|---|
| **venv** | Incluido en Python, simple y estándar. | Siempre como base. ✅ |
| **virtualenv** | Precursor de `venv`, algo más rápido y con más opciones. | Proyectos legacy o Python 2. |
| **pipenv** | Une venv + pip, usa `Pipfile` y `Pipfile.lock`. | Proyectos que quieren lockfile automático. |
| **poetry** | Gestiona dependencias, versiones y publicación de paquetes con `pyproject.toml`. | Librerías y proyectos profesionales grandes. |
| **uv** | Gestor ultra rápido (escrito en Rust) que reemplaza pip + venv. | Cuando la velocidad importa; cada vez más popular. |
| **conda** | Maneja también paquetes no-Python (C, CUDA, etc.). | Ciencia de datos y machine learning. |

Ejemplo con **uv**, para comparar:

```bash
uv venv                          # crea .venv
uv pip install requests          # instala (muy rápido)
uv pip freeze > requirements.txt
```

---

## 16. Buenas prácticas

- ✅ **Un entorno virtual por proyecto**, siempre.
- ✅ Crearlo **dentro** de la carpeta del proyecto con el nombre `.venv`.
- ✅ Agregar `.venv/` al `.gitignore` **desde el primer commit**.
- ✅ Mantener el `requirements.txt` **actualizado** cada vez que instalás o quitás algo.
- ✅ **Fijar versiones** (`==`) en proyectos que van a producción.
- ✅ Separar dependencias de **producción** y de **desarrollo**.
- ✅ Usar `python -m pip` para evitar confusiones de intérprete.
- ❌ No instalar paquetes en el Python global.
- ❌ No editar archivos dentro de `.venv` a mano.
- ❌ No mover ni copiar la carpeta `.venv` entre equipos: recreala.

---

## 17. Chuleta de comandos

| Acción | Windows | Linux / macOS |
|---|---|---|
| Crear entorno | `python -m venv .venv` | `python3 -m venv .venv` |
| Activar (CMD) | `.venv\Scripts\activate.bat` | — |
| Activar (PowerShell) | `.venv\Scripts\Activate.ps1` | — |
| Activar (bash/zsh) | `source .venv/Scripts/activate` | `source .venv/bin/activate` |
| Desactivar | `deactivate` | `deactivate` |
| Actualizar pip | `python -m pip install --upgrade pip` | ídem |
| Instalar paquete | `pip install paquete` | ídem |
| Listar paquetes | `pip list` | ídem |
| Guardar dependencias | `pip freeze > requirements.txt` | ídem |
| Instalar desde archivo | `pip install -r requirements.txt` | ídem |
| Ver intérprete activo | `where python` | `which python` |
| Eliminar entorno | `Remove-Item -Recurse -Force .venv` | `rm -rf .venv` |

---

## 📌 Resumen en una frase

> Un **entorno virtual** es una carpeta aislada con su propio Python y sus propias librerías, que permite **englobar todas las dependencias de un proyecto** para que no choquen con otros proyectos y para que cualquiera pueda **reproducirlo exactamente** con un simple `pip install -r requirements.txt`.
