# Meetscheduling Deployment Guide

This guide is for taking your project live with production-safe settings and repeatable checks.

## 1) Choose hosting

Recommended stack:

- App host: Railway or Render
- Database: Managed PostgreSQL (Railway Postgres, Neon, Supabase, Render Postgres)

## 2) Required environment variables

Set these on your hosting platform:

- `NODE_ENV=production`
- `PORT` (platform usually injects this automatically)
- `APP_BASE_URL=https://your-domain.com`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=<long-random-secret>`
- `PUBLIC_BOOKING_SIGNING_SECRET=<long-random-secret>`

Optional:

- `HOST_DEFAULT_TIMEZONE=UTC`
- `SLOT_INTERVAL_MINUTES=15`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`

## 3) Build/start commands

This project uses Node runtime directly.

- Install: `npm install`
- Start: `npm start`

Server boot already runs migrations and seed defaults.

## 4) Deploy on Railway (quick path)

1. Push project to GitHub.
2. Create Railway project -> Deploy from GitHub repo.
3. Add PostgreSQL plugin.
4. Set env vars from section 2.
5. Add custom domain and SSL.

## 5) Deploy on Render

1. New Web Service -> connect GitHub repo.
2. Runtime: Node.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add managed PostgreSQL and connect `DATABASE_URL`.
6. Set all env vars.
7. Add custom domain + SSL.

## 6) Post-deploy smoke checks

Run:

```bash
APP_URL=https://your-domain.com bash scripts/smoke.sh
```

Expected:

- health endpoint ok
- auth/dev-login returns token
- protected routes work with token
- frontend pages return HTTP 200

## 7) Production checklist

- Replace all placeholder secrets.
- Configure SMTP for booking confirmation emails.
- Configure Google credentials for calendar sync depth.
- Enable backups on PostgreSQL.
- Add uptime monitoring for `/api/health`.
- Run smoke script after each deploy.

