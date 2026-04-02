/**
 * reminders.service.js
 *
 * Background reminder processor — called by setInterval in server.js every 60 s.
 *
 * Handles four reminder windows:
 *   - 24 hours before  (reminder_24h_sent)  — only if host has email_reminders_enabled
 *   - 1 hour before    (reminder_1h_sent)   — only if host has email_reminders_enabled
 *   - 30 minutes before (reminder_30m_sent) — always
 *   - At meeting time  (reminder_0m_sent)   — always
 *
 * The 24h and 1h windows respect the Calendar Reminders integration setting
 * (calendar_reminders_settings.email_reminders_enabled) so they only fire when
 * the host has explicitly opted into email reminders.
 */

"use strict";

const { query } = require("../db/pool");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Send a reminder email for a booking row and update the sent flag.
 *
 * @param {object} row         - Joined booking + event_type + user row
 * @param {string} type        - '24h' | '1h' | '30m' | '0m'
 * @param {string} sentColumn  - DB column to mark as sent
 */
async function processReminderRow(row, type, sentColumn) {
  const { sendReminderMail } = require("./email.service");
  try {
    await sendReminderMail(row, type);
    await query(
      `UPDATE bookings SET ${sentColumn} = true WHERE id = $1`,
      [row.id]
    );
  } catch (err) {
    console.error(`[reminders] Failed to send ${type} reminder for booking ${row.id}:`, err?.message || err);
  }
}

// ---------------------------------------------------------------------------
// Base SELECT used by all reminder queries
// ---------------------------------------------------------------------------

const BASE_SELECT = `
  SELECT
    b.*,
    e.title        AS event_title,
    e.location_type,
    e.custom_location,
    u.email        AS host_email,
    u.display_name AS host_name
  FROM bookings b
  JOIN event_types e ON b.event_type_id = e.id
  JOIN users u       ON e.user_id = u.id
`;

// ---------------------------------------------------------------------------
// Main processor
// ---------------------------------------------------------------------------

async function processReminders() {
  try {
    // ── 24-hour reminder ──────────────────────────────────────────────────
    // Only fire if the host has email_reminders_enabled in calendar_reminders_settings.
    // Safe guard: if the columns/table don't exist yet, the query returns 0 rows.
    try {
      const res24h = await query(`
        ${BASE_SELECT}
        JOIN calendar_reminders_settings crs ON crs.workspace_id = u.id
        WHERE b.status = 'confirmed'
          AND b.reminder_24h_sent = false
          AND crs.enabled = true
          AND crs.email_reminders_enabled = true
          AND b.start_at_utc <= (NOW() + interval '24 hours')
          AND b.start_at_utc >  (NOW() + interval '23 hours')
      `);
      for (const row of res24h.rows) {
        await processReminderRow(row, "24h", "reminder_24h_sent");
      }
    } catch {
      // calendar_reminders_settings table may not exist yet — skip silently
    }

    // ── 1-hour reminder ───────────────────────────────────────────────────
    try {
      const res1h = await query(`
        ${BASE_SELECT}
        JOIN calendar_reminders_settings crs ON crs.workspace_id = u.id
        WHERE b.status = 'confirmed'
          AND b.reminder_1h_sent = false
          AND crs.enabled = true
          AND crs.email_reminders_enabled = true
          AND b.start_at_utc <= (NOW() + interval '1 hour')
          AND b.start_at_utc >  (NOW() + interval '59 minutes')
      `);
      for (const row of res1h.rows) {
        await processReminderRow(row, "1h", "reminder_1h_sent");
      }
    } catch {
      // Safe fallback if table/columns missing
    }

    // ── 30-minute reminder ────────────────────────────────────────────────
    const res30 = await query(`
      ${BASE_SELECT}
      WHERE b.status = 'confirmed'
        AND b.reminder_30m_sent = false
        AND b.start_at_utc <= (NOW() + interval '30 minutes')
        AND b.start_at_utc >  NOW()
    `);
    for (const row of res30.rows) {
      await processReminderRow(row, "30m", "reminder_30m_sent");
    }

    // ── At-meeting reminder ───────────────────────────────────────────────
    const res0 = await query(`
      ${BASE_SELECT}
      WHERE b.status = 'confirmed'
        AND b.reminder_0m_sent = false
        AND b.start_at_utc <= NOW()
        AND b.end_at_utc >   NOW()
    `);
    for (const row of res0.rows) {
      await processReminderRow(row, "0m", "reminder_0m_sent");
    }
  } catch (err) {
    console.error("[reminders] processReminders error:", err?.message || err);
  }
}

module.exports = { processReminders };
