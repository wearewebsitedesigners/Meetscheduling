const env = require("./config/env");
const buildApp = require("./app");
const { migrate } = require("./db/migrate");
const { seedDefaults } = require("./db/seed");
const { pool } = require("./db/pool");

async function startServer() {
  const skipMigrations = /^(1|true|yes)$/i.test(
    String(process.env.SKIP_DB_MIGRATIONS || "")
  );
  const runSeedOnBoot = /^(1|true|yes)$/i.test(
    String(process.env.RUN_SEED_ON_BOOT || "")
  );
  const previewMode = /^(1|true|yes)$/i.test(
    String(process.env.PREVIEW_MODE || "")
  );

  if (skipMigrations) {
    // eslint-disable-next-line no-console
    console.warn("SKIP_DB_MIGRATIONS is enabled. Schema drift may break dashboard modules.");
  } else {
    // eslint-disable-next-line no-console
    console.log("Running database migrations...");
    await migrate();
    // eslint-disable-next-line no-console
    console.log("Database migrations complete.");
  }

  // Keep seed opt-in to avoid re-adding demo content in production.
  if (runSeedOnBoot) {
    // eslint-disable-next-line no-console
    console.log("RUN_SEED_ON_BOOT enabled. Seeding defaults...");
    await seedDefaults();
    // eslint-disable-next-line no-console
    console.log("Default seed complete.");
  }

  const app = buildApp();
  const listenHost = env.host || (previewMode ? "127.0.0.1" : undefined);
  const runtimeBaseUrl = previewMode
    ? `http://${listenHost || "127.0.0.1"}:${env.port}`
    : env.appBaseUrl;
  const onListen = () => {
    // eslint-disable-next-line no-console
    console.log(`Meetscheduling API running on ${runtimeBaseUrl}`);

    if (previewMode || skipMigrations) {
      // eslint-disable-next-line no-console
      console.log("Preview mode active. Background workers are disabled.");
      return;
    }

    const { processReminders } = require("./services/reminders.service");

    // Start reminder worker
    setInterval(processReminders, 60000);
    processReminders(); // run once immediately
  };

  if (listenHost) {
    app.listen(env.port, listenHost, onListen);
    return;
  }

  app.listen(env.port, onListen);
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
