/**
 * calendar-reminders.service.js
 *
 * Manages the Calendar Reminders integration settings per workspace.
 * Settings are stored in the calendar_reminders_settings table (migration 033).
 *
 * Responsibilities:
 *  - Read/write enabled state, reminder timings, and title template
 *  - Provide helper to render the event title template
 *  - Graceful fallback if the table does not exist yet (migration pending)
 */

"use strict";

const { query } = require("../db/pool");

/** Default reminder timings in minutes before meeting: 24 hours, 1 hour, 15 minutes */
const DEFAULT_TIMINGS = [1440, 60, 15];

// ---------------------------------------------------------------------------
// Read settings
// ---------------------------------------------------------------------------

/**
 * Get calendar reminder settings for a workspace.
 * Returns sensible defaults when the workspace has not configured the integration.
 *
 * @param {string} workspaceId
 * @returns {Promise<{
 *   enabled: boolean,
 *   reminderTimings: number[],
 *   eventTitleTemplate: string,
 *   emailRemindersEnabled: boolean,
 * }>}
 */
async function getCalendarReminderSettings(workspaceId) {
  const defaults = {
    enabled: false,
    reminderTimings: DEFAULT_TIMINGS,
    eventTitleTemplate: "{{eventTitle}} with {{inviteeName}}",
    emailRemindersEnabled: false,
  };

  try {
    const result = await query(
      `SELECT enabled, reminder_timings, event_title_template, email_reminders_enabled
       FROM calendar_reminders_settings
       WHERE workspace_id = $1`,
      [workspaceId]
    );

    if (!result.rows.length) return defaults;

    const row = result.rows[0];
    const timings = Array.isArray(row.reminder_timings)
      ? row.reminder_timings
          .map(Number)
          .filter((t) => Number.isFinite(t) && t > 0)
      : DEFAULT_TIMINGS;

    return {
      enabled: Boolean(row.enabled),
      reminderTimings: timings.length ? timings : DEFAULT_TIMINGS,
      eventTitleTemplate:
        String(row.event_title_template || "").trim() ||
        "{{eventTitle}} with {{inviteeName}}",
      emailRemindersEnabled: Boolean(row.email_reminders_enabled),
    };
  } catch {
    // Table may not exist yet (migration pending). Fail open with safe defaults.
    return defaults;
  }
}

// ---------------------------------------------------------------------------
// Write settings
// ---------------------------------------------------------------------------

/**
 * Save calendar reminder settings for a workspace (upsert).
 *
 * @param {string} workspaceId
 * @param {object} updates
 * @param {boolean}  updates.enabled
 * @param {number[]} updates.reminderTimings            - e.g. [1440, 60, 15]
 * @param {string}   updates.eventTitleTemplate
 * @param {boolean} [updates.emailRemindersEnabled]
 * @returns {Promise<object>} Saved settings
 */
async function saveCalendarReminderSettings(
  workspaceId,
  { enabled, reminderTimings, eventTitleTemplate, emailRemindersEnabled }
) {
  const safeEnabled = Boolean(enabled);
  const safeEmailReminders = Boolean(emailRemindersEnabled);

  const safeTimings = (Array.isArray(reminderTimings) ? reminderTimings : DEFAULT_TIMINGS)
    .map(Number)
    .filter((t) => Number.isFinite(t) && t > 0 && t <= 10080) // max 7 days (10080 min)
    .slice(0, 5); // max 5 alarm points

  const safeTemplate = String(
    eventTitleTemplate || "{{eventTitle}} with {{inviteeName}}"
  )
    .trim()
    .slice(0, 200) || "{{eventTitle}} with {{inviteeName}}";

  await query(
    `INSERT INTO calendar_reminders_settings
       (workspace_id, enabled, reminder_timings, event_title_template, email_reminders_enabled, updated_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, NOW())
     ON CONFLICT (workspace_id) DO UPDATE
       SET enabled                 = EXCLUDED.enabled,
           reminder_timings        = EXCLUDED.reminder_timings,
           event_title_template    = EXCLUDED.event_title_template,
           email_reminders_enabled = EXCLUDED.email_reminders_enabled,
           updated_at              = NOW()`,
    [
      workspaceId,
      safeEnabled,
      JSON.stringify(safeTimings),
      safeTemplate,
      safeEmailReminders,
    ]
  );

  return {
    enabled: safeEnabled,
    reminderTimings: safeTimings,
    eventTitleTemplate: safeTemplate,
    emailRemindersEnabled: safeEmailReminders,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render an event title template, substituting {{eventTitle}} and {{inviteeName}}.
 *
 * @param {string} template
 * @param {{ eventTitle: string, inviteeName: string }} vars
 * @returns {string}
 */
function renderEventTitle(template, { eventTitle, inviteeName }) {
  return String(template || "{{eventTitle}} with {{inviteeName}}")
    .replace(/\{\{eventTitle\}\}/g, String(eventTitle || "Meeting"))
    .replace(/\{\{inviteeName\}\}/g, String(inviteeName || "Guest"));
}

module.exports = {
  getCalendarReminderSettings,
  saveCalendarReminderSettings,
  renderEventTitle,
  DEFAULT_TIMINGS,
};
