#!/usr/bin/env bash
set -euo pipefail

root="$(printf '%s' "${1:?backup directory required}" | base64 -d)"
week="${2:?week date required}"
case "$root" in
  /mnt/d/*) ;;
  *) echo "Backup target must be on D:" >&2; exit 2 ;;
esac
[[ "$week" =~ ^[0-9]{8}$ ]] || { echo "Invalid week date" >&2; exit 2; }

mkdir -p "$root"
final="$root/$week"
if [[ -f "$final/complete.txt" ]]; then
  echo "Backup for $week already exists: $final"
  exit 0
fi
if [[ -e "$final" ]]; then
  echo "Backup directory exists without completion marker: $final" >&2
  exit 1
fi
tmp="$(mktemp -d "$root/.backup-$week-XXXXXXXX")"
for database in vocabulary practice insights journal; do
  echo "Dumping $database..."
  docker compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$1" -Fc' sh "$database" > "$tmp/$database.dump"
  [[ -s "$tmp/$database.dump" ]] || { echo "Empty dump: $database" >&2; exit 1; }
  docker compose exec -T postgres pg_restore -l < "$tmp/$database.dump" > /dev/null
done
(cd "$tmp" && sha256sum ./*.dump > SHA256SUMS)
printf 'week=%s\ncreated_at=%s\nformat=pg_dump_custom\n' "$week" "$(date --iso-8601=seconds)" > "$tmp/complete.txt"
mv "$tmp" "$final"
echo "Backup ready: $final"
