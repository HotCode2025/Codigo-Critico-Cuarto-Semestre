# ToDo API (Spring Boot + MySQL)

Clase 10 y Clase 11 – Proyecto Matías Carballo, Partes 1 y 2.

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

## 3. Temas de la Clase 10 (Parte 1)

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

## 4. Temas de la Clase 11 (Parte 2)

### 12.1 – El Service

Es la capa donde va **la lógica del programa**. El controlador no toca la base de datos: le pide las cosas al servicio, y el servicio usa el repositorio y el mapper.

Está dividido en dos partes:

- `ITaskService` → la **interfaz**, dice *qué* se puede hacer (crear, listar, marcar como realizada, eliminar).
- `TaskService` → la **implementación**, dice *cómo* se hace.

```java
@Service
@RequiredArgsConstructor
public class TaskService implements ITaskService {
    private final TastkRepository repository;
    private final TaskMapper mapper;
    ...
}
```

- `@Service` le avisa a Spring que cree un objeto (bean) de esta clase y lo guarde, para inyectarlo donde se necesite.
- `@RequiredArgsConstructor` (Lombok) arma el constructor con los atributos `final`. Así Spring inyecta el repositorio y el mapper sin usar `@Autowired`.

Lo que hace cada método:

| Método | Qué hace |
|---|---|
| `createTask` | Convierte el DTO en entidad, la guarda y devuelve la tarea guardada como DTO. |
| `findAll` | Trae todas las tareas y las devuelve como lista de DTO. |
| `updateTaskAsFinished` | Busca la tarea por id. Si no existe lanza un error `404`. Si existe, actualiza el estado. Lleva `@Transactional` porque modifica datos con una query propia. |
| `deleteById` | Igual: si la tarea no existe lanza `404`, y si existe la elimina (borrado lógico, queda con `enable = false`). |

> Ojo: en `updateTaskAsFinished` el valor que llega se invierte (`finished = !finished`) antes de guardarlo. El frontend manda el estado actual de la tarea y el servicio lo da vuelta.

### 12.2 – El Controller

Es la **puerta de entrada** de la API: recibe las peticiones HTTP, llama al servicio y devuelve la respuesta. No tiene lógica, solo se comunica con el servicio.

```java
@RestController
@RequestMapping("api/v1/tasks")
@RequiredArgsConstructor
public class TaskController { ... }
```

- `@RestController` → indica que es un controlador REST (responde en JSON).
- `@RequestMapping("api/v1/tasks")` → la ruta base de todos los endpoints. El `v1` sirve para versionar la API.

Cada método se asocia a un verbo HTTP:

| Anotación | Endpoint | Respuesta |
|---|---|---|
| `@PostMapping("/create")` | Crear tarea | `201 Created` con la tarea creada |
| `@GetMapping("/all")` | Listar tareas | `200 OK` con la lista |
| `@PatchMapping("/mark_as_finished/{id}/{finished}")` | Cambiar estado | `204 No Content` |
| `@DeleteMapping("delete/{id}")` | Eliminar | `204 No Content` |

- `@RequestBody` → toma el JSON que viene en el cuerpo y lo convierte en `TaskRequestDTO`.
- `@PathVariable` → toma un valor que viene en la URL, por ejemplo el `{id}`.
- `ResponseEntity` → permite elegir qué código HTTP devolver junto con los datos.

### 12.3 – Exceptions (manejo de errores)

La idea es que cuando algo falla, la API devuelva un **mensaje claro y el código correcto**, y no un error largo y descontrolado.

Se usan dos clases:

**`ToDoExceptions`** → una excepción propia que extiende de `RuntimeException` y guarda el mensaje y el código HTTP:

```java
throw new ToDoExceptions("Task not found", HttpStatus.NOT_FOUND);
```

**`ExceptionHandler`** → la clase que "atrapa" esas excepciones en toda la aplicación:

- `@ControllerAdvice` → hace que la clase escuche los errores de **todos** los controladores.
- `@ExceptionHandler(value = {ToDoExceptions.class})` → indica qué tipo de excepción maneja.
- Arma la respuesta con el mensaje y el código que traía la excepción.

Resultado: si pido marcar o borrar una tarea que no existe, recibo un `404` con el texto `Task not found`.

### 12.4 – CORS

El navegador, por seguridad, **bloquea** las peticiones de una página a un servidor que está en otro origen (otro dominio o puerto). Por ejemplo, el frontend en Live Server (`http://127.0.0.1:5500`) llamando a la API en `http://localhost:8080`.

CORS es la configuración que le dice al navegador: "esta API acepta peticiones de afuera". Está en `context/CorsConfig.java`:

| Configuración | Qué permite |
|---|---|
| `setAllowedOrigins(List.of("*"))` | Peticiones desde **cualquier** origen. |
| `setAllowedHeaders(...)` | Los encabezados que se pueden mandar (`Content-Type`, `Authorization`, etc.). |
| `setAllowedMethods(...)` | Los métodos `GET`, `POST`, `PUT`, `DELETE`, `PATCH` y `OPTIONS`. |
| `registerCorsConfiguration("/**", ...)` | Aplica la regla a todas las rutas. |

