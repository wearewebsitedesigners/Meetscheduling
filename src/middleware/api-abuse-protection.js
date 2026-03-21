const { getOptionalAuthContext } = require("./auth");
const { composeMiddlewares, createMethodRateLimiter } = require("./rate-limit");
const {
  buildRequestLogContext,
  getRequestIp,
  logSecurityEvent,
} = require("../utils/security-log");

const AUTOMATED_USER_AGENT_PATTERN =
  /\b(bot|crawler|spider|scrapy|curl|wget|python-requests|httpclient|libwww-perl|go-http-client|node-fetch|axios|postman|insomnia|headless|selenium|playwright|phantom)\b/i;

function isLocalRequest(req) {
  const host = String(req?.hostname || "").trim().toLowerCase();
  const ip = getRequestIp(req);
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("::ffff:127.0.0.1")
  );
}

function normalizeHost(req) {
  return String(req?.hostname || req?.headers?.host || "")
    .trim()
    .toLowerCase() || "unknown-host";
}

function resolveActorKey(req) {
  if (req?.auth?.userId) {
    return `user:${req.auth.userId}`;
  }

  const authContext = getOptionalAuthContext(req);
  if (authContext?.userId) {
    return `user:${authContext.userId}`;
  }

  return `ip:${getRequestIp(req)}`;
}

function isLikelyAutomatedClient(req) {
  if (isLocalRequest(req)) return false;
  const userAgent = String(req?.get?.("user-agent") || req?.headers?.["user-agent"] || "")
    .trim();
  if (!userAgent) return true;
  return AUTOMATED_USER_AGENT_PATTERN.test(userAgent);
}

function buildProtectedKey(req, scope) {
  return `${scope}:${normalizeHost(req)}:${resolveActorKey(req)}`;
}

function logLimitEvent(event, req, meta, extra = {}) {
  logSecurityEvent(event, {
    ...buildRequestLogContext(req),
    retryAfterSeconds: meta.retryAfterSeconds,
    bucket: meta.bucketId,
    ...extra,
  }, { level: "warn" });
}

const protectedReadRateLimit = createMethodRateLimiter({
  methods: ["GET", "HEAD", "OPTIONS"],
  key: "protected-api-read",
  windowMs: 5 * 60 * 1000,
  maxRequests: 450,
  blockMs: 10 * 60 * 1000,
  errorMessage: "Too many API reads. Please slow down and try again.",
  keyFn: (req) => buildProtectedKey(req, "read"),
  onLimit: (req, meta) => {
    logLimitEvent("traffic.protected_api_read_rate_limited", req, meta, {
      automatedClient: isLikelyAutomatedClient(req),
    });
  },
});

const protectedWriteRateLimit = createMethodRateLimiter({
  methods: ["POST", "PUT", "PATCH", "DELETE"],
  key: "protected-api-write",
  windowMs: 10 * 60 * 1000,
  maxRequests: 360,
  blockMs: 15 * 60 * 1000,
  errorMessage: "Too many API writes. Please wait before trying again.",
  keyFn: (req) => buildProtectedKey(req, "write"),
  onLimit: (req, meta) => {
    logLimitEvent("traffic.protected_api_write_rate_limited", req, meta, {
      automatedClient: isLikelyAutomatedClient(req),
    });
  },
});

const automatedClientRateLimit = createMethodRateLimiter({
  methods: ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"],
  key: "protected-api-automated-client",
  windowMs: 10 * 60 * 1000,
  maxRequests: 40,
  blockMs: 30 * 60 * 1000,
  errorMessage: "Automated traffic limit reached. Please wait before sending more requests.",
  keyFn: (req) => {
    if (!isLikelyAutomatedClient(req)) return "";
    return buildProtectedKey(req, "automated");
  },
  onLimit: (req, meta) => {
    logLimitEvent("traffic.protected_api_automated_client_rate_limited", req, meta, {
      automatedClient: true,
    });
  },
});

const protectedApiRateLimit = composeMiddlewares(
  automatedClientRateLimit,
  protectedReadRateLimit,
  protectedWriteRateLimit
);

module.exports = {
  isLikelyAutomatedClient,
  protectedApiRateLimit,
};
