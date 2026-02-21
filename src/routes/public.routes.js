const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const publicRateLimit = require("../middleware/public-rate-limit");
const { badRequest } = require("../utils/http-error");
const { DateTime } = require("luxon");
const { getPublicEventTypeByUsernameAndSlug } = require("../services/event-types.service");
const { generatePublicSlots, assertDate, assertZone } = require("../services/slots.service");
const { createPublicBooking } = require("../services/bookings.service");
const {
  getPublicLandingPageByUsername,
  createLandingLeadForUsername,
} = require("../services/landing-page.service");

const router = express.Router();
router.use(publicRateLimit);

function detectVisitorTimezone(req) {
  const fromQuery = req.query.timezone;
  const fromHeader = req.headers["x-timezone"];
  const fromBody = req.body?.timezone;
  const fallback = "UTC";
  const preferred = fromQuery || fromHeader || fromBody || fallback;
  return assertZone(preferred, "timezone");
}

function nextDates(timezone, count = 14) {
  const today = DateTime.now().setZone(timezone).startOf("day");
  return Array.from({ length: count }, (_, index) =>
    today.plus({ days: index }).toFormat("yyyy-LL-dd")
  );
}

router.get(
  "/landing/:username",
  asyncHandler(async (req, res) => {
    const landingPage = await getPublicLandingPageByUsername(req.params.username);
    res.json({ landingPage });
  })
);

router.post(
  "/landing/:username/leads",
  asyncHandler(async (req, res) => {
    const lead = await createLandingLeadForUsername(req.params.username, req.body || {}, {
      sourceUrl: req.body?.sourceUrl || req.headers.referer || "",
    });
    res.status(201).json({ lead });
  })
);

router.get(
  "/:username/:slug",
  asyncHandler(async (req, res) => {
    const visitorTimezone = detectVisitorTimezone(req);
    const event = await getPublicEventTypeByUsernameAndSlug(
      req.params.username,
      req.params.slug
    );
    res.json({
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
      dates: nextDates(visitorTimezone),
    });
  })
);

router.get(
  "/:username/:slug/slots",
  asyncHandler(async (req, res) => {
    const date = req.query.date;
    if (!date) throw badRequest("date is required");
    const safeDate = assertDate(date, "date");
    const visitorTimezone = detectVisitorTimezone(req);

    const payload = await generatePublicSlots({
      username: req.params.username,
      slug: req.params.slug,
      visitorDate: safeDate,
      visitorTimezone,
    });
    res.json(payload);
  })
);

router.post(
  "/:username/:slug/bookings",
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const visitorTimezone = detectVisitorTimezone(req);
    const result = await createPublicBooking({
      username: req.params.username,
      slug: req.params.slug,
      visitorDate: body.visitorDate || body.date,
      visitorTimezone,
      startAtUtc: body.startAtUtc,
      slotToken: body.slotToken,
      inviteeName: body.name,
      inviteeEmail: body.email,
      notes: body.notes || "",
    });
    res.status(201).json(result);
  })
);

module.exports = router;
