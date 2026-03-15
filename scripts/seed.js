const { migrate } = require("../src/db/migrate");
const { seedDefaults } = require("../src/db/seed");
const { pool } = require("../src/db/pool");

Promise.resolve()
  .then(() => migrate())
  .then(() => seedDefaults())
  .then(async () => {
    // eslint-disable-next-line no-console
    console.log("Seed completed.");
    await pool.end();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    try {
      await pool.end();
    } catch {
      // ignore
    }
    process.exit(1);
  });

