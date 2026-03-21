const crypto = require("crypto");

const SENSITIVE_KEY_PATTERN = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|client[-_]?secret|private[-_]?key|database_url|smtp_pass/i;

function randomId(prefix = "req") {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function maskEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const atIndex = email.indexOf("@");
  if (atIndex <= 1) return email ? "***" : "";
  return `${email.slice(0, 2)}***${email.slice(atIndex)}`;
}

function sanitizeForLog(value, key = "", depth = 0) {
  if (depth > 4) return "[truncated]";

  if (value === undefined || value === null) return value;

  if (typeof value === "string") {
    if (SENSITIVE_KEY_PATTERN.test(key)) return "[redacted]";
    const compact = value.replace(/\s+/g, " ").trim();
    return compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((entry) => sanitizeForLog(entry, key, depth + 1));
  }

  if (typeof value === "object") {
    const next = {};
    Object.entries(value)
      .slice(0, 25)
      .forEach(([entryKey, entryValue]) => {
        next[entryKey] = sanitizeForLog(entryValue, entryKey, depth + 1);
      });
    return next;
  }

  return String(value);
}

function getRequestIp(req) {
  const forwardedFor = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwardedFor || String(req?.ip || "").trim() || "unknown";
}

function buildRequestLogContext(req) {
  return {
    requestId: String(req?.id || "").trim() || "",
    method: String(req?.method || "").trim() || "",
    path: String(req?.originalUrl || req?.url || "").trim() || "",
    ip: getRequestIp(req),
    userId: String(req?.auth?.userId || "").trim() || "",
    workspaceId: String(req?.auth?.workspaceId || "").trim() || "",
    userAgent: String(req?.get?.("user-agent") || req?.headers?.["user-agent"] || "")
      .trim()
      .slice(0, 240),
  };
}

function logSecurityEvent(event, details = {}, { level = "info" } = {}) {
  const logger = typeof console[level] === "function" ? console[level] : console.log;
  logger(
    JSON.stringify({
      scope: "security",
      event: String(event || "event").trim(),
      at: new Date().toISOString(),
      ...sanitizeForLog(details),
    })
  );
}

function logAuthEvent(action, req, details = {}, level = "info") {
  logSecurityEvent(
    `auth.${String(action || "").trim() || "event"}`,
    {
      ...buildRequestLogContext(req),
      ...details,
    },
    { level }
  );
}

module.exports = {
  buildRequestLogContext,
  getRequestIp,
  logAuthEvent,
  logSecurityEvent,
  maskEmail,
  randomId,
  sanitizeForLog,
};
