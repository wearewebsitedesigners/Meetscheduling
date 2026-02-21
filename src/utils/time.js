const { DateTime } = require("luxon");
const { badRequest } = require("./http-error");

function dateInZone(dateIso, zone) {
  const dt = DateTime.fromISO(dateIso, { zone });
  if (!dt.isValid) throw badRequest("Invalid date");
  return dt.startOf("day");
}

function combineDateAndTime(dateIso, timeValue, zone) {
  const dt = DateTime.fromISO(`${dateIso}T${timeValue}`, { zone });
  if (!dt.isValid) throw badRequest("Invalid date/time");
  return dt;
}

function parseTimeToMinutes(timeValue) {
  const parts = String(timeValue).split(":");
  if (parts.length !== 2) throw badRequest("Invalid time");
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw badRequest("Invalid time");
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw badRequest("Invalid time");
  }
  return hour * 60 + minute;
}

function addMinutes(dateTime, minutes) {
  return dateTime.plus({ minutes });
}

function weekdayIndex(dateIso, zone) {
  const dt = DateTime.fromISO(dateIso, { zone });
  if (!dt.isValid) throw badRequest("Invalid date");
  // Luxon weekday: Monday=1...Sunday=7
  return dt.weekday % 7;
}

function asUtcIso(dateTime) {
  return dateTime.toUTC().toISO({ suppressMilliseconds: true });
}

function formatForZone(utcIso, zone) {
  const dt = DateTime.fromISO(utcIso, { zone: "utc" }).setZone(zone);
  return {
    date: dt.toFormat("yyyy-LL-dd"),
    time: dt.toFormat("hh:mm a"),
    iso: dt.toISO({ suppressMilliseconds: true }),
  };
}

function dateFromUtcInZone(utcIso, zone) {
  return DateTime.fromISO(utcIso, { zone: "utc" })
    .setZone(zone)
    .toFormat("yyyy-LL-dd");
}

module.exports = {
  DateTime,
  dateInZone,
  combineDateAndTime,
  parseTimeToMinutes,
  addMinutes,
  weekdayIndex,
  asUtcIso,
  formatForZone,
  dateFromUtcInZone,
};

