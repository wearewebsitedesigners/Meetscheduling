const fs = require("fs");
const path = require("path");

const requireProduction = process.argv.includes("--production");
const projectRoot = __dirname;
const envFilePath = path.join(projectRoot, ".env");

let env;
try {
  env = require("./src/config/env");
} catch (error) {
  console.error("[check-env] invalid configuration:", error?.message || error);
  process.exit(1);
}

function printStatus(label, value) {
  console.log(`[check-env] ${label}: ${value}`);
}

function fail(message) {
  console.error(`[check-env] ERROR: ${message}`);
  process.exit(1);
}

if (requireProduction && env.nodeEnv !== "production") {
  fail("NODE_ENV must be production when running with --production");
}

const envFileExists = fs.existsSync(envFilePath);
let envFileMode = "not present";
if (envFileExists) {
  const stat = fs.statSync(envFilePath);
  envFileMode = (stat.mode & 0o777).toString(8);
}

printStatus("NODE_ENV", env.nodeEnv);
printStatus("APP_BASE_URL", env.appBaseUrl);
printStatus("HTTPS enforced", env.security.forceHttps);
printStatus("HTTP bind host", env.host || "not set");
printStatus("Database endpoint", env.database.endpointDescription || "not set");
printStatus("Database endpoint type", env.database.endpointType);
printStatus("Database TLS enabled", env.database.sslEnabled);
printStatus("Database private networking required", env.database.privateNetworkRequired);
printStatus("Database private networking asserted", env.database.privateNetworkAsserted);
printStatus("JWT secret configured", Boolean(String(env.jwtSecret || "").trim()));
printStatus(
  "Public booking signing secret configured",
  Boolean(String(env.publicBookingSigningSecret || "").trim())
);
printStatus(
  "Integration token secret configured",
  Boolean(String(env.integrationTokenSecret || "").trim())
);
printStatus(".env file present", envFileExists);
printStatus(".env file mode", envFileMode);

if (requireProduction && envFileExists) {
  const stat = fs.statSync(envFilePath);
  if ((stat.mode & 0o077) !== 0) {
    fail(".env permissions are too broad. Run `chmod 600 .env` before deploying.");
  }
}

printStatus("configuration", "ok");
