const env = require("../config/env");
const { query } = require("../db/pool");
const { getPublicEventTypeByUsernameAndSlug } = require("./event-types.service");
const { makeSlotToken } = require("../utils/booking-token");
const { badRequest } = require("../utils/http-error");
const { DateTime } = require("luxon");

function toIsoDate(value) {
  return value.toFormat("yyyy-LL-dd");
}

function isValidZone(zone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function assertZone(zone, field) {
  if (!zone || typeof zone !== "string" || !isValidZone(zone)) {
    throw badRequest(`${field} is invalid`);
  }
  return zone;
}

function assertDate(dateValue, field = "date") {
  if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw badRequest(`${field} must be YYYY-MM-DD`);
  }
  const parsed = DateTime.fromISO(dateValue, { zone: "utc" });
  if (!parsed.isValid) throw badRequest(`${field} is invalid`);
  return dateValue;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function toTimeString(value) {
  if (typeof value !== "string") return String(value);
  return value.slice(0, 5);
}

function parsePgTimestamp(value) {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: "utc" });
  }
  return DateTime.fromISO(String(value), { zone: "utc" });
}

async function fetchWeeklyAvailability(userId) {
  const result = await query(
    `
      SELECT weekday, start_time, end_time, is_available
      FROM user_weekly_availability
      WHERE user_id = $1
      ORDER BY weekday ASC, start_time ASC
    `,
    [userId]
  );
  return result.rows;
}

async function fetchDateOverrides(userId, fromDate, toDate) {
  const result = await query(
    `
      SELECT override_date, start_time, end_time, is_available
      FROM user_date_overrides
      WHERE user_id = $1
        AND override_date >= $2::date
        AND override_date <= $3::date
      ORDER BY override_date ASC, start_time ASC NULLS FIRST
    `,
    [userId, fromDate, toDate]
  );
  return result.rows;
}

async function fetchBookingsForRange(eventTypeId, rangeStartUtc, rangeEndUtc) {
  const result = await query(
    `
      SELECT
        id,
        start_at_utc,
        end_at_utc,
        buffer_before_min,
        buffer_after_min,
        status
      FROM bookings
      WHERE event_type_id = $1
        AND status = 'confirmed'
        AND end_at_utc > $2::timestamptz
        AND start_at_utc < $3::timestamptz
      ORDER BY start_at_utc ASC
    `,
    [eventTypeId, rangeStartUtc, rangeEndUtc]
  );
  return result.rows;
}

async function fetchBookingCountByHostDate(
  eventTypeId,
  hostTimezone,
  rangeStartUtc,
  rangeEndUtc
) {
  const result = await query(
    `
      SELECT
        timezone($2, start_at_utc)::date AS host_date,
        COUNT(*)::int AS count
      FROM bookings
      WHERE event_type_id = $1
        AND status = 'confirmed'
        AND start_at_utc >= $3::timestamptz
        AND start_at_utc < $4::timestamptz
      GROUP BY host_date
    `,
    [eventTypeId, hostTimezone, rangeStartUtc, rangeEndUtc]
  );

  const map = new Map();
  for (const row of result.rows) {
    map.set(String(row.host_date), row.count);
  }
  return map;
}

function getDateIntervals({
  hostDate,
  hostTimezone,
  weeklyRows,
  dateOverrides,
}) {
  const weekday = DateTime.fromISO(hostDate, { zone: hostTimezone }).weekday % 7;
  const weeklyForDay = weeklyRows.filter(
    (row) => Number(row.weekday) === weekday && row.is_available
  );
  const overridesForDay = dateOverrides.filter(
    (row) => String(row.override_date) === hostDate
  );

  const hasAvailableOverride = overridesForDay.some((row) => row.is_available);
  const hasBlockOverride = overridesForDay.some((row) => !row.is_available);

  if (hasAvailableOverride) {
    return overridesForDay
      .filter((row) => row.is_available)
      .map((row) => ({
        startTime: toTimeString(row.start_time),
        endTime: toTimeString(row.end_time),
      }));
  }

  if (hasBlockOverride) {
    return [];
  }

  return weeklyForDay.map((row) => ({
    startTime: toTimeString(row.start_time),
    endTime: toTimeString(row.end_time),
  }));
}

function buildDateRange(startDateIso, endDateIso, zone) {
  const list = [];
  let cursor = DateTime.fromISO(startDateIso, { zone }).startOf("day");
  const end = DateTime.fromISO(endDateIso, { zone }).startOf("day");
  while (cursor <= end) {
    list.push(cursor.toFormat("yyyy-LL-dd"));
    cursor = cursor.plus({ days: 1 });
  }
  return list;
}

