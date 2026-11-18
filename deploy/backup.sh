#!/usr/bin/env bash
# Nightly backup: database dump + uploads, kept 14 days locally. Copy /srv/theonlinestore/backups off the
# server too (e.g. `rclone sync` to Google Drive / Backblaze / S3) — a backup on the same disk isn't enough.
# Cron (as "store"):  30 2 * * *  /srv/theonlinestore/app/deploy/backup.sh >> /srv/theonlinestore/backups/backup.log 2>&1
set -euo pipefail
DIR=/srv/theonlinestore/backups
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DIR"
docker exec "$(docker ps -qf name=postgres)" pg_dump -U theonlinestore -Fc theonlinestore > "$DIR/db-$STAMP.dump"
tar -C /srv/theonlinestore -czf "$DIR/uploads-$STAMP.tar.gz" uploads
find "$DIR" -name 'db-*.dump' -mtime +14 -delete
find "$DIR" -name 'uploads-*.tar.gz' -mtime +14 -delete
echo "$(date -Is) backup ok: db-$STAMP.dump, uploads-$STAMP.tar.gz"
# Restore (example): docker exec -i <postgres> pg_restore -U theonlinestore -d theonlinestore --clean < db-<stamp>.dump
