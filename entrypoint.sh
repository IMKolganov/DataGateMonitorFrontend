#!/bin/sh

# Substitute BACKEND_URL in the template and start Nginx
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
