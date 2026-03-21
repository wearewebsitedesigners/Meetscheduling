const buckets = new Map();

function cleanupExpiredEntries(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.blockedUntil > now) continue;
    if (bucket.hits.some((hit) => hit > now - bucket.windowMs)) continue;
    buckets.delete(key);
  }
}

function createRateLimiter({
  key = "rate-limit",
  windowMs = 60 * 1000,
  maxRequests = 10,
  blockMs = windowMs,
  errorMessage = "Too many requests. Please try again later.",
  keyFn,
  skip,
  onLimit,
}) {
  return (req, res, next) => {
    if (typeof skip === "function" && skip(req)) {
      return next();
    }

    const rateKey = typeof keyFn === "function" ? keyFn(req) : "";
    if (!rateKey) return next();

    const now = Date.now();
    if (buckets.size && now % 17 === 0) {
      cleanupExpiredEntries(now);
    }

    const bucketId = `${key}:${rateKey}`;
    const existing = buckets.get(bucketId) || {
      hits: [],
      blockedUntil: 0,
      windowMs,
    };

    existing.windowMs = windowMs;
    existing.hits = existing.hits.filter((timestamp) => timestamp > now - windowMs);
    const remaining = Math.max(0, maxRequests - existing.hits.length);
    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));

    if (existing.blockedUntil > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.blockedUntil - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      if (typeof onLimit === "function") {
        onLimit(req, { bucketId, retryAfterSeconds, windowMs, maxRequests });
      }
      return res.status(429).json({ error: errorMessage });
    }

    if (existing.hits.length >= maxRequests) {
      existing.blockedUntil = now + blockMs;
      buckets.set(bucketId, existing);
      const retryAfterSeconds = Math.max(1, Math.ceil(blockMs / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      if (typeof onLimit === "function") {
        onLimit(req, { bucketId, retryAfterSeconds, windowMs, maxRequests });
      }
      return res.status(429).json({ error: errorMessage });
    }

    existing.hits.push(now);
    buckets.set(bucketId, existing);
    return next();
  };
}

function createMethodRateLimiter({
  methods = [],
  ...options
}) {
  const allowedMethods = new Set(
    Array.isArray(methods)
      ? methods
        .map((value) => String(value || "").trim().toUpperCase())
        .filter(Boolean)
      : []
  );
  const limiter = createRateLimiter(options);

  return (req, res, next) => {
    if (allowedMethods.size && !allowedMethods.has(String(req.method || "").toUpperCase())) {
      return next();
    }
    return limiter(req, res, next);
  };
}

function composeMiddlewares(...middlewares) {
  const stack = middlewares.flat().filter((entry) => typeof entry === "function");

  return (req, res, next) => {
    let index = 0;

    function run(error) {
      if (error) return next(error);
      const middleware = stack[index];
      index += 1;
      if (!middleware) return next();

      try {
        return middleware(req, res, run);
      } catch (caughtError) {
        return next(caughtError);
      }
    }

    return run();
  };
}

module.exports = {
  composeMiddlewares,
  createMethodRateLimiter,
  createRateLimiter,
};
