# Meetscheduling Deployment Guide

This repo is set up for deployment to a VPS through GitHub Actions.

## 1) GitHub Actions -> VPS (recommended)

Workflow file: `.github/workflows/deploy.yml`

Trigger:

- Push to `main`
- Manual run from Actions tab (`workflow_dispatch`)

Deploy behavior on VPS:

- `git fetch` + `git pull --ff-only origin main`
- `npm ci --omit=dev`
- `npm run build --if-present`
- optional `npm run migrate` (when `RUN_MIGRATIONS=true`)
- restart app with PM2 (`meetscheduling`)

Important:

- This app runs as a single PM2 `fork` process on port `8080`.
- Use `pm2 restart meetscheduling --update-env`, not `pm2 reload`, otherwise PM2 may try a hot handoff and the replacement process can fail with `EADDRINUSE`.
- The GitHub Actions workflow forces IPv4 for SSH to avoid runner-side IPv6 connection issues that can surface as `dial tcp ... i/o timeout`.
- On some VPS setups, Git may refuse to pull with `detected dubious ownership`; add the app directory once with:

```bash
git config --global --add safe.directory /home/meetscheduling/htdocs/www.meetscheduling.com
```

## 2) Configure GitHub secrets/variables

Add these in GitHub repository settings:

Required secrets:

- `VPS_HOST` (example: `meetscheduling.com`)
- `VPS_USER` (SSH user on server)
- `VPS_SSH_KEY` (private key matching VPS `authorized_keys`)

Optional secrets:

- `VPS_SSH_PRIVATE_KEY` (legacy alias; the workflow accepts either secret name)
- `VPS_SSH_PORT` (default `22`)
- `VPS_SSH_PASSPHRASE` (only if your private key is encrypted)

Optional repository variables:

- `VPS_APP_DIR` (default used by workflow: `/var/www/meetscheduling`)
- `PM2_APP_NAME` (default: `meetscheduling`)
- `DEPLOY_BRANCH` (default: `main`)
- `HEALTHCHECK_URL` (default: `http://127.0.0.1:8080/api/health`)
- `RUN_MIGRATIONS` (`true` or `false`; default behavior is skip)

## 3) Create the deploy SSH key

Generate a dedicated deploy key locally:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/meetscheduling_github_actions -C "github-actions-deploy"
```

Install the public key on the VPS for the deploy user:

```bash
ssh-copy-id -i ~/.ssh/meetscheduling_github_actions.pub <user>@<host>
```

Or append it manually to `~/.ssh/authorized_keys` for `VPS_USER`.

Then paste the private key into the GitHub secret `VPS_SSH_KEY`:

```bash
cat ~/.ssh/meetscheduling_github_actions
```

Make sure the VPS permissions are correct:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## 4) One-time VPS bootstrap

Install prerequisites on server:

- Node.js 18+
- npm
- PM2 (`npm i -g pm2`)
- Git

Initial app setup:

```bash
mkdir -p /var/www/meetscheduling
cd /var/www/meetscheduling
git clone <your-repo-ssh-url> .
cp .env.example .env
npm ci
mkdir -p logs/pm2
chmod 600 .env
pm2 start ecosystem.config.js --env production
pm2 save
```

Then set real production values in `.env`:

- `NODE_ENV=production`
- `APP_BASE_URL=https://your-domain.com`
- `HOST=127.0.0.1`
- `TRUST_PROXY=1`
- `FORCE_HTTPS=true`
- `DATABASE_URL=postgresql://...` or a private/internal PostgreSQL URL
- `DATABASE_SSL_ENABLED=true`
- `DATABASE_SSL_REJECT_UNAUTHORIZED=true`
- `DATABASE_PRIVATE_NETWORK_REQUIRED=true`
- `DATABASE_PRIVATE_NETWORK_ASSERTED=true` only after confirming the DB is reachable only through private networking or strict firewall allowlists
- `JWT_SECRET=<long-random-secret>`
- `PUBLIC_BOOKING_SIGNING_SECRET=<long-random-secret>`
- `INTEGRATION_TOKEN_SECRET=<long-random-secret>` when Google OAuth is enabled

Optional:

