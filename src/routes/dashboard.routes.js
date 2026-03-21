const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const {
  assertEnum,
  assertIsoDate,
  assertInteger,
  assertOptionalString,
  assertTimezone,
} = require("../utils/validation");
const {
  listBookingsForUser,
  listUpcomingBookingsForUser,
  cancelBookingForUser,
} = require("../services/bookings.service");
const { getDashboardOverview } = require("../services/dashboard-overview.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/overview",
  requirePermission("dashboard.overview.read"),
  asyncHandler(async (req, res) => {
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 20 })
      : 5;
    const overview = await getDashboardOverview(req.auth.workspaceId, { limit });
    res.json({ overview });
  })
);

router.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    const timezone = req.query.timezone
      ? assertTimezone(req.query.timezone, "timezone")
      : "UTC";
    const fromDate = req.query.from ? assertIsoDate(req.query.from, "from") : null;
    const toDate = req.query.to ? assertIsoDate(req.query.to, "to") : null;
    const statusQuery = assertOptionalString(req.query.status, "status", { max: 20 });
    const status =
      !statusQuery || statusQuery === "all"
        ? "all"
        : assertEnum(statusQuery, "status", ["confirmed", "canceled"]);

    const bookings = await listBookingsForUser(req.auth.workspaceId, {
      fromDate,
      toDate,
      status,
      timezone,
    });
    res.json({ bookings });
  })
);

router.get(
  "/bookings/upcoming",
  asyncHandler(async (req, res) => {
    const timezone = req.query.timezone
      ? assertTimezone(req.query.timezone, "timezone")
      : "UTC";
    const limit = req.query.limit
      ? assertInteger(req.query.limit, "limit", { min: 1, max: 200 })
      : 20;
    const bookings = await listUpcomingBookingsForUser(req.auth.workspaceId, {
      limit,
      timezone,
    });
    res.json({ bookings });
  })
);

router.post(
  "/bookings/:bookingId/cancel",
  asyncHandler(async (req, res) => {
    const reason = assertOptionalString(req.body?.reason, "reason", { max: 500 });
    const booking = await cancelBookingForUser(
      req.auth.workspaceId,
      req.params.bookingId,
      reason
    );
    res.json({ booking });
  })
);

module.exports = router;
