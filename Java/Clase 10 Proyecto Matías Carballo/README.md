# ToDo API (Spring Boot + MySQL)

Clase 10 – Proyecto Matías Carballo, Parte 1.

API REST para gestionar tareas (crear, listar, marcar como realizadas y eliminar), hecha con Spring Boot y MySQL. Incluye un frontend simple en HTML, CSS y JavaScript que consume la API.

Es la base de un proyecto más grande: la idea es seguir ampliándolo hacia una e-commerce.

---

## 1. Requisitos

| Programa | Para qué se usa |
|---|---|
| **Java 17** | Lo usa la aplicación. |
| **IntelliJ IDEA** | Ejecutar el backend. |
| **MySQL** | Base de datos. Tiene que estar corriendo en `localhost:3306`. |
| **Git** | Clonar el repositorio. |
| **VS Code + Live Server** (opcional) | Abrir el frontend. |

---

## 2. Estructura

```
Clase 10 Proyecto Matías Carballo/
├── Back/ToDo API/            → API REST con Spring Boot
├── Front/                    → Página en HTML, CSS y JavaScript
├── db_todo_api.sql           → Script de la base de datos (opcional)
└── Tasks.postman_collection.json → Pruebas de la API en Postman
```

---

## 3. Temas de la clase

### 11.2 – El archivo `pom.xml`

Versiones: **Spring Boot 3.0.2** y **Java 17**.

| Dependencia | Para qué se usa |
|---|---|
| `spring-boot-starter-web` | Crear la API REST (controladores, Tomcat embebido). |
| `spring-boot-starter-data-jpa` | Guardar y leer datos con JPA / Hibernate. |
| `mysql-connector-j` | Conectarse a MySQL. |
| `lombok` | Evitar escribir getters, setters y constructores. |
| `jakarta.validation-api` + `hibernate-validator` | Validar los datos que llegan a la API. |
| `spring-boot-starter-test` | Pruebas. |
| `springdoc-openapi-starter-webmvc-ui` | Documentación con Swagger. |
| `spring-boot-devtools` | Reinicio automático al guardar cambios. |

### 11.3 – `application.yml` con variables de entorno

El usuario y la clave de la base de datos **no se escriben en el archivo**, para que no queden subidos al repositorio. Se leen de variables de entorno:

```yaml
datasource:
  username: ${DB_USER}
  password: ${DB_PASS}
  url: "jdbc:mysql://localhost:3306/db_todo_api?createDatabaseIfNotExist=true"
```

Con `createDatabaseIfNotExist=true` y `ddl-auto: update`, la base `db_todo_api` y la tabla `task` se crean solas la primera vez que se ejecuta.

### 11.4 – Patrones de diseño utilizados

El proyecto está organizado en capas. Cada una solo habla con la siguiente:

```
Controller  →  Service  →  Repository  →  MySQL
    ↑             ↓
   DTO   ←    Mapper
```

| Paquete | Qué hace |
|---|---|
| `controller` | Recibe las peticiones HTTP y responde. Solo habla con el servicio. |
| `service` | Lógica de negocio. Se usa una interfaz (`ITaskService`) y su implementación (`TaskService`). |
| `repository` | Acceso a la base de datos. |
| `model/entity` | La entidad `Task` que se guarda en la tabla. |
| `model/dto` | Objetos de entrada (`TaskRequestDTO`) y salida (`TaskResponseDTO`), para no exponer la entidad. |
| `model/mapper` | Convierte entre entidad y DTO. |
| `exceptions` | Manejo centralizado de errores. |
| `context` | Configuración de CORS y de Swagger. |

Además, la entidad usa **borrado lógico**: al eliminar una tarea no se borra de la tabla, se marca `enable = false` y deja de mostrarse.

### 11.5 – El Repository

`TastkRepository` extiende de `JpaRepository<Task, Long>`. Solo con eso ya tiene los métodos para guardar, buscar, listar y eliminar, sin escribir SQL.

---

## 4. Cómo ejecutarlo

### 4.1 Clonar el repositorio

```bash
git clone https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre.git
```

### 4.2 Abrir el backend en IntelliJ

Abrir la carpeta `Back` y esperar a que Maven descargue las dependencias.

### 4.3 Cargar las variables de entorno

1. Arriba, en el desplegable **TodoAppApplication**, elegir **Edit Configurations...**
2. En **Environment variables** escribir (con tu usuario y clave de MySQL):

   ```
   DB_USER=tu_usuario;DB_PASS=tu_clave
   ```

3. Dejar **destildado** "Store as project file", así la clave no se sube al repositorio.
4. **Apply** → **OK**.

> Si aparece `Access denied for user`, revisar que la variable se llame exactamente `DB_PASS` (no `DB_PASSWORD`) y que el usuario y la clave sean correctos.

### 4.4 Ejecutar

Ejecutar `TodoAppApplication`. Cuando arranca bien, la consola muestra:

```
Tomcat started on port(s): 8080 (http)
Started TodoAppApplication
```

---

## 5. Endpoints

Base: `http://localhost:8080/api/v1/tasks`

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/create` | Crea una tarea. |
| `GET` | `/all` | Lista todas las tareas. |
| `PATCH` | `/mark_as_finished/{id}/{finished}` | Marca la tarea como realizada (`true`) o pendiente (`false`). |
| `DELETE` | `/delete/{id}` | Elimina la tarea (borrado lógico). |

Ejemplo de body para crear una tarea:

```json
{
  "title": "Tarea 1",
  "date": "2026-10-20",
  "time": "10:00"
}
```

### Probar la API

- **Swagger**: http://localhost:8080/swagger-ui/index.html
- **Postman**: importar el archivo `Tasks.postman_collection.json` de esta carpeta.

---

## 6. Frontend

Está en la carpeta `Front`, hecho con HTML, CSS y JavaScript sin frameworks. Usa [SweetAlert2](https://sweetalert2.github.io/) para las alertas.

Con el backend corriendo, abrir `Front/index.html` con **Live Server** de VS Code. La dirección de la API se configura en `Front/assets/script/data/path.js`.

---

## Créditos

Proyecto presentado por Matías Carballo en la Tecnicatura Universitaria en Programación (UTN FRSR). Basado en el trabajo de una cohorte anterior, adaptado y documentado para esta cursada.
