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
- `RUN_MIGRATIONS` (`true` or `false`; default behavior is skip)

## 3) One-time VPS bootstrap

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
pm2 start src/server.js --name meetscheduling --time
pm2 save
```

Then set real production values in `.env`:

- `NODE_ENV=production`
- `APP_BASE_URL=https://your-domain.com`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=<long-random-secret>`
- `PUBLIC_BOOKING_SIGNING_SECRET=<long-random-secret>`

Optional:

- `HOST_DEFAULT_TIMEZONE`, `SLOT_INTERVAL_MINUTES`
- SMTP vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`)
- Google vars (`GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)

## 4) Manual VPS deploy (optional fallback)

Use `deploy.sh` with environment variables:

```bash
DEPLOY_HOST=meetscheduling.com DEPLOY_USER=admin ./deploy.sh
```

Equivalent manual commands on a CloudPanel-style VPS:

```bash
cd /home/meetscheduling/htdocs/www.meetscheduling.com
git config --global --add safe.directory /home/meetscheduling/htdocs/www.meetscheduling.com
git pull --ff-only origin main
pm2 restart meetscheduling --update-env
pm2 save
```

Optional overrides:

- `DEPLOY_PORT` (default `22`)
- `DEPLOY_PATH` (default `/var/www/meetscheduling`)
- `DEPLOY_REF` (default `main`)

## 5) SSH timeout troubleshooting

If GitHub Actions fails with `dial tcp ... i/o timeout`, the runner could not open a TCP connection to the SSH host. That happens before key authentication, so the usual causes are:

- `VPS_HOST` points at the wrong host or a proxied DNS record instead of the VPS itself
- `VPS_SSH_PORT` is wrong or the SSH daemon is not listening on that port
- the VPS firewall, cloud firewall, or provider security group allows your local IP but blocks GitHub-hosted runners
- the host has a broken IPv6 path; the workflow now forces IPv4 to avoid that class of failure

For the most stable setup, use the VPS public IP or a direct DNS A record for `VPS_HOST`, and verify that the SSH port is reachable from outside your local network.

## 6) Post-deploy smoke checks

```bash
APP_URL=https://your-domain.com bash scripts/smoke.sh
```

Expected:

- health endpoint ok
- signup returns token
- protected routes work with token
- frontend pages return HTTP 200

## 7) Production checklist

- Replace all placeholder secrets.
- Configure SMTP for booking confirmation emails.
- Configure Google credentials for calendar sync.
- Enable PostgreSQL backups.
- Add uptime monitoring for `/api/health`.
- Run smoke tests after every deploy.
