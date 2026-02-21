const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { unauthorized } = require("../utils/http-error");

function readBearerToken(headerValue = "") {
  const raw = String(headerValue || "");
  if (!raw.startsWith("Bearer ")) return "";
  return raw.slice("Bearer ".length).trim();
}

function signAuthToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
}

function requireAuth(req, res, next) {
  try {
    const token = readBearerToken(req.headers.authorization);
    if (!token) throw unauthorized("Missing bearer token");
    const decoded = jwt.verify(token, env.jwtSecret);
    if (!decoded || typeof decoded !== "object" || !decoded.userId) {
      throw unauthorized("Invalid token");
    }
    req.auth = {
      userId: decoded.userId,
      email: decoded.email || "",
      username: decoded.username || "",
      plan: decoded.plan || "free",
    };
    next();
  } catch (error) {
    next(unauthorized("Invalid or expired token"));
  }
}

module.exports = {
  requireAuth,
  signAuthToken,
};

