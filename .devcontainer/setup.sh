#!/usr/bin/env bash
# Runs once automatically when the Codespace is created. A Codespace exposes
# forwarded ports at https://$CODESPACE_NAME-<port>.$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
# rather than localhost, and the frontend's API base URL is baked in at
# Next.js build time — so both must be derived here, before `docker compose
# up --build` runs, not left to the app's own localhost fallback.
set -euo pipefail

cd "$(dirname "$0")/.."

FRONTEND_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
BACKEND_URL="https://${CODESPACE_NAME}-8000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"

cat > .env <<EOF
NEXT_PUBLIC_API_BASE_URL=${BACKEND_URL}
CORS_ALLOWED_ORIGINS=["${FRONTEND_URL}"]
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
GOOGLE_API_KEY=${GOOGLE_API_KEY:-}
EOF

docker compose up -d --build

echo "Kész. Felület: ${FRONTEND_URL}"
