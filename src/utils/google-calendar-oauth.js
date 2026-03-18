const env = require("../config/env");

const DEFAULT_GOOGLE_CALENDAR_RETURN_PATH = "/dashboard/scheduling";

function normalizeGoogleRedirectUri(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function resolveAppBaseUrl(req = null) {
  const fromEnv = String(env.appBaseUrl || "").trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req?.headers?.["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req?.protocol || "https";
  const host = forwardedHost || req?.get?.("host") || "localhost:8080";
  return `${protocol}://${host}`;
}

function resolveGoogleRedirectUri({
  redirectUriCandidate = "",
  req = null,
} = {}) {
  const candidate = normalizeGoogleRedirectUri(redirectUriCandidate);
  if (candidate) return candidate;

  const fromEnv = normalizeGoogleRedirectUri(env.google.redirectUri);
  if (fromEnv) return fromEnv;

  if (req) {
    const fromRequest = normalizeGoogleRedirectUri(
      `${resolveAppBaseUrl(req)}/api/integrations/google-calendar/callback`
    );
    if (fromRequest) return fromRequest;
  }

  return `${resolveAppBaseUrl(req)}/api/integrations/google-calendar/callback`;
}

function normalizeGoogleCalendarReturnPath(
  raw,
  fallback = DEFAULT_GOOGLE_CALENDAR_RETURN_PATH
) {
  const value = String(raw || "").trim();
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;

  try {
    const url = new URL(value, "http://localhost");
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

function extractSameOriginReturnPathFromRequest(req = null) {
  const referer = String(req?.headers?.referer || "").trim();
  if (!referer) return "";

  try {
    const refererUrl = new URL(referer);
    const appBaseUrl = new URL(`${resolveAppBaseUrl(req)}/`);
    if (refererUrl.origin !== appBaseUrl.origin) {
      return "";
    }

    const returnPath = `${refererUrl.pathname}${refererUrl.search}${refererUrl.hash}`;
    if (returnPath.startsWith("/api/integrations/google-calendar/")) {
      return "";
    }
    return returnPath;
  } catch {
    return "";
  }
}

function resolveGoogleCalendarReturnPath({
  returnPath = "",
  req = null,
  fallback = DEFAULT_GOOGLE_CALENDAR_RETURN_PATH,
} = {}) {
  const explicit = String(returnPath || "").trim();
  if (explicit) {
    return normalizeGoogleCalendarReturnPath(explicit, fallback);
  }

  const fromRequest = extractSameOriginReturnPathFromRequest(req);
  if (fromRequest) {
    return normalizeGoogleCalendarReturnPath(fromRequest, fallback);
  }

  return normalizeGoogleCalendarReturnPath("", fallback);
}

function buildGoogleCalendarAppRedirect(req, returnPath = "", params = {}) {
  const targetPath = normalizeGoogleCalendarReturnPath(returnPath);
  const url = new URL(targetPath, `${resolveAppBaseUrl(req)}/`);
  Object.entries(params || {}).forEach(([key, value]) => {
    const safeValue = String(value || "").trim();
    if (safeValue) {
      url.searchParams.set(key, safeValue);
    }
  });
  return url.toString();
}

module.exports = {
  DEFAULT_GOOGLE_CALENDAR_RETURN_PATH,
  normalizeGoogleRedirectUri,
  resolveAppBaseUrl,
  resolveGoogleRedirectUri,
  normalizeGoogleCalendarReturnPath,
  resolveGoogleCalendarReturnPath,
  buildGoogleCalendarAppRedirect,
};
