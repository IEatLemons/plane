#!/bin/sh
set -e
# Cloud platforms (Railway, Fly, etc.) and K8s often set PORT. Nginx must listen on
# the same port as the container publish target (e.g. `3002:3002` needs PORT=3002),
# otherwise the edge proxy returns 502 Bad Gateway.
PORT="${PORT:-3000}"
sed -i "s/listen 3000;/listen ${PORT};/" /etc/nginx/nginx.conf
if ! grep -qE "listen[[:space:]]+${PORT};" /etc/nginx/nginx.conf; then
  echo "docker-entrypoint: nginx listen was not set to PORT=${PORT} (sed failed?)" >&2
  exit 1
fi
exec nginx -g "daemon off;"
