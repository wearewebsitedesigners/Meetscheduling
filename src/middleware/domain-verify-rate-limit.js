const { forbidden } = require("../utils/http-error");

const WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const bucket = new Map();

function cleanup(now) {
  for (const [key, value] of bucket.entries()) {
    if (!value || value.resetAt <= now) {
      bucket.delete(key);
    }
  }
}

function domainVerifyRateLimit(req, res, next) {
  const now = Date.now();
  cleanup(now);

  const actorKey = req.auth?.workspaceId || req.auth?.userId || req.ip || "unknown";
  const domainKey = String(req.params.id || req.params.domainId || "global");
  const key = `${actorKey}:${domainKey}`;

  const current = bucket.get(key);
  if (!current || current.resetAt <= now) {
    bucket.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS_PER_WINDOW) {
    return next(forbidden("Too many verification attempts. Please wait and try again."));
  }
  return next();
}

module.exports = domainVerifyRateLimit;