- `HOST_DEFAULT_TIMEZONE`, `SLOT_INTERVAL_MINUTES`
- SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`)
- Google vars (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)

Never commit `.env`, `.env.local`, certificate files, OAuth client secrets, SMTP passwords,
or provider tokens. Keep them only in the server environment, your host secret manager,
or GitHub Actions encrypted secrets where appropriate.

Before the first production start, validate the deployment configuration:

```bash
npm run check-env -- --production
```

This fails fast when HTTPS, loopback binding, database TLS, or private-database assertions are unsafe.

First-run behavior from GitHub Actions:

- the workflow first validates raw SSH login
- if `VPS_APP_DIR` does not exist yet, it clones the repo there automatically
- if `.env` is missing, it creates a placeholder from `.env.example`, stops, and asks you to fill in production secrets on the VPS
- once `.env` is configured, rerun the workflow and it will complete the deploy

## 5) Manual VPS deploy (optional fallback)

Use `deploy.sh` with environment variables:

```bash
DEPLOY_HOST=meetscheduling.com DEPLOY_USER=admin ./deploy.sh
```

Equivalent manual commands on a CloudPanel-style VPS:

```bash
cd /home/meetscheduling/htdocs/www.meetscheduling.com
git config --global --add safe.directory /home/meetscheduling/htdocs/www.meetscheduling.com
git pull --ff-only origin main
npm run check-env -- --production
pm2 restart meetscheduling --update-env
pm2 save
```

Optional overrides:

- `DEPLOY_PORT` (default `22`)
- `DEPLOY_PATH` (default `/var/www/meetscheduling`)
- `DEPLOY_REF` (default `main`)

## 6) TLS proxy and network exposure

Terminate TLS at Nginx/Caddy/Cloudflare and proxy traffic to `127.0.0.1:8080`. A ready-to-adapt
Nginx example is included at [`deploy/nginx/meetscheduling.conf`](/Users/divyanshu/Downloads/Meetscheduling-fixed/deploy/nginx/meetscheduling.conf).

Minimum network rules:

- Allow inbound `80/tcp` and `443/tcp` to the reverse proxy only.
- Do not expose `8080/tcp` publicly; keep the Node app bound to `127.0.0.1`.
- Do not expose `5432/tcp` publicly; allow PostgreSQL only from the app host or a private network.
- If your database provider uses a hostname, enforce provider firewall allowlists or private VPC networking before setting `DATABASE_PRIVATE_NETWORK_ASSERTED=true`.

Example UFW policy on the VPS:

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 8080/tcp
ufw deny 5432/tcp
```

## 7) SSH timeout troubleshooting

If GitHub Actions fails with `dial tcp ... i/o timeout`, the runner could not open a TCP connection to the SSH host. That happens before key authentication, so the usual causes are:

- `VPS_HOST` points at the wrong host or a proxied DNS record instead of the VPS itself
- `VPS_SSH_PORT` is wrong or the SSH daemon is not listening on that port
- the VPS firewall, cloud firewall, or provider security group allows your local IP but blocks GitHub-hosted runners
- the host has a broken IPv6 path; the workflow now forces IPv4 to avoid that class of failure

For the most stable setup, use the VPS public IP or a direct DNS A record for `VPS_HOST`, and verify that the SSH port is reachable from outside your local network.

If GitHub Actions fails with SSH exit code `255`, that usually means authentication or remote shell startup failed. Check:

- `VPS_USER` is correct
- the private key in `VPS_SSH_KEY` matches the public key in `~/.ssh/authorized_keys`
- the SSH daemon allows that user and key
- the deploy user can `cd` into `VPS_APP_DIR`

Manual test:

```bash
ssh -i ~/.ssh/meetscheduling_github_actions -p <port> <user>@<host> 'echo ok && whoami && hostname'
```

## 8) Post-deploy smoke checks

```bash
APP_URL=https://your-domain.com bash scripts/smoke.sh
```

Expected:

- health endpoint ok
- signup requires email verification
- protected routes work with the session cookie
- frontend pages return HTTP 200

## 9) Production checklist

- Replace all placeholder secrets.
- Keep `.env` server-side only and never commit it.
- Restrict `.env` permissions to the app user only (`chmod 600 .env`).
- Run `npm run check-env -- --production` before every production restart.
- Do not expose server-only vars through `NEXT_PUBLIC_`, `REACT_APP_`, `VITE_`, or other browser build-time env prefixes.
- Run `npm run security:scan-secrets` before deploying or pushing secret-related changes.
- Terminate TLS at Nginx/Caddy/Cloudflare and proxy to `127.0.0.1:8080`.
- Restrict PostgreSQL to private networking or firewall allowlists only. Do not expose port `5432` publicly.
- Enable structured log shipping for auth attempts, API errors, and repeated 429/404 traffic.
- Configure SMTP for booking confirmation emails.
- Configure Google credentials for calendar sync.
- Enable PostgreSQL backups.
- Add uptime monitoring for `/api/health`.
- Run smoke tests after every deploy.
