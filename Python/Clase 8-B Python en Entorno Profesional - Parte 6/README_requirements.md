# 📦 El archivo `requirements.txt` en Python

> Clase 8-B · Python en Entorno Profesional · Parte 6
> Clase del lunes 19 de octubre de 2026 · Semana 11
> Tema 11.1: **Comenzamos a entender el trabajo con el archivo `requirements.txt`**

---

## 📑 Índice

1. [¿Qué es `requirements.txt`?](#1-qué-es-requirementstxt)
2. [¿Por qué es necesario?](#2-por-qué-es-necesario)
3. [Relación con el entorno virtual](#3-relación-con-el-entorno-virtual)
4. [Cómo se ve el archivo por dentro](#4-cómo-se-ve-el-archivo-por-dentro)
5. [Cómo generarlo](#5-cómo-generarlo)
6. [Comandos para que alguien contribuya al proyecto](#6-comandos-para-que-alguien-contribuya-al-proyecto)
7. [Explicación de cada comando](#7-explicación-de-cada-comando)
8. [Ejemplo práctico con la librería `requests`](#8-ejemplo-práctico-con-la-librería-requests)
9. [Qué se sube a GitHub y qué no](#9-qué-se-sube-a-github-y-qué-no)
10. [Errores frecuentes](#10-errores-frecuentes)
11. [Resumen](#11-resumen)

---

## 1. ¿Qué es `requirements.txt`?

Es un **archivo de texto plano** ubicado en la raíz del proyecto que **gestiona todas las dependencias** (librerías externas) que el proyecto necesita y **en qué versiones** se necesitan.

Es como la **receta** del proyecto: no contiene las librerías, sino la **lista** de lo que hay que instalar para que el código funcione.

---

## 2. ¿Por qué es necesario?

Cuando alguien clona tu repositorio, recibe tu código, pero **no** las librerías que instalaste con `pip`. Sin `requirements.txt`, esa persona tendría que adivinar qué paquetes usaste y en qué versión.

Con el archivo, alcanza **un solo comando** para instalar todo:

```sh
pip3 install -r requirements.txt
```

Beneficios:

- ✅ **Reproducibilidad:** todos trabajan con las mismas versiones.
- ✅ **Colaboración:** cualquier persona puede contribuir al proyecto rápidamente.
- ✅ **Despliegue:** los servidores (producción, Docker, CI/CD) instalan exactamente lo mismo.
- ✅ **Documentación:** a simple vista se sabe de qué depende el proyecto.

---

## 3. Relación con el entorno virtual

Los dos trabajan juntos:

| Elemento | Qué es | ¿Se sube a GitHub? |
|---|---|---|
| **Entorno virtual** (`env/` o `.venv/`) | Carpeta con Python y las librerías **instaladas** | ❌ No |
| **`requirements.txt`** | **Lista** de las librerías que hay que instalar | ✅ Sí |

> 🧠 Se comparte la **receta** (`requirements.txt`), no la **cocina** (`env/`). Cada persona crea su propio entorno virtual y lo llena usando la receta.

---

## 4. Cómo se ve el archivo por dentro

Una librería por línea, normalmente con su versión:

```txt
certifi==2024.8.30
charset-normalizer==3.4.0
idna==3.10
requests==2.32.3
urllib3==2.2.3
```

### Operadores de versión

| Operador | Significado | Ejemplo |
|---|---|---|
| `==` | Versión exacta | `requests==2.32.3` |
| `>=` | Igual o mayor | `requests>=2.31` |
| `<` | Menor que | `django<6.0` |
| `~=` | Compatible | `flask~=3.0` (≥ 3.0 y < 4.0) |
| *(sin versión)* | La última disponible | `requests` |

> 💡 En proyectos profesionales se recomienda **fijar versiones exactas** (`==`) para evitar que una actualización rompa el código.

---

## 5. Cómo generarlo

Con el entorno virtual **activado** y las librerías ya instaladas:

```sh
pip3 freeze > requirements.txt
```

- `pip3 freeze` → lista todos los paquetes instalados en el entorno con su versión.
- `>` → redirige esa salida a un archivo (lo crea o lo sobrescribe).

⚠️ **Cada vez que instales o desinstales una librería**, volvé a ejecutar este comando para mantener el archivo actualizado.

---

## 6. Comandos para que alguien contribuya al proyecto

Estos son los pasos que debe seguir cualquier persona que quiera **descargar y ejecutar** el proyecto:

```sh
git clone https://github.com/usuario/repositorio.git  # Clonamos el repositorio
cd app                                  # Entramos a la carpeta del proyecto
python3 -m venv env                     # Creamos el entorno virtual (no se comparte desde GitHub)
source env/bin/activate                 # Activamos el entorno en Linux / macOS
env\Scripts\activate                    # Activamos el entorno en Windows
pip3 install -r requirements.txt        # Instalamos todas las dependencias
python3 main.py                         # Ejecutamos el programa
```

> 📝 **Dos correcciones respecto a lo escrito en el video:**
> - En Windows la ruta es `env\Scripts\activate` (con el nombre del entorno, `env`, y **`Scripts` en plural**), no `venv/Script/activate`.
> - La opción `-r` **no** significa "reutilizar": es la forma corta de `--requirement`, e indica que pip debe **leer la lista de paquetes desde un archivo**.

---

## 7. Explicación de cada comando

| Comando | Qué hace |
|---|---|
| `git clone <url>` | Descarga una copia del repositorio a tu computadora. |
| `cd app` | Se mueve a la carpeta del proyecto. |
| `python3 -m venv env` | Crea un entorno virtual en la carpeta `env`. Se crea **en cada máquina**, porque no viaja en el repositorio. |
| `source env/bin/activate` | Activa el entorno en Linux / macOS / WSL. Aparece `(env)` en la terminal. |
| `env\Scripts\activate` | Activa el entorno en Windows (CMD). En PowerShell: `env\Scripts\Activate.ps1`. |
| `pip3 install -r requirements.txt` | Lee el archivo e instala todas las librerías con sus versiones. |
| `python3 main.py` | Ejecuta el programa, ya con todas las dependencias disponibles. |
| `deactivate` | Sale del entorno virtual cuando terminás. |

> 💡 En Windows normalmente se usa `python` y `pip` en lugar de `python3` y `pip3`.

---

## 8. Ejemplo práctico con la librería `requests`

*(Relacionado con el tema 11.3 de la clase)*

```sh
# 1. Crear y activar el entorno
python3 -m venv env
source env/bin/activate

# 2. Instalar la librería
pip3 install requests

# 3. Guardar las dependencias
pip3 freeze > requirements.txt
```

`main.py`:

```python
import requests

respuesta = requests.get("https://api.github.com")
print("Código de estado:", respuesta.status_code)
print("Tipo de contenido:", respuesta.headers["content-type"])
```

```sh
# 4. Ejecutar
python3 main.py
```

Fijate que, aunque instalaste **solo** `requests`, el `requirements.txt` incluye también `certifi`, `idna`, `urllib3` y `charset-normalizer`: son **sub-dependencias** que `requests` necesita para funcionar, y `pip freeze` las registra todas.

---

## 9. Qué se sube a GitHub y qué no

`.gitignore`:

```gitignore
# Entorno virtual
env/
venv/
.venv/

# Caché de Python
__pycache__/
*.pyc
```

Luego se commitea el trabajo:

```sh
git add requirements.txt main.py README.md .gitignore
git commit -m "Agrega requirements.txt y proyecto con requests"
git push
```

| Archivo / carpeta | ¿Se sube? |
|---|---|
| `requirements.txt` | ✅ Sí |
| `main.py` y código fuente | ✅ Sí |
| `README.md` | ✅ Sí |
| `.gitignore` | ✅ Sí |
| `env/` (entorno virtual) | ❌ No |
| `__pycache__/` | ❌ No |

---

## 10. Errores frecuentes

| Problema | Causa | Solución |
|---|---|---|
| `requirements.txt` sale lleno de paquetes que no uso | Ejecutaste `pip freeze` **sin** el entorno activado (listó el Python global) | Activá el entorno y volvé a generarlo |
| `ModuleNotFoundError` | El entorno no está activado o no instalaste las dependencias | Activá el entorno y ejecutá `pip3 install -r requirements.txt` |
| `No such file or directory: 'requirements.txt'` | No estás en la carpeta del proyecto | Hacé `cd` a la carpeta correcta |
| PowerShell no deja activar el entorno | Política de ejecución de scripts | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Subiste la carpeta `env/` a GitHub | Faltaba el `.gitignore` | Agregá `env/` al `.gitignore` y ejecutá `git rm -r --cached env` |

---

## 11. Resumen

1. **`requirements.txt`** lista todas las dependencias del proyecto y sus versiones.
2. Se genera con **`pip3 freeze > requirements.txt`** (con el entorno activado).
3. Se instala con **`pip3 install -r requirements.txt`** (`-r` = leer desde archivo).
4. El **entorno virtual no se sube** a GitHub; el `requirements.txt` **sí**.
5. Flujo para colaborar: **clonar → crear entorno → activar → instalar dependencias → ejecutar**.
