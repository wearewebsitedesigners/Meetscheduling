const env = require("./config/env");
const buildApp = require("./app");
const { migrate } = require("./db/migrate");
const { seedDefaults } = require("./db/seed");
const { pool } = require("./db/pool");

async function startServer() {
  await migrate();
  await seedDefaults();

  const app = buildApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Meetscheduling API running on ${env.appBaseUrl}`);
  });
}

startServer().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

