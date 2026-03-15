const { HttpError } = require("../utils/http-error");

function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Route not found",
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
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

  // eslint-disable-next-line no-console
  console.error("Unhandled error:", error);
  return res.status(500).json({
    error: "Internal server error",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
