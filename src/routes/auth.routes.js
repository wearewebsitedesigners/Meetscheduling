const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth, signAuthToken } = require("../middleware/auth");
const { query } = require("../db/pool");
const {
  assertEmail,
  assertOptionalString,
  assertSlug,
  assertTimezone,
} = require("../utils/validation");
const { slugify } = require("../utils/slug");
const { getOrCreateUser, requireUser } = require("../services/users.service");

const router = express.Router();

router.post(
  "/dev-login",
  asyncHandler(async (req, res) => {
    const email = assertEmail(req.body?.email, "email");
    const localPart = email.split("@")[0] || "user";
    const username = assertSlug(
      req.body?.username ? req.body.username : slugify(localPart),
      "username"
    );
    const displayName = assertOptionalString(
      req.body?.displayName || localPart,
      "displayName",
      { max: 100 }
    );
    const timezone = assertTimezone(req.body?.timezone || "UTC");
    const plan = req.body?.plan === "pro" ? "pro" : "free";

    let user = null;
    const baseUsername = username;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? baseUsername : `${baseUsername}-${attempt}`;
      try {
        user = await getOrCreateUser({
          email,
          username: candidate,
          displayName: displayName || localPart,
          timezone,
          plan,
        });
        break;
      } catch (error) {
        if (error && error.code === "23505") {
          continue;
        }
        throw error;
      }
    }
    if (!user) {
      throw new Error("Could not create user");
    }

    await query(
      `
        UPDATE users
        SET timezone = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [timezone, user.id]
    );

    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      plan: user.plan,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        timezone,
        plan: user.plan,
      },
    });
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    assertEmail(req.body?.email, "email");

    // Security best practice: always return the same response
    // to avoid account enumeration.
    res.json({
      ok: true,
      message:
        "If an account exists for this email, a password reset link has been sent.",
    });
  })
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
