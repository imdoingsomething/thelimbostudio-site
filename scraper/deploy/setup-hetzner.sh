#!/usr/bin/env bash
# One-shot setup for a fresh Hetzner Ubuntu 22.04/24.04 server.
# Run as root:  bash setup-hetzner.sh [git-repo-url]
set -euo pipefail

REPO_URL="${1:-https://github.com/imdoingsomething/thelimbostudio-site.git}"
APP_DIR=/opt/jobscout

echo "==> installing docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

echo "==> firewall (ufw): allow ssh/http/https"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

echo "==> fetching code into ${APP_DIR}"
if [ -d "${APP_DIR}/.git" ]; then
  git -C "${APP_DIR}" pull --ff-only
else
  git clone --depth 1 "${REPO_URL}" "${APP_DIR}"
fi
cd "${APP_DIR}/scraper"

echo "==> seeding config"
mkdir -p data
[ -f data/config.json ] || cp config.example.json data/config.json
[ -f .env ] || cp .env.example .env

echo "==> building & starting"
docker compose up -d --build

cat <<'EOF'

Done. Next steps:
  1. Edit .env and set DOMAIN=<your subdomain> (after adding its DNS A record),
     then: docker compose up -d --force-recreate caddy
  2. Tune data/config.json (sources, greenhouse/lever board slugs),
     then: docker compose restart scraper
  3. Watch the first scrape:  docker compose logs -f scraper
  4. Verify the feed:         curl -s localhost/jobs.json | head -c 300
EOF
