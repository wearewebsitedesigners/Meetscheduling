const { forbidden } = require("../utils/http-error");

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const bucket = new Map();

function cleanup(now) {
  for (const [key, value] of bucket.entries()) {
    if (value.resetAt <= now) {
      bucket.delete(key);
    }
  }
}

function publicRateLimit(req, res, next) {
  const now = Date.now();
  cleanup(now);

  const key = `${req.ip || "unknown"}:${req.path}`;
  const row = bucket.get(key);
  if (!row || row.resetAt <= now) {
    bucket.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return next();
  }

  row.count += 1;
  if (row.count > MAX_REQUESTS_PER_WINDOW) {
    return next(forbidden("Too many requests. Please try again."));
  }
  return next();
}

module.exports = publicRateLimit;

