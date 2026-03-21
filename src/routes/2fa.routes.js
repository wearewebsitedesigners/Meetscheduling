const express = require("express");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const bcrypt = require("bcrypt");
const env = require("../config/env");
const asyncHandler = require("../middleware/async-handler");
const { createRateLimiter } = require("../middleware/rate-limit");
const {
  clearTempAuthSession,
  readTempAuthToken,
  requireAuth,
  setAuthSession,
  verifyTempAuthToken,
} = require("../middleware/auth");
const {
  requireUser,
  enableUser2FA,
  disableUser2FA,
  removeBackupCode,
  touchUserLastLogin,
} = require("../services/users.service");
const { sendLoginNotificationEmail } = require("../services/email.service");
const { buildAuthClaimsForUser, buildUserPayload } = require("../services/auth-context.service");
const { verifyPassword } = require("../services/password-auth.service");
const { query } = require("../db/pool");
const {
  assertBase32Secret,
  assertString,
  assertTotpCode,
} = require("../utils/validation");
const { logAuthEvent, maskEmail } = require("../utils/security-log");

const router = express.Router();

const verifyLoginRateLimit = createRateLimiter({
  key: "auth-2fa-verify",
  windowMs: 10 * 60 * 1000,
  maxRequests: 8,
  blockMs: 15 * 60 * 1000,
  errorMessage: "Too many verification attempts. Please wait a few minutes and try again.",
  keyFn: (req) => String(req.ip || "").trim() || "unknown",
  onLimit: (req) => {
    logAuthEvent("2fa_rate_limited", req, {}, "warn");
  },
});

function sendEmailSilently(task) {
  Promise.resolve()
    .then(() => task())
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("2FA auth email failed:", error?.message || error);
    });
}

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.post(
  "/setup",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.auth.userId);

    if (user.two_factor_enabled) {
      return res.status(400).json({ error: "2FA is already enabled." });
    }

    const secret = speakeasy.generateSecret({
      name: `Meetscheduling (${user.email})`,
      length: 20,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    logAuthEvent("2fa_setup_started", req, {
      userId: user.id,
      email: maskEmail(user.email),
    });

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  })
);

router.post(
  "/verify-setup",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.auth.userId);
    const token = assertTotpCode(req.body?.token, "token");
    const secret = assertBase32Secret(req.body?.secret, "secret");

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: "Invalid verification code." });
    }

    const { backupCodes } = await enableUser2FA(user.id, secret);
    logAuthEvent("2fa_enabled", req, {
      userId: user.id,
      email: maskEmail(user.email),
    });

    res.json({ success: true, backupCodes });
  })
);

router.post(
  "/verify-login",
  verifyLoginRateLimit,
  asyncHandler(async (req, res) => {
    const code = assertTotpCode(req.body?.code, "code");
    const tempToken = readTempAuthToken(
      req,
      req.body?.tempToken
        ? assertString(req.body.tempToken, "tempToken", { min: 20, max: 4000 })
        : ""
    );

    if (!tempToken || !code) {
      return res.status(400).json({ error: "Verification code is required." });
    }

    let decoded;
    try {
      decoded = verifyTempAuthToken(tempToken);
    } catch {
      clearTempAuthSession(res);
      logAuthEvent("2fa_login_failed", req, { reason: "expired_temp_session" }, "warn");
      return res.status(401).json({ error: "Your verification session expired. Please log in again." });
    }

    const user = await requireUser(decoded.userId);
    if (!user.two_factor_enabled || !user.two_factor_secret) {
      clearTempAuthSession(res);
      logAuthEvent("2fa_login_failed", req, {
        userId: user.id,
        email: maskEmail(user.email),
        reason: "2fa_not_configured",
      }, "warn");
      return res.status(400).json({ error: "Two-factor authentication is not configured for this account." });
    }

    let isBackupCode = false;
    if (code.length === 8 && user.two_factor_backup_codes) {
      for (const hash of user.two_factor_backup_codes) {
        if (await bcrypt.compare(code.toUpperCase(), hash)) {
          isBackupCode = true;
          await removeBackupCode(user.id, hash);
          break;
        }
      }
    }

    if (!isBackupCode) {
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: "base32",
        token: code,
        window: 1,
      });

      if (!verified) {
        logAuthEvent("2fa_login_failed", req, {
          userId: user.id,
          email: maskEmail(user.email),
          reason: "invalid_code",
        }, "warn");
        return res.status(401).json({ error: "Invalid verification code." });
      }
    }

    const claims = await buildAuthClaimsForUser(user, decoded.workspaceId || "");
    setAuthSession(res, claims);
    const loggedInUser = (await touchUserLastLogin(user.id)) || user;

    sendEmailSilently(() =>
      sendLoginNotificationEmail({
        toEmail: loggedInUser.email,
        displayName:
          loggedInUser.display_name || loggedInUser.username || loggedInUser.email,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || "",
      })
    );
    logAuthEvent("2fa_login_succeeded", req, {
      userId: loggedInUser.id,
      email: maskEmail(loggedInUser.email),
    });

    res.json({
      user: buildUserPayload(loggedInUser),
      session: {
        expiresInSeconds: env.auth.sessionTtlSeconds,
      },
    });
  })
);

router.post(
  "/disable",
  requireAuth,
  asyncHandler(async (req, res) => {
    const password = req.body?.password
      ? assertString(req.body.password, "password", {
        min: 1,
        max: 200,
        trim: false,
        normalize: false,
      })
      : "";

    const result = await query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [req.auth.userId]
    );

    const userPass = result.rows[0]?.password_hash;

    if (userPass) {
      if (!password) {
        return res.status(400).json({ error: "Password is required to disable 2FA." });
      }
      const isMatch = await verifyPassword(password, userPass);
      if (!isMatch) {
        return res.status(401).json({ error: "Incorrect password." });
      }
    }

    await disableUser2FA(req.auth.userId);
    logAuthEvent("2fa_disabled", req, { userId: req.auth.userId });

    res.json({ success: true });
  })
);

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.auth.userId);
    res.json({ enabled: user.two_factor_enabled });
  })
);

module.exports = router;
