const crypto = require("crypto");
const { DateTime } = require("luxon");
const { query, withTransaction } = require("../db/pool");
const { sendBookingConfirmation } = require("./email.service");
const { generateMeetingLink, isJoinableMeetingLink } = require("./meeting-link.service");
const { generatePublicSlots } = require("./slots.service");
const {
  getAuthenticatedGoogleClient,
  getGoogleCalendarConnectionStatusForUser,
} = require("./integrations.service");
const { verifySlotToken } = require("../utils/booking-token");
const { conflict, notFound } = require("../utils/http-error");
const { assertEmail, assertOptionalString, assertString } = require("../utils/validation");

function mapBookingRow(row, timezone = "UTC") {
  const parseTs = (value) =>
    value instanceof Date
      ? DateTime.fromJSDate(value, { zone: "utc" })
      : DateTime.fromISO(String(value), { zone: "utc" });

  const start = parseTs(row.start_at_utc).setZone(timezone);
  const end = parseTs(row.end_at_utc).setZone(timezone);
  return {
    id: row.id,
    userId: row.user_id,
    eventTypeId: row.event_type_id,
    eventTitle: row.event_title || null,
    inviteeName: row.invitee_name,
    inviteeEmail: row.invitee_email,
    notes: row.notes,
    visitorTimezone: row.visitor_timezone,
    startAtUtc: row.start_at_utc,
    endAtUtc: row.end_at_utc,
    startLocal: {
      date: start.toFormat("yyyy-LL-dd"),
      time: start.toFormat("hh:mm a"),
      iso: start.toISO({ suppressMilliseconds: true }),
    },
    endLocal: {
      date: end.toFormat("yyyy-LL-dd"),
      time: end.toFormat("hh:mm a"),
      iso: end.toISO({ suppressMilliseconds: true }),
    },
    durationMinutes: row.duration_minutes,
    bufferBeforeMin: row.buffer_before_min,
    bufferAfterMin: row.buffer_after_min,
    locationType: row.location_type,
    meetingLink: row.meeting_link,
    meetingLinkStatus: row.meeting_link_status || "pending_generation",
    calendarProvider: row.calendar_provider || null,
    calendarEventId: row.calendar_event_id || null,
    status: row.status,
    cancelReason: row.cancel_reason,
    canceledAt: row.canceled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertBookingStillAvailable(client, { event, slot }) {
  const lockedEventResult = await query(
    `
      SELECT
        id,
        is_active,
        max_bookings_per_day,
        buffer_before_min,
        buffer_after_min
      FROM event_types
      WHERE id = $1
      FOR UPDATE
    `,
    [event.id],
    client
  );
  const lockedEvent = lockedEventResult.rows[0];
  if (!lockedEvent || !lockedEvent.is_active) {
    throw conflict("Selected slot is no longer available");
  }

  const hostDate = DateTime.fromISO(slot.startAtUtc, { zone: "utc" })
    .setZone(event.hostTimezone)
    .toFormat("yyyy-LL-dd");

  const maxBookingsPerDay = Number(lockedEvent.max_bookings_per_day || 0);
  if (maxBookingsPerDay > 0) {
    const perDayResult = await query(
      `
        SELECT COUNT(*)::int AS count
        FROM bookings
        WHERE event_type_id = $1
          AND status = 'confirmed'
          AND timezone($2, start_at_utc)::date = $3::date
      `,
      [event.id, event.hostTimezone, hostDate],
      client
    );
    const currentCount = Number(perDayResult.rows[0]?.count || 0);
    if (currentCount >= maxBookingsPerDay) {
      throw conflict("This day has reached its booking limit. Please choose another time.");
    }
  }

  const bufferBefore = Number(lockedEvent.buffer_before_min || 0);
  const bufferAfter = Number(lockedEvent.buffer_after_min || 0);

  const overlapResult = await query(
    `
      SELECT 1
      FROM bookings
      WHERE event_type_id = $1
        AND status = 'confirmed'
        AND (start_at_utc - (buffer_before_min::int * INTERVAL '1 minute')) <
          ($3::timestamptz + ($5::int * INTERVAL '1 minute'))
        AND (end_at_utc + (buffer_after_min::int * INTERVAL '1 minute')) >
          ($2::timestamptz - ($4::int * INTERVAL '1 minute'))
      LIMIT 1
    `,
    [event.id, slot.startAtUtc, slot.endAtUtc, bufferBefore, bufferAfter],
    client
  );

  if (overlapResult.rows[0]) {
    throw conflict("This slot was just booked. Please select another time.");
  }
}

function randomRequestId(prefix = "id") {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseGoogleErrorStatus(error) {
  const status = Number(
    error?.code ||
    error?.status ||
    error?.response?.status ||
    error?.response?.data?.error?.code ||
    0
  );
  return Number.isFinite(status) ? status : 0;
}

function isRetryableGoogleError(error) {
  const status = parseGoogleErrorStatus(error);
  if ([408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  const message = String(error?.message || "").toLowerCase();
  return /timeout|temporar|rate|quota|backend|unavailable/.test(message);
}

function extractGoogleMeetLinkFromEvent(eventData = {}) {
  const hangoutLink = String(eventData?.hangoutLink || "").trim();
  if (isJoinableMeetingLink(hangoutLink, "google_meet")) return hangoutLink;

  const entryPoints = eventData?.conferenceData?.entryPoints;
  if (Array.isArray(entryPoints)) {
    const videoEntry = entryPoints.find((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const uri = String(entry.uri || "").trim();
      return isJoinableMeetingLink(uri, "google_meet");
    });
    if (videoEntry) return String(videoEntry.uri).trim();
  }

  return null;
}

function initialMeetingState({ locationType, generatedLink, hasGoogleCalendarConnection }) {
  if (locationType === "google_meet") {
    return {
      meetingLink: null,
      meetingLinkStatus: hasGoogleCalendarConnection
        ? "pending_generation"
        : "pending_calendar_connection",
      calendarProvider: hasGoogleCalendarConnection ? "google-calendar" : null,
      calendarEventId: null,
    };
  }

  if (locationType === "in_person") {
    return {
      meetingLink: null,
      meetingLinkStatus: "unavailable",
      calendarProvider: null,
      calendarEventId: null,
    };
  }

  if (locationType === "custom") {
    return {
      meetingLink: generatedLink || null,
      meetingLinkStatus: generatedLink ? "ready" : "unavailable",
      calendarProvider: null,
      calendarEventId: null,
    };
  }

  if (locationType === "zoom") {
    const canJoin = isJoinableMeetingLink(generatedLink, "zoom");
    return {
      meetingLink: canJoin ? generatedLink : null,
      meetingLinkStatus: canJoin ? "ready" : "unavailable",
      calendarProvider: null,
      calendarEventId: null,
    };
  }

  return {
    meetingLink: generatedLink || null,
    meetingLinkStatus: generatedLink ? "ready" : "unavailable",
    calendarProvider: null,
    calendarEventId: null,
  };
}

async function createGoogleCalendarEventWithMeet({
  calendarClient,
  booking,
  event,
  slot,
  inviteeName,
  inviteeEmail,
  notes,
}) {
  const startUtcIso = new Date(slot.startAtUtc).toISOString();
  const endUtcIso = new Date(slot.endAtUtc).toISOString();
  const timezone = String(event.hostTimezone || "UTC");
  const requestId = randomRequestId("meet");

  const response = await calendarClient.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: `${event.title} with ${inviteeName}`,
      description: notes || `Booked via Meetscheduling (booking ${booking.id})`,
      start: {
        dateTime: startUtcIso,
        timeZone: timezone,
      },
      end: {
        dateTime: endUtcIso,
        timeZone: timezone,
      },
      attendees: [{ email: inviteeEmail }],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const calendarEventId = String(response?.data?.id || "").trim() || null;
  let meetingLink = extractGoogleMeetLinkFromEvent(response?.data || {});

  // Google can return conference data asynchronously even after a successful insert.
  if (!meetingLink && calendarEventId) {
    const backoffMs = [300, 700, 1200];
    for (const waitMs of backoffMs) {
      await sleep(waitMs);
      try {
        const lookup = await calendarClient.events.get({
          calendarId: "primary",
          eventId: calendarEventId,
          conferenceDataVersion: 1,
        });
        meetingLink = extractGoogleMeetLinkFromEvent(lookup?.data || {});
        if (meetingLink) break;
      } catch {
        // Keep booking successful; fallback status handling happens upstream.
      }
    }
  }

  return {
    calendarEventId,
    meetingLink,
  };
}

async function createPublicBooking({
  username,
  slug,
  visitorDate,
  visitorTimezone,
  startAtUtc,
  slotToken,
  inviteeName,
  inviteeEmail,
  notes = "",
}) {
  const safeStartAtUtc = assertString(startAtUtc, "startAtUtc", { min: 15, max: 50 });
  const cleanName = assertString(inviteeName, "name", { min: 2, max: 120 });
  const cleanEmail = assertEmail(inviteeEmail, "email");
  const cleanNotes = assertOptionalString(notes, "notes", { max: 5000 });

  const slotPayload = await generatePublicSlots({
    username,
    slug,
    visitorDate,
    visitorTimezone,
  });

  const slot = slotPayload.slots.find((item) => item.startAtUtc === safeStartAtUtc);
  if (!slot) {
    throw conflict("Selected slot is no longer available");
  }
  verifySlotToken(slotPayload.event.id, safeStartAtUtc, slotToken);

  const event = slotPayload.event;
  const generatedMeetingLink = generateMeetingLink({
    location_type: event.locationType,
    custom_location: event.customLocation,
  });

  let googleConnection = {
    connected: false,
    hasRefreshToken: false,
    integrationId: null,
    accountEmail: "",
  };
  if (event.locationType === "google_meet") {
    try {
      googleConnection = await getGoogleCalendarConnectionStatusForUser(event.userId);
    } catch (error) {
      googleConnection = {
        connected: false,
        hasRefreshToken: false,
        integrationId: null,
        accountEmail: "",
      };
    }
  }

  const baseMeetingState = initialMeetingState({
    locationType: event.locationType,
    generatedLink: generatedMeetingLink,
    hasGoogleCalendarConnection: !!googleConnection.connected,
  });

  let booking = await withTransaction(async (client) => {
    await assertBookingStillAvailable(client, { event, slot });

    try {
      const inserted = await query(
        `
          INSERT INTO bookings (
            user_id,
            event_type_id,
            invitee_name,
            invitee_email,
            notes,
            visitor_timezone,
            start_at_utc,
            end_at_utc,
            duration_minutes,
            buffer_before_min,
            buffer_after_min,
            location_type,
            meeting_link,
            meeting_link_status,
            calendar_provider,
            calendar_event_id,
            status
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7::timestamptz,$8::timestamptz,$9,$10,$11,$12,$13,$14,$15,$16,'confirmed'
          )
          RETURNING *
        `,
        [
          event.userId,
          event.id,
          cleanName,
          cleanEmail,
          cleanNotes,
          slotPayload.visitorTimezone,
          slot.startAtUtc,
          slot.endAtUtc,
          event.durationMinutes,
          event.bufferBeforeMin,
          event.bufferAfterMin,
          event.locationType,
          baseMeetingState.meetingLink,
          baseMeetingState.meetingLinkStatus,
          baseMeetingState.calendarProvider,
          baseMeetingState.calendarEventId,
        ],
        client
      );

      return inserted.rows[0];
    } catch (error) {
      if (error && error.code === "23505") {
        throw conflict("This slot was just booked. Please select another time.");
      }
      throw error;
    }
  });

  if (event.locationType === "google_meet" && googleConnection.connected) {
    let calendarResult = null;
    let calendarError = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const gcal = await getAuthenticatedGoogleClient(event.userId);
        calendarResult = await createGoogleCalendarEventWithMeet({
          calendarClient: gcal,
          booking,
          event,
          slot,
          inviteeName: cleanName,
          inviteeEmail: cleanEmail,
          notes: cleanNotes,
        });
        break;
      } catch (error) {
        calendarError = error;
        const shouldRetry = attempt < 2 && isRetryableGoogleError(error);
        if (!shouldRetry) break;
      }
    }

    if (calendarResult) {
      const nextStatus = calendarResult.meetingLink ? "ready" : "pending_generation";
      const updated = await query(
        `
          UPDATE bookings
          SET
            calendar_provider = 'google-calendar',
            calendar_event_id = $1,
            meeting_link = $2,
            meeting_link_status = $3,
            updated_at = NOW()
          WHERE id = $4
          RETURNING *
        `,
        [calendarResult.calendarEventId, calendarResult.meetingLink, nextStatus, booking.id]
      );
      if (updated.rows[0]) {
        booking = updated.rows[0];
      }
    } else if (calendarError) {
      const errorStatus = parseGoogleErrorStatus(calendarError);
      const errorMsg = String(calendarError?.message || "").toLowerCase();
      const authorizationIssue =
        errorStatus === 401 ||
        errorStatus === 403 ||
        /not connected|authorized|authorization expired|reconnect/.test(errorMsg);
      const nextStatus = authorizationIssue
        ? "pending_calendar_connection"
        : "generation_failed";
      const nextProvider = authorizationIssue ? null : "google-calendar";
      const updated = await query(
        `
          UPDATE bookings
          SET
            calendar_provider = $1,
            meeting_link_status = $2,
            updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `,
        [nextProvider, nextStatus, booking.id]
      );
      if (updated.rows[0]) {
        booking = updated.rows[0];
      }
      console.error(
        "Failed to create Google Calendar event/Meet link:",
        calendarError?.message || calendarError
      );
    }
  }

  const userRes = await query("SELECT email FROM users WHERE id = $1", [event.userId]);
  const hostEmail = userRes.rows[0]?.email || "";

  let emailStatus = { sent: false, reason: "Not attempted" };
  try {
    emailStatus = await sendBookingConfirmation({
      toEmail: cleanEmail,
      inviteeName: cleanName,
      hostEmail,
      hostName: event.hostName,
      eventTitle: event.title,
      startLocal: slot.startLocal,
      endLocal: slot.endLocal,
      timezone: slotPayload.visitorTimezone,
      startUtc: slot.startAtUtc,
      endUtc: slot.endAtUtc,
      locationType: booking.location_type,
      meetingLink: booking.meeting_link,
      meetingLinkStatus: booking.meeting_link_status,
    });
  } catch (error) {
    emailStatus = { sent: false, reason: "Email failed" };
  }

  return {
    booking: mapBookingRow(booking, slotPayload.visitorTimezone),
    event,
    emailStatus,
  };
}

async function listBookingsForUser(
  userId,
  { fromDate = null, toDate = null, status = "all", timezone = "UTC" } = {}
) {
  const params = [userId];
  const conditions = ["b.user_id = $1"];

  if (status === "confirmed" || status === "canceled") {
    params.push(status);
    conditions.push(`b.status = $${params.length}`);
  }

  if (fromDate) {
    params.push(fromDate);
    params.push(timezone);
    conditions.push(`timezone($${params.length}, b.start_at_utc)::date >= $${params.length - 1}::date`);
  }

  if (toDate) {
    params.push(toDate);
    params.push(timezone);
    conditions.push(`timezone($${params.length}, b.start_at_utc)::date <= $${params.length - 1}::date`);
  }

  const result = await query(
    `
      SELECT
        b.*,
        et.title AS event_title
      FROM bookings b
      JOIN event_types et ON et.id = b.event_type_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY b.start_at_utc ASC
    `,
    params
  );
  return result.rows.map((row) => mapBookingRow(row, timezone));
}

async function listUpcomingBookingsForUser(userId, { limit = 20, timezone = "UTC" } = {}) {
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 200) : 20;
  const result = await query(
    `
      SELECT
        b.*,
        et.title AS event_title
      FROM bookings b
      JOIN event_types et ON et.id = b.event_type_id
      WHERE b.user_id = $1
        AND b.status = 'confirmed'
        AND b.start_at_utc >= NOW()
      ORDER BY b.start_at_utc ASC
      LIMIT $2
    `,
    [userId, safeLimit]
  );
  return result.rows.map((row) => mapBookingRow(row, timezone));
}

async function cancelBookingForUser(userId, bookingId, reason = "") {
  const safeReason = assertOptionalString(reason, "reason", { max: 500 });
  const result = await query(
    `
      UPDATE bookings
      SET
        status = 'canceled',
        cancel_reason = $1,
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND user_id = $3 AND status = 'confirmed'
      RETURNING *
    `,
    [safeReason || null, bookingId, userId]
  );

  const row = result.rows[0];
  if (!row) throw notFound("Booking not found or already canceled");
  return mapBookingRow(row, "UTC");
}

module.exports = {
  createPublicBooking,
  listBookingsForUser,
  listUpcomingBookingsForUser,
  cancelBookingForUser,
};
