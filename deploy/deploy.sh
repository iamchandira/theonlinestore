#!/usr/bin/env bash
# Deploys the latest code on the server. Run as the "store" user from /srv/theonlinestore/app:
#   ./deploy/deploy.sh            (production branch)
# Database migrations run automatically during the build and on start.
set -euo pipefail
cd /srv/theonlinestore/app
BRANCH="${1:-production}"

echo "→ Fetching $BRANCH"
git fetch --prune origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "→ Backing up the database first"
/srv/theonlinestore/app/deploy/backup.sh

echo "→ Installing and building"
set -a; source /srv/theonlinestore/.env; set +a
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile --prod=false
# Apply database changes once, before the build (the build reads the database for pre-rendered pages)
pnpm payload migrate
pnpm build

echo "→ Keeping optimised images between deploys"
mkdir -p /srv/theonlinestore/image-cache
rm -rf .next/standalone/.next/cache/images
mkdir -p .next/standalone/.next/cache
ln -sfn /srv/theonlinestore/image-cache .next/standalone/.next/cache/images

echo "→ Restarting"
sudo systemctl restart theonlinestore
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/; then echo "✓ Live"; exit 0; fi
  sleep 2
done
echo "✗ The app didn't answer within 60 s. Check: journalctl -u theonlinestore -n 100" >&2
exit 1
