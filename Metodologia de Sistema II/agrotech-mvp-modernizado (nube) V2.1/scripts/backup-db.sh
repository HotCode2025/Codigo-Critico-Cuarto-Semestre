#!/usr/bin/env bash
# Backup lógico de la base de AgroTech (esquema public) con pg_dump dentro de Docker.
#
# Uso manual:   ./scripts/backup-db.sh
# La DATABASE_URL se busca, en este orden, en:
#   1. la variable de entorno DATABASE_URL
#   2. el archivo ~/.config/agrotech/db_url (o $AGROTECH_DB_URL_FILE), que tiene que ser
#      legible solo por tu usuario (chmod 600): así corre sin preguntar, para el temporizador
#   3. el teclado (sin mostrarla), solo si hay una terminal interactiva
# Usá la cadena del Session Pooler (puerto 5432), no la 6543.
#
# Variables opcionales:
#   BACKUP_DIR              carpeta de destino (por defecto ~/agrotech-backups)
#   BACKUP_RETENTION_DAYS   si se define, borra los backups de más de N días (solo tras un backup exitoso)
#   BACKUP_NOTIFY=1         avisa con una notificación de escritorio si salió bien o mal
#
# Los .sql tienen emails y hashes de contraseñas: quedan fuera del repo y nunca se suben a GitHub.
set -euo pipefail

DESTINO="${BACKUP_DIR:-$HOME/agrotech-backups}"
ARCHIVO_URL="${AGROTECH_DB_URL_FILE:-$HOME/.config/agrotech/db_url}"
IMAGEN="postgres:17-alpine"
TABLAS_ESPERADAS=11
ARCHIVO=""
PARCIAL=""

avisar() {
  [ "${BACKUP_NOTIFY:-}" = "1" ] || return 0
  command -v notify-send >/dev/null 2>&1 || return 0
  notify-send -u "$1" "AgroTech: backup de la base" "$2" >/dev/null 2>&1 || true
}

terminar() {
  local estado=$?
  if [ "$estado" -ne 0 ]; then
    # Solo se descarta el archivo a medias: un backup anterior nunca se toca.
    [ -n "$PARCIAL" ] && rm -f "$PARCIAL"
    avisar critical "FALLÓ el backup (código $estado). Corré ./scripts/backup-db.sh a mano para ver el error."
  fi
}
trap terminar EXIT

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

if [ -z "${DATABASE_URL:-}" ] && [ -f "$ARCHIVO_URL" ]; then
  PERMISOS="$(stat -c %a "$ARCHIVO_URL")"
  if [ "$PERMISOS" != "600" ] && [ "$PERMISOS" != "400" ]; then
    echo "$ARCHIVO_URL tiene permisos $PERMISOS: tiene que ser solo tuyo. Corré: chmod 600 \"$ARCHIVO_URL\"" >&2
    exit 1
  fi
  DATABASE_URL="$(tr -d '\r\n' < "$ARCHIVO_URL")"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ ! -t 0 ]; then
    echo "No hay DATABASE_URL (ni variable ni $ARCHIVO_URL) y no hay terminal para pedirla." >&2
    exit 1
  fi
  read -r -s -p "Pegá la DATABASE_URL (no se muestra): " DATABASE_URL
  echo
fi
export DATABASE_URL

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
ARCHIVO="$DESTINO/agrotech-backup-$(date +%F_%H%M%S).sql"
PARCIAL="$ARCHIVO.parcial"

asegurar_imagen
echo "Haciendo el backup..."
# La URL viaja por variable de entorno (-e) y no por argumento, para que no se vea en `ps`.
docker run --rm --network host -e DATABASE_URL "$IMAGEN" \
  sh -c 'pg_dump "$DATABASE_URL" --schema=public --no-owner --no-privileges' > "$PARCIAL" \
  || { echo "pg_dump falló: revisá la URL (Session Pooler, puerto 5432) y tu conexión." >&2; exit 1; }
chmod 600 "$PARCIAL"

TABLAS=$(grep -c '^CREATE TABLE' "$PARCIAL" || true)
if [ "$TABLAS" -lt "$TABLAS_ESPERADAS" ]; then
  echo "El backup tiene $TABLAS tablas y se esperaban $TABLAS_ESPERADAS: no lo des por bueno." >&2
  exit 1
fi

mv "$PARCIAL" "$ARCHIVO"
PARCIAL=""
TAMANO="$(du -h "$ARCHIVO" | cut -f1)"
echo "Listo: $ARCHIVO ($TAMANO, $TABLAS tablas)"

if [ -n "${BACKUP_RETENTION_DAYS:-}" ]; then
  BORRADOS="$(find "$DESTINO" -maxdepth 1 -name 'agrotech-backup-*.sql' -mtime +"$BACKUP_RETENTION_DAYS" -print -delete | wc -l)"
  [ "$BORRADOS" -gt 0 ] && echo "Se borraron $BORRADOS backup(s) de más de $BACKUP_RETENTION_DAYS días."
fi

avisar normal "Backup listo ($TAMANO, $TABLAS tablas). Acordate de copiarlo a Drive."
echo "Comprobá que se puede restaurar con: ./scripts/verificar-backup.sh \"$ARCHIVO\""
