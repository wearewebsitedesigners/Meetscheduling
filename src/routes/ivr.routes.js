/**
 * IVR Routes — Twilio webhook endpoints for confirmation calls.
 *
 * Twilio POSTs application/x-www-form-urlencoded to these endpoints.
 * Each handler returns TwiML XML telling Twilio what to say/do next.
 *
 * Routes (no auth — called by Twilio's servers):
 *   POST /api/ivr/welcome           — Initial IVR greeting
 *   POST /api/ivr/handle-response   — Handle press 1 (confirm) or 2 (reschedule)
 *   POST /api/ivr/reschedule-reason — Record reschedule reason
 *   POST /api/ivr/status            — Twilio call status callback (JSON response)
 */

const { Router } = require("express");
const { DateTime } = require("luxon");
const { query } = require("../db/pool");
const { scheduleRetryCall } = require("../services/ivr.service");
const { logSecurityEvent } = require("../utils/security-log");

const router = Router();

// ---------------------------------------------------------------------------
// TwiML helpers — build XML strings without needing the full Twilio SDK
// ---------------------------------------------------------------------------

function twimlResponse(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

function say(text) {
  // Polly.Joanna is an AWS Polly neural voice available via Twilio
  const safe = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<Say voice="Polly.Joanna" language="en-US">${safe}</Say>`;
}

function gather(attrs, inner) {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return `<Gather ${attrStr}>${inner}</Gather>`;
}

function redirect(url) {
  return `<Redirect>${url}</Redirect>`;
}

function sendTwiml(res, inner) {
  res.set("Content-Type", "text/xml");
  return res.send(twimlResponse(inner));
}

// ---------------------------------------------------------------------------
// POST /api/ivr/welcome
// ---------------------------------------------------------------------------

router.post("/welcome", async (req, res) => {
  const callId = String(req.query.callId || "").trim();
  if (!callId) {
    return sendTwiml(res, say("Sorry, we could not find your booking.") + "<Hangup/>");
  }

  // Voicemail detection — hang up silently, Twilio will fire a 'no-answer' status
  const answeredBy = String(req.body.AnsweredBy || "");
  if (answeredBy === "machine_start" || answeredBy === "machine_end_beep") {
    return sendTwiml(res, "<Hangup/>");
  }

  try {
    const result = await query(
      `SELECT cc.id, cc.status,
              b.invitee_name, b.start_at_utc, b.visitor_timezone,
              u.display_name AS host_name
       FROM confirmation_calls cc
       JOIN bookings b ON b.id = cc.booking_id
       JOIN users u ON u.id = b.user_id
       WHERE cc.id = $1`,
      [callId]
    );

    const call = result.rows[0];
    if (!call) {
      return sendTwiml(res, say("Sorry, we could not find your booking.") + "<Hangup/>");
    }

    // Already actioned
    if (["confirmed", "reschedule_requested"].includes(call.status)) {
      return sendTwiml(res, say("This meeting has already been actioned. Thank you. Goodbye.") + "<Hangup/>");
    }

    const tz = call.visitor_timezone || "UTC";
    const dt = DateTime.fromJSDate(new Date(call.start_at_utc), { zone: "UTC" }).setZone(tz);
    const meetingDate = dt.toFormat("EEEE, MMMM d");
    const meetingTime = dt.toFormat("h:mm a");

    const message =
      `Hi ${call.invitee_name}. This is a confirmation call for your meeting ` +
      `with ${call.host_name} on ${meetingDate} at ${meetingTime}. ` +
      `Press 1 to confirm your attendance. ` +
      `Press 2 to reschedule.`;

    const gatherBlock = gather(
      {
        input: "dtmf",
        numDigits: "1",
        action: `/api/ivr/handle-response?callId=${encodeURIComponent(callId)}`,
        method: "POST",
        timeout: "10",
      },
      say(message)
    );

    // If caller doesn't press anything, repeat the greeting once more
    const noInputFallback =
      say("We did not receive your input. Please try again.") +
      redirect(`/api/ivr/welcome?callId=${encodeURIComponent(callId)}`);

    return sendTwiml(res, gatherBlock + noInputFallback);
  } catch (err) {
    logSecurityEvent("ivr.welcome_error", { callId, error: err?.message }, { level: "error" });
    return sendTwiml(res, say("Sorry, an error occurred. Goodbye.") + "<Hangup/>");
  }
});

// ---------------------------------------------------------------------------
// POST /api/ivr/handle-response
// ---------------------------------------------------------------------------

router.post("/handle-response", async (req, res) => {
  const callId = String(req.query.callId || "").trim();
  const digits = String(req.body.Digits || "").trim();

  if (!callId) return sendTwiml(res, "<Hangup/>");

  try {
    if (digits === "1") {
      // ── CONFIRMED ────────────────────────────────────────────────────────
      await query(
        `UPDATE confirmation_calls
         SET status = 'confirmed', response = 'confirmed',
             completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [callId]
      );

      await query(
        `UPDATE bookings
         SET is_confirmed = TRUE, updated_at = NOW()
         WHERE id = (SELECT booking_id FROM confirmation_calls WHERE id = $1)`,
        [callId]
      );

      return sendTwiml(
        res,
        say(
          "Thank you! Your meeting is confirmed. " +
            "You will receive a reminder before the meeting. Goodbye!"
        ) + "<Hangup/>"
      );
    } else if (digits === "2") {
      // ── RESCHEDULE ───────────────────────────────────────────────────────
      const reasonGather = gather(
        {
          input: "dtmf",
          numDigits: "1",
          action: `/api/ivr/reschedule-reason?callId=${encodeURIComponent(callId)}`,
          method: "POST",
          timeout: "10",
        },
        say(
          "We understand you need to reschedule. " +
            "Press 1 for scheduling conflict. " +
            "Press 2 for emergency. " +
            "Press 3 for other reason."
        )
      );

      return sendTwiml(
        res,
        reasonGather +
          say("We did not receive your selection. Goodbye.") +
          "<Hangup/>"
      );
    } else {
      // ── INVALID INPUT ────────────────────────────────────────────────────
      return sendTwiml(
        res,
        say("Invalid selection.") +
          redirect(`/api/ivr/welcome?callId=${encodeURIComponent(callId)}`)
      );
    }
  } catch (err) {
    logSecurityEvent("ivr.handle_response_error", { callId, error: err?.message }, { level: "error" });
    return sendTwiml(res, say("Sorry, an error occurred. Goodbye.") + "<Hangup/>");
  }
});

