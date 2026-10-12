# Tienda de Libros (Spring Boot + Swing)

Aplicación de escritorio para administrar libros (agregar, modificar y eliminar), hecha con Spring Boot, Swing y MySQL.

La base de datos se levanta con **Docker**, así no hace falta instalar MySQL. La primera vez se carga con los mismos libros del proyecto original.

---

## 1. Requisitos (se instalan una sola vez)

| Programa | Para qué se usa |
|---|---|
| **Docker** | Levantar la base de datos MySQL. En Windows y Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop/), y tiene que estar **abierto** mientras lo usan. En Linux: Docker Engine. |
| **IntelliJ IDEA** | Ejecutar la aplicación. Es necesario porque el formulario está hecho con su diseñador (`.form`). |
| **Java 17** o superior | Lo usa la aplicación. |
| **Git** | Clonar el repositorio. |

No hace falta instalar MySQL.

Para comprobar que Docker está instalado:

```bash
docker --version
```

```bash
docker compose version
```

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre.git
```

Entrar a la carpeta del proyecto (todos los comandos de Docker se ejecutan desde acá):

```bash
cd "Codigo-Critico-Cuarto-Semestre/Java/Clase 06A TiendaLibros SpringSwing/tienda_libros"
```

---

## 3. Levantar la base de datos

```bash
docker compose up -d
```

La primera vez tarda un poco: descarga MySQL 8, crea la base `tienda_libros_db` y carga los libros desde `docker/init/tienda_libros_db.sql`.

Comprobar que está corriendo:

```bash
docker compose ps
```

Tiene que aparecer `mysql-tienda-libros` con estado **running** (o **Up**).

Si quieren ver si MySQL ya terminó de arrancar:

```bash
docker compose logs mysql
```

Cuando aparece `ready for connections`, ya se puede usar. Para salir de los logs: **Ctrl + C**.

---

## 4. Ejecutar la aplicación

1. Abrir la carpeta `tienda_libros` en **IntelliJ IDEA**.
2. Esperar a que descargue las dependencias de Maven.
3. Ejecutar `src/main/java/utn/tienda_libros/TiendaLibrosApplication.java` (botón ▶).

Se abre la ventana **Tienda de Libros** con la lista de libros.

No hace falta configurar nada: la contraseña de la base ya está en el archivo `.env` y coincide con `src/main/resources/application.properties`.

---

## 5. Cuando terminan de usarla

Detener la base de datos (los libros se guardan):

```bash
docker compose stop
```

La próxima vez la vuelven a arrancar con:

```bash
docker compose up -d
```

---

## Resumen de comandos

| Qué quiero hacer | Comando |
|---|---|
| Levantar la base | `docker compose up -d` |
| Ver si está corriendo | `docker compose ps` |
| Ver los mensajes de MySQL | `docker compose logs mysql` |
| Detener la base | `docker compose stop` |
| Volver a los libros originales (borra los cambios) | `docker compose down -v` y después `docker compose up -d` |

---

## Problemas comunes

**`port is already allocated` o el puerto 3306 está ocupado**
Ya tienen MySQL instalado y corriendo en su máquina. Deténganlo y vuelvan a ejecutar `docker compose up -d`.
- Linux: `sudo systemctl stop mysql`
- Windows: abrir **Servicios**, buscar **MySQL** y elegir **Detener**.

**`permission denied` al ejecutar docker (Linux)**
Ejecutar el comando con `sudo` adelante, por ejemplo `sudo docker compose up -d`.

**`Cannot connect to the Docker daemon`**
Docker no está abierto. Abran Docker Desktop (o en Linux: `sudo systemctl start docker`) y prueben de nuevo.

**`no configuration file provided: not found`**
No están en la carpeta correcta. Tienen que estar dentro de `tienda_libros`, donde está el archivo `docker-compose.yml`.

**La aplicación no se conecta a la base (`Communications link failure`)**
MySQL todavía está arrancando. Esperen unos segundos, revisen con `docker compose logs mysql` que diga `ready for connections` y vuelvan a ejecutar la aplicación.

**Quieren empezar de cero con los libros originales**

```bash
docker compose down -v
```

```bash
docker compose up -d
```
