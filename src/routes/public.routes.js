const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const publicRateLimit = require("../middleware/public-rate-limit");
const { createRateLimiter } = require("../middleware/rate-limit");
const { badRequest } = require("../utils/http-error");
const { assertSlug } = require("../utils/validation");
const { getRequestIp, logSecurityEvent } = require("../utils/security-log");
const { getPublicEventTypeByUsernameAndSlug } = require("../services/event-types.service");
const {
  generatePublicSlots,
  listPublicBookableDates,
  assertDate,
  assertZone,
} = require("../services/slots.service");
const {
  createPublicBooking,
  getPublicBookingConfirmationForEvent,
} = require("../services/bookings.service");
const {
  getPublicLandingPageByUsername,
  createLandingLeadForUsername,
} = require("../services/landing-page.service");

// ---------------------------------------------------------------------------
// In-memory TTL cache for public event page data (event info + available dates).
// Keyed by "username:slug:timezone". Entries expire after 60 s.
// Slots per date are cached separately keyed by "username:slug:date:timezone".
// Both caches are bounded at 500 entries to prevent unbounded growth.
// ---------------------------------------------------------------------------
const EVENT_CACHE_TTL = 600_000;  // 10 minutes — busted on new booking
const SLOT_CACHE_TTL  = 300_000;  // 5 minutes

const eventPageCache = new Map(); // key → { data, expiresAt }
const slotCache      = new Map(); // key → { data, expiresAt }

function _getCached(map, key) {
  const entry = map.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data;
}

function _setCached(map, key, data, ttl) {
  map.set(key, { data, expiresAt: Date.now() + ttl });
  if (map.size > 500) {
    map.delete(map.keys().next().value);
  }
}

/** Remove all cache entries that belong to a given event (by eventTypeId). */
function bustEventCache(eventTypeId) {
  for (const [key, entry] of eventPageCache) {
    if (entry.data?.eventTypeId === eventTypeId) eventPageCache.delete(key);
  }
  for (const [key, entry] of slotCache) {
    if (entry.data?.eventTypeId === eventTypeId) slotCache.delete(key);
  }
}

const router = express.Router();
router.use(publicRateLimit);

const publicWriteRateLimit = createRateLimiter({
  key: "public-write",
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many form submissions. Please try again later.",
  keyFn: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 320);
    return `${String(req.hostname || "").trim().toLowerCase() || "unknown-host"}:${getRequestIp(req)}:${req.path}:${email || "anon"}`;
  },
  onLimit: (req, meta) => {
    logSecurityEvent("traffic.public_write_rate_limited", {
      requestId: req.id || "",
      ip: getRequestIp(req),
      host: String(req.hostname || "").trim().toLowerCase() || "unknown-host",
      path: req.originalUrl || req.url || "",
      retryAfterSeconds: meta.retryAfterSeconds,
    }, { level: "warn" });
  },
});

function detectVisitorTimezone(req) {
  const fromQuery = req.query.timezone;
  const fromHeader = req.headers["x-timezone"];
  const fromBody = req.body?.timezone;
  const fallback = "UTC";
  const preferred = fromQuery || fromHeader || fromBody || fallback;
  return assertZone(preferred, "timezone");
}

function readPublicRouteParams(req) {
  return {
    username: assertSlug(req.params.username, "username"),
    slug: assertSlug(req.params.slug, "slug"),
  };
}

router.get(
  "/landing/:username",
  asyncHandler(async (req, res) => {
    const username = assertSlug(req.params.username, "username");
    const landingPage = await getPublicLandingPageByUsername(username);
    res.json({ landingPage });
  })
);

router.post(
  "/landing/:username/leads",
  publicWriteRateLimit,
  asyncHandler(async (req, res) => {
    const username = assertSlug(req.params.username, "username");
    const lead = await createLandingLeadForUsername(username, req.body || {}, {
      sourceUrl: req.body?.sourceUrl || req.headers.referer || "",
    });
    res.status(201).json({ lead });
  })
);

