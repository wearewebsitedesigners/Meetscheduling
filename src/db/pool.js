const { Pool } = require("pg");
const env = require("../config/env");
const { logSecurityEvent } = require("../utils/security-log");

const dbConnectTimeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000);
const dbQueryTimeoutMs = Number(process.env.DB_QUERY_TIMEOUT_MS || 10000);
const dbIdleInTransactionTimeoutMs = Number(
  process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS || 10000
);

const pool = new Pool({
  connectionString: env.databaseUrl || undefined,
  ssl: env.database.sslEnabled
    ? {
      rejectUnauthorized: env.database.sslRejectUnauthorized,
    }
    : undefined,
  connectionTimeoutMillis: Number.isFinite(dbConnectTimeoutMs)
    ? dbConnectTimeoutMs
    : 5000,
  query_timeout: Number.isFinite(dbQueryTimeoutMs) ? dbQueryTimeoutMs : 10000,
  statement_timeout: Number.isFinite(dbQueryTimeoutMs) ? dbQueryTimeoutMs : 10000,
  idle_in_transaction_session_timeout: Number.isFinite(dbIdleInTransactionTimeoutMs)
    ? dbIdleInTransactionTimeoutMs
    : 10000,
  idleTimeoutMillis: 10000,
  max: Number(process.env.DB_POOL_MAX || (env.nodeEnv === "production" ? 10 : 20)),
  application_name: "meetscheduling",
  keepAlive: true,
});

// A catch-all for idle client errors from pg.
// This prevents Neon dropping TCP connections from crashing the node app.
pool.on("error", (error) => {
  logSecurityEvent("database.pool_error", {
    message: error?.message || "Unexpected error on idle pg client",
    code: error?.code || "",
  }, { level: "error" });
});

async function query(text, params = [], client = null, retries = 1) {
  try {
    if (client) return await client.query(text, params);
    return await pool.query(text, params);
  } catch (error) {
    if (retries > 0 && error.message && error.message.includes("Connection terminated unexpectedly")) {
      logSecurityEvent("database.query_retry", {
        message: error.message,
      }, { level: "warn" });
      return query(text, params, client, retries - 1);
    }
    throw error;
  }
}

async function withTransaction(handler) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  withTransaction,
};
