#!/bin/sh
set -e

: "${BACKEND_URL:=}"
BACKEND_INTERNAL_URL="${BACKEND_INTERNAL_URL:-http://backend:5581}"
export BACKEND_INTERNAL_URL
: "${VITE_GOOGLE_CLIENT_ID:=}"
: "${VITE_CARTO_API_KEY:=}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_GOOGLE_CLIENT_ID: "${VITE_GOOGLE_CLIENT_ID}",
  VITE_CARTO_API_KEY: "${VITE_CARTO_API_KEY}",
  BACKEND_URL: "${BACKEND_URL}"
};
EOF

envsubst '${BACKEND_INTERNAL_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
