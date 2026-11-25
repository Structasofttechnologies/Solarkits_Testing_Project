#!/bin/sh
# Replace $PORT placeholder in Nginx config template manually
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Delete default Nginx welcome page to prevent conflicts
rm -f /usr/share/nginx/html/index.html

# Start the unified Node.js backend in the background on port 5000
PORT=5000 node /app/src/index.js &

# Start Nginx in the foreground
nginx -g "daemon off;"
