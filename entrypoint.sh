#!/bin/sh
set -e

: "${BACKEND_URL:=}"
: "${VITE_GOOGLE_CLIENT_ID:=}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_GOOGLE_CLIENT_ID: "${VITE_GOOGLE_CLIENT_ID}",
  BACKEND_URL: "${BACKEND_URL}"
};
EOF

envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
