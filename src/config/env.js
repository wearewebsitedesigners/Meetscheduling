const dotenv = require("dotenv");

dotenv.config();

function readEnv(key, fallback = undefined) {
  const value = process.env[key];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

function readInt(key, fallback) {
  const raw = readEnv(key, "");
  if (raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function readBool(key, fallback = false) {
  const raw = String(readEnv(key, fallback ? "true" : "false")).toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function readTrustProxy(key, fallback = false) {
  const raw = String(readEnv(key, fallback ? "1" : "")).trim();
  if (!raw) return false;
  if (/^(true|yes)$/i.test(raw)) return true;
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 0) return numeric;
  return raw;
}

function clampInt(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(Math.max(Math.trunc(numeric), min), max);
}

function readSameSite(key, fallback = "lax") {
  const raw = String(readEnv(key, fallback)).trim().toLowerCase();
  if (raw === "strict" || raw === "none") return raw;
  return "lax";
}

function isIpv4Address(value) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(String(value || "").trim());
}

function isPrivateIpv4Address(value) {
  const parts = String(value || "")
    .trim()
    .split(".")
    .map((entry) => Number.parseInt(entry, 10));

  if (parts.length !== 4 || parts.some((entry) => !Number.isInteger(entry) || entry < 0 || entry > 255)) {
    return false;
  }

  const [first, second] = parts;
  if (first === 10 || first === 127) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 169 && second === 254) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  return false;
}

function isIpv6Address(value) {
  return String(value || "").includes(":");
}

function isPrivateIpv6Address(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isWildcardHost(value) {
  const host = String(value || "").trim().toLowerCase();
  return host === "0.0.0.0" || host === "::" || host === "[::]";
}

function isPrivateBindHost(value) {
  const host = String(value || "").trim().toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (isIpv4Address(host)) return isPrivateIpv4Address(host);
  if (isIpv6Address(host)) return isPrivateIpv6Address(host);
  return false;
}

function classifyDatabaseEndpoint(databaseUrl) {
  const raw = String(databaseUrl || "").trim();
  if (!raw) {
    return {
      type: "missing",
      host: "",
      description: "not configured",
    };
  }

  try {
    const parsed = new URL(raw);
    const socketHost = String(parsed.searchParams.get("host") || "").trim();
    if (socketHost.startsWith("/")) {
      return {
        type: "unix-socket",
        host: socketHost,
        description: socketHost,
      };
    }

    const host = String(parsed.hostname || socketHost || "").trim().toLowerCase();
    if (!host) {
      return {
        type: "unknown",
        host: "",
        description: "configured without a resolvable host",
      };
    }

    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return {
        type: "loopback",
        host,
        description: host,
      };
    }

    if (isIpv4Address(host)) {
      return {
        type: isPrivateIpv4Address(host) ? "private-ip" : "public-ip",
        host,
        description: host,
      };
    }

    if (isIpv6Address(host)) {
      return {
        type: isPrivateIpv6Address(host) ? "private-ip" : "public-ip",
        host,
        description: host,
      };
    }

    return {
      type: "hostname",
      host,
      description: host,
    };
  } catch {
    return {
      type: "unknown",
      host: "",
      description: "invalid connection string",
    };
  }
}

const previewMode = readBool("PREVIEW_MODE", false);
const port = readInt("PORT", 8080);
const host = readEnv("HOST", "127.0.0.1");
const nodeEnv = readEnv("NODE_ENV", "development");
const isProduction = nodeEnv === "production";
const defaultAppBaseUrl = previewMode
  ? `http://${host || "127.0.0.1"}:${port}`
  : "http://localhost:8080";
const authSessionTtlHours = clampInt(readInt("AUTH_SESSION_TTL_HOURS", 12), 1, 168);
const authTempSessionTtlMinutes = clampInt(readInt("AUTH_TEMP_SESSION_TTL_MINUTES", 10), 5, 60);
const authPasswordHashRounds = clampInt(readInt("PASSWORD_HASH_ROUNDS", 12), 10, 14);
const authPasswordMinLength = clampInt(readInt("PASSWORD_MIN_LENGTH", 12), 8, 128);
const authEmailVerificationTtlMinutes = clampInt(
  readInt("EMAIL_VERIFICATION_TOKEN_TTL_MINUTES", 24 * 60),
  15,
  7 * 24 * 60
);
const passwordResetTtlMinutes = clampInt(
  readInt("PASSWORD_RESET_TOKEN_TTL_MINUTES", 60),
  10,
  240
);
const authCookieSameSite = readSameSite("AUTH_COOKIE_SAME_SITE", "lax");
const authCookieSecure = isProduction ? true : readBool("AUTH_COOKIE_SECURE", false);
const trustProxy = readTrustProxy("TRUST_PROXY", isProduction);
const forceHttps = isProduction ? readBool("FORCE_HTTPS", true) : readBool("FORCE_HTTPS", false);
const hstsMaxAgeSeconds = clampInt(readInt("HSTS_MAX_AGE_SECONDS", 31536000), 0, 63072000);
const apiRateLimitWindowMs = clampInt(readInt("API_RATE_LIMIT_WINDOW_MS", 60_000), 1000, 60 * 60 * 1000);
const apiRateLimitMaxRequests = clampInt(readInt("API_RATE_LIMIT_MAX_REQUESTS", 240), 20, 5000);
const apiRateLimitBlockMs = clampInt(readInt("API_RATE_LIMIT_BLOCK_MS", 60_000), 1000, 24 * 60 * 60 * 1000);
const slowRequestThresholdMs = clampInt(readInt("SLOW_REQUEST_THRESHOLD_MS", 2500), 100, 60_000);
const databaseSslEnabled = isProduction ? readBool("DATABASE_SSL_ENABLED", true) : readBool("DATABASE_SSL_ENABLED", false);
const databaseSslRejectUnauthorized = readBool("DATABASE_SSL_REJECT_UNAUTHORIZED", true);
const databasePrivateNetworkRequired = isProduction
  ? readBool("DATABASE_PRIVATE_NETWORK_REQUIRED", true)
  : readBool("DATABASE_PRIVATE_NETWORK_REQUIRED", false);
const databasePrivateNetworkAsserted = readBool("DATABASE_PRIVATE_NETWORK_ASSERTED", false);
const databaseEndpoint = classifyDatabaseEndpoint(
  readEnv("DATABASE_URL", readEnv("POSTGRES_URL", readEnv("POSTGRES_PRISMA_URL", "")))
);

const env = {
  nodeEnv,
  previewMode,
  port,
  host,
  appBaseUrl: readEnv("APP_BASE_URL", defaultAppBaseUrl),
  databaseUrl: readEnv(
    "DATABASE_URL",
    readEnv("POSTGRES_URL", readEnv("POSTGRES_PRISMA_URL", ""))
  ),
  jwtSecret: readEnv("JWT_SECRET", "replace-me-in-prod"),
  integrationTokenSecret: readEnv("INTEGRATION_TOKEN_SECRET", ""),
  googleOAuthDebug: readBool("GOOGLE_OAUTH_DEBUG", false),
  publicBookingSigningSecret: readEnv(
    "PUBLIC_BOOKING_SIGNING_SECRET",
    "replace-me-in-prod"
  ),
  auth: {
    cookieName: readEnv("AUTH_COOKIE_NAME", "ms_auth_session"),
    tempCookieName: readEnv("AUTH_TEMP_COOKIE_NAME", "ms_auth_2fa"),
    cookieSameSite: authCookieSameSite,
    cookieSecure: authCookieSecure,
    sessionTtlHours: authSessionTtlHours,
    sessionTtlMinutes: authSessionTtlHours * 60,
    sessionTtlSeconds: authSessionTtlHours * 60 * 60,
    sessionTtlMs: authSessionTtlHours * 60 * 60 * 1000,
    sessionTtl: `${authSessionTtlHours}h`,
    tempSessionTtlMinutes: authTempSessionTtlMinutes,
    tempSessionTtlSeconds: authTempSessionTtlMinutes * 60,
    tempSessionTtlMs: authTempSessionTtlMinutes * 60 * 1000,
    tempSessionTtl: `${authTempSessionTtlMinutes}m`,
    passwordHashRounds: authPasswordHashRounds,
    passwordMinLength: authPasswordMinLength,
    emailVerificationTtlMinutes: authEmailVerificationTtlMinutes,
  },
  defaultTimezone: readEnv("HOST_DEFAULT_TIMEZONE", "UTC"),
  slotIntervalMinutes: readInt("SLOT_INTERVAL_MINUTES", 15),
  smtp: {
    host: readEnv("SMTP_HOST", ""),
    port: readInt("SMTP_PORT", 587),
    secure: readBool("SMTP_SECURE", false),
    user: readEnv("SMTP_USER", ""),
    pass: readEnv("SMTP_PASS", ""),
    from: readEnv("EMAIL_FROM", ""),
  },
  authEmail: {
    welcomeEnabled: readBool("AUTH_WELCOME_EMAIL_ENABLED", true),
    loginEnabled: readBool("AUTH_LOGIN_EMAIL_ENABLED", true),
    supportEmail: readEnv("SUPPORT_EMAIL", readEnv("EMAIL_FROM", "support@meetscheduling.com")),
    passwordResetTtlMinutes,
    outboxDir: readEnv("EMAIL_OUTBOX_DIR", "/tmp/meetscheduling-email-outbox"),
  },
  google: {
    clientEmail: readEnv("GOOGLE_CLIENT_EMAIL", ""),
    privateKey: readEnv("GOOGLE_PRIVATE_KEY", ""),
    calendarId: readEnv("GOOGLE_CALENDAR_ID", ""),
    clientId: readEnv("GOOGLE_CLIENT_ID", ""),
    clientSecret: readEnv("GOOGLE_CLIENT_SECRET", ""),
    redirectUri: readEnv("GOOGLE_REDIRECT_URI", `${readEnv("APP_BASE_URL", "http://localhost:8080")}/api/integrations/google-calendar/callback`),
  },
  paypal: {
    env: readEnv("PAYPAL_ENV", "sandbox") === "live" ? "live" : "sandbox",
    clientId: readEnv("PAYPAL_CLIENT_ID", ""),
    secret: readEnv("PAYPAL_SECRET", ""),
    webhookId: readEnv("PAYPAL_WEBHOOK_ID", ""),
    productId: readEnv("PAYPAL_PRODUCT_ID", ""),
    basicPlanId: readEnv("PAYPAL_BASIC_PLAN_ID", ""),
    popularPlanId: readEnv("PAYPAL_POPULAR_PLAN_ID", ""),
    proPlanId: readEnv("PAYPAL_PRO_PLAN_ID", ""),
    basicPriceUsd: readEnv("PAYPAL_BASIC_PRICE_USD", "15"),
    popularPriceUsd: readEnv("PAYPAL_POPULAR_PRICE_USD", "28"),
    proPriceUsd: readEnv("PAYPAL_PRO_PRICE_USD", "79"),
  },
  twilio: {
    accountSid: readEnv("TWILIO_ACCOUNT_SID", ""),
    authToken: readEnv("TWILIO_AUTH_TOKEN", ""),
    phoneNumber: readEnv("TWILIO_PHONE_NUMBER", ""),
  },
  domains: {
    provider: readEnv("CUSTOM_DOMAIN_PROVIDER", "local"),
    cnameTarget: readEnv("CUSTOM_DOMAIN_CNAME_TARGET", (() => {
      try {
        const host = new URL(readEnv("APP_BASE_URL", "http://localhost:8080")).hostname;
        const normalized = host.startsWith("www.") ? host.slice(4) : host;
        return `cname.${normalized}`;
      } catch {
        return "cname.meetscheduling.com";
      }
    })()),
    aRecordTargets: String(readEnv("CUSTOM_DOMAIN_A_RECORD_TARGETS", ""))
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    platformHosts: String(
      readEnv("CUSTOM_DOMAIN_PLATFORM_HOSTS", (() => {
        try {
          const host = new URL(readEnv("APP_BASE_URL", "http://localhost:8080")).hostname;
          const normalized = host.startsWith("www.") ? host.slice(4) : host;
          return [host, normalized].filter(Boolean).join(",");
        } catch {
          return "localhost,127.0.0.1";
        }
      })())
    )
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    assumeSslReady: readBool("CUSTOM_DOMAIN_ASSUME_SSL_READY", true),
  },
  database: {
    sslEnabled: databaseSslEnabled,
    sslRejectUnauthorized: databaseSslRejectUnauthorized,
    privateNetworkRequired: databasePrivateNetworkRequired,
    privateNetworkAsserted: databasePrivateNetworkAsserted,
    endpointType: databaseEndpoint.type,
    endpointHost: databaseEndpoint.host,
    endpointDescription: databaseEndpoint.description,
  },
  security: {
    trustProxy,
    forceHttps,
    hstsEnabled: hstsMaxAgeSeconds > 0,
    hstsMaxAgeSeconds,
    apiRateLimitWindowMs,
    apiRateLimitMaxRequests,
    apiRateLimitBlockMs,
    slowRequestThresholdMs,
  },
};

if (!env.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    "DATABASE_URL/POSTGRES_URL is not set. PostgreSQL endpoints will fail until it is configured."
  );
}

