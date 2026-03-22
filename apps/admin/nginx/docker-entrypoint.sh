#!/bin/sh
set -e
PORT="${PORT:-3000}"
sed -i "s/listen 3000;/listen ${PORT};/" /etc/nginx/nginx.conf
exec nginx -g "daemon off;"