El filtro se registra con `Ordered.HIGHEST_PRECEDENCE` para que sea lo primero que se ejecute.

> Usar `*` está bien para aprender y probar. En un proyecto real se pone solo la dirección del frontend.

Sin esta configuración, el frontend muestra en la consola un error de tipo `blocked by CORS policy`.

### 12.5 – OpenAPI (Swagger)

OpenAPI genera **la documentación de la API automáticamente**, leyendo los controladores. Swagger la muestra en una página web donde además se pueden probar los endpoints sin otro programa.

Se agrega con la dependencia `springdoc-openapi-starter-webmvc-ui` y se configura en `context/OpenApiConfig.java`:

- `@Configuration` + `@Bean` → crea el objeto `OpenAPI` dentro del contexto de Spring.
- `.info(...)` → título (`ToDo API`), descripción y versión (`v1`) que aparecen arriba en la página.
- `.addSecuritySchemes(...)` → deja preparado un botón **Authorize** para usar tokens JWT más adelante (todavía no se usa).

Con la API corriendo, entrar a: http://localhost:8080/swagger-ui/index.html

Ahí aparecen los 4 endpoints. Para probar uno: abrirlo → **Try it out** → completar los datos → **Execute**.

### 12.6 – Postman

Postman es un programa para **probar la API** mandando peticiones a mano y viendo la respuesta (código, tiempo y JSON).

En esta carpeta está la colección `Tasks.postman_collection.json` con las 4 pruebas listas:

| Prueba | Método | URL |
|---|---|---|
| Create Task | `POST` | `localhost:8080/api/v1/tasks/create` |
| Get All Taks | `GET` | `localhost:8080/api/v1/tasks/all` |
| Update Status Task | `PATCH` | `localhost:8080/api/v1/tasks/mark_as_finished/4/true` |
| Delete Task | `DELETE` | `localhost:8080/api/v1/tasks/delete/4` |

Pasos:

1. En Postman: **Import** → elegir el archivo `Tasks.postman_collection.json`.
2. Con el backend corriendo, ejecutar primero **Create Task** (en *Body → raw → JSON*).
3. Ejecutar **Get All Taks** para ver la tarea creada y su `id`.
4. En **Update Status Task** y **Delete Task** cambiar el `4` por un `id` que exista.

### Qué probar (testeo)

Las pruebas son lo más importante de esta clase. Conviene revisar no solo que funcione, sino también qué pasa cuando algo sale mal:

| Caso | Resultado esperado |
|---|---|
| Crear una tarea con datos válidos | `201 Created` y la tarea con su `id` |
| Listar las tareas | `200 OK` y la lista en JSON |
| Marcar como realizada una tarea que existe | `204 No Content` |
| Marcar o borrar un `id` que **no** existe (ej. `9999`) | `404 Not Found` con `Task not found` |
| Borrar una tarea y volver a listar | `204`, y la tarea ya no aparece en la lista |
| Usar el frontend con Live Server | Funciona sin errores de CORS en la consola |

---

## 5. Cómo ejecutarlo

### 5.1 Clonar el repositorio

```bash
git clone https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre.git
```

### 5.2 Abrir el backend en IntelliJ

Abrir la carpeta `Back` y esperar a que Maven descargue las dependencias.

### 5.3 Cargar las variables de entorno

1. Arriba, en el desplegable **TodoAppApplication**, elegir **Edit Configurations...**
2. En **Environment variables** escribir (con tu usuario y clave de MySQL):

   ```
   DB_USER=tu_usuario;DB_PASS=tu_clave
   ```

3. Dejar **destildado** "Store as project file", así la clave no se sube al repositorio.
4. **Apply** → **OK**.

> Si aparece `Access denied for user`, revisar que la variable se llame exactamente `DB_PASS` (no `DB_PASSWORD`) y que el usuario y la clave sean correctos.

### 5.4 Ejecutar

Ejecutar `TodoAppApplication`. Cuando arranca bien, la consola muestra:

```
Tomcat started on port(s): 8080 (http)
Started TodoAppApplication
```

---

## 6. Endpoints

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

## 7. Frontend

Está en la carpeta `Front`, hecho con HTML, CSS y JavaScript sin frameworks. Usa [SweetAlert2](https://sweetalert2.github.io/) para las alertas.

Con el backend corriendo, abrir `Front/index.html` con **Live Server** de VS Code. La dirección de la API se configura en `Front/assets/script/data/path.js`.

---

## Créditos

Proyecto presentado por Matías Carballo en la Tecnicatura Universitaria en Programación (UTN FRSR). Basado en el trabajo de una cohorte anterior, adaptado y documentado para esta cursada.
