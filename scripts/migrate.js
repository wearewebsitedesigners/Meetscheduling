const { migrate } = require("../src/db/migrate");
const { pool } = require("../src/db/pool");

migrate()
  .then(async () => {
    // eslint-disable-next-line no-console
    console.log("Migrations completed.");
    await pool.end();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error("Migration failed:", error);
    try {
      await pool.end();
    } catch {
      // ignore
    }
    process.exit(1);
  });

