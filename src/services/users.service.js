const crypto = require("crypto");
const { query } = require("../db/pool");
const { badRequest, conflict, notFound } = require("../utils/http-error");
const {
  assertEmail,
  assertOptionalString,
  assertRelativeOrHttpUrl,
  assertSlug,
  assertString,
  assertTimezone,
} = require("../utils/validation");
const { hashBackupCode } = require("./password-auth.service");
const { activatePendingWorkspaceInvitesForUser, ensureWorkspaceForUser } = require("./workspace.service");

const RESERVED_USERNAMES = new Set([
  "",
  "api",
  "assets",
  "classic-dashboard",
  "dashboard",
  "meetings",
  "scheduling",
  "availability",
  "contacts",
  "workflows",
  "integrations",
  "routing",
  "landing-page",
  "landing-page-builder",
  "analytics",
  "admin",
  "account",
  "app",
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "booking",
  "book",
  "schedule",
  "pricing",
  "about",
  "contact",
  "help",
  "help-center",
  "developers",
  "community",
  "blog",
  "privacy",
  "terms",
  "status",
]);

function assertPublicUsername(value) {
  const username = assertSlug(value, "username");
  if (RESERVED_USERNAMES.has(username) || username.includes(".")) {
    throw badRequest("Username is reserved.");
  }
  return username;
}

async function getUserById(userId, client = null) {
  const result = await query(
    `
      SELECT id, email, username, display_name, timezone, plan, avatar_url,
             two_factor_enabled, two_factor_secret, email_verified_at, last_login_at,
             created_at, updated_at
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
      SELECT id, email, username, display_name, timezone, plan, avatar_url,
             two_factor_enabled, email_verified_at, last_login_at, created_at, updated_at
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
      SELECT id, email, username, display_name, timezone, plan, avatar_url,
             two_factor_enabled, email_verified_at, last_login_at, created_at, updated_at
      FROM users
      WHERE email = $1
    `,
    [email],
    client
  );
  return result.rows[0] || null;
}

async function getUserByEmailWithPassword(email, client = null) {
  const result = await query(
    `
      SELECT id, email, username, display_name, timezone, plan, avatar_url,
             password_hash, two_factor_enabled, two_factor_secret, two_factor_backup_codes,
             email_verified_at, last_login_at, created_at, updated_at
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
  passwordHash = null,
  emailVerifiedAt = null,
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
      INSERT INTO users (email, username, display_name, timezone, plan, password_hash, email_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, username, display_name, timezone, plan, avatar_url,
                email_verified_at, last_login_at, created_at, updated_at
    `,
    [cleanEmail, cleanUsername, cleanDisplayName, cleanTimezone, cleanPlan, passwordHash, emailVerifiedAt],
    client
  );

  const user = result.rows[0];
  await activatePendingWorkspaceInvitesForUser(user.id, cleanEmail, client);
  const workspaceContext = await ensureWorkspaceForUser(user.id, client);
  const workspaceId = workspaceContext?.workspaceId || user.id;

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
          user_id, workspace_id, weekday, start_time, end_time, is_available
        )
        VALUES ($1, $2, $3, $4, $5, TRUE)
      `,
      [user.id, workspaceId, weekday, startTime, endTime],
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

async function updateUserProfile(userId, payload = {}, client = null) {
  const updates = [];
  const values = [];

  if (payload.displayName !== undefined) {
    values.push(
      payload.displayName === ""
        ? ""
        : assertString(payload.displayName, "displayName", { min: 2, max: 100 })
    );
    updates.push(`display_name = $${values.length}`);
  }

  if (payload.avatarUrl !== undefined) {
    values.push(
      payload.avatarUrl
        ? assertRelativeOrHttpUrl(payload.avatarUrl, "avatarUrl", { max: 2000 })
        : ""
    );
    updates.push(`avatar_url = $${values.length}`);
  }

  if (payload.username !== undefined) {
    values.push(assertPublicUsername(payload.username));
    updates.push(`username = $${values.length}`);
  }

  if (!updates.length) {
    throw badRequest("No profile fields provided.");
  }

  values.push(userId);
  let result;
  try {
    result = await query(
      `
        UPDATE users
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING id, email, username, display_name, timezone, plan, avatar_url,
                  two_factor_enabled, email_verified_at, last_login_at, created_at, updated_at
      `,
      values,
      client
    );
  } catch (error) {
    if (error?.code === "23505") {
      throw conflict("Username is already taken.");
    }
    throw error;
  }

  return result.rows[0] || null;
}

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    let code = "";
    while (code.length < 8) {
      code += crypto.randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "");
    }
    codes.push(code.slice(0, 8).toUpperCase());
  }
  return codes;
}

async function enableUser2FA(userId, secret, client = null) {
  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map((code) => hashBackupCode(code)));

  const result = await query(
    `
      UPDATE users
      SET two_factor_secret = $1, two_factor_enabled = TRUE, two_factor_backup_codes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, email, username, two_factor_enabled
    `,
    [secret, hashedCodes, userId],
    client
  );

  // Return the raw backup codes to display ONLY ONCE to the user
  return { user: result.rows[0], backupCodes };
}

async function disableUser2FA(userId, client = null) {
  const result = await query(
    `
          UPDATE users
          SET two_factor_secret = NULL, two_factor_enabled = FALSE, two_factor_backup_codes = '{}', updated_at = NOW()
          WHERE id = $1
          RETURNING id, email, username, two_factor_enabled
        `,
    [userId],
    client
  );
  return result.rows[0];
}

async function getBackupCodes(userId, client = null) {
  const result = await query(
    `
          SELECT two_factor_backup_codes
          FROM users
          WHERE id = $1
        `,
    [userId],
    client
  );
  return result.rows[0]?.two_factor_backup_codes || [];
}

async function removeBackupCode(userId, hashToRemove, client = null) {
  const result = await query(
    `
          UPDATE users
          SET two_factor_backup_codes = array_remove(two_factor_backup_codes, $1)
          WHERE id = $2
        `,
    [hashToRemove, userId],
    client
  );
  return result.rowCount > 0;
}

async function updateUserPasswordHash(userId, passwordHash, client = null) {
  const result = await query(
    `
      UPDATE users
      SET password_hash = $1,
          password_updated_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, username, display_name, timezone, plan, avatar_url,
                two_factor_enabled, email_verified_at, last_login_at, created_at, updated_at
    `,
    [passwordHash, userId],
    client
  );
  return result.rows[0] || null;
}

async function touchUserLastLogin(userId, client = null) {
  const result = await query(
    `
      UPDATE users
      SET last_login_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, username, display_name, timezone, plan, avatar_url,
                two_factor_enabled, email_verified_at, last_login_at, created_at, updated_at
    `,
    [userId],
    client
  );
  return result.rows[0] || null;
}

module.exports = {
  getUserById,
  getUserByUsername,
  getUserByEmail,
  getUserByEmailWithPassword,
  createUser,
  getOrCreateUser,
  requireUser,
  updateUserProfile,
  enableUser2FA,
  disableUser2FA,
  getBackupCodes,
  removeBackupCode,
  updateUserPasswordHash,
  touchUserLastLogin,
};
