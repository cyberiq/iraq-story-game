#!/usr/bin/env bash
set -euo pipefail
echo "Rollback script started: $(date)"

if [ -z "$(git rev-parse --is-inside-work-tree 2>/dev/null)" ]; then
  echo "Not a git repository. Abort." >&2
  exit 2
fi

CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
echo "Current branch: $CURRENT"

echo "Reverting last commit (attempting safe revert)..."
if git rev-parse --verify --quiet HEAD~1 >/dev/null; then
  git revert --no-edit HEAD || {
    echo "Revert failed; trying hard reset to HEAD~1"
    git reset --hard HEAD~1
  }
else
  echo "No previous commit to rollback to." >&2
  exit 1
fi

echo "Installing deps & reloading PM2..."
if [ -f package-lock.json ]; then
  npm ci --production || true
else
  npm install --production || true
fi

pm2 startOrReload ecosystem.config.js --env production || true
pm2 save || true

echo "Rollback finished: $(date)"
