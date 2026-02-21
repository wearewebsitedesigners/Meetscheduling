const { query } = require("../db/pool");
const { notFound } = require("../utils/http-error");
const { assertEmail, assertSlug, assertString, assertTimezone } = require("../utils/validation");

async function getUserById(userId, client = null) {
  const result = await query(
    `
      SELECT id, email, username, display_name, timezone, plan, created_at, updated_at
      FROM users
      WHERE id = $1
    `,
    [userId],
    client
  );
  return result.rows[0] || null;
}

async function getUserByUsername(username, client = null) {
  const result = await query(
    `
      SELECT id, email, username, display_name, timezone, plan, created_at, updated_at
      FROM users
      WHERE username = $1
    `,
    [username],
    client
  );
  return result.rows[0] || null;
}

async function getUserByEmail(email, client = null) {
  const result = await query(
    `
      SELECT id, email, username, display_name, timezone, plan, created_at, updated_at
      FROM users
      WHERE email = $1
    `,
    [email],
    client
  );
  return result.rows[0] || null;
}

async function createUser({
  email,
  username,
  displayName,
  timezone = "UTC",
  plan = "free",
}, client = null) {
  const cleanEmail = assertEmail(email);
  const cleanUsername = assertSlug(username, "username");
  const cleanDisplayName = assertString(displayName, "displayName", {
    min: 2,
    max: 100,
  });
  const cleanTimezone = assertTimezone(timezone);
  const cleanPlan = plan === "pro" ? "pro" : "free";

  const result = await query(
    `
      INSERT INTO users (email, username, display_name, timezone, plan)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, display_name, timezone, plan, created_at, updated_at
    `,
    [cleanEmail, cleanUsername, cleanDisplayName, cleanTimezone, cleanPlan],
    client
  );

  const user = result.rows[0];

  const defaultWeekly = [
    [1, "09:00", "17:00"],
    [2, "09:00", "17:00"],
    [3, "09:00", "17:00"],
    [4, "09:00", "17:00"],
    [5, "09:00", "17:00"],
  ];
  for (const [weekday, startTime, endTime] of defaultWeekly) {
    await query(
      `
        INSERT INTO user_weekly_availability (
          user_id, weekday, start_time, end_time, is_available
        )
        VALUES ($1, $2, $3, $4, TRUE)
      `,
      [user.id, weekday, startTime, endTime],
      client
    );
  }

  return user;
}

async function getOrCreateUser(payload, client = null) {
  const found = await getUserByEmail(payload.email, client);
  if (found) return found;
  return createUser(payload, client);
}

async function requireUser(userId, client = null) {
  const user = await getUserById(userId, client);
  if (!user) throw notFound("User not found");
  return user;
}

module.exports = {
  getUserById,
  getUserByUsername,
  getUserByEmail,
  createUser,
  getOrCreateUser,
  requireUser,
};
