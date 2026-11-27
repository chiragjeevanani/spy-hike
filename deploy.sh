#!/usr/bin/env bash
# Find Your Trek — VPS redeploy script.
# Run as the `findyourtrek` user from anywhere: ~/findyourtrek/deploy.sh
# Pulls the latest code, reinstalls deps, rebuilds the frontend, and
# zero-downtime-reloads the backend under PM2. Never run this as root.

set -euo pipefail

BRANCH="${1:-main}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM2_APP="findyourtrek-api"
# Nginx (running as www-data) reads from here — not from inside the home
# directory, whose default 750 permissions www-data can't traverse.
FRONTEND_WEBROOT="/var/www/findyourtrek"

if [ "$(id -u)" -eq 0 ]; then
  echo "✗ Refusing to run as root. Switch to the findyourtrek user first." >&2
  exit 1
fi

echo "==> Deploying branch '$BRANCH' from $REPO_DIR"
cd "$REPO_DIR"

echo "==> Pulling latest code"
python3 scripts/security_scan.py
git -c core.hooksPath=/dev/null -c core.fsmonitor=false fetch origin
REMOTE_COMMIT="$(git rev-parse "refs/remotes/origin/$BRANCH")"
python3 scripts/security_scan.py --ref "$REMOTE_COMMIT"
git -c core.hooksPath=/dev/null checkout "$BRANCH"
git -c core.hooksPath=/dev/null merge --ff-only "$REMOTE_COMMIT"
python3 scripts/security_scan.py

echo "==> Installing backend dependencies"
cd "$REPO_DIR/backend"
npm ci --ignore-scripts --omit=dev

echo "==> Installing frontend dependencies and building"
cd "$REPO_DIR/frontend"
npm ci --ignore-scripts
npm --ignore-scripts run build

echo "==> Publishing frontend build to $FRONTEND_WEBROOT"
if [ ! -d "$FRONTEND_WEBROOT" ]; then
  echo "✗ $FRONTEND_WEBROOT does not exist yet. One-time setup (needs sudo):" >&2
  echo "    sudo mkdir -p $FRONTEND_WEBROOT" >&2
  echo "    sudo chown -R \$(whoami):www-data $FRONTEND_WEBROOT" >&2
  echo "    sudo chmod -R 2775 $FRONTEND_WEBROOT" >&2
  exit 1
fi
rsync -a --no-o --no-g --delete "$REPO_DIR/frontend/dist/" "$FRONTEND_WEBROOT/"

echo "==> Reloading backend via PM2"
if pm2 describe "$PM2_APP" > /dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  cd "$REPO_DIR/backend"
  pm2 start src/server.js --name "$PM2_APP"
fi
pm2 save

echo "✓ Deploy complete — $(date)"