async function generatePublicSlots({
  username,
  slug,
  visitorDate,
  visitorTimezone,
}) {
  const safeDate = assertDate(visitorDate, "date");
  const safeVisitorTimezone = assertZone(visitorTimezone || "UTC", "timezone");

  const event = await getPublicEventTypeByUsernameAndSlug(username, slug);
  const hostTimezone = assertZone(
    event.timezone || env.defaultTimezone,
    "Host timezone"
  );

  const visitorStart = DateTime.fromISO(safeDate, {
    zone: safeVisitorTimezone,
  }).startOf("day");
  const visitorEndExclusive = visitorStart.plus({ days: 1 });
  const nowUtc = DateTime.utc();

  const hostWindowStart = visitorStart
    .setZone(hostTimezone)
    .minus({ days: 1 })
    .startOf("day");
  const hostWindowEnd = visitorEndExclusive
    .setZone(hostTimezone)
    .plus({ days: 1 })
    .startOf("day");
  const hostDateRange = buildDateRange(
    toIsoDate(hostWindowStart),
    toIsoDate(hostWindowEnd),
    hostTimezone
  );

  const weeklyRows = await fetchWeeklyAvailability(event.user_id);
  const dateOverrides = await fetchDateOverrides(
    event.user_id,
    hostDateRange[0],
    hostDateRange[hostDateRange.length - 1]
  );
  const existingBookings = await fetchBookingsForRange(
    event.id,
    hostWindowStart.toUTC().toISO(),
    hostWindowEnd.toUTC().toISO()
  );
  const bookingCountByHostDate = await fetchBookingCountByHostDate(
    event.id,
    hostTimezone,
    hostWindowStart.toUTC().toISO(),
    hostWindowEnd.toUTC().toISO()
  );

  const durationMinutes = Number(event.duration_minutes);
  const bufferBefore = Number(event.buffer_before_min || 0);
  const bufferAfter = Number(event.buffer_after_min || 0);
  const maxBookingsPerDay = Number(event.max_bookings_per_day || 0);
  const stepMinutes = Math.max(5, Number(env.slotIntervalMinutes || 15));

  const existingRanges = existingBookings.map((row) => {
    const startUtc = parsePgTimestamp(row.start_at_utc);
    const endUtc = parsePgTimestamp(row.end_at_utc);
    const blockStart = startUtc.minus({ minutes: Number(row.buffer_before_min || 0) });
    const blockEnd = endUtc.plus({ minutes: Number(row.buffer_after_min || 0) });
    return {
      startUtc,
      endUtc,
      blockStart,
      blockEnd,
    };
  });

  const slots = [];
  for (const hostDate of hostDateRange) {
    const dayCount = bookingCountByHostDate.get(hostDate) || 0;
    if (maxBookingsPerDay > 0 && dayCount >= maxBookingsPerDay) {
      continue;
    }

    const intervals = getDateIntervals({
      hostDate,
      hostTimezone,
      weeklyRows,
      dateOverrides,
    });
    if (!intervals.length) continue;

    for (const interval of intervals) {
      const intervalStart = DateTime.fromISO(`${hostDate}T${interval.startTime}`, {
        zone: hostTimezone,
      });
      const intervalEnd = DateTime.fromISO(`${hostDate}T${interval.endTime}`, {
        zone: hostTimezone,
      });
      if (!intervalStart.isValid || !intervalEnd.isValid || intervalStart >= intervalEnd) {
        continue;
      }

      let candidateStart = intervalStart.plus({ minutes: bufferBefore });
      const latestStart = intervalEnd.minus({
        minutes: durationMinutes + bufferAfter,
      });

      while (candidateStart <= latestStart) {
        const candidateEnd = candidateStart.plus({ minutes: durationMinutes });
        const candidateBlockedStart = candidateStart.minus({ minutes: bufferBefore });
        const candidateBlockedEnd = candidateEnd.plus({ minutes: bufferAfter });
        const candidateStartUtc = candidateStart.toUTC();
        const candidateEndUtc = candidateEnd.toUTC();
        const candidateInVisitorZone = candidateStartUtc.setZone(safeVisitorTimezone);

        const visitorSlotDate = candidateInVisitorZone.toFormat("yyyy-LL-dd");
        const isSelectedVisitorDate = visitorSlotDate === safeDate;
        const isFuture = candidateStartUtc > nowUtc;
        const hasOverlap = existingRanges.some((range) =>
          overlaps(
            candidateBlockedStart.toMillis(),
            candidateBlockedEnd.toMillis(),
            range.blockStart.toMillis(),
            range.blockEnd.toMillis()
          )
        );

        if (isSelectedVisitorDate && isFuture && !hasOverlap) {
          const startAtUtc = candidateStartUtc.toISO({ suppressMilliseconds: true });
          const endAtUtc = candidateEndUtc.toISO({ suppressMilliseconds: true });
          slots.push({
            startAtUtc,
            endAtUtc,
            startLocal: {
              date: candidateInVisitorZone.toFormat("yyyy-LL-dd"),
              time: candidateInVisitorZone.toFormat("hh:mm a"),
              iso: candidateInVisitorZone.toISO({ suppressMilliseconds: true }),
            },
            endLocal: {
              date: candidateEndUtc.setZone(safeVisitorTimezone).toFormat("yyyy-LL-dd"),
              time: candidateEndUtc.setZone(safeVisitorTimezone).toFormat("hh:mm a"),
              iso: candidateEndUtc
                .setZone(safeVisitorTimezone)
                .toISO({ suppressMilliseconds: true }),
            },
            token: makeSlotToken(event.id, startAtUtc),
          });
        }

        candidateStart = candidateStart.plus({ minutes: stepMinutes });
      }
    }
  }

  slots.sort((a, b) => (a.startAtUtc < b.startAtUtc ? -1 : 1));

  return {
    event: {
      id: event.id,
      userId: event.user_id,
      title: event.title,
      description: event.description,
      slug: event.slug,
      durationMinutes: event.duration_minutes,
      username: event.username,
      hostName: event.display_name,
      hostTimezone,
      locationType: event.location_type,
      customLocation: event.custom_location,
      bufferBeforeMin: event.buffer_before_min,
      bufferAfterMin: event.buffer_after_min,
      maxBookingsPerDay: event.max_bookings_per_day,
    },
    visitorTimezone: safeVisitorTimezone,
    visitorDate: safeDate,
    slots,
  };
}

module.exports = {
  generatePublicSlots,
  assertDate,
  assertZone,
};
