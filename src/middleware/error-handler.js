const { HttpError } = require("../utils/http-error");
const { buildRequestLogContext, logSecurityEvent, sanitizeForLog } = require("../utils/security-log");

function notFoundHandler(req, res) {
  const isApiRoute = String(req.originalUrl || req.url || "").startsWith("/api/");
  if (isApiRoute || req.suspiciousTraffic === true) {
    logSecurityEvent("api.route_not_found", {
      ...buildRequestLogContext(req),
      suspiciousTraffic: req.suspiciousTraffic === true,
      statusCode: 404,
    }, { level: "warn" });
  }

  res.status(404).json({
    error: "Route not found",
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
    logSecurityEvent("api.error", {
      ...buildRequestLogContext(req),
      statusCode: error.statusCode,
      message: error.message,
      details: sanitizeForLog(error.details),
    }, { level: error.statusCode >= 500 ? "error" : "warn" });
    if (error.statusCode === 402 && error.message === "PLAN_LIMIT_OR_FEATURE") {
      return res.status(402).json({
        error: "PLAN_LIMIT_OR_FEATURE",
        ...(error.details && typeof error.details === "object" ? error.details : {}),
      });
    }
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details || undefined,
    });
  }

  logSecurityEvent("api.unhandled_error", {
    ...buildRequestLogContext(req),
    name: error?.name || "Error",
    message: error?.message || "Unhandled error",
    stack: error?.stack ? String(error.stack).split("\n").slice(0, 8) : [],
  }, { level: "error" });
  return res.status(500).json({
    error: "Internal server error",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
