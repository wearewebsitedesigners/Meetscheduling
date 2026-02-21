const { badRequest } = require("./http-error");

function assertString(value, field, { min = 1, max = 5000 } = {}) {
  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw badRequest(`${field} is required`);
  }
  if (trimmed.length > max) {
    throw badRequest(`${field} is too long`);
  }
  return trimmed;
}

function assertOptionalString(value, field, { max = 5000 } = {}) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw badRequest(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw badRequest(`${field} is too long`);
  return trimmed;
}

function assertEmail(value, field = "email") {
  const email = assertString(value, field, { min: 3, max: 320 }).toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!ok) throw badRequest(`${field} is invalid`);
  return email;
}

function assertSlug(value, field = "slug") {
  const slug = assertString(value, field, { min: 2, max: 80 }).toLowerCase();
  const ok = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  if (!ok) {
    throw badRequest(`${field} must use lowercase letters, numbers, and hyphens`);
  }
  return slug;
}

function assertInteger(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw badRequest(`${field} must be an integer`);
  }
  if (parsed < min || parsed > max) {
    throw badRequest(`${field} must be between ${min} and ${max}`);
  }
  return parsed;
}

function assertBoolean(value, field) {
  if (typeof value !== "boolean") throw badRequest(`${field} must be boolean`);
  return value;
}

function assertIsoDate(value, field = "date") {
  const date = assertString(value, field, { min: 10, max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest(`${field} must be YYYY-MM-DD`);
  }
  return date;
}

function assertTime(value, field = "time") {
  const time = assertString(value, field, { min: 5, max: 5 });
  if (!/^\d{2}:\d{2}$/.test(time)) throw badRequest(`${field} must be HH:MM`);
  return time;
}

function assertTimezone(value, field = "timezone") {
  const tz = assertString(value, field, { min: 1, max: 100 });
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw badRequest(`${field} is invalid`);
  }
  return tz;
}

function normalizeLocationType(value) {
  const allowed = new Set(["google_meet", "zoom", "custom", "in_person"]);
  const type = assertString(value, "locationType", { min: 2, max: 30 });
  if (!allowed.has(type)) {
    throw badRequest("locationType is invalid");
  }
  return type;
}

module.exports = {
  assertString,
  assertOptionalString,
  assertEmail,
  assertSlug,
  assertInteger,
  assertBoolean,
  assertIsoDate,
  assertTime,
  assertTimezone,
  normalizeLocationType,
};