if (isProduction && !env.databaseUrl) {
  throw new Error("DATABASE_URL must be set in production.");
}

function isWeakSecret(value) {
  const secret = String(value || "").trim();
  return !secret || secret.length < 32 || /replace|changeme|secret|password/i.test(secret);
}

if (isProduction && isWeakSecret(env.jwtSecret)) {
  throw new Error("JWT_SECRET must be set to a strong secret in production.");
}

if (isProduction && isWeakSecret(env.publicBookingSigningSecret)) {
  throw new Error("PUBLIC_BOOKING_SIGNING_SECRET must be set to a strong secret in production.");
}

if (isProduction && env.auth.cookieSameSite === "none" && !env.auth.cookieSecure) {
  throw new Error("AUTH_COOKIE_SECURE must be enabled when AUTH_COOKIE_SAME_SITE=none.");
}

if (isProduction && !String(env.appBaseUrl || "").startsWith("https://")) {
  throw new Error("APP_BASE_URL must use HTTPS in production.");
}

if (isProduction && (isWildcardHost(env.host) || !isPrivateBindHost(env.host))) {
  throw new Error(
    "HOST must bind to a loopback or private interface in production. " +
    "Put TLS on a reverse proxy and proxy traffic to 127.0.0.1:8080."
  );
}

