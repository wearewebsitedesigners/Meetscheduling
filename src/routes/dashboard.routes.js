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
const { query } = require("../db/pool");
const env = require("../config/env");

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

// ── IVR / Confirmation Calls Settings ──────────────────────────────────────

router.get(
  "/ivr-settings",
  asyncHandler(async (req, res) => {
    // Get user's IVR settings
    const userRes = await query(
      `SELECT enable_confirmation_calls, call_delay_minutes
       FROM users
       WHERE id = (
         SELECT owner_user_id FROM workspaces WHERE id = $1
       )`,
      [req.auth.workspaceId]
    );
    const user = userRes.rows[0] || {};

    // Recent calls (last 50)
    const callsRes = await query(
      `SELECT cc.id, cc.status, cc.response, cc.reschedule_reason,
              cc.call_duration_seconds, cc.cost_estimate_usd, cc.created_at,
              b.invitee_name
       FROM confirmation_calls cc
       JOIN bookings b ON b.id = cc.booking_id
       WHERE b.workspace_id = $1
       ORDER BY cc.created_at DESC
       LIMIT 50`,
      [req.auth.workspaceId]
    );

    // Monthly usage
    const month = new Date().toISOString().slice(0, 7);
    const usageRes = await query(
      `SELECT total_calls, total_minutes, total_cost_usd
       FROM call_usage
       WHERE user_id = (SELECT owner_user_id FROM workspaces WHERE id = $1)
         AND month = $2`,
      [req.auth.workspaceId, month]
    );

    res.json({
      settings: {
        enable_confirmation_calls: Boolean(user.enable_confirmation_calls),
        call_delay_minutes: Number(user.call_delay_minutes) || 5,
        twilio_configured: Boolean(env.twilio?.accountSid && env.twilio?.phoneNumber),
      },
      recentCalls: callsRes.rows,
      usage: usageRes.rows[0] || null,
    });
  })
);

router.patch(
  "/ivr-settings",
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const updates = [];
    const params = [];

    if (typeof body.enable_confirmation_calls === "boolean") {
      params.push(body.enable_confirmation_calls);
      updates.push(`enable_confirmation_calls = $${params.length}`);
    }

    if (typeof body.call_delay_minutes === "number") {
      const delay = Math.max(1, Math.min(120, Math.trunc(body.call_delay_minutes)));
      params.push(delay);
      updates.push(`call_delay_minutes = $${params.length}`);
    }

    if (!updates.length) {
      return res.json({ ok: true });
    }

    params.push(req.auth.workspaceId);
    await query(
      `UPDATE users
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = (SELECT owner_user_id FROM workspaces WHERE id = $${params.length})`,
      params
    );

    res.json({ ok: true });
  })
);

module.exports = router;
