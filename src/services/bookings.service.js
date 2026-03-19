const crypto = require("crypto");
const { DateTime } = require("luxon");
const { query, withTransaction } = require("../db/pool");
const { upsertContactFromBooking } = require("./contacts.service");
const { sendBookingConfirmation } = require("./email.service");
const {
  generateMeetingLink,
  generateGoogleMeetLink,
  isJoinableMeetingLink,
} = require("./meeting-link.service");
const { generatePublicSlots } = require("./slots.service");
const {
  getAuthenticatedGoogleClient,
  getVerifiedGoogleCalendarConnectionStatus,
} = require("./integrations.service");
const { verifySlotToken } = require("../utils/booking-token");
const { conflict, notFound } = require("../utils/http-error");
const { assertEmail, assertOptionalString, assertString } = require("../utils/validation");

const BOOKING_COLUMN_CACHE_TTL_MS = 5 * 60 * 1000;
let bookingColumnCache = {
  expiresAt: 0,
  data: null,
  pending: null,
};

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
    workspaceId: row.workspace_id || row.user_id,
    eventTypeId: row.event_type_id,
    eventTitle: row.event_title || null,
    inviteeName: row.invitee_name,
    inviteeEmail: row.invitee_email,
    contactId: row.contact_id || null,
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
    emailSentHost:
      row.email_sent_host === undefined ? null : Boolean(row.email_sent_host),
    emailSentInvitee:
      row.email_sent_invitee === undefined ? null : Boolean(row.email_sent_invitee),
    status: row.status,
    cancelReason: row.cancel_reason,
    canceledAt: row.canceled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function resetBookingColumnCache() {
  bookingColumnCache = {
    expiresAt: 0,
    data: null,
    pending: null,
  };
}

async function getBookingColumnSupport() {
  const now = Date.now();
  if (bookingColumnCache.data && bookingColumnCache.expiresAt > now) {
    return bookingColumnCache.data;
  }
  if (bookingColumnCache.pending) {
    return bookingColumnCache.pending;
  }

  bookingColumnCache.pending = (async () => {
    try {
      const result = await query(
        `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'bookings'
            AND column_name = ANY($1::text[])
        `,
        [[
          "workspace_id",
          "meeting_link_status",
          "calendar_provider",
          "calendar_event_id",
          "email_sent_host",
          "email_sent_invitee",
        ]]
      );
      const names = new Set(result.rows.map((row) => String(row.column_name || "")));
      const data = {
        hasWorkspaceId: names.has("workspace_id"),
        hasMeetingLinkStatus: names.has("meeting_link_status"),
        hasCalendarProvider: names.has("calendar_provider"),
        hasCalendarEventId: names.has("calendar_event_id"),
        hasEmailSentHost: names.has("email_sent_host"),
        hasEmailSentInvitee: names.has("email_sent_invitee"),
      };
      bookingColumnCache = {
        data,
        expiresAt: now + BOOKING_COLUMN_CACHE_TTL_MS,
        pending: null,
      };
      return data;
    } catch {
      // Fail open for older DB schemas so booking still works.
      const data = {
        hasWorkspaceId: false,
        hasMeetingLinkStatus: false,
        hasCalendarProvider: false,
        hasCalendarEventId: false,
        hasEmailSentHost: false,
        hasEmailSentInvitee: false,
      };
      bookingColumnCache = {
        data,
        expiresAt: now + 30_000,
        pending: null,
      };
      return data;
    }
  })();

  return bookingColumnCache.pending;
}

function hasExtendedBookingColumns(columnSupport) {
  return Boolean(
    columnSupport?.hasWorkspaceId &&
    columnSupport?.hasMeetingLinkStatus &&
    columnSupport?.hasCalendarProvider &&
    columnSupport?.hasCalendarEventId &&
    columnSupport?.hasEmailSentHost &&
    columnSupport?.hasEmailSentInvitee
  );
}

