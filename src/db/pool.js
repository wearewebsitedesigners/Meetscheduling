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

async function query(text, params = [], client = null) {
  if (client) return client.query(text, params);
  return pool.query(text, params);
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
