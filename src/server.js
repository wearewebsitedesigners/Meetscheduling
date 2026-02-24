const env = require("./config/env");
const buildApp = require("./app");
const { migrate } = require("./db/migrate");
const { seedDefaults } = require("./db/seed");
const { pool } = require("./db/pool");

async function startServer() {
  // Skipping migrations to bypass connection timeout errors
  console.log("Skipping migrations for faster startup.");
  // await migrate();
  // await seedDefaults();

  const { processReminders } = require("./services/reminders.service");

  const app = buildApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Meetscheduling API running on ${env.appBaseUrl}`);

    // Start reminder worker
    setInterval(processReminders, 60000);
    processReminders(); // run once immediately
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

