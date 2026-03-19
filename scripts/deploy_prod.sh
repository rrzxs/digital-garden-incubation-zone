#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"

DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_TARGET_DIR="${DEPLOY_TARGET_DIR:-/var/www/html/seed}"
DEPLOY_TMP_DIR="${DEPLOY_TMP_DIR:-~/digital_garden_tmp}"

SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_OPTS=(-p "${DEPLOY_PORT}" -o StrictHostKeyChecking=yes)
RSYNC_RSH="ssh -p ${DEPLOY_PORT} -o StrictHostKeyChecking=yes"

rsync -az --delete \
  --rsh "${RSYNC_RSH}" \
  --exclude '.DS_Store' \
  --exclude '.git' \
  --exclude '.github' \
  --exclude '.gitignore' \
  --exclude '.agent' \
  --exclude 'docs' \
  --exclude 'tests' \
  --exclude 'scripts' \
  --exclude 'deploy.sh' \
  --exclude 'DEPLOY_GUIDE.md' \
  --exclude 'README.md' \
  --exclude 'package.json' \
  ./ "${SSH_TARGET}:${DEPLOY_TMP_DIR}/"

ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" <<REMOTE
set -euo pipefail
sudo rm -rf "${DEPLOY_TARGET_DIR}"
sudo mkdir -p "${DEPLOY_TARGET_DIR}"
sudo cp -R "${DEPLOY_TMP_DIR}/." "${DEPLOY_TARGET_DIR}/"
sudo chown -R www-data:www-data "${DEPLOY_TARGET_DIR}"
rm -rf "${DEPLOY_TMP_DIR}"
REMOTE

echo "digital_garden deployed to ${DEPLOY_HOST}:${DEPLOY_TARGET_DIR}"