router.get(
  "/:username/:slug",
  asyncHandler(async (req, res) => {
    const { username, slug } = readPublicRouteParams(req);
    const visitorTimezone = detectVisitorTimezone(req);

    const cacheKey = `${username}:${slug}:${visitorTimezone}`;
    const cached = _getCached(eventPageCache, cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res.json(cached);
    }

    // Fetch event once and pass it into listPublicBookableDates so it is not
    // re-fetched internally by preparePublicSchedulingContext.
    const event = await getPublicEventTypeByUsernameAndSlug(username, slug);
    const dates = await listPublicBookableDates({
      username,
      slug,
      visitorTimezone,
      event,
    });

    const responseData = {
      eventTypeId: event.id, // used by cache busting
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        slug: event.slug,
        hostName: event.display_name,
        username: event.username,
        hostTimezone: event.timezone,
        locationType: event.location_type,
        durationMinutes: event.duration_minutes,
        bufferBeforeMin: event.buffer_before_min,
        bufferAfterMin: event.buffer_after_min,
        customQuestions: Array.isArray(event.custom_questions) ? event.custom_questions : [],
        color: event.color || null,
        brandLogoUrl: event.brand_logo_url || null,
        brandTagline: event.brand_tagline || null,
        sidebarMessage: event.sidebar_message || null,
        brandBgColor: event.brand_bg_color || null,
      },
      visitorTimezone,
      dates,
    };

    _setCached(eventPageCache, cacheKey, responseData, EVENT_CACHE_TTL);
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json(responseData);
  })
);

router.get(
  "/:username/:slug/slots",
  asyncHandler(async (req, res) => {
    const { username, slug } = readPublicRouteParams(req);
    const date = req.query.date;
    if (!date) throw badRequest("date is required");
    const safeDate = assertDate(date, "date");
    const visitorTimezone = detectVisitorTimezone(req);

    const cacheKey = `${username}:${slug}:${safeDate}:${visitorTimezone}`;
    const cached = _getCached(slotCache, cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res.json(cached);
    }

    const payload = await generatePublicSlots({
      username,
      slug,
      visitorDate: safeDate,
      visitorTimezone,
    });

    _setCached(slotCache, cacheKey, payload, SLOT_CACHE_TTL);
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json(payload);
  })
);

router.get(
  "/:username/:slug/bookings/:bookingId",
  asyncHandler(async (req, res) => {
    const { username, slug } = readPublicRouteParams(req);
    const visitorTimezone = detectVisitorTimezone(req);
    const event = await getPublicEventTypeByUsernameAndSlug(username, slug);
    const booking = await getPublicBookingConfirmationForEvent(event, req.params.bookingId, {
      timezone: visitorTimezone,
    });

    res.json({
      booking,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        slug: event.slug,
        hostName: event.display_name,
        username: event.username,
        hostTimezone: event.timezone,
        locationType: event.location_type,
        durationMinutes: event.duration_minutes,
        bufferBeforeMin: event.buffer_before_min,
        bufferAfterMin: event.buffer_after_min,
      },
      visitorTimezone,
      publicBookingUrl: `/${encodeURIComponent(event.username)}/${encodeURIComponent(event.slug)}`,
      landingUrl: `/${encodeURIComponent(event.username)}`,
    });
  })
);

router.post(
  "/:username/:slug/bookings",
  publicWriteRateLimit,
  asyncHandler(async (req, res) => {
    const { username, slug } = readPublicRouteParams(req);
    const body = req.body || {};
    const visitorTimezone = detectVisitorTimezone(req);
    const result = await createPublicBooking({
      username,
      slug,
      visitorDate: body.visitorDate || body.date,
      visitorTimezone,
      startAtUtc: body.startAtUtc,
      slotToken: body.slotToken,
      inviteeName: body.name,
      inviteeEmail: body.email,
      inviteePhone: body.phone || "",
      inviteeCompany: body.company || "",
      source: body.source || "booking_link",
      notes: body.notes || "",
      answers: Array.isArray(body.answers) ? body.answers : [],
    });
    // Bust the event page + slot caches so the next visitor sees fresh availability.
    if (result?.booking?.event_type_id) bustEventCache(result.booking.event_type_id);
    res.status(201).json({
      ...result,
      publicBookingUrl: `/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
      landingUrl: `/${encodeURIComponent(username)}`,
    });
  })
);

module.exports = router;
