const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function migrate() {
  const sqlDir = path.join(__dirname, "sql");
  const files = fs
    .readdirSync(sqlDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      const fullPath = path.join(sqlDir, file);
      const sql = fs.readFileSync(fullPath, "utf8");
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}

module.exports = {
  migrate,
};

