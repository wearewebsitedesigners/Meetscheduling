const { query } = require("../db/pool");
const env = require("../config/env");
const { logSecurityEvent } = require("../utils/security-log");

let _twilioClient = null;

function getTwilioClient() {
  if (!env.twilio.accountSid || !env.twilio.authToken) return null;
  if (!_twilioClient) {
    const twilio = require("twilio");
    _twilioClient = twilio(env.twilio.accountSid, env.twilio.authToken);
  }
  return _twilioClient;
}

/**
 * Schedule a confirmation call for a booking.
 * Creates a DB record and sets an in-process timer.
 * On restart, recoverPendingCalls() re-arms timers from DB.
 */
async function scheduleConfirmationCall(bookingId, delayMinutes) {
  if (!env.twilio.accountSid || !env.twilio.phoneNumber) return null;

  const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  const result = await query(
    `INSERT INTO confirmation_calls (booking_id, scheduled_at, max_attempts)
     VALUES ($1, $2, 3)
     RETURNING id`,
    [bookingId, scheduledAt.toISOString()]
  );

  const callId = result.rows[0].id;

  setTimeout(() => {
    makeConfirmationCall(callId).catch((err) => {
      logSecurityEvent(
        "ivr.schedule_call_failed",
        { callId, error: err?.message || String(err) },
        { level: "error" }
      );
    });
  }, delayMinutes * 60 * 1000);

  return callId;
}

/**
 * Make the actual outbound call via Twilio.
 */
async function makeConfirmationCall(confirmationCallId) {
  const client = getTwilioClient();
  if (!client) {
    logSecurityEvent("ivr.twilio_not_configured", {}, { level: "warn" });
    return;
  }

  const result = await query(
    `SELECT cc.*,
            b.invitee_name, b.invitee_phone, b.start_at_utc, b.visitor_timezone,
            b.user_id AS host_user_id,
            u.enable_confirmation_calls, u.plan, u.call_delay_minutes
     FROM confirmation_calls cc
     JOIN bookings b ON b.id = cc.booking_id
     JOIN users u ON u.id = b.user_id
     WHERE cc.id = $1`,
    [confirmationCallId]
  );

  const call = result.rows[0];
  if (!call) {
    logSecurityEvent("ivr.call_record_not_found", { confirmationCallId }, { level: "warn" });
    return;
  }

  // Skip if IVR is disabled or phone missing
  if (!call.enable_confirmation_calls || !call.invitee_phone) {
    await query(
      `UPDATE confirmation_calls SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [confirmationCallId]
    );
    return;
  }

  // Skip if already actioned (confirmed / reschedule / no_answer)
  if (["confirmed", "reschedule_requested", "no_answer"].includes(call.status)) return;

  try {
    const twilioCall = await client.calls.create({
      to: call.invitee_phone,
      from: env.twilio.phoneNumber,
      url: `${env.appBaseUrl}/api/ivr/welcome?callId=${confirmationCallId}`,
      statusCallback: `${env.appBaseUrl}/api/ivr/status?callId=${confirmationCallId}`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
      timeout: 30,
      machineDetection: "Enable",
    });

    await query(
      `UPDATE confirmation_calls
       SET twilio_call_sid = $1, status = 'calling',
           attempts = attempts + 1, called_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [twilioCall.sid, confirmationCallId]
    );

    logSecurityEvent("ivr.call_placed", { confirmationCallId, sid: twilioCall.sid }, { level: "info" });
  } catch (error) {
    await query(
      `UPDATE confirmation_calls
       SET status = 'failed', attempts = attempts + 1, updated_at = NOW()
       WHERE id = $1`,
      [confirmationCallId]
    );
    throw error;
  }
}

/**
 * Schedule a retry call after a delay (called from ivr.routes when call not answered).
 */
async function scheduleRetryCall(confirmationCallId, delayMinutes) {
  const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  await query(
    `UPDATE confirmation_calls
     SET scheduled_at = $1, status = 'pending', updated_at = NOW()
     WHERE id = $2`,
    [scheduledAt.toISOString(), confirmationCallId]
  );

  setTimeout(() => {
    makeConfirmationCall(confirmationCallId).catch((err) => {
      logSecurityEvent(
        "ivr.retry_call_failed",
        { confirmationCallId, error: err?.message || String(err) },
        { level: "error" }
      );
    });
  }, delayMinutes * 60 * 1000);
}

/**
 * On startup, re-arm timers for any pending calls that survived a restart.
 */
async function recoverPendingCalls() {
  if (!env.twilio.accountSid || !env.twilio.phoneNumber) return;

  try {
    const result = await query(
      `SELECT id, scheduled_at
       FROM confirmation_calls
       WHERE status = 'pending' AND attempts < max_attempts
       ORDER BY scheduled_at ASC
       LIMIT 200`
    );

    for (const row of result.rows) {
      const delay = Math.max(0, new Date(row.scheduled_at).getTime() - Date.now());
      setTimeout(() => {
        makeConfirmationCall(row.id).catch((err) => {
          logSecurityEvent(
            "ivr.recovery_call_failed",
            { callId: row.id, error: err?.message || String(err) },
            { level: "error" }
          );
        });
      }, delay);
    }

    if (result.rows.length > 0) {
      logSecurityEvent(
        "ivr.recovered_pending_calls",
        { count: result.rows.length },
        { level: "info" }
      );
    }
  } catch (err) {
    logSecurityEvent("ivr.recovery_failed", { error: err?.message || String(err) }, { level: "error" });
  }
}

module.exports = {
  scheduleConfirmationCall,
  makeConfirmationCall,
  scheduleRetryCall,
  recoverPendingCalls,
};