if (
  isProduction &&
  env.databaseUrl &&
  env.database.privateNetworkRequired &&
  env.database.endpointType === "public-ip"
) {
  throw new Error(
    "DATABASE_URL points to a public IP. Restrict PostgreSQL to private networking or a firewall allowlist."
  );
}

if (
  isProduction &&
  env.databaseUrl &&
  env.database.privateNetworkRequired &&
  (env.database.endpointType === "hostname" || env.database.endpointType === "unknown") &&
  !env.database.privateNetworkAsserted
) {
  throw new Error(
    "DATABASE_PRIVATE_NETWORK_ASSERTED=true is required in production when DATABASE_URL uses a hostname. " +
    "Set it only after confirming the database is reachable only over private networking or strict firewall allowlists."
  );
}

if (
  isProduction &&
  env.databaseUrl &&
  env.database.endpointType !== "unix-socket" &&
  !env.database.sslEnabled
) {
  throw new Error("DATABASE_SSL_ENABLED must be true in production for network PostgreSQL connections.");
}

// --- Google OAuth startup checks ---
if (env.google.clientId && !env.integrationTokenSecret) {
  const integrationSecretMessage =
    "INTEGRATION_TOKEN_SECRET is required for Google OAuth token encryption. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"";
  if (env.nodeEnv === "production") {
    throw new Error(integrationSecretMessage);
  }
  // eslint-disable-next-line no-console
  console.warn("[WARN] " + integrationSecretMessage);
}

