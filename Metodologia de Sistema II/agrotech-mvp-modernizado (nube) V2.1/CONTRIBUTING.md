# Cómo contribuir a AgroTech

Guía para trabajar en el proyecto sin romper lo que ya está en producción. Regla general:
**modernizar sin reescribir**. Cada cambio entra por un PR, con sus tests, y pasa el CI.

## 1. Preparar el entorno

Necesitás Node 18 o más nuevo (el CI usa Node 20) y Docker.

```bash
cd "Metodologia de Sistema II/agrotech-mvp-modernizado (nube) V2.1"
npm install                 # herramientas de lint (ESLint + Prettier)
cd server && npm install    # dependencias del backend
```

Para levantar todo (base, API, frontend y N8N):

```bash
docker compose up -d --build
```

| Servicio | Dirección |
|----------|-----------|
| Frontend | http://localhost:8000 |
| API | http://localhost:3001 |
| Documentación de la API | http://localhost:3001/api/docs |
| N8N | http://localhost:5678 |

Si ya tenés otro N8N en el puerto 5678, copiá `.env.example` como `.env` y poné `N8N_PORT=5679`.
Para borrar la base y empezar de cero: `docker compose down -v`.

## 2. Ramas

- `main` es lo que se entrega. Nadie trabaja directo sobre `main`.
- Cada integrante trabaja en su rama (por ejemplo `metodologiariel`) o en una rama por tarea
  (`feat/remito-r`, `fix/fecha-cheques`).
- Antes de empezar, traé lo último de `main`:

  ```bash
  git switch main && git pull
  git switch mi-rama && git merge main
  ```

- Revisá en qué rama estás antes de cada commit: `git branch --show-current`.

## 3. Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/), en español:

```
tipo(alcance): qué cambia, en presente y en minúscula
```

| Tipo | Para qué |
|------|----------|
| `feat` | Una función nueva |
| `fix` | Un arreglo |
| `docs` | Solo documentación |
| `test` | Tests nuevos o arreglados |
| `refactor` | Cambio interno que no cambia el comportamiento |
| `style` | Formato (sin cambios de lógica) |
| `chore` | Herramientas, dependencias, configuración |
| `ci` | GitHub Actions |

Alcances habituales: `agrotech` (la app en general), `api`, `server`, `n8n`, `ci`.

Ejemplos reales del proyecto:

```
feat(agrotech): verificación de email al registrarse
fix(api): validar tipo, estado, monto y fecha al crear ingresos y gastos
ci(agrotech): lint en cada PR además de los tests
```

Si el commit es parte de una issue, agregá `Ref #NN` en el cuerpo; si la termina, `Closes #NN`.

## 4. Antes de abrir el PR

Las dos cosas que corre el CI, en la carpeta del proyecto:

```bash
npm run lint        # ESLint + Prettier. npm run lint:fix arregla casi todo solo
```

```bash
docker run -d --name pg-agrotech-test -e POSTGRES_PASSWORD=test -p 55432:5432 postgres:16-alpine
cd server
DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npm test
```

Los tests se niegan a correr contra una base que no sea `localhost`, para no escribir datos de prueba
en Supabase.

Además, según lo que cambie:

- **Un endpoint nuevo o cambiado**: documentalo en `server/src/docs/openapi.js`. El test
  `docs.test.js` falla si una ruta de la app no está en la documentación.
- **Un cambio en la base**: agregá el SQL en `server/migrations/` (numerado: `002-...sql`) y
  actualizá `server/schema.sql`. Hacé un backup de Supabase antes de aplicarlo (`scripts/backup-db.sh`).
- **Una variable de entorno nueva**: agregala en `server/.env.example` y en `docker-compose.yml`.
- **Algo que ve el usuario**: anotalo en `CHANGELOG.md`, en `[Sin publicar]`.

## 5. Pull request

1. Abrí el PR de tu rama hacia `main` con la plantilla de AgroTech, agregando `?template=agrotech.md`
   al link de comparación (cambiá `mi-rama` por la tuya):
   `https://github.com/HotCode2025/Codigo-Critico-Cuarto-Semestre/compare/main...mi-rama?template=agrotech.md`
2. Completá la plantilla: qué cambia, cómo se probó y el checklist.
3. El CI tiene que quedar en verde (lint + tests).
4. Lo revisa el otro integrante del equipo antes de fusionarlo.

Para reportar un error o proponer una mejora, abrí una issue y elegí **AgroTech: reportar un error**
o **AgroTech: proponer una mejora**.

Si la decisión es de arquitectura (una tecnología, un formato, una regla fiscal), anotala como ADR en
[`docs/adr/`](docs/adr/README.md).

## 6. Versiones

Cuando se entrega una versión, se pasa lo de `[Sin publicar]` a un título con el número y la fecha en
`CHANGELOG.md`, se actualiza `version` en `server/package.json` y se marca el commit en `main`:

```bash
git tag agrotech-v2.1.0
git push origin agrotech-v2.1.0
```

## 7. Seguridad

- Nunca subas `.env`, backups de la base, tokens ni claves. Si se sube uno por error, hay que
  cambiar la clave, no alcanza con borrar el archivo.
- AgroTech nunca guarda la clave fiscal de ARCA del productor.
