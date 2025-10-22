#!/usr/bin/env bash
set -euo pipefail

NGINX_CONF=${NGINX_CONF:-/etc/nginx/nginx.conf}
HEALTHCHECK_URLS=${HEALTHCHECK_URLS:-"https://localhost/ https://localhost/api/health"}
CURL_TIMEOUT=${CURL_TIMEOUT:-5}

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*"
}

trap 'log "Deployment failed"' ERR

if ! command -v nginx >/dev/null 2>&1; then
    log "nginx binary not found in PATH"
    exit 1
fi

log "Validating configuration at $NGINX_CONF"
nginx -t -c "$NGINX_CONF"

if command -v systemctl >/dev/null 2>&1; then
    log "Reloading Nginx via systemctl"
    systemctl reload nginx
else
    log "Reloading Nginx via nginx -s reload"
    nginx -c "$NGINX_CONF" -s reload
fi

log "Running health checks"
IFS=' ' read -r -a urls <<< "$HEALTHCHECK_URLS"

curl_args=("-fsSL" "--max-time" "$CURL_TIMEOUT" "--connect-timeout" "$CURL_TIMEOUT")
if [[ "${CURL_INSECURE:-0}" != "0" ]]; then
    curl_args+=("-k")
fi

for url in "${urls[@]}"; do
    [[ -z "$url" ]] && continue
    log "Checking $url"
    if ! curl "${curl_args[@]}" "$url" >/dev/null; then
        log "Health check failed for $url"
        exit 1
    fi
done

log "All health checks passed"
