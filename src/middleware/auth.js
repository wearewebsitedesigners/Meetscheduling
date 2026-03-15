const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { forbidden, unauthorized } = require("../utils/http-error");
const { PERMISSIONS_VERSION, canRole, normalizeRole } = require("../services/workspace.service");

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
    if (decoded.isInterim) {
      throw unauthorized("Token requires 2FA verification");
    }
    const role = normalizeRole(decoded.membershipRole || "owner");
    const workspaceId = decoded.workspaceId || decoded.userId;
    const permissionsVersion = Number(decoded.permissionsVersion || PERMISSIONS_VERSION);

    req.auth = {
      userId: decoded.userId,
      email: decoded.email || "",
      username: decoded.username || "",
      plan: decoded.plan || "free",
      workspaceId,
      role,
      permissionsVersion,
      can(permission) {
        return canRole(role, permission);
      },
    };
    next();
  } catch (error) {
    next(unauthorized("Invalid or expired token"));
  }
}

function requirePermission(permission) {
  const requiredPermission = String(permission || "").trim();
  return (req, res, next) => {
    if (!req.auth || typeof req.auth.can !== "function") {
      return next(unauthorized("Missing auth context"));
    }
    if (!requiredPermission || req.auth.can(requiredPermission)) {
      return next();
    }
    return next(forbidden("Insufficient permissions"));
  };
}

module.exports = {
  requireAuth,
  requirePermission,
  signAuthToken,
};
