class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function badRequest(message, details = null) {
  return new HttpError(400, message, details);
}

function unauthorized(message = "Unauthorized") {
  return new HttpError(401, message);
}

function forbidden(message = "Forbidden") {
  return new HttpError(403, message);
}

function notFound(message = "Not found") {
  return new HttpError(404, message);
}

function conflict(message = "Conflict") {
  return new HttpError(409, message);
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
};