if (isProduction && env.google.clientId && isWeakSecret(env.integrationTokenSecret)) {
  throw new Error("INTEGRATION_TOKEN_SECRET must be set to a strong secret in production.");
}

if (env.google.clientId && !env.google.clientSecret) {
  // eslint-disable-next-line no-console
  console.warn(
    "[WARN] GOOGLE_CLIENT_ID is set but GOOGLE_CLIENT_SECRET is missing. " +
    "Google Calendar OAuth will not work."
  );
}

if (
  env.google.clientId &&
  env.google.redirectUri &&
  !env.google.redirectUri.startsWith("https://") &&
  env.nodeEnv === "production"
) {
  // eslint-disable-next-line no-console
  console.warn(
    "[WARN] GOOGLE_REDIRECT_URI does not use HTTPS in production: " + env.google.redirectUri +
    ". This will cause Google OAuth redirect_uri_mismatch errors."
  );
}

if (env.google.clientId && env.google.redirectUri) {
  try {
    const redirectUrl = new URL(env.google.redirectUri);
    const redirectHost = redirectUrl.hostname.trim().toLowerCase();
    if (redirectHost === "yourdomain.com" || redirectHost === "www.yourdomain.com") {
      const placeholderMessage =
        "GOOGLE_REDIRECT_URI still points to the placeholder host " +
        `"${redirectHost}". Set it to your real production callback URL.`;
      if (env.nodeEnv === "production") {
        throw new Error(placeholderMessage);
      }
      // eslint-disable-next-line no-console
      console.warn("[WARN] " + placeholderMessage);
    }
  } catch (error) {
    if (env.nodeEnv === "production") {
      throw error;
    }
    // eslint-disable-next-line no-console
    console.warn("[WARN] Invalid GOOGLE_REDIRECT_URI:", env.google.redirectUri);
  }
}

module.exports = env;
