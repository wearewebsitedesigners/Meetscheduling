const { getRequestIp, logSecurityEvent } = require("../utils/security-log");
const { isLikelyAutomatedClient } = require("./api-abuse-protection");
const { composeMiddlewares, createMethodRateLimiter, createRateLimiter } = require("./rate-limit");

function normalizeHost(req) {
  return String(req?.hostname || req?.headers?.host || "")
    .trim()
    .toLowerCase() || "unknown-host";
}

function buildPublicActorKey(req, scope) {
  return `${scope}:${normalizeHost(req)}:${getRequestIp(req)}`;
}

function getPublicRouteBucket(req) {
  const segments = String(req?.path || "")
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!segments.length) return "root";
  if (segments[0] === "landing") return segments[1] === undefined ? "landing" : "landing-page";
  if (segments[0] === "pages") {
    if (segments[2] === "availability") return "page-availability";
    return "page-details";
  }
  if (segments[0] === "availability") return "page-availability";
  if (segments[0] === "booking") {
    if (segments[1] === "slots") return "domain-booking-slots";
    if (segments[1] === "bookings" && segments[2]) return "domain-booking-confirmation";
    if (segments[1] === "bookings") return "domain-booking-create";
    return "domain-booking";
  }
  if (segments[2] === "slots") return "booking-slots";
  if (segments[2] === "bookings" && segments[3]) return "booking-confirmation";
  if (segments[2] === "bookings") return "booking-create";
  return segments[0].toLowerCase();
}

function logPublicLimitEvent(event, req, meta, extra = {}) {
  logSecurityEvent(event, {
    requestId: req.id || "",
    ip: getRequestIp(req),
    host: normalizeHost(req),
    path: req.originalUrl || req.url || "",
    retryAfterSeconds: meta.retryAfterSeconds,
    ...extra,
  }, { level: "warn" });
}

const publicGlobalRateLimit = createRateLimiter({
  key: "public-global",
  windowMs: 5 * 60 * 1000,
  maxRequests: 180,
  blockMs: 15 * 60 * 1000,
  errorMessage: "Too many public requests. Please try again later.",
  keyFn: (req) => buildPublicActorKey(req, "global"),
  onLimit: (req, meta) => {
    logPublicLimitEvent("traffic.public_global_rate_limited", req, meta);
  },
});

const publicBurstRateLimit = createRateLimiter({
  key: "public-route-burst",
  windowMs: 60 * 1000,
  maxRequests: 45,
  blockMs: 10 * 60 * 1000,
  errorMessage: "Too many repeated requests. Please slow down and try again later.",
  keyFn: (req) => `${buildPublicActorKey(req, "burst")}:${getPublicRouteBucket(req)}`,
  onLimit: (req, meta) => {
    logPublicLimitEvent("traffic.public_route_rate_limited", req, meta, {
      bucket: getPublicRouteBucket(req),
    });
  },
});

const automatedPublicRateLimit = createMethodRateLimiter({
  methods: ["GET", "HEAD", "OPTIONS", "POST"],
  key: "public-automated-client",
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  blockMs: 30 * 60 * 1000,
  errorMessage: "Automated traffic limit reached. Please wait before sending more requests.",
  keyFn: (req) => {
    if (!isLikelyAutomatedClient(req)) return "";
    return buildPublicActorKey(req, "automated");
  },
  onLimit: (req, meta) => {
    logPublicLimitEvent("traffic.public_automated_client_rate_limited", req, meta, {
      automatedClient: true,
    });
  },
});

module.exports = composeMiddlewares(
  automatedPublicRateLimit,
  publicGlobalRateLimit,
  publicBurstRateLimit
);
