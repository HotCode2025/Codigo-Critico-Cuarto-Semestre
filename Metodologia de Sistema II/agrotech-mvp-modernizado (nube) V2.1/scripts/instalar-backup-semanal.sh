#!/usr/bin/env bash
# Programa el backup de la base de AgroTech una vez por semana (viernes 18:00) con un
# temporizador de systemd de tu usuario. Si la PC estaba apagada a esa hora, corre apenas
# se enciende (Persistent=true). Guarda los últimos 30 días y avisa con una notificación.
#
# Antes de instalarlo, creá el archivo con la DATABASE_URL (solo tu usuario puede leerlo):
#   mkdir -p ~/.config/agrotech && chmod 700 ~/.config/agrotech
#   read -r -s -p "Pegá la DATABASE_URL: " U; echo
#   (umask 077; printf '%s' "$U" > ~/.config/agrotech/db_url); unset U
#
# Uso:
#   ./scripts/instalar-backup-semanal.sh                 instala y activa el temporizador
#   ./scripts/instalar-backup-semanal.sh --desinstalar   lo saca (no borra tus backups)
#   ./scripts/instalar-backup-semanal.sh --ver           muestra los archivos sin instalar nada
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_BACKUP="$AQUI/backup-db.sh"
CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}"
UNIDADES="$CONFIG/systemd/user"
ARCHIVO_URL="${AGROTECH_DB_URL_FILE:-$HOME/.config/agrotech/db_url}"
DIAS_A_GUARDAR=30

servicio() {
  cat <<UNIT
[Unit]
Description=Backup de la base de AgroTech

[Service]
Type=oneshot
Environment=BACKUP_NOTIFY=1
Environment=BACKUP_RETENTION_DAYS=$DIAS_A_GUARDAR
ExecStart="$SCRIPT_BACKUP"
UNIT
}

temporizador() {
  cat <<UNIT
[Unit]
Description=Backup semanal de la base de AgroTech

[Timer]
OnCalendar=Fri *-*-* 18:00:00
Persistent=true

[Install]
WantedBy=timers.target
UNIT
}

case "${1:-}" in
  --ver)
    echo "# $UNIDADES/agrotech-backup.service"; servicio; echo
    echo "# $UNIDADES/agrotech-backup.timer"; temporizador
    exit 0 ;;
  --desinstalar)
    systemctl --user disable --now agrotech-backup.timer 2>/dev/null || true
    rm -f "$UNIDADES/agrotech-backup.service" "$UNIDADES/agrotech-backup.timer"
    systemctl --user daemon-reload
    echo "Temporizador desinstalado. Tus backups en ~/agrotech-backups no se tocaron."
    exit 0 ;;
  "") ;;
  *) echo "Opción desconocida: $1" >&2; exit 1 ;;
esac

if [ ! -x "$SCRIPT_BACKUP" ]; then echo "No encuentro $SCRIPT_BACKUP" >&2; exit 1; fi
if [ ! -f "$ARCHIVO_URL" ]; then
  echo "Falta $ARCHIVO_URL con la DATABASE_URL. Mirá las instrucciones al principio de este script." >&2
  exit 1
fi
PERMISOS="$(stat -c %a "$ARCHIVO_URL")"
if [ "$PERMISOS" != "600" ] && [ "$PERMISOS" != "400" ]; then
  echo "$ARCHIVO_URL tiene permisos $PERMISOS: tiene que ser solo tuyo (chmod 600)." >&2
  exit 1
fi

mkdir -p "$UNIDADES"
servicio > "$UNIDADES/agrotech-backup.service"
temporizador > "$UNIDADES/agrotech-backup.timer"
systemctl --user daemon-reload
systemctl --user enable --now agrotech-backup.timer

echo "Listo. Próxima ejecución:"
systemctl --user list-timers agrotech-backup.timer --no-pager | head -3
echo
echo "Probalo ahora con:  systemctl --user start agrotech-backup.service"
echo "Y mirá el resultado: journalctl --user -u agrotech-backup.service -n 20 --no-pager"
