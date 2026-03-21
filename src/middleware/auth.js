const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { forbidden, unauthorized } = require("../utils/http-error");
const { PERMISSIONS_VERSION, canRole, normalizeRole } = require("../services/workspace.service");

function parseCookies(cookieHeader = "") {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) return acc;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (!key) return acc;
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function readBearerToken(headerValue = "") {
  const raw = String(headerValue || "");
  if (!raw.startsWith("Bearer ")) return "";
  return raw.slice("Bearer ".length).trim();
}

function readCookieToken(req, cookieName) {
  const cookies = parseCookies(req?.headers?.cookie || "");
  return String(cookies[cookieName] || "").trim();
}

function buildCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: env.auth.cookieSameSite,
    secure: env.auth.cookieSecure,
    path: "/",
    maxAge: maxAgeMs,
  };
}

function signAuthToken(payload, expiresIn = env.auth.sessionTtl) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
}

function signTempAuthToken(payload, expiresIn = env.auth.tempSessionTtl) {
  return jwt.sign(
    {
      ...payload,
      temp2FA: true,
    },
    env.jwtSecret,
    { expiresIn }
  );
}

function setAuthSession(res, payload, options = {}) {
  const expiresIn = options.expiresIn || env.auth.sessionTtl;
  const maxAgeMs = options.maxAgeMs || env.auth.sessionTtlMs;
  const token = signAuthToken(payload, expiresIn);
  clearTempAuthSession(res);
  res.cookie(env.auth.cookieName, token, buildCookieOptions(maxAgeMs));
  return token;
}

function setTempAuthSession(res, payload, options = {}) {
  const expiresIn = options.expiresIn || env.auth.tempSessionTtl;
  const maxAgeMs = options.maxAgeMs || env.auth.tempSessionTtlMs;
  const token = signTempAuthToken(payload, expiresIn);
  clearAuthSession(res, { includeTemp: false });
  res.cookie(env.auth.tempCookieName, token, buildCookieOptions(maxAgeMs));
  return token;
}

function clearTempAuthSession(res) {
  res.clearCookie(env.auth.tempCookieName, {
    path: "/",
    httpOnly: true,
    sameSite: env.auth.cookieSameSite,
    secure: env.auth.cookieSecure,
  });
}

function clearAuthSession(res, { includeTemp = true } = {}) {
  res.clearCookie(env.auth.cookieName, {
    path: "/",
    httpOnly: true,
    sameSite: env.auth.cookieSameSite,
    secure: env.auth.cookieSecure,
  });
  if (includeTemp) {
    clearTempAuthSession(res);
  }
}

function readAuthToken(req) {
  return readCookieToken(req, env.auth.cookieName) || readBearerToken(req.headers.authorization);
}

function readTempAuthToken(req, fallbackToken = "") {
  return readCookieToken(req, env.auth.tempCookieName) || String(fallbackToken || "").trim();
}

function verifyTempAuthToken(token) {
  const decoded = jwt.verify(String(token || ""), env.jwtSecret);
  if (!decoded || typeof decoded !== "object" || !decoded.userId || !decoded.temp2FA) {
    throw unauthorized("Invalid token");
  }
  return decoded;
}

function buildAuthContextFromClaims(decoded) {
  if (!decoded || typeof decoded !== "object" || !decoded.userId) {
    throw unauthorized("Invalid token");
  }
  if (decoded.isInterim || decoded.temp2FA) {
    throw unauthorized("Token requires 2FA verification");
  }

  const role = normalizeRole(decoded.membershipRole || "owner");
  const workspaceId = decoded.workspaceId || decoded.userId;
  const permissionsVersion = Number(decoded.permissionsVersion || PERMISSIONS_VERSION);

  return {
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
}

function requireAuth(req, res, next) {
  try {
    const token = readAuthToken(req);
    if (!token) throw unauthorized("Missing auth token");
    const decoded = jwt.verify(token, env.jwtSecret);
    req.auth = buildAuthContextFromClaims(decoded);
    next();
  } catch (error) {
    next(unauthorized("Invalid or expired session"));
  }
}

function getOptionalAuthContext(req) {
  try {
    const token = readAuthToken(req);
    if (!token) return null;
    const decoded = jwt.verify(token, env.jwtSecret);
    return buildAuthContextFromClaims(decoded);
  } catch {
    return null;
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
  clearAuthSession,
  clearTempAuthSession,
  getOptionalAuthContext,
  readBearerToken,
  readTempAuthToken,
  requireAuth,
  requirePermission,
  setAuthSession,
  setTempAuthSession,
  signAuthToken,
  signTempAuthToken,
  verifyTempAuthToken,
};
