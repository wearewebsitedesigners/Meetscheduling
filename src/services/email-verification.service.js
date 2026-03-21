const crypto = require("crypto");
const env = require("../config/env");
const { query, withTransaction } = require("../db/pool");
const { badRequest } = require("../utils/http-error");
const { assertEmail, assertString } = require("../utils/validation");

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildEmailVerificationUrl(token) {
  const baseUrl = String(env.appBaseUrl || "http://localhost:8080").replace(/\/+$/, "");
  return `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

async function getEmailVerificationUserById(userId, client = null) {
  const result = await query(
    `
      SELECT id, email, username, display_name, email_verified_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
    client
  );
  return result.rows[0] || null;
}

async function getEmailVerificationUserByEmail(email, client = null) {
  const cleanEmail = assertEmail(email, "email");
  const result = await query(
    `
      SELECT id, email, username, display_name, email_verified_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [cleanEmail],
    client
  );
  return result.rows[0] || null;
}

async function createEmailVerificationRequestForUser(userOrId, meta = {}, client = null) {
  const user =
    typeof userOrId === "object" && userOrId
      ? userOrId
      : await getEmailVerificationUserById(assertString(userOrId, "userId", { min: 10, max: 80 }), client);

  if (!user) return null;
  if (user.email_verified_at) {
    return {
      alreadyVerified: true,
      user,
    };
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const ttlMinutes = Number(env.auth.emailVerificationTtlMinutes || 24 * 60);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const requestedIp = String(meta.ipAddress || "").trim().slice(0, 80) || null;
  const userAgent = String(meta.userAgent || "").trim().slice(0, 500) || null;

  await query(
    `
      DELETE FROM email_verification_tokens
      WHERE user_id = $1
         OR expires_at <= NOW()
         OR used_at IS NOT NULL
    `,
    [user.id],
    client
  );

  await query(
    `
      INSERT INTO email_verification_tokens (
        user_id,
        token_hash,
        expires_at,
        requested_ip,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [user.id, tokenHash, expiresAt, requestedIp, userAgent],
    client
  );

  return {
    token,
    expiresAt,
    user,
  };
}

async function resendVerificationForEmail(email, meta = {}) {
  const user = await getEmailVerificationUserByEmail(email);
  if (!user) return null;
  return createEmailVerificationRequestForUser(user, meta);
}

async function markUserEmailVerified(userId, client = null) {
  const result = await query(
    `
      UPDATE users
      SET email_verified_at = COALESCE(email_verified_at, NOW()),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, username, display_name, timezone, plan, avatar_url,
                two_factor_enabled, email_verified_at, created_at, updated_at
    `,
    [userId],
    client
  );
  return result.rows[0] || null;
}

async function verifyEmailWithToken(token) {
  const rawToken = assertString(token, "token", { min: 24, max: 300 });
  const tokenHash = hashToken(rawToken);

  return withTransaction(async (client) => {
    const tokenRes = await query(
      `
        SELECT evt.id,
               evt.user_id,
               evt.expires_at,
               evt.used_at
        FROM email_verification_tokens evt
        WHERE evt.token_hash = $1
        LIMIT 1
      `,
      [tokenHash],
      client
    );

    const tokenRow = tokenRes.rows[0] || null;
    if (!tokenRow) throw badRequest("Verification link is invalid or expired.");
    if (tokenRow.used_at) throw badRequest("This verification link has already been used.");
    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      throw badRequest("Verification link is invalid or expired.");
    }

    await query(
      `
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE id = $1
      `,
      [tokenRow.id],
      client
    );

    await query(
      `
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL
          AND id <> $2
      `,
      [tokenRow.user_id, tokenRow.id],
      client
    );

    const user = await markUserEmailVerified(tokenRow.user_id, client);
    if (!user) throw badRequest("Verification link is invalid or expired.");
    return user;
  });
}

module.exports = {
  buildEmailVerificationUrl,
  createEmailVerificationRequestForUser,
  resendVerificationForEmail,
  verifyEmailWithToken,
  markUserEmailVerified,
};
