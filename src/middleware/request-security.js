const env = require("../config/env");
const { getOptionalAuthContext } = require("./auth");
const { badRequest } = require("../utils/http-error");
const {
  buildRequestLogContext,
  logSecurityEvent,
  randomId,
} = require("../utils/security-log");
const { createRateLimiter } = require("./rate-limit");

const INVALID_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const SUSPICIOUS_INPUT_PATTERN =
  /<script\b|javascript:|data:text\/html|onerror\s*=|onload\s*=|union\s+select|drop\s+table|\.\.\/|%2e%2e%2f/i;
const SUSPICIOUS_PATH_PATTERN =
  /(?:^|\/)(?:\.env(?:\.[^/]+)?|\.git|wp-admin|wp-login\.php|xmlrpc\.php|phpmyadmin|cgi-bin|server-status|server-info|actuator|vendor\/phpunit|boaform|HNAP1|_ignition|etc\/passwd|id_rsa|composer\.(?:json|lock))/i;
const SUSPICIOUS_METHOD_PATTERN = /^(TRACE|CONNECT)$/i;

function isLocalRequest(req) {
  const host = String(req?.hostname || "").trim().toLowerCase();
  const ip = String(req?.ip || "").trim();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("::ffff:127.0.0.1")
  );
}

function assignRequestId(req, res, next) {
  req.id = req.id || randomId("req");
  res.setHeader("X-Request-Id", req.id);
  next();
}

function detectSuspiciousTraffic(req, res, next) {
  const requestPath = String(req.originalUrl || req.url || "");
  const method = String(req.method || "").trim().toUpperCase();
  const suspiciousPath = SUSPICIOUS_PATH_PATTERN.test(requestPath);
  const suspiciousMethod = SUSPICIOUS_METHOD_PATTERN.test(method);

  if (suspiciousPath || suspiciousMethod) {
    req.suspiciousTraffic = true;
    logSecurityEvent("traffic.suspicious_probe_detected", {
      ...buildRequestLogContext(req),
      suspiciousPath,
      suspiciousMethod,
    }, { level: "warn" });
  }

  next();
}

function applySecurityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.path.startsWith("/api/")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  const forwardedProto = String(req.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (
    env.security.hstsEnabled &&
    (req.secure || forwardedProto === "https") &&
    !isLocalRequest(req)
  ) {
    res.setHeader(
      "Strict-Transport-Security",
      `max-age=${env.security.hstsMaxAgeSeconds}; includeSubDomains`
    );
  }
  next();
}

function enforceHttps(req, res, next) {
  if (!env.security.forceHttps || isLocalRequest(req)) {
    return next();
  }

  const forwardedProto = String(req.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (req.secure || forwardedProto === "https") {
    return next();
  }

  logSecurityEvent("traffic.insecure_transport_blocked", {
    ...buildRequestLogContext(req),
    forwardedProto: forwardedProto || "",
    action: req.method === "GET" || req.method === "HEAD" ? "redirect" : "reject",
  }, { level: "warn" });

  if (req.method === "GET" || req.method === "HEAD") {
    const host = String(req.headers.host || "").trim();
    return res.redirect(308, `https://${host}${req.originalUrl || req.url || "/"}`);
  }

  return res.status(426).json({ error: "HTTPS is required." });
}

function sanitizeStructuredValue(value, path, depth = 0) {
  if (depth > 12) {
    throw badRequest(`${path} is too deeply nested`);
  }

  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (INVALID_CONTROL_CHARS.test(value)) {
      throw badRequest(`${path} contains invalid control characters`);
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    if (value.length > 500) {
      throw badRequest(`${path} contains too many items`);
    }
    return value.map((entry, index) => sanitizeStructuredValue(entry, `${path}[${index}]`, depth + 1));
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > 250) {
      throw badRequest(`${path} contains too many fields`);
    }

    return keys.reduce((accumulator, key) => {
      if (key === "__proto__" || key === "prototype" || key === "constructor") {
        throw badRequest(`${path}.${key} is not allowed`);
      }
      if (INVALID_CONTROL_CHARS.test(key)) {
        throw badRequest(`${path} contains an invalid field name`);
      }
      accumulator[key] = sanitizeStructuredValue(value[key], `${path}.${key}`, depth + 1);
      return accumulator;
    }, {});
  }

  throw badRequest(`${path} contains an unsupported value`);
}

function containsSuspiciousInput(value, depth = 0) {
  if (depth > 5 || value === null || value === undefined) return false;
  if (typeof value === "string") return SUSPICIOUS_INPUT_PATTERN.test(value);
  if (Array.isArray(value)) return value.some((entry) => containsSuspiciousInput(entry, depth + 1));
  if (typeof value === "object") {
    return Object.entries(value).some(([key, entry]) => {
      return SUSPICIOUS_INPUT_PATTERN.test(key) || containsSuspiciousInput(entry, depth + 1);
    });
  }
  return false;
}

function sanitizeIncomingRequest(req, res, next) {
  try {
    req.params = sanitizeStructuredValue(req.params || {}, "params");
    req.query = sanitizeStructuredValue(req.query || {}, "query");
    if (req.body && !Buffer.isBuffer(req.body)) {
      req.body = sanitizeStructuredValue(req.body, "body");
    }

    if (
      containsSuspiciousInput(req.query) ||
      containsSuspiciousInput(req.params) ||
      (!Buffer.isBuffer(req.body) && containsSuspiciousInput(req.body))
    ) {
      req.suspiciousTraffic = true;
      logSecurityEvent("traffic.suspicious_payload_detected", {
        ...buildRequestLogContext(req),
      }, { level: "warn" });
    }
    next();
  } catch (error) {
    next(error);
  }
}

function auditApiRequests(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    if (!req.path.startsWith("/api/")) return;

    const durationMs = Date.now() - startedAt;
    const statusCode = Number(res.statusCode || 0);
    const shouldLog =
      statusCode >= 400 ||
      durationMs >= env.security.slowRequestThresholdMs ||
      req.suspiciousTraffic === true;

    if (!shouldLog) return;

    logSecurityEvent("api.request_audit", {
      ...buildRequestLogContext(req),
      statusCode,
      durationMs,
      suspiciousTraffic: req.suspiciousTraffic === true,
    }, { level: statusCode >= 500 ? "error" : "warn" });
  });

  next();
}

const apiRateLimit = createRateLimiter({
  key: "api-global",
  windowMs: env.security.apiRateLimitWindowMs,
  maxRequests: env.security.apiRateLimitMaxRequests,
  blockMs: env.security.apiRateLimitBlockMs,
  errorMessage: "Too many API requests. Please slow down and try again.",
  keyFn: (req) => {
    if (req.path === "/health" || req.originalUrl === "/api/health") return "";
    const authContext = req.auth || getOptionalAuthContext(req);
    if (authContext?.userId) {
      return `user:${authContext.userId}`;
    }
    return `ip:${String(req.ip || "").trim() || "unknown"}`;
  },
  onLimit: (req, meta) => {
    logSecurityEvent("traffic.api_rate_limited", {
      ...buildRequestLogContext(req),
      retryAfterSeconds: meta.retryAfterSeconds,
      bucket: meta.bucketId,
    }, { level: "warn" });
  },
});

module.exports = {
  apiRateLimit,
  applySecurityHeaders,
  assignRequestId,
  auditApiRequests,
  detectSuspiciousTraffic,
  enforceHttps,
  sanitizeIncomingRequest,
};
