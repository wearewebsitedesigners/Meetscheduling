const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const publicRateLimit = require("../middleware/public-rate-limit");
const { createRateLimiter } = require("../middleware/rate-limit");
const { badRequest } = require("../utils/http-error");
const { assertOptionalString, assertSlug } = require("../utils/validation");
const { getRequestIp, logSecurityEvent } = require("../utils/security-log");
const {
  getPublishedPageBySlug,
  getPublicAvailability,
  createBookingFromPublicPage,
} = require("../services/page-builder.service");

const router = express.Router();
router.use(publicRateLimit);

const publicWriteRateLimit = createRateLimiter({
  key: "page-public-booking-write",
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many booking attempts. Please try again later.",
  keyFn: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 320);
    return `${String(req.hostname || "").trim().toLowerCase() || "unknown-host"}:${getRequestIp(req)}:page-booking:${email || "anon"}`;
  },
  onLimit: (req, meta) => {
    logSecurityEvent("traffic.page_public_booking_rate_limited", {
      requestId: req.id || "",
      ip: getRequestIp(req),
      host: String(req.hostname || "").trim().toLowerCase() || "unknown-host",
      path: req.originalUrl || req.url || "",
      retryAfterSeconds: meta.retryAfterSeconds,
    }, { level: "warn" });
  },
});

router.get(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    const payload = await getPublishedPageBySlug(assertSlug(req.params.slug, "slug"));
    res.json(payload);
  })
);

router.get(
  "/pages/:slug/availability",
  asyncHandler(async (req, res) => {
    const date = assertOptionalString(req.query.date, "date", { max: 20 });
    if (!date) throw badRequest("date is required");
    const payload = await getPublicAvailability({
      pageSlug: assertSlug(req.params.slug, "slug"),
      serviceId: assertOptionalString(req.query.serviceId, "serviceId", { max: 80 }),
      staffId: assertOptionalString(req.query.staffId, "staffId", { max: 80 }),
      date,
      timezone: assertOptionalString(req.query.timezone, "timezone", { max: 100 }) || undefined,
    });
    res.json(payload);
  })
);

router.get(
  "/availability",
  asyncHandler(async (req, res, next) => {
    const rawPageSlug =
      assertOptionalString(req.query.pageSlug, "pageSlug", { max: 80 }) ||
      assertOptionalString(req.query.slug, "slug", { max: 80 });
    const pageSlug = rawPageSlug ? assertSlug(rawPageSlug, "pageSlug") : "";
    if (!pageSlug) return next();

    const date = assertOptionalString(req.query.date, "date", { max: 20 });
    if (!date) throw badRequest("date is required");
    const payload = await getPublicAvailability({
      pageSlug,
      serviceId: assertOptionalString(req.query.serviceId, "serviceId", { max: 80 }),
      staffId: assertOptionalString(req.query.staffId, "staffId", { max: 80 }),
      date,
      timezone: assertOptionalString(req.query.timezone, "timezone", { max: 100 }) || undefined,
    });
    res.json(payload);
  })
);

router.post(
  "/bookings",
  publicWriteRateLimit,
  asyncHandler(async (req, res) => {
    const payload = await createBookingFromPublicPage(req.body || {});
    res.status(201).json(payload);
  })
);

module.exports = router;
