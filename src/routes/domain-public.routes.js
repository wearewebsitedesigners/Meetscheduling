const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const publicRateLimit = require("../middleware/public-rate-limit");
const { createRateLimiter } = require("../middleware/rate-limit");
const { badRequest, notFound } = require("../utils/http-error");
const { getRequestIp, logSecurityEvent } = require("../utils/security-log");
const {
  getPublicEventTypeByUsernameAndSlug,
} = require("../services/event-types.service");
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
const { getPublishedPageBySlug } = require("../services/landing-builder.service");

const ACTIVE_DOMAIN_STATUSES = new Set(["active", "verified", "ssl_pending"]);

function requireResolvedDomain(req, res, next) {
  const domain = req.customDomain;
  if (!domain) {
    return next(notFound("Custom domain not found"));
  }
  if (!ACTIVE_DOMAIN_STATUSES.has(String(domain.status || "").trim().toLowerCase())) {
    return next(notFound("Custom domain is not active yet"));
  }
  return next();
}

function detectVisitorTimezone(req) {
  const fromQuery = req.query.timezone;
  const fromHeader = req.headers["x-timezone"];
  const fromBody = req.body?.timezone;
  return assertZone(fromQuery || fromHeader || fromBody || "UTC", "timezone");
}

function requireBookingTarget(domain) {
  if (!domain || domain.targetType !== "booking_page") {
    throw notFound("This custom domain is not assigned to a booking page");
  }
  if (!domain.connectedPage?.username || !domain.connectedPage?.slug) {
    throw notFound("Booking page target is unavailable");
  }
}

function requireLandingTarget(domain) {
  if (!domain || domain.targetType !== "landing_page") {
    throw notFound("This custom domain is not assigned to a landing page");
  }
  if (!domain.connectedPage?.slug) {
    throw notFound("Landing page target is unavailable");
  }
}

const router = express.Router();
router.use(publicRateLimit);
router.use(requireResolvedDomain);

const publicWriteRateLimit = createRateLimiter({
  key: "domain-public-write",
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many form submissions. Please try again later.",
  keyFn: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 320);
    return `${String(req.hostname || "").trim().toLowerCase() || "unknown-host"}:${getRequestIp(req)}:${req.path}:${email || "anon"}`;
  },
  onLimit: (req, meta) => {
    logSecurityEvent("traffic.domain_public_write_rate_limited", {
      requestId: req.id || "",
      ip: getRequestIp(req),
      host: String(req.hostname || "").trim().toLowerCase() || "unknown-host",
      path: req.originalUrl || req.url || "",
      retryAfterSeconds: meta.retryAfterSeconds,
    }, { level: "warn" });
  },
});

router.get(
  "/booking",
  asyncHandler(async (req, res) => {
    const domain = req.customDomain;
    requireBookingTarget(domain);

    const visitorTimezone = detectVisitorTimezone(req);
    const event = await getPublicEventTypeByUsernameAndSlug(
      domain.connectedPage.username,
      domain.connectedPage.slug
    );
    const dates = await listPublicBookableDates({
      username: domain.connectedPage.username,
      slug: domain.connectedPage.slug,
      visitorTimezone,
    });

    res.json({
      domain,
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
      dates,
    });
  })
);

router.get(
  "/booking/slots",
  asyncHandler(async (req, res) => {
    const domain = req.customDomain;
    requireBookingTarget(domain);

    const date = req.query.date;
    if (!date) throw badRequest("date is required");
    const safeDate = assertDate(date, "date");
    const visitorTimezone = detectVisitorTimezone(req);

    const payload = await generatePublicSlots({
      username: domain.connectedPage.username,
      slug: domain.connectedPage.slug,
      visitorDate: safeDate,
      visitorTimezone,
    });
    res.json(payload);
  })
);

router.get(
  "/booking/bookings/:bookingId",
  asyncHandler(async (req, res) => {
    const domain = req.customDomain;
    requireBookingTarget(domain);

    const visitorTimezone = detectVisitorTimezone(req);
    const event = await getPublicEventTypeByUsernameAndSlug(
      domain.connectedPage.username,
      domain.connectedPage.slug
    );
    const booking = await getPublicBookingConfirmationForEvent(event, req.params.bookingId, {
      timezone: visitorTimezone,
    });

    res.json({
      domain,
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
      publicBookingUrl: "/",
      landingUrl: "/",
    });
  })
);

router.post(
  "/booking/bookings",
  publicWriteRateLimit,
  asyncHandler(async (req, res) => {
    const domain = req.customDomain;
    requireBookingTarget(domain);

    const body = req.body || {};
    const visitorTimezone = detectVisitorTimezone(req);
    const result = await createPublicBooking({
      username: domain.connectedPage.username,
      slug: domain.connectedPage.slug,
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
    res.status(201).json({
      ...result,
      publicBookingUrl: "/",
      landingUrl: "/",
    });
  })
);

router.get(
  "/landing",
  asyncHandler(async (req, res) => {
    const domain = req.customDomain;
    requireLandingTarget(domain);

    const payload = await getPublishedPageBySlug(domain.connectedPage.slug);
    res.json({
      ...payload,
      domain,
    });
  })
);

module.exports = router;
