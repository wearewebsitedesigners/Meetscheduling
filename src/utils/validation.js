const { badRequest } = require("./http-error");

const INVALID_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function assertString(value, field, { min = 1, max = 5000, trim = true, normalize = true } = {}) {
  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string`);
  }
  const processed = normalize ? value.normalize("NFKC") : value;
  if (INVALID_CONTROL_CHARS.test(processed)) {
    throw badRequest(`${field} contains invalid characters`);
  }
  const result = trim ? processed.trim() : processed;
  if (result.length < min) {
    throw badRequest(`${field} is required`);
  }
  if (result.length > max) {
    throw badRequest(`${field} is too long`);
  }
  return result;
}

function assertOptionalString(value, field, { max = 5000, trim = true, normalize = true } = {}) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw badRequest(`${field} must be a string`);
  const processed = normalize ? value.normalize("NFKC") : value;
  if (INVALID_CONTROL_CHARS.test(processed)) {
    throw badRequest(`${field} contains invalid characters`);
  }
  const result = trim ? processed.trim() : processed;
  if (result.length > max) throw badRequest(`${field} is too long`);
  return result;
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

function assertOptionalBooleanString(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") throw badRequest(`${field} must be "true" or "false"`);
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw badRequest(`${field} must be "true" or "false"`);
}

function assertEnum(value, field, allowedValues) {
  const safeValue = assertString(value, field, { min: 1, max: 120 });
  if (!Array.isArray(allowedValues) || !allowedValues.includes(safeValue)) {
    throw badRequest(`${field} is invalid`);
  }
  return safeValue;
}

function assertBase32Secret(value, field = "secret") {
  const secret = assertString(value, field, { min: 16, max: 128 }).replace(/\s+/g, "");
  if (!/^[A-Z2-7]+=*$/i.test(secret)) {
    throw badRequest(`${field} is invalid`);
  }
  return secret.toUpperCase();
}

function assertTotpCode(value, field = "code") {
  const code = assertString(value, field, { min: 6, max: 12 }).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9]{6,12}$/.test(code)) {
    throw badRequest(`${field} is invalid`);
  }
  return code.toUpperCase();
}

function assertSafeFileName(value, field = "fileName", { max = 220 } = {}) {
  const name = assertString(value, field, { min: 1, max });
  if (/[\\/]/.test(name) || name.includes("..")) {
    throw badRequest(`${field} is invalid`);
  }
  return name;
}

function assertRelativeOrHttpUrl(
  value,
  field,
  {
    allowRelative = true,
    allowHttp = false,
    allowHttps = true,
    max = 2000,
  } = {}
) {
  const url = assertString(value, field, { min: 1, max });

  if (allowRelative && url.startsWith("/")) {
    if (url.startsWith("//") || /[\s\\]/.test(url)) {
      throw badRequest(`${field} is invalid`);
    }
    return url;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw badRequest(`${field} must be a valid URL`);
  }

  const protocol = parsed.protocol.toLowerCase();
  if (
    (protocol === "http:" && !allowHttp) ||
    (protocol === "https:" && !allowHttps) ||
    (protocol !== "http:" && protocol !== "https:")
  ) {
    throw badRequest(`${field} must use an allowed URL scheme`);
  }
  if (parsed.username || parsed.password) {
    throw badRequest(`${field} must not include credentials`);
  }
  return parsed.toString();
}

function assertNavigationUrl(
  value,
  field,
  {
    allowRelative = true,
    allowHttp = false,
    allowHttps = true,
    allowFragment = true,
    allowMailto = true,
    allowTel = true,
    max = 2000,
  } = {}
) {
  const url = assertString(value, field, { min: 1, max });

  if (allowFragment && url.startsWith("#")) {
    if (/[\s\\]/.test(url)) {
      throw badRequest(`${field} is invalid`);
    }
    return url;
  }

  if (allowRelative && url.startsWith("/")) {
    if (url.startsWith("//") || /[\s\\]/.test(url)) {
      throw badRequest(`${field} is invalid`);
    }
    return url;
  }

  if (allowMailto && url.toLowerCase().startsWith("mailto:")) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw badRequest(`${field} must be a valid URL`);
    }
    if (parsed.protocol.toLowerCase() !== "mailto:" || !parsed.pathname) {
      throw badRequest(`${field} must be a valid mailto link`);
    }
    return url;
  }

  if (allowTel && url.toLowerCase().startsWith("tel:")) {
    if (!/^tel:\+?[0-9().\-\s]{3,30}$/i.test(url)) {
      throw badRequest(`${field} must be a valid tel link`);
    }
    return url;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw badRequest(`${field} must be a valid URL`);
  }

  const protocol = parsed.protocol.toLowerCase();
  if (
    (protocol === "http:" && !allowHttp) ||
    (protocol === "https:" && !allowHttps) ||
    (protocol !== "http:" && protocol !== "https:")
  ) {
    throw badRequest(`${field} must use an allowed URL scheme`);
  }
  if (parsed.username || parsed.password) {
    throw badRequest(`${field} must not include credentials`);
  }
  return parsed.toString();
}

function sanitizeJsonValue(value, field, depth = 0) {
  if (depth > 6) throw badRequest(`${field} is too deeply nested`);
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return assertOptionalString(value, field, { max: 5000 });
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (value.length > 100) throw badRequest(`${field} contains too many items`);
    return value.map((entry, index) => sanitizeJsonValue(entry, `${field}[${index}]`, depth + 1));
  }
  if (typeof value === "object") {
    if (Buffer.isBuffer(value)) throw badRequest(`${field} is invalid`);
    const keys = Object.keys(value);
    if (keys.length > 100) throw badRequest(`${field} contains too many fields`);
    return keys.reduce((accumulator, key) => {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        throw badRequest(`${field}.${key} is invalid`);
      }
      accumulator[key] = sanitizeJsonValue(value[key], `${field}.${key}`, depth + 1);
      return accumulator;
    }, {});
  }
  throw badRequest(`${field} must be JSON-compatible`);
}

function assertJsonObject(value, field, { allowEmpty = true } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Buffer.isBuffer(value)) {
    throw badRequest(`${field} must be an object`);
  }
  const cleaned = sanitizeJsonValue(value, field, 0);
  if (!allowEmpty && !Object.keys(cleaned).length) {
    throw badRequest(`${field} is required`);
  }
  return cleaned;
}

function assertIsoDate(value, field = "date") {
  const date = assertString(value, field, { min: 10, max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest(`${field} must be YYYY-MM-DD`);
  }
  return date;
}

function assertIsoDateTime(value, field = "datetime") {
  const dateTime = assertString(value, field, { min: 17, max: 40 });
  if (!ISO_DATETIME_RE.test(dateTime)) {
    throw badRequest(`${field} must be an ISO 8601 date-time with timezone`);
  }
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`${field} is invalid`);
  }
  return parsed.toISOString();
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

function assertHexColor(value, field = "color") {
  const color = assertString(value, field, { min: 4, max: 7 }).toLowerCase();
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(color)) {
    throw badRequest(`${field} must be a valid hex color`);
  }
  return color;
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
  assertOptionalBooleanString,
  assertEnum,
  assertBase32Secret,
  assertTotpCode,
  assertSafeFileName,
  assertRelativeOrHttpUrl,
  assertNavigationUrl,
  assertJsonObject,
  assertIsoDate,
  assertIsoDateTime,
  assertTime,
  assertTimezone,
  assertHexColor,
  normalizeLocationType,
};
