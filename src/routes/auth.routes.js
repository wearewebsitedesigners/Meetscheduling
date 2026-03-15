const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, signAuthToken } = require("../middleware/auth");
const { requireUser, getUserByEmailWithPassword, createUser, updateUserProfile } = require("../services/users.service");
const {
  sendWelcomeEmail,
  sendLoginNotificationEmail,
  sendPasswordResetEmail,
} = require("../services/email.service");
const {
  createPasswordResetRequest,
  resetPasswordWithToken,
} = require("../services/password-reset.service");
const { buildAuthClaimsForUser, buildUserPayload } = require("../services/auth-context.service");
const { assertEmail, assertOptionalString, assertString, assertSlug, assertTimezone } = require("../utils/validation");
const { slugify } = require("../utils/slug");
const env = require("../config/env");

const router = express.Router();

function sendEmailSilently(task) {
  Promise.resolve()
    .then(() => task())
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Auth email failed:", error?.message || error);
    });
}

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const email = assertEmail(req.body?.email, "email");
    const password = assertString(req.body?.password, "password", { min: 6 });
    const localPart = email.split("@")[0] || "user";
    const username = assertSlug(
      req.body?.username ? req.body.username : slugify(localPart),
      "username"
    );
    const timezone = assertTimezone(req.body?.timezone || "UTC");

    const existingUser = await getUserByEmailWithPassword(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user = null;
    const baseUsername = username;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = attempt === 0 ? baseUsername : `${baseUsername}-${Math.random().toString(36).substring(2, 7)}`;
      try {
        user = await createUser({
          email,
          username: candidate,
          displayName: localPart,
          timezone,
          plan: "free",
          passwordHash,
        });
        break;
      } catch (error) {
        if (error && error.code === "23505") continue;
        throw error;
      }
    }

    if (!user) throw new Error("Could not create user");

    const token = signAuthToken(await buildAuthClaimsForUser(user));

    sendEmailSilently(() =>
      sendWelcomeEmail({
        toEmail: user.email,
        displayName: user.display_name || user.username || localPart,
        username: user.username,
      })
    );

    res.json({ token, user: buildUserPayload(user) });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = assertEmail(req.body?.email, "email");
    const password = assertString(req.body?.password, "password");
    const requestedWorkspaceId = assertOptionalString(req.body?.workspaceId, "workspaceId", {
      max: 80,
    });

    const user = await getUserByEmailWithPassword(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.two_factor_enabled) {
      const jwt = require("jsonwebtoken");
      const claims = await buildAuthClaimsForUser(user, requestedWorkspaceId);
      const tempToken = jwt.sign(
        { ...claims, temp2FA: true },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "10m" }
      );
      return res.json({
        tempToken,
        requires2FA: true,
        message: "Two-factor authentication required"
      });
    }

    const token = signAuthToken(await buildAuthClaimsForUser(user, requestedWorkspaceId));

    sendEmailSilently(() =>
      sendLoginNotificationEmail({
        toEmail: user.email,
        displayName: user.display_name || user.username || user.email,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || "",
      })
    );

    res.json({ token, user: buildUserPayload(user) });
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const email = assertEmail(req.body?.email, "email");
    const resetRequest = await createPasswordResetRequest(email, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    if (resetRequest?.user?.email && resetRequest?.token) {
      const resetUrl = `${env.appBaseUrl || "https://meetscheduling.com"}/reset-password?token=${encodeURIComponent(
        resetRequest.token
      )}`;

      sendEmailSilently(() =>
        sendPasswordResetEmail({
          toEmail: resetRequest.user.email,
          displayName: resetRequest.user.displayName || resetRequest.user.username || resetRequest.user.email,
          resetUrl,
          expiresAt: resetRequest.expiresAt,
        })
      );
    }

    res.json({
      message: "If an account exists for this email, a secure password reset link has been sent.",
    });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const token = assertString(req.body?.token, "token", { min: 24, max: 300 });
    const password = assertString(req.body?.password, "password", { min: 8, max: 200 });
    const confirmPassword = assertString(req.body?.confirmPassword, "confirmPassword", {
      min: 8,
      max: 200,
    });

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    await resetPasswordWithToken({ token, password });
    res.json({ message: "Password reset successful. You can now log in." });
  })
);

