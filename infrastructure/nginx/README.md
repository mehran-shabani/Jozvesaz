# Nginx Reverse Proxy

This directory contains the Nginx configuration and helper scripts that expose the Jozvesaz
stack behind a single HTTPS endpoint. Requests under `/api/` are forwarded to the FastAPI
backend, while any other path is handled by the Next.js frontend.

## Files

- `site.conf` – Production-ready virtual host configuration.
- `deploy.sh` – Safe reload/deployment helper with health checks (see below).

## Usage

1. Copy `site.conf` to your Nginx `sites-available/` directory (or the root
   configuration file when running inside a container).
2. Replace `example.com` with your actual domain name(s).
3. Ensure the upstream names (`backend` and `frontend`) resolve to the FastAPI and Next.js
   services respectively. In Docker Compose the service names automatically resolve via the
   internal network.
4. Mount or copy the file into your Nginx container and enable it, e.g. via a symlink in
   `sites-enabled/` or by including it from `nginx.conf`.

## SSL Certificates and Certbot Integration

The configuration expects TLS assets to live under `/etc/letsencrypt/live/<domain>/`. There
are two common ways to provision them:

### 1. Using Certbot with the webroot plugin

1. Create the challenge directory that is referenced by `site.conf`:
   ```bash
   sudo mkdir -p /var/www/certbot
   sudo chown -R www-data:www-data /var/www/certbot
   ```
2. Point your DNS `A/AAAA` records to the server running Nginx.
3. Obtain the certificate (replace `example.com` with your domain and add any SANs):
   ```bash
   sudo certbot certonly \
     --webroot -w /var/www/certbot \
     -d example.com -d www.example.com
   ```
4. Certbot writes the certificates to `/etc/letsencrypt/live/...`. After the first
   issuance, reload Nginx using `deploy.sh` or `sudo systemctl reload nginx`.
5. Configure a cron job or systemd timer to renew automatically. Certbot installs one by
   default. After each renewal, invoke the deployment script to reload Nginx.

### 2. Using a DNS provider or custom certificates

If you prefer DNS challenges (e.g., via `certbot-dns-*` plugins) or have certificates from
another authority:

1. Adjust the certificate issuance command according to your provider.
2. Copy the resulting `fullchain.pem` and `privkey.pem` into `/etc/letsencrypt/live/<domain>/`
   (or update the paths in `site.conf`).
3. Run the deployment script to reload Nginx.

> **Tip:** Keep `/etc/letsencrypt` outside of containers and mount it into the Nginx
> container as a read-only volume so renewals persist across deployments.

## Deploying and Reloading Nginx Safely

Use the `deploy.sh` script to validate the configuration, reload Nginx, and confirm that the
backend services respond correctly:

```bash
./deploy.sh
```

The script:

1. Validates the configuration using `nginx -t` (override the path with `NGINX_CONF`).
2. Reloads the server using `systemctl reload nginx` when available, falling back to
   `nginx -s reload`.
3. Runs health checks against the frontend and backend. Customize the targets with the
   `HEALTHCHECK_URLS` environment variable (space-separated URLs). TLS-only test
   environments can set `CURL_INSECURE=1` to allow self-signed certificates.

> **Requirements:** The host running the script must have `nginx` and `curl` available in
> `PATH`.

Example with custom checks:

```bash
HEALTHCHECK_URLS="https://example.com/ https://example.com/api/health" ./deploy.sh
```

If any health check fails, the script exits with a non-zero status so that CI/CD systems can
abort the deployment.

## Automating with Certbot Renewals

Certbot can automatically execute hooks after successful renewal. Add the deployment script
as a post-renew hook:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null <<'HOOK'
#!/usr/bin/env bash
cd /path/to/repo/infrastructure/nginx
./deploy.sh
HOOK
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

The hook ensures that every renewal seamlessly reloads Nginx with the new certificates.