// ---------------------------------------------------------------------------
// POST /api/ivr/reschedule-reason
// ---------------------------------------------------------------------------

router.post("/reschedule-reason", async (req, res) => {
  const callId = String(req.query.callId || "").trim();
  const digits = String(req.body.Digits || "").trim();

  if (!callId) return sendTwiml(res, "<Hangup/>");

  const reasonMap = {
    "1": "Scheduling conflict",
    "2": "Emergency",
    "3": "Other reason",
  };
  const reason = reasonMap[digits] || "Unspecified";

  try {
    await query(
      `UPDATE confirmation_calls
       SET status = 'reschedule_requested', response = 'reschedule',
           reschedule_reason = $1, completed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [reason, callId]
    );

    return sendTwiml(
      res,
      say(
        `Thank you. Your reschedule request has been noted. Reason: ${reason}. ` +
          `The host will reach out to you with new time options. Goodbye!`
      ) + "<Hangup/>"
    );
  } catch (err) {
    logSecurityEvent("ivr.reschedule_reason_error", { callId, error: err?.message }, { level: "error" });
    return sendTwiml(res, say("Sorry, an error occurred. Goodbye.") + "<Hangup/>");
  }
});

// ---------------------------------------------------------------------------
// POST /api/ivr/status  — Twilio call status callback (responds JSON)
// ---------------------------------------------------------------------------

router.post("/status", async (req, res) => {
  const callId = String(req.query.callId || "").trim();
  const callStatus = String(req.body.CallStatus || "");
  const callDuration = parseInt(String(req.body.CallDuration || "0"), 10) || 0;

  if (!callId) return res.json({ ok: true });

  try {
    const callResult = await query(
      `SELECT cc.*, b.user_id AS host_user_id
       FROM confirmation_calls cc
       JOIN bookings b ON b.id = cc.booking_id
       WHERE cc.id = $1`,
      [callId]
    );

    const call = callResult.rows[0];
    if (!call) return res.json({ ok: true });

    if (callStatus === "completed") {
      // Track cost — Twilio US outbound ~$0.014/min
      const costPerMin = 0.014;
      const minutes = Math.max(1, Math.ceil(callDuration / 60));
      const cost = parseFloat((minutes * costPerMin).toFixed(4));

      await query(
        `UPDATE confirmation_calls
         SET call_duration_seconds = $1, cost_estimate_usd = $2, updated_at = NOW()
         WHERE id = $3`,
        [callDuration, cost, callId]
      );

      const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      await query(
        `INSERT INTO call_usage (user_id, month, total_calls, total_minutes, total_cost_usd)
         VALUES ($1, $2, 1, $3, $4)
         ON CONFLICT (user_id, month) DO UPDATE
           SET total_calls    = call_usage.total_calls + 1,
               total_minutes  = call_usage.total_minutes + $3,
               total_cost_usd = call_usage.total_cost_usd + $4,
               updated_at     = NOW()`,
        [call.host_user_id, month, minutes, cost]
      );
    } else if (["no-answer", "busy", "failed"].includes(callStatus)) {
      if (call.attempts < call.max_attempts) {
        // Retry: 30 min after 1st miss, 2 hr after 2nd
        const delayMinutes = call.attempts === 1 ? 30 : 120;
        await scheduleRetryCall(callId, delayMinutes);
      } else {
        await query(
          `UPDATE confirmation_calls SET status = 'no_answer', updated_at = NOW() WHERE id = $1`,
          [callId]
        );
      }
    }
  } catch (err) {
    logSecurityEvent("ivr.status_error", { callId, error: err?.message }, { level: "error" });
  }

  return res.json({ ok: true });
});

module.exports = router;
