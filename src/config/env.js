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

const env = {
  nodeEnv: readEnv("NODE_ENV", "development"),
  port: readInt("PORT", 8080),
  appBaseUrl: readEnv("APP_BASE_URL", "http://localhost:8080"),
  databaseUrl: readEnv("DATABASE_URL", ""),
  jwtSecret: readEnv("JWT_SECRET", "replace-me-in-prod"),
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
  google: {
    clientEmail: readEnv("GOOGLE_CLIENT_EMAIL", ""),
    privateKey: readEnv("GOOGLE_PRIVATE_KEY", ""),
    calendarId: readEnv("GOOGLE_CALENDAR_ID", ""),
  },
};

if (!env.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn(
    "DATABASE_URL is not set. PostgreSQL endpoints will fail until it is configured."
  );
}

module.exports = env;

