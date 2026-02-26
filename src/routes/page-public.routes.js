const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const publicRateLimit = require("../middleware/public-rate-limit");
const { badRequest } = require("../utils/http-error");
const {
  getPublishedPageBySlug,
  getPublicAvailability,
  createBookingFromPublicPage,
} = require("../services/page-builder.service");

const router = express.Router();
router.use(publicRateLimit);

router.get(
  "/pages/:slug",
  asyncHandler(async (req, res) => {
    const payload = await getPublishedPageBySlug(req.params.slug);
    res.json(payload);
  })
);

router.get(
  "/pages/:slug/availability",
  asyncHandler(async (req, res) => {
    const date = String(req.query.date || "").trim();
    if (!date) throw badRequest("date is required");
    const payload = await getPublicAvailability({
      pageSlug: req.params.slug,
      serviceId: String(req.query.serviceId || "").trim(),
      staffId: String(req.query.staffId || "").trim(),
      date,
      timezone: req.query.timezone,
    });
    res.json(payload);
  })
);

router.get(
  "/availability",
  asyncHandler(async (req, res, next) => {
    const pageSlug = String(req.query.pageSlug || req.query.slug || "").trim();
    if (!pageSlug) return next();

    const date = String(req.query.date || "").trim();
    if (!date) throw badRequest("date is required");
    const payload = await getPublicAvailability({
      pageSlug,
      serviceId: String(req.query.serviceId || "").trim(),
      staffId: String(req.query.staffId || "").trim(),
      date,
      timezone: req.query.timezone,
    });
    res.json(payload);
  })
);

router.post(
  "/bookings",
  asyncHandler(async (req, res) => {
    const payload = await createBookingFromPublicPage(req.body || {});
    res.status(201).json(payload);
  })
);

module.exports = router;
