/**
 * ics.service.js
 *
 * RFC 5545-compliant ICS calendar event generator.
 *
 * Used by the Calendar Reminders integration to:
 *  - Attach ICS invites (with VALARM blocks) to booking confirmation emails
 *  - Generate "Add to Calendar" URLs for Google Calendar and Outlook
 *
 * No external dependencies — pure Node.js.
 */

"use strict";

const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date or ISO string to ICS UTC timestamp: YYYYMMDDTHHMMSSZ
 * @param {Date|string} dateValue
 * @returns {string}
 */
function toIcsUtcDate(dateValue) {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Escape special characters in ICS text values (RFC 5545 §3.3.11).
 * @param {string} str
 * @returns {string}
 */
function escapeIcsText(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a single ICS property line at 75 octets (RFC 5545 §3.1).
 * Continuation lines are indented with a single space.
 * @param {string} line
 * @returns {string}
 */
function foldLine(line) {
  // Work with bytes to respect octet limit
  const buf = Buffer.from(line, "utf8");
  if (buf.length <= 75) return line;

  const parts = [];
  let offset = 0;
  // First segment: 75 bytes; continuation segments: 74 bytes (leading space occupies 1)
  while (offset < buf.length) {
    const limit = parts.length === 0 ? 75 : 74;
    parts.push(buf.slice(offset, offset + limit).toString("utf8"));
    offset += limit;
  }
  return parts.join("\r\n ");
}

// ---------------------------------------------------------------------------
// VALARM generation
// ---------------------------------------------------------------------------

/**
 * Build VALARM component blocks for the given reminder timings.
 * Each timing is expressed in minutes before the meeting start.
 *
 * Examples:
 *   1440  → -P1DT    (24 hours before)
 *   60    → -PT1H    (1 hour before)
 *   15    → -PT15M   (15 minutes before)
 *
 * @param {number[]} minutesBefore
 * @returns {string} CRLF-joined VALARM blocks, or empty string if none
 */
function buildVAlarms(minutesBefore = []) {
  const valid = minutesBefore.filter((m) => Number.isFinite(Number(m)) && Number(m) > 0);
  if (!valid.length) return "";

  return valid
    .map((raw) => {
      const m = Number(raw);
      const days = Math.floor(m / 1440);
      const hours = Math.floor((m % 1440) / 60);
      const mins = m % 60;

      // Build ISO 8601 duration string
      let dur = "-P";
      if (days > 0) dur += `${days}D`;
      if (hours > 0 || mins > 0) {
        dur += "T";
        if (hours > 0) dur += `${hours}H`;
        if (mins > 0) dur += `${mins}M`;
      }
      // Edge case: exactly 0 (should never reach here after filter, but guard anyway)
      if (dur === "-P") dur = "-PT0S";

      return [
        "BEGIN:VALARM",
        `TRIGGER:${dur}`,
        "ACTION:DISPLAY",
        "DESCRIPTION:Upcoming meeting reminder",
        "END:VALARM",
      ].join("\r\n");
    })
    .join("\r\n");
}

// ---------------------------------------------------------------------------
// ICS generation
// ---------------------------------------------------------------------------

/**
 * Generate an RFC 5545-compliant ICS calendar event string.
 *
 * @param {object}   opts
 * @param {Date|string} opts.startUtc                 - Event start (UTC)
 * @param {Date|string} opts.endUtc                   - Event end (UTC)
 * @param {string}      opts.summary                  - Event SUMMARY (title)
 * @param {string}     [opts.description]             - Event DESCRIPTION (plain text)
 * @param {string}     [opts.location]                - Meeting URL or physical location
 * @param {string}     [opts.organizerEmail]          - Host email address
 * @param {string}     [opts.organizerName]           - Host display name
 * @param {string}     [opts.attendeeEmail]           - Invitee email address
 * @param {string}     [opts.attendeeName]            - Invitee display name
 * @param {number[]}   [opts.reminderTimingsMinutes]  - Minutes before for VALARM, e.g. [1440, 60, 15]
 * @param {string}     [opts.uid]                     - Override the UID (optional)
 * @returns {string}   ICS content with CRLF line endings
 */
function generateIcs({
  startUtc,
  endUtc,
  summary,
  description = "",
  location = "",
  organizerEmail = "",
  organizerName = "",
  attendeeEmail = "",
  attendeeName = "",
  reminderTimingsMinutes = [1440, 60, 15],
  uid,
}) {
  const eventUid =
    uid ||
    `ms-${Date.now()}-${crypto.randomBytes(6).toString("hex")}@meetscheduling.com`;

  const now = toIcsUtcDate(new Date());
  const dtStart = toIcsUtcDate(startUtc);
  const dtEnd = toIcsUtcDate(endUtc);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MeetScheduling//CalendarReminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${eventUid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${escapeIcsText(summary)}`),
  ];

  if (description) {
    lines.push(foldLine(`DESCRIPTION:${escapeIcsText(description)}`));
  }

  if (location) {
    lines.push(foldLine(`LOCATION:${escapeIcsText(location)}`));
    lines.push(foldLine(`URL:${location}`));
  }

  if (organizerEmail) {
    const cn = organizerName ? `;CN="${escapeIcsText(organizerName)}"` : "";
    lines.push(foldLine(`ORGANIZER${cn}:mailto:${organizerEmail}`));
  }

  if (attendeeEmail) {
    const cn = attendeeName ? `;CN="${escapeIcsText(attendeeName)}"` : "";
    lines.push(
      foldLine(
        `ATTENDEE${cn};RSVP=FALSE;PARTSTAT=ACCEPTED;ROLE=REQ-PARTICIPANT:mailto:${attendeeEmail}`
      )
    );
  }

  const vAlarms = buildVAlarms(reminderTimingsMinutes);
  if (vAlarms) {
    lines.push(vAlarms);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// "Add to Calendar" URL builders
// ---------------------------------------------------------------------------

/**
 * Generate a Google Calendar "Add to Calendar" event URL.
 *
 * @param {object}   opts
 * @param {Date|string} opts.startUtc
 * @param {Date|string} opts.endUtc
 * @param {string}      opts.summary
 * @param {string}     [opts.description]
 * @param {string}     [opts.location]
 * @returns {string}
 */
function googleCalendarUrl({ startUtc, endUtc, summary, description = "", location = "" }) {
  const fmt = (d) =>
    (d instanceof Date ? d : new Date(d))
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summary,
    dates: `${fmt(startUtc)}/${fmt(endUtc)}`,
    details: description,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an Outlook Live "Add to Calendar" compose URL.
 *
 * @param {object}   opts
 * @param {Date|string} opts.startUtc
 * @param {Date|string} opts.endUtc
 * @param {string}      opts.summary
 * @param {string}     [opts.description]
 * @param {string}     [opts.location]
 * @returns {string}
 */
function outlookCalendarUrl({ startUtc, endUtc, summary, description = "", location = "" }) {
  const toIso = (d) =>
    (d instanceof Date ? d : new Date(d)).toISOString().replace(/\.\d{3}Z$/, "");

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: summary,
    startdt: toIso(startUtc),
    enddt: toIso(endUtc),
    body: description,
    location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

module.exports = {
  generateIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  // Exported for testing
  toIcsUtcDate,
  buildVAlarms,
  foldLine,
};
