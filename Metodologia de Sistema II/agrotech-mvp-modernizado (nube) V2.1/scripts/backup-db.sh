#!/usr/bin/env bash
# Backup lógico de la base de AgroTech (esquema public) con pg_dump dentro de Docker.
#
# Uso:   ./scripts/backup-db.sh
# La DATABASE_URL se toma de la variable de entorno o, si no está, se pide por
# teclado sin mostrarla. Usá la cadena del Session Pooler (puerto 5432), no la 6543.
# El archivo queda en $BACKUP_DIR (por defecto ~/agrotech-backups), fuera del repo:
# tiene emails y hashes de contraseñas, así que nunca se sube a GitHub.
set -euo pipefail

DESTINO="${BACKUP_DIR:-$HOME/agrotech-backups}"
IMAGEN="postgres:17-alpine"
TABLAS_ESPERADAS=11

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

if ! command -v docker >/dev/null 2>&1; then
  echo "Falta Docker (se usa para correr pg_dump sin instalar nada)." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  read -r -s -p "Pegá la DATABASE_URL (no se muestra): " DATABASE_URL
  echo
fi
export DATABASE_URL

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
ARCHIVO="$DESTINO/agrotech-backup-$(date +%F_%H%M).sql"

asegurar_imagen
echo "Haciendo el backup..."
# La URL viaja por variable de entorno (-e) y no por argumento, para que no se vea en `ps`.
if ! docker run --rm --network host -e DATABASE_URL "$IMAGEN" \
    sh -c 'pg_dump "$DATABASE_URL" --schema=public --no-owner --no-privileges' > "$ARCHIVO"; then
  rm -f "$ARCHIVO"
  echo "pg_dump falló: revisá la URL (Session Pooler, puerto 5432) y tu conexión." >&2
  exit 1
fi
chmod 600 "$ARCHIVO"

TABLAS=$(grep -c '^CREATE TABLE' "$ARCHIVO" || true)
if [ "$TABLAS" -lt "$TABLAS_ESPERADAS" ]; then
  echo "El backup tiene $TABLAS tablas y se esperaban $TABLAS_ESPERADAS: no lo des por bueno." >&2
  exit 1
fi

echo "Listo: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1), $TABLAS tablas)"
echo "Comprobá que se puede restaurar con: ./scripts/verificar-backup.sh \"$ARCHIVO\""