router.get(
  "/google",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: "Google login is not configured on this server. Please contact the administrator." });
    }
    next();
  },
  passport.authenticate("google-auth", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: "Google login is not configured on this server." });
    }
    next();
  },
  (req, res, next) => {
    passport.authenticate("google-auth", { session: false }, (err, user, info) => {
      if (err) {
        console.error("Google Auth Error:", err);
        return res.redirect("/login.html?error=auth_failed");
      }
      if (!user) {
        console.error("Google Auth No User:", info);
        return res.redirect("/login.html?error=no_user");
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  asyncHandler(async (req, res) => {
    if (req.user.two_factor_enabled) {
      const jwt = require("jsonwebtoken");
      const claims = await buildAuthClaimsForUser(req.user);
      const tempToken = jwt.sign(
        { ...claims, temp2FA: true },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "10m" }
      );
      return res.redirect(`/verify-2fa.html?tempToken=${tempToken}`);
    }

    const token = signAuthToken(await buildAuthClaimsForUser(req.user));

    if (req.user.justCreated) {
      sendEmailSilently(() =>
        sendWelcomeEmail({
          toEmail: req.user.email,
          displayName: req.user.display_name || req.user.username || req.user.email,
          username: req.user.username,
        })
      );
    } else {
      sendEmailSilently(() =>
        sendLoginNotificationEmail({
          toEmail: req.user.email,
          displayName: req.user.display_name || req.user.username || req.user.email,
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || "",
        })
      );
    }

    res.redirect(`/dashboard?token=${token}`);
  })
);

router.get(
  "/microsoft",
  (req, res, next) => {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return res.status(500).json({ error: "Microsoft login is not configured on this server. Please contact the administrator." });
    }
    next();
  },
  passport.authenticate("microsoft-auth", {
    prompt: "select_account",
  })
);

router.get(
  "/microsoft/callback",
  (req, res, next) => {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return res.status(500).json({ error: "Microsoft login is not configured on this server." });
    }
    next();
  },
  passport.authenticate("microsoft-auth", { session: false, failureRedirect: "/login.html" }),
  asyncHandler(async (req, res) => {
    if (req.user.two_factor_enabled) {
      const jwt = require("jsonwebtoken");
      const claims = await buildAuthClaimsForUser(req.user);
      const tempToken = jwt.sign(
        { ...claims, temp2FA: true },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "10m" }
      );
      return res.redirect(`/verify-2fa.html?tempToken=${tempToken}`);
    }

    const token = signAuthToken(await buildAuthClaimsForUser(req.user));

    if (req.user.justCreated) {
      sendEmailSilently(() =>
        sendWelcomeEmail({
          toEmail: req.user.email,
          displayName: req.user.display_name || req.user.username || req.user.email,
          username: req.user.username,
        })
      );
    } else {
      sendEmailSilently(() =>
        sendLoginNotificationEmail({
          toEmail: req.user.email,
          displayName: req.user.display_name || req.user.username || req.user.email,
          ipAddress: req.ip,
          userAgent: req.get("user-agent") || "",
        })
      );
    }

    res.redirect(`/dashboard?token=${token}`);
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.auth.userId);
    res.json({
      user: {
        ...buildUserPayload(user),
        workspaceId: req.auth.workspaceId || user.id,
        membershipRole: req.auth.role || "owner",
        permissionsVersion: req.auth.permissionsVersion || 1,
      },
    });
  })
);

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const avatarUrl =
      req.body?.avatarUrl === undefined
        ? undefined
        : assertOptionalString(req.body.avatarUrl, "avatarUrl", { max: 2000 });
    const displayName =
      req.body?.displayName === undefined
        ? undefined
        : assertString(req.body.displayName, "displayName", { min: 2, max: 100 });
    const username =
      req.body?.username === undefined
        ? undefined
        : req.body.username;

    const user = await updateUserProfile(req.auth.userId, { avatarUrl, displayName, username });
    res.json({
      user: {
        ...buildUserPayload(user),
        workspaceId: req.auth.workspaceId || user.id,
        membershipRole: req.auth.role || "owner",
        permissionsVersion: req.auth.permissionsVersion || 1,
      },
    });
  })
);

module.exports = router;
