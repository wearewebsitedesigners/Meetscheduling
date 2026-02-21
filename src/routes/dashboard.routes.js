const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertIsoDate, assertInteger, assertOptionalString, assertTimezone } = require("../utils/validation");
const {
  listBookingsForUser,
  listUpcomingBookingsForUser,
  cancelBookingForUser,
} = require("../services/bookings.service");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    const timezone = req.query.timezone
      ? assertTimezone(req.query.timezone, "timezone")
      : "UTC";
    const fromDate = req.query.from ? assertIsoDate(req.query.from, "from") : null;
    const toDate = req.query.to ? assertIsoDate(req.query.to, "to") : null;
    const status =
      req.query.status === "confirmed" || req.query.status === "canceled"
        ? req.query.status
        : "all";

    const bookings = await listBookingsForUser(req.auth.userId, {
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
    const bookings = await listUpcomingBookingsForUser(req.auth.userId, {
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
      req.auth.userId,
      req.params.bookingId,
      reason
    );
    res.json({ booking });
  })
);

module.exports = router;

