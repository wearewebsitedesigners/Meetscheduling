const crypto = require("crypto");
const bcrypt = require("bcrypt");
const env = require("../config/env");
const { query, withTransaction } = require("../db/pool");
const { badRequest } = require("../utils/http-error");
const { assertEmail, assertString } = require("../utils/validation");
const { ensureWorkspaceForUser } = require("./workspace.service");

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createPasswordResetRequest(email, meta = {}) {
  const cleanEmail = assertEmail(email, "email");
  const userRes = await query(
    `
      SELECT id, email, username, display_name
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [cleanEmail]
  );

  const user = userRes.rows[0] || null;
  if (!user) return null;

  const workspaceContext = await ensureWorkspaceForUser(user.id);
  const workspaceId = workspaceContext?.workspaceId || user.id;

  const token = generateToken();
  const tokenHash = hashToken(token);
  const ttlMinutes = Number(env.authEmail?.passwordResetTtlMinutes || 60);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const requestedIp = String(meta.ipAddress || "").trim().slice(0, 80) || null;
  const userAgent = String(meta.userAgent || "").trim().slice(0, 500) || null;

  await query(
    `
      DELETE FROM password_reset_tokens
      WHERE user_id = $1
         OR expires_at <= NOW()
         OR used_at IS NOT NULL
    `,
    [user.id]
  );

  await query(
    `
      INSERT INTO password_reset_tokens (
        user_id,
        workspace_id,
        token_hash,
        expires_at,
        requested_ip,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [user.id, workspaceId, tokenHash, expiresAt, requestedIp, userAgent]
  );

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
    },
  };
}

async function resetPasswordWithToken({ token, password }) {
  const rawToken = assertString(token, "token", { min: 24, max: 300 });
  const cleanPassword = assertString(password, "password", { min: 8, max: 200 });
  const tokenHash = hashToken(rawToken);
  const passwordHash = await bcrypt.hash(cleanPassword, 10);

  return withTransaction(async (client) => {
    const tokenRes = await query(
      `
        SELECT id, user_id, expires_at, used_at
        FROM password_reset_tokens
        WHERE token_hash = $1
        LIMIT 1
      `,
      [tokenHash],
      client
    );
    const tokenRow = tokenRes.rows[0];
    if (!tokenRow) throw badRequest("Reset link is invalid or expired.");

    if (tokenRow.used_at) throw badRequest("This reset link has already been used.");
    if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      throw badRequest("Reset link is invalid or expired.");
    }

    await query(
      `
        UPDATE users
        SET password_hash = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [passwordHash, tokenRow.user_id],
      client
    );

    await query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = $1
      `,
      [tokenRow.id],
      client
    );

    await query(
      `
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = $1
          AND used_at IS NULL
          AND id <> $2
      `,
      [tokenRow.user_id, tokenRow.id],
      client
    );

    return { ok: true };
  });
}

module.exports = {
  createPasswordResetRequest,
  resetPasswordWithToken,
};
