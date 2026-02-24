const { Pool } = require("pg");
const env = require("../config/env");

const dbConnectTimeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000);
const dbQueryTimeoutMs = Number(process.env.DB_QUERY_TIMEOUT_MS || 10000);

const pool = new Pool({
  connectionString: env.databaseUrl || undefined,
  ssl:
    env.nodeEnv === "production"
      ? {
        rejectUnauthorized: false,
      }
      : undefined,
  connectionTimeoutMillis: Number.isFinite(dbConnectTimeoutMs)
    ? dbConnectTimeoutMs
    : 5000,
  query_timeout: Number.isFinite(dbQueryTimeoutMs) ? dbQueryTimeoutMs : 10000,
  idleTimeoutMillis: 10000,
  max: env.nodeEnv === "production" ? 3 : 10,
});

// A catch-all for idle client errors from pg. 
// This prevents Neon dropping TCP connections from crashing the node app.
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle pg client", err);
});

async function query(text, params = [], client = null, retries = 1) {
  try {
    if (client) return await client.query(text, params);
    return await pool.query(text, params);
  } catch (error) {
    if (retries > 0 && error.message && error.message.includes("Connection terminated unexpectedly")) {
      console.warn("Retrying query due to connection termination...");
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
