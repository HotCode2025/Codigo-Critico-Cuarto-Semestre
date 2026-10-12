#!/usr/bin/env bash
# Restaura un backup de AgroTech en una base descartable (un Postgres en Docker que se
# borra al terminar) y cuenta las tablas y filas, para comprobar que el archivo sirve.
# No usa ninguna credencial real ni toca tu base de producción.
#
# Uso:   ./scripts/verificar-backup.sh ruta/al/agrotech-backup-AAAA-MM-DD_HHMM.sql
set -euo pipefail

ARCHIVO="${1:-}"
IMAGEN="postgres:17-alpine"
NOMBRE="pg-agrotech-verificar-$$"

if [ -z "$ARCHIVO" ] || [ ! -s "$ARCHIVO" ]; then
  echo "Uso: $0 ruta/al/backup.sql (el archivo tiene que existir y no estar vacío)" >&2
  exit 1
fi

# Baja la imagen si no está. Si el gestor de credenciales de Docker falla (pasa con `pass`/gpg),
# se reintenta sin credenciales: la imagen de Postgres es pública.
asegurar_imagen() {
  if docker image inspect "$IMAGEN" >/dev/null 2>&1; then return 0; fi
  echo "Bajando la imagen $IMAGEN (solo la primera vez)..."
  if docker pull -q "$IMAGEN" >/dev/null 2>&1; then return 0; fi
  SIN_CREDENCIALES="$(mktemp -d)"
  DOCKER_CONFIG="$SIN_CREDENCIALES" docker pull -q "$IMAGEN" >/dev/null
  rm -rf "$SIN_CREDENCIALES"
}

limpiar() { docker rm -f "$NOMBRE" >/dev/null 2>&1 || true; }
trap limpiar EXIT

asegurar_imagen
docker run -d --name "$NOMBRE" -e POSTGRES_PASSWORD=verificar "$IMAGEN" >/dev/null
echo "Esperando que arranque la base descartable..."
for _ in $(seq 1 30); do
  if docker exec "$NOMBRE" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
sleep 2

echo "Restaurando $ARCHIVO ..."
# El volcado trae su propio CREATE SCHEMA public: se parte de una base sin ese esquema.
docker exec "$NOMBRE" psql -U postgres -q -c 'DROP SCHEMA IF EXISTS public CASCADE' >/dev/null
docker exec -i "$NOMBRE" psql -U postgres -v ON_ERROR_STOP=1 -q < "$ARCHIVO" >/dev/null

echo
echo "Filas por tabla en la base restaurada:"
NUM=0
for TABLA in $(docker exec "$NOMBRE" psql -U postgres -At -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1"); do
  FILAS=$(docker exec "$NOMBRE" psql -U postgres -At -c "SELECT count(*) FROM public.\"$TABLA\"")
  printf '  %-20s %s\n' "$TABLA" "$FILAS"
  NUM=$((NUM + 1))
done

echo
if [ "$NUM" -ge 11 ]; then
  echo "OK: el backup se restauró y tiene $NUM tablas."
else
  echo "ATENCIÓN: se restauraron solo $NUM tablas y se esperaban 11." >&2
  exit 1
fi