function isMissingExtendedBookingColumnError(error) {
  if (!error || String(error.code || "") !== "42703") return false;
  const message = String(error.message || "").toLowerCase();
  return (
    message.includes("meeting_link_status") ||
    message.includes("calendar_provider") ||
    message.includes("calendar_event_id") ||
    message.includes("workspace_id") ||
    message.includes("email_sent_host") ||
    message.includes("email_sent_invitee")
  );
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

function logGoogleMeetBooking(step, details = {}, level = "info") {
  const logger = typeof console[level] === "function" ? console[level] : console.log;
  logger(
    `[google-meet-booking] ${step} ${JSON.stringify(
      details && typeof details === "object" ? details : { value: String(details || "") }
    )}`
  );
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
    const backoffMs = [300, 700, 1200, 2000];
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

  // Fallback: request conference data generation one more time on the same event.
  if (!meetingLink && calendarEventId) {
    try {
      await calendarClient.events.patch({
        calendarId: "primary",
        eventId: calendarEventId,
        conferenceDataVersion: 1,
        requestBody: {
          conferenceData: {
            createRequest: {
              requestId: randomRequestId("meet-retry"),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
      });
    } catch {
      // Keep booking successful; fallback status handling happens upstream.
    }

    const retryBackoffMs = [600, 1200, 2000, 3000];
    for (const waitMs of retryBackoffMs) {
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
  inviteePhone,
  inviteeCompany,
  source = "booking_link",
  notes = "",
}) {
  const hasStartAtUtc = typeof startAtUtc === "string" && String(startAtUtc).trim().length > 0;
  const safeStartAtUtc = hasStartAtUtc
    ? assertString(startAtUtc, "startAtUtc", { min: 15, max: 50 })
    : "";
  const safeSlotToken = assertOptionalString(slotToken, "slotToken", { min: 20, max: 500 });
  const cleanName = assertString(inviteeName, "name", { min: 2, max: 120 });
  const cleanEmail = assertEmail(inviteeEmail, "email");
  const cleanPhone = assertOptionalString(inviteePhone, "phone", { max: 40 });
  const cleanCompany = assertOptionalString(inviteeCompany, "company", { max: 160 });
  const cleanNotes = assertOptionalString(notes, "notes", { max: 5000 });
  const cleanSource = assertOptionalString(source, "source", { max: 40 }) || "booking_link";

  const slotPayload = await generatePublicSlots({
    username,
    slug,
    visitorDate,
    visitorTimezone,
  });

  let slot = null;
  let resolvedStartAtUtc = safeStartAtUtc;

  if (resolvedStartAtUtc) {
    slot = slotPayload.slots.find((item) => item.startAtUtc === resolvedStartAtUtc);
    if (!slot) {
      throw conflict("Selected slot is no longer available");
    }
    if (safeSlotToken) {
      verifySlotToken(slotPayload.event.id, resolvedStartAtUtc, safeSlotToken);
    }
  } else {
    if (!safeSlotToken) {
      throw conflict("A slot token is required to complete this booking.");
    }
    slot = slotPayload.slots.find((item) => {
      try {
        verifySlotToken(slotPayload.event.id, item.startAtUtc, safeSlotToken);
        return true;
      } catch {
        return false;
      }
    });
    if (!slot) {
      throw conflict("Selected slot is no longer available");
    }
    resolvedStartAtUtc = slot.startAtUtc;
  }

  const event = slotPayload.event;
  const hostWorkspaceId = event.workspaceId || event.userId;
  const generatedMeetingLink = generateMeetingLink({
    location_type: event.locationType,
    custom_location: event.customLocation,
  });

  let googleConnection = {
    connected: false,
    hasRefreshToken: false,
    integrationId: null,
    accountEmail: "",
    reason: "missing_row",
  };
  if (event.locationType === "google_meet") {
    try {
      googleConnection = await getVerifiedGoogleCalendarConnectionStatus({
        workspaceId: hostWorkspaceId,
        userId: event.userId,
        logContext: "booking.create",
      });
    } catch (error) {
      googleConnection = {
        connected: false,
        hasRefreshToken: false,
        integrationId: null,
        accountEmail: "",
        reason: "status_check_failed",
      };
    }
  }

  const baseMeetingState = initialMeetingState({
    locationType: event.locationType,
    generatedLink: generatedMeetingLink,
    hasGoogleCalendarConnection: !!googleConnection.connected,
  });
  const columnSupport = await getBookingColumnSupport();
  const supportsExtendedColumns = hasExtendedBookingColumns(columnSupport);

  let booking = await withTransaction(async (client) => {
    await assertBookingStillAvailable(client, { event, slot });

    try {
      const baseValues = [
        event.userId,
        hostWorkspaceId,
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
      ];

      const inserted = supportsExtendedColumns
        ? await query(
            `
              INSERT INTO bookings (
                user_id,
                workspace_id,
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
                email_sent_host,
                email_sent_invitee,
                status
              )
              VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz,$10,$11,$12,$13,$14,$15,$16,$17,FALSE,FALSE,'confirmed'
              )
              RETURNING *
            `,
            [
              ...baseValues,
              baseMeetingState.meetingLinkStatus,
              baseMeetingState.calendarProvider,
              baseMeetingState.calendarEventId,
            ],
            client
          )
        : await query(
            `
              INSERT INTO bookings (
                user_id,
                workspace_id,
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
                $1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz,$10,$11,$12,$13,$14,'confirmed'
              )
              RETURNING *
            `,
            baseValues,
            client
          );

      return inserted.rows[0];
    } catch (error) {
      if (isMissingExtendedBookingColumnError(error)) {
        // Schema has not been migrated on this environment yet; retry with legacy insert.
        resetBookingColumnCache();
        const inserted = await query(
          `
            INSERT INTO bookings (
              user_id,
              workspace_id,
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
              $1,$2,$3,$4,$5,$6,$7,$8::timestamptz,$9::timestamptz,$10,$11,$12,$13,$14,'confirmed'
            )
            RETURNING *
          `,
          [
            event.userId,
            hostWorkspaceId,
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
          ],
          client
        );
        return inserted.rows[0];
      }
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
        calendarResult = await generateGoogleMeetLink(hostWorkspaceId, {
          bookingId: booking.id,
          eventTitle: event.title,
          hostTimezone: event.hostTimezone,
          startAtUtc: slot.startAtUtc,
          endAtUtc: slot.endAtUtc,
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
      if (!calendarResult.meetingLink) {
        logGoogleMeetBooking(
          "generation_completed_without_link",
          {
            bookingId: booking.id,
            workspaceId: hostWorkspaceId,
            userId: event.userId,
            calendarEventId: calendarResult.calendarEventId || "",
          },
          "warn"
        );
      }
      const nextStatus = calendarResult.meetingLink ? "ready" : "generation_failed";
      const updated = supportsExtendedColumns
        ? await query(
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
          )
        : await query(
            `
              UPDATE bookings
              SET
                meeting_link = $1,
                updated_at = NOW()
              WHERE id = $2
              RETURNING *
            `,
            [calendarResult.meetingLink, booking.id]
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
      if (supportsExtendedColumns) {
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
      }
      logGoogleMeetBooking(
        "generation_failed",
        {
          bookingId: booking.id,
          workspaceId: hostWorkspaceId,
          userId: event.userId,
          integrationConnected: googleConnection.connected,
          integrationReason: googleConnection.reason || "",
          errorStatus,
          authorizationIssue,
          error: calendarError?.message || String(calendarError || ""),
        },
        authorizationIssue ? "warn" : "error"
      );
    }
  } else if (event.locationType === "google_meet") {
    logGoogleMeetBooking("generation_skipped_not_connected", {
      bookingId: booking.id,
      workspaceId: hostWorkspaceId,
      userId: event.userId,
      integrationConnected: googleConnection.connected,
      integrationReason: googleConnection.reason || "",
    });
  }

  try {
    const syncedContact = await upsertContactFromBooking(
      hostWorkspaceId,
      event.userId,
      booking,
      {
        bookingId: booking.id,
        inviteeName: cleanName,
        inviteeEmail: cleanEmail,
        inviteePhone: cleanPhone,
        inviteeCompany: cleanCompany,
        notes: cleanNotes,
        source: cleanSource,
      }
    );
    if (syncedContact?.id) {
      booking.contact_id = syncedContact.id;
    }
  } catch (error) {
    console.error("Failed to sync booking contact:", error?.message || error);
  }

  const userRes = await query(
    "SELECT email, display_name FROM users WHERE id = $1",
    [event.userId]
  );
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
      locationType: booking.location_type || event.locationType,
      meetingLink: booking.meeting_link || null,
      meetingLinkStatus: booking.meeting_link_status || baseMeetingState.meetingLinkStatus,
    });
  } catch (error) {
    emailStatus = {
      sent: false,
      inviteeSent: false,
      hostSent: false,
      reason: "Email failed",
    };
  }

  if (supportsExtendedColumns) {
    const updated = await query(
      `
        UPDATE bookings
        SET
          email_sent_host = $1,
          email_sent_invitee = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [
        Boolean(emailStatus.hostSent),
        Boolean(emailStatus.inviteeSent),
        booking.id,
      ]
    );
    if (updated.rows[0]) {
      booking = updated.rows[0];
    }
  }

  return {
    booking: mapBookingRow(booking, slotPayload.visitorTimezone),
    event,
    emailStatus,
  };
}

async function refreshPendingGoogleMeetLinks(scopeId, rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  const columnSupport = await getBookingColumnSupport();
  if (!hasExtendedBookingColumns(columnSupport)) return rows;

  const pendingRows = rows
    .filter((row) => {
      const locationType = String(row.location_type || "").trim().toLowerCase();
      if (locationType !== "google_meet") return false;
      if (String(row.meeting_link || "").trim()) return false;
      const status = String(row.meeting_link_status || "").trim().toLowerCase();
      return (
        status === "pending_generation" ||
        status === "generation_failed" ||
        status === "pending_calendar_connection"
      );
    })
    .slice(0, 8);

  if (!pendingRows.length) return rows;

  const resultMap = new Map(rows.map((row) => [String(row.id), row]));
  const withEventId = [];
  const withoutEventId = [];

  for (const row of pendingRows) {
    const eventId = String(row.calendar_event_id || "").trim();
    if (eventId) withEventId.push(row);
    else withoutEventId.push(row);
  }

  const markRowsAsPendingCalendarConnection = async (items = []) => {
    for (const row of items) {
      const rowId = String(row.id || "");
      if (!rowId) continue;
      const currentStatus = String(row.meeting_link_status || "").trim().toLowerCase();
      if (currentStatus === "pending_calendar_connection") {
        resultMap.set(rowId, row);
        continue;
      }
      try {
        const updated = await query(
          `
            UPDATE bookings
            SET meeting_link_status = 'pending_calendar_connection', updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [rowId]
        );
        const next = updated.rows[0];
        if (next) {
          resultMap.set(String(next.id), {
            ...row,
            ...next,
            event_title: row.event_title,
          });
        }
      } catch {
        // ignore update failures during best-effort refresh
      }
    }
  };

  let connectionStatus = {
    connected: false,
    hasRefreshToken: false,
    integrationId: null,
    accountEmail: "",
    reason: "missing_row",
  };
  try {
    const scopeUserId = String(
      pendingRows[0]?.user_id || withEventId[0]?.user_id || withoutEventId[0]?.user_id || ""
    ).trim();
    connectionStatus = await getVerifiedGoogleCalendarConnectionStatus({
      workspaceId: scopeId,
      userId: scopeUserId,
      logContext: "booking.refresh",
    });
  } catch {
    connectionStatus = {
      connected: false,
      hasRefreshToken: false,
      integrationId: null,
      accountEmail: "",
      reason: "status_check_failed",
    };
  }

  if (!connectionStatus.connected) {
    logGoogleMeetBooking("refresh_skipped_not_connected", {
      scopeId,
      reason: connectionStatus.reason || "",
      rowCount: pendingRows.length,
    });
    await markRowsAsPendingCalendarConnection(pendingRows);
    return rows.map((row) => resultMap.get(String(row.id)) || row);
  }

  let gcal;
  try {
    gcal = await getAuthenticatedGoogleClient(scopeId);
  } catch (error) {
    const status = parseGoogleErrorStatus(error);
    const message = String(error?.message || "").toLowerCase();
    const isAuthIssue =
      status === 401 ||
      status === 403 ||
      /not connected|authorized|authorization expired|reconnect/.test(message);

    if (isAuthIssue) {
      await markRowsAsPendingCalendarConnection(pendingRows);
      return rows.map((row) => resultMap.get(String(row.id)) || row);
    }

    return rows;
  }

  let hostTimezone = "UTC";
  try {
    const scopeUserId = String(
      pendingRows[0]?.user_id || withEventId[0]?.user_id || withoutEventId[0]?.user_id || ""
    ).trim();
    const userRow = scopeUserId
      ? await query("SELECT timezone FROM users WHERE id = $1", [scopeUserId])
      : { rows: [] };
    hostTimezone = String(userRow.rows[0]?.timezone || "UTC");
  } catch {
    hostTimezone = "UTC";
  }

  for (const row of withEventId) {
    const rowId = String(row.id || "");
    const calendarEventId = String(row.calendar_event_id || "").trim();
    if (!rowId || !calendarEventId) continue;

    try {
      const lookup = await gcal.events.get({
        calendarId: "primary",
        eventId: calendarEventId,
        conferenceDataVersion: 1,
      });
      const link = extractGoogleMeetLinkFromEvent(lookup?.data || {});
      if (link) {
        const updated = await query(
          `
            UPDATE bookings
            SET
              meeting_link = $1,
              meeting_link_status = 'ready',
              updated_at = NOW()
            WHERE id = $2
            RETURNING *
          `,
          [link, rowId]
        );
        const next = updated.rows[0];
        if (next) {
          resultMap.set(String(next.id), {
            ...row,
            ...next,
            event_title: row.event_title,
          });
        }
        continue;
      }

      const currentStatus = String(row.meeting_link_status || "").trim().toLowerCase();
      const createdTs = Date.parse(String(row.created_at || ""));
      const isStalePending =
        currentStatus === "pending_generation" &&
        Number.isFinite(createdTs) &&
        Date.now() - createdTs > 2 * 60 * 1000;

      if (isStalePending) {
        const updated = await query(
          `
            UPDATE bookings
            SET meeting_link_status = 'generation_failed', updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [rowId]
        );
        const next = updated.rows[0];
        if (next) {
          resultMap.set(String(next.id), {
            ...row,
            ...next,
            event_title: row.event_title,
          });
        }
      }
    } catch {
      // ignore best-effort lookup failures and keep current row data
    }
  }

  for (const row of withoutEventId) {
    const rowId = String(row.id || "");
    if (!rowId) continue;

    try {
      const calendarResult = await createGoogleCalendarEventWithMeet({
        calendarClient: gcal,
        booking: { id: rowId },
        event: {
          title: String(row.event_title || "Meeting"),
          hostTimezone,
        },
        slot: {
          startAtUtc: row.start_at_utc,
          endAtUtc: row.end_at_utc,
        },
        inviteeName: String(row.invitee_name || "Invitee"),
        inviteeEmail: String(row.invitee_email || "").trim(),
        notes: String(row.notes || ""),
      });

      if (!calendarResult.meetingLink) {
        logGoogleMeetBooking(
          "refresh_completed_without_link",
          {
            bookingId: rowId,
            scopeId,
            calendarEventId: calendarResult.calendarEventId || "",
          },
          "warn"
        );
      }
      const nextStatus = calendarResult.meetingLink ? "ready" : "generation_failed";
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
        [calendarResult.calendarEventId, calendarResult.meetingLink, nextStatus, rowId]
      );
      const next = updated.rows[0];
      if (next) {
        resultMap.set(String(next.id), {
          ...row,
          ...next,
          event_title: row.event_title,
        });
      }
    } catch (error) {
      const status = parseGoogleErrorStatus(error);
      const message = String(error?.message || "").toLowerCase();
      const isAuthIssue =
        status === 401 ||
        status === 403 ||
        /not connected|authorized|authorization expired|reconnect/.test(message);

      const nextStatus = isAuthIssue ? "pending_calendar_connection" : "generation_failed";
      const nextProvider = isAuthIssue ? null : "google-calendar";
      try {
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
          [nextProvider, nextStatus, rowId]
        );
        const next = updated.rows[0];
        if (next) {
          resultMap.set(String(next.id), {
            ...row,
            ...next,
            event_title: row.event_title,
          });
        }
      } catch {
        // ignore update errors for best-effort repair path
      }
    }
  }

  return rows.map((row) => resultMap.get(String(row.id)) || row);
}

async function refreshPendingGoogleMeetLinksForRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const rowsByScopeId = new Map();
  for (const row of rows) {
    const scopeId = String(row.workspace_id || row.user_id || "").trim();
    if (!scopeId) continue;
    if (!rowsByScopeId.has(scopeId)) rowsByScopeId.set(scopeId, []);
    rowsByScopeId.get(scopeId).push(row);
  }

  if (!rowsByScopeId.size) return rows;

  const refreshedById = new Map();
  for (const [scopeId, scopedRows] of rowsByScopeId.entries()) {
    const refreshedRows = await refreshPendingGoogleMeetLinks(scopeId, scopedRows);
    for (const refreshedRow of refreshedRows) {
      refreshedById.set(String(refreshedRow.id), refreshedRow);
    }
  }

  return rows.map((row) => refreshedById.get(String(row.id)) || row);
}

async function listBookingsForUser(
  workspaceId,
  { fromDate = null, toDate = null, status = "all", timezone = "UTC" } = {}
) {
  const params = [workspaceId];
  const conditions = ["b.workspace_id = $1"];

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
  const refreshedRows = await refreshPendingGoogleMeetLinksForRows(result.rows);
  return refreshedRows.map((row) => mapBookingRow(row, timezone));
}

async function listUpcomingBookingsForUser(workspaceId, { limit = 20, timezone = "UTC" } = {}) {
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 200) : 20;
  const result = await query(
    `
      SELECT
        b.*,
        et.title AS event_title
      FROM bookings b
      JOIN event_types et ON et.id = b.event_type_id
      WHERE b.workspace_id = $1
        AND b.status = 'confirmed'
        AND b.start_at_utc >= NOW()
      ORDER BY b.start_at_utc ASC
      LIMIT $2
    `,
    [workspaceId, safeLimit]
  );
  const refreshedRows = await refreshPendingGoogleMeetLinksForRows(result.rows);
  return refreshedRows.map((row) => mapBookingRow(row, timezone));
}

async function getPublicBookingConfirmationForEvent(
  event,
  bookingId,
  { timezone = "UTC" } = {}
) {
  const safeBookingId = assertString(bookingId, "bookingId", { min: 3, max: 120 });
  const safeTimezone = String(timezone || "UTC").trim() || "UTC";

  const result = await query(
    `
      SELECT
        b.*,
        et.title AS event_title
      FROM bookings b
      JOIN event_types et ON et.id = b.event_type_id
      WHERE b.id = $1
        AND b.event_type_id = $2
        AND b.status = 'confirmed'
      LIMIT 1
    `,
    [safeBookingId, event.id]
  );

  const row = result.rows[0];
  if (!row) {
    throw notFound("Booking confirmation not found");
  }

  const refreshedRows = await refreshPendingGoogleMeetLinks(
    event.workspaceId || event.userId,
    [row]
  );
  const finalRow = refreshedRows[0] || row;

  return mapBookingRow(finalRow, safeTimezone);
}

async function cancelBookingForUser(workspaceId, bookingId, reason = "") {
  const safeReason = assertOptionalString(reason, "reason", { max: 500 });
  const result = await query(
    `
      UPDATE bookings
      SET
        status = 'canceled',
        cancel_reason = $1,
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND workspace_id = $3 AND status = 'confirmed'
      RETURNING *
    `,
    [safeReason || null, bookingId, workspaceId]
  );

  const row = result.rows[0];
  if (!row) throw notFound("Booking not found or already canceled");
  return mapBookingRow(row, "UTC");
}

module.exports = {
  createPublicBooking,
  listBookingsForUser,
  listUpcomingBookingsForUser,
  getPublicBookingConfirmationForEvent,
  cancelBookingForUser,
};
