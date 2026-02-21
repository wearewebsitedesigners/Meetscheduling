# Meetscheduling (Meetscheduling-style backend)

Production-focused backend for a meeting scheduling SaaS, built with:

- Node.js + Express
- PostgreSQL
- JWT auth middleware
- Server-side slot generation with timezone conversion
- Booking management APIs
- Plan enforcement (`free` vs `pro`)

The existing frontend files (`index.html`, `login.html`, `dashboard.html`) are still served statically.

## Implemented Features

### 1) Event Type System

- Create / edit / delete event types
- Toggle active/inactive
- Event fields:
  - `title`
  - `description`
  - `durationMinutes`
  - `slug` (unique per user)
  - `locationType` (`google_meet`, `zoom`, `custom`, `in_person`)
  - `customLocation`
  - `bufferBeforeMin`
  - `bufferAfterMin`
  - `maxBookingsPerDay`

### 2) Availability System

- Weekly availability (Mon-Sun)
- Date overrides
- Block full specific dates
- Stored in PostgreSQL and used by slot generation

### 3) Real Slot Generation (Server-side)

Public API supports `username + event slug` and:

- Validates visitor timezone
- Converts host availability into visitor timezone
- Generates slots dynamically
- Excludes booked/conflicting times
- Respects `duration + buffers`
- Respects `maxBookingsPerDay`

### 4) Booking Flow

- Visitor submits:
  - selected date/time
  - name/email/notes
- On confirm:
  - server re-validates slot
  - prevents double booking (DB unique + conflict handling)
  - stores booking in DB
  - generates meeting link when needed
  - sends confirmation email (if SMTP configured)

### 5) Dashboard Booking Management

Authenticated APIs for:

- list all bookings
- filter by date/status
- list upcoming bookings
- cancel booking

### 6) SaaS-ready Plan Limits

- `free`: max 1 event type
- `pro`: unlimited event types
- Limit is enforced in event-type creation API

### 7) Production-ready Architecture

- Clean folder structure (`src/config`, `src/db`, `src/routes`, `src/services`, `src/middleware`)
- Validation helpers
- Auth middleware (`Bearer JWT`)
- Public route throttling
- Signed slot token verification for secure public booking confirm

---

## Folder Structure

```txt
src/
  app.js
  server.js
  config/
    env.js
  db/
    pool.js
    migrate.js
    seed.js
    sql/
      001_init.sql
      002_integrations_schema.sql
      003_productivity_modules.sql
  middleware/
    async-handler.js
    auth.js
    error-handler.js
    public-rate-limit.js
  routes/
    auth.routes.js
    event-types.routes.js
    availability.routes.js
    public.routes.js
    dashboard.routes.js
    integrations.routes.js
    contacts.routes.js
    workflows.routes.js
    routing.routes.js
  services/
    users.service.js
    event-types.service.js
    availability.service.js
    slots.service.js
    bookings.service.js
    meeting-link.service.js
    email.service.js
    integrations.service.js
    contacts.service.js
    workflows.service.js
    routing.service.js
  utils/
    booking-token.js
    http-error.js
    plans.js
    slug.js
    time.js
    validation.js
scripts/
  migrate.js
  seed.js
```

---

## Environment

Copy and fill:

```bash
cp .env.example .env
```

Required for backend:

- `DATABASE_URL`
- `JWT_SECRET`
- `PUBLIC_BOOKING_SIGNING_SECRET`

Optional:

- SMTP vars for confirmation emails
- Google vars for future calendar integration depth

---

## Setup

```bash
npm install
npm run migrate
npm run seed
npm start
```

Server runs on:

- `http://localhost:8080`

## Smoke Test

After local start or production deploy, run:

```bash
bash scripts/smoke.sh
```

For production:

```bash
APP_URL=https://your-domain.com bash scripts/smoke.sh
```

## Deployment

See `DEPLOYMENT.md` for Railway/Render deployment steps and production checklist.

---

## API Overview

### Auth

- `POST /api/auth/dev-login`
  - Body: `{ "email", "username?", "displayName?", "timezone?", "plan?" }`
  - Returns JWT token
- `GET /api/auth/me` (Bearer token)

### Event Types (auth required)

- `GET /api/event-types`
- `POST /api/event-types`
- `GET /api/event-types/:eventTypeId`
- `PATCH /api/event-types/:eventTypeId`
- `PATCH /api/event-types/:eventTypeId/active`
- `DELETE /api/event-types/:eventTypeId`

### Availability (auth required)

- `GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `PUT /api/availability/weekly`
  - Body: `{ "slots": [{ "weekday", "startTime", "endTime", "isAvailable?" }] }`
- `POST /api/availability/overrides`
  - Body:
    - Available override: `{ "overrideDate", "isAvailable": true, "startTime", "endTime", "note?" }`
    - Block date: `{ "overrideDate", "isAvailable": false, "note?" }`
- `DELETE /api/availability/overrides/:overrideId`

### Public booking routes (no auth)

- `GET /api/public/:username/:slug?timezone=...`
- `GET /api/public/:username/:slug/slots?date=YYYY-MM-DD&timezone=...`
- `POST /api/public/:username/:slug/bookings`
  - Body:
    - `visitorDate`
    - `startAtUtc`
    - `slotToken`
    - `name`
    - `email`
    - `notes?`
    - `timezone` (optional; can also pass as query/header)

### Dashboard booking management (auth required)

- `GET /api/dashboard/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD&status=all|confirmed|canceled&timezone=...`
- `GET /api/dashboard/bookings/upcoming?limit=20&timezone=...`
- `POST /api/dashboard/bookings/:bookingId/cancel`
  - Body: `{ "reason?" }`

### Integrations (auth required)

- `GET /api/integrations?tab=discover|manage&filter=all|connected|available&search=&sort=most_popular|a_z|category`
- `POST /api/integrations/connect`
  - Body: `{ "provider", "displayName?", "category?", "accountEmail?", "metadata?" }`
- `POST /api/integrations/connect-all`
- `POST /api/integrations/disconnect-all`
- `PATCH /api/integrations/:provider/configure`
  - Body: `{ "accountEmail?", "metadata?" }`
- `PATCH /api/integrations/:provider/connection`
  - Body: `{ "connected": true|false }`
- `POST /api/integrations/:provider/connect`
- `POST /api/integrations/:provider/disconnect`
- `DELETE /api/integrations/:provider`

### Contacts (auth required)

- `GET /api/contacts?search=&filter=all|lead|customer|vip`
- `POST /api/contacts`
- `PATCH /api/contacts/:contactId`
- `DELETE /api/contacts/:contactId`

### Workflows (auth required)

- `GET /api/workflows?search=&filter=all|active|paused|draft`
- `POST /api/workflows`
- `PATCH /api/workflows/:workflowId`
- `POST /api/workflows/:workflowId/run`
- `POST /api/workflows/:workflowId/duplicate`
- `DELETE /api/workflows/:workflowId`

### Routing (auth required)

- `GET /api/routing?search=&filter=all|active|paused`
- `POST /api/routing/forms`
- `PATCH /api/routing/forms/:formId`
- `DELETE /api/routing/forms/:formId`
- `POST /api/routing/leads`
- `PATCH /api/routing/leads/:leadId`
- `POST /api/routing/leads/:leadId/route`
- `DELETE /api/routing/leads/:leadId`

---

## Notes

- Slot generation is server-side and timezone-aware.
- Booking confirmation is protected by signed slot tokens.
- Double booking is blocked by DB uniqueness + transactional insert handling.
- Email sending is safe-fallback: booking still succeeds if SMTP is not configured.
