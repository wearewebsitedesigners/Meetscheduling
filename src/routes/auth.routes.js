const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, signAuthToken } = require("../middleware/auth");
const { requireUser, getUserByEmailWithPassword, createUser } = require("../services/users.service");
const { assertEmail, assertString, assertSlug, assertTimezone } = require("../utils/validation");
const { slugify } = require("../utils/slug");

const router = express.Router();

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

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      plan: user.plan,
    });

    res.json({ token, user: { id: user.id, email: user.email, username: user.username, plan: user.plan, timezone: user.timezone } });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = assertEmail(req.body?.email, "email");
    const password = assertString(req.body?.password, "password");

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
      const tempToken = jwt.sign(
        { userId: user.id, email: user.email, username: user.username, plan: user.plan, temp2FA: true },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "10m" }
      );
      return res.json({
        tempToken,
        requires2FA: true,
        message: "Two-factor authentication required"
      });
    }

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      plan: user.plan,
    });

    res.json({ token, user: { id: user.id, email: user.email, username: user.username, plan: user.plan, timezone: user.timezone } });
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
  (req, res) => {
    if (req.user.two_factor_enabled) {
      const jwt = require("jsonwebtoken");
      const tempToken = jwt.sign(
        { userId: req.user.id, email: req.user.email, username: req.user.username, plan: req.user.plan, temp2FA: true },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "10m" }
      );
      return res.redirect(`/verify-2fa.html?tempToken=${tempToken}`);
    }

    const token = signAuthToken({
      userId: req.user.id,
      email: req.user.email,
      username: req.user.username,
      plan: req.user.plan,
    });
    res.redirect(`/dashboard.html?token=${token}`);
  }
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
  (req, res) => {
    if (req.user.two_factor_enabled) {
      const jwt = require("jsonwebtoken");
      const tempToken = jwt.sign(
        { userId: req.user.id, email: req.user.email, username: req.user.username, plan: req.user.plan, temp2FA: true },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "10m" }
      );
      return res.redirect(`/verify-2fa.html?tempToken=${tempToken}`);
    }

    const token = signAuthToken({
      userId: req.user.id,
      email: req.user.email,
      username: req.user.username,
      plan: req.user.plan,
    });
    res.redirect(`/dashboard.html?token=${token}`);
  }
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await requireUser(req.auth.userId);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        timezone: user.timezone,
        plan: user.plan,
      },
    });
  })
);

module.exports = router;
