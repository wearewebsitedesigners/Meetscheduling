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

const previewMode = readBool("PREVIEW_MODE", false);
const port = readInt("PORT", 8080);
const host = readEnv("HOST", "");
const defaultAppBaseUrl = previewMode
  ? `http://${host || "127.0.0.1"}:${port}`
  : "http://localhost:8080";

const env = {
  nodeEnv: readEnv("NODE_ENV", "development"),
  port,
  host,
  appBaseUrl: readEnv("APP_BASE_URL", defaultAppBaseUrl),
  databaseUrl: readEnv(
    "DATABASE_URL",
    readEnv("POSTGRES_URL", readEnv("POSTGRES_PRISMA_URL", ""))
  ),
  jwtSecret: readEnv("JWT_SECRET", "replace-me-in-prod"),
  integrationTokenSecret: readEnv("INTEGRATION_TOKEN_SECRET", ""),
  publicBookingSigningSecret: readEnv(
    "PUBLIC_BOOKING_SIGNING_SECRET",
    "replace-me-in-prod"
  ),
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
    passwordResetTtlMinutes: Math.min(
      Math.max(readInt("PASSWORD_RESET_TOKEN_TTL_MINUTES", 60), 10),
      240
    ),
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
};

if (!env.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    "DATABASE_URL/POSTGRES_URL is not set. PostgreSQL endpoints will fail until it is configured."
  );
}

// --- Google OAuth startup checks ---
if (env.google.clientId && !env.integrationTokenSecret) {
  // eslint-disable-next-line no-console
  console.warn(
    "[WARN] INTEGRATION_TOKEN_SECRET is not set. Google OAuth tokens will be encrypted " +
    "using JWT_SECRET as fallback. Set a dedicated INTEGRATION_TOKEN_SECRET for production. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
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

module.exports = env;
