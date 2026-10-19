# 0001. PostgreSQL como base de datos

- **Estado:** Aceptada
- **Fecha:** 2026-09-11 (v2.0)

## Contexto

La v1 guardaba todo en el `localStorage` del navegador: un navegador era un productor, los datos se
perdían al cambiar de celular y no había forma de compartir nada entre productores (la Red).

Para la v2 hacía falta una base de datos de verdad. Los datos de AgroTech son relacionales por
naturaleza: un productor tiene fincas, las fincas tienen cuarteles, y gastos, ingresos y cheques
cuelgan de un cuartel. Además se manejan montos de dinero, donde un error de redondeo no es aceptable.

Opciones consideradas:

| Opción | A favor | En contra |
|--------|---------|-----------|
| **PostgreSQL** | Relacional, `NUMERIC` exacto para montos, restricciones `CHECK` y claves foráneas, plan gratuito en Supabase | Hay que escribir el SQL y las migraciones |
| MongoDB | Flexible, sin esquema | Las relaciones (finca → cuartel → gasto) quedan a cargo del código; sin tipos exactos para dinero por defecto |
| Firebase | Sin backend propio | Atado a Google, consultas con agregados limitadas, reglas de seguridad complejas |
| SQLite | Simple, un archivo | No sirve para varios usuarios en un servidor en la nube como Render |

## Decisión

Usar **PostgreSQL** (en producción, en **Supabase**), con SQL escrito a mano mediante el driver `pg`,
sin ORM. El esquema vive en `server/schema.sql` y los cambios posteriores en `server/migrations/`.

## Consecuencias

- Los montos se guardan como `NUMERIC(14,2)`: no hay errores de punto flotante en los totales.
- La base valida sola lo que no puede pasar: montos negativos, estados inválidos y datos huérfanos
  (`CHECK` y claves foráneas), además de la validación de la API.
- Cada consulta filtra por `productor_id`, lo que aísla los datos de cada productor; hay tests que lo
  comprueban.
- Sin ORM, el SQL se lee directo en las rutas, pero las migraciones son manuales. Está previsto
  automatizarlas (migraciones numeradas con registro de cuáles corrieron).
- El plan gratuito de Supabase no hace backups: se resolvió con `scripts/backup-db.sh`, la
  verificación de restauración y el backup semanal.
- Para desarrollo y tests alcanza con un Postgres en Docker (`docker-compose.yml`).
