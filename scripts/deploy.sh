#!/usr/bin/env bash
set -euo pipefail
echo "Deploy script started: $(date)"

# Must be run from project root on the server (e.g. /var/www/iraqstorycard.tech)
if [ ! -f ecosystem.config.js ]; then
  echo "ecosystem.config.js not found in $(pwd). Abort." >&2
  exit 2
fi

echo "Pulling latest from git..."
git fetch --all --prune
git pull --ff-only || echo "git pull failed or no fast-forward; please review."

echo "Installing dependencies (production)..."
if [ -f package-lock.json ]; then
  npm ci --production
else
  npm install --production
fi

echo "Starting/reloading PM2 processes..."
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "Deploy finished: $(date)"
