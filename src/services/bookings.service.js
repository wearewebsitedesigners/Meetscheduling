const { DateTime } = require("luxon");
const { query, withTransaction } = require("../db/pool");
const { sendBookingConfirmation } = require("./email.service");
const { generateMeetingLink } = require("./meeting-link.service");
const { generatePublicSlots } = require("./slots.service");
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
  const { getAuthenticatedGoogleClient } = require("./integrations.service");

  let meetingLink = "";
  if (event.locationType === "google_meet") {
    try {
      const gcal = await getAuthenticatedGoogleClient(event.userId);
      const calendarRes = await gcal.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1,
        requestBody: {
          summary: `${event.title} with ${cleanName}`,
          description: cleanNotes,
          start: { dateTime: new Date(slot.startAtUtc).toISOString() },
          end: { dateTime: new Date(slot.endAtUtc).toISOString() },
          attendees: [{ email: cleanEmail }],
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
      });
      meetingLink = calendarRes.data.hangoutLink || "No Meet link generated";
    } catch (err) {
      console.error("Failed to create Google Calendar event/Meet link:", err);
      meetingLink = generateMeetingLink({
        location_type: event.locationType,
        custom_location: event.customLocation,
      });
    }
  } else {
    meetingLink = generateMeetingLink({
      location_type: event.locationType,
      custom_location: event.customLocation,
    });
  }

  const booking = await withTransaction(async (client) => {
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
            status
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7::timestamptz,$8::timestamptz,$9,$10,$11,$12,$13,'confirmed'
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
          meetingLink,
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
      meetingLink,
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
