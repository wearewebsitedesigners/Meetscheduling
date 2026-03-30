const express = require("express");
const passport = require("passport");
const asyncHandler = require("../middleware/async-handler");
const {
  clearAuthSession,
  requireAuth,
  setAuthSession,
  setTempAuthSession,
} = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rate-limit");
const {
  requireUser,
  getUserByEmailWithPassword,
  createUser,
  updateUserProfile,
  touchUserLastLogin,
  updateUserPasswordHash,
} = require("../services/users.service");
const {
  sendEmailVerificationEmail,
  sendLoginNotificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require("../services/email.service");
const {
  createPasswordResetRequest,
  resetPasswordWithToken,
} = require("../services/password-reset.service");
const {
  buildEmailVerificationUrl,
  createEmailVerificationRequestForUser,
  resendVerificationForEmail,
  verifyEmailWithToken,
} = require("../services/email-verification.service");
const { buildAuthClaimsForUser, buildUserPayload } = require("../services/auth-context.service");
const {
  assertEmail,
  assertOptionalString,
  assertString,
  assertSlug,
  assertTimezone,
} = require("../utils/validation");
const {
  assertStrongPassword,
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} = require("../services/password-auth.service");
const { slugify } = require("../utils/slug");
const env = require("../config/env");
const { logAuthEvent, logSecurityEvent, maskEmail } = require("../utils/security-log");

const router = express.Router();

function sendEmailSilently(task) {
  Promise.resolve()
    .then(() => task())
    .catch((error) => {
      logSecurityEvent("email.send_failed", {
        message: error?.message || String(error),
        stack: error?.stack || "",
      }, { level: "error" });
      // eslint-disable-next-line no-console
      console.error("Auth email failed:", error?.message || error);
    });
}

function normalizeRateLimitIdentity(value) {
  return String(value || "").trim().toLowerCase().slice(0, 320);
}

function buildIpRateLimiter({
  key,
  windowMs,
  maxRequests,
  blockMs,
  errorMessage,
  onLimit,
}) {
  return createRateLimiter({
    key,
    windowMs,
    maxRequests,
    blockMs,
    errorMessage,
    keyFn: (req) => String(req.ip || "").trim() || "unknown",
    onLimit,
  });
}

async function queueEmailVerification(user, req) {
  const verificationRequest = await createEmailVerificationRequestForUser(user, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || "",
  });

  if (!verificationRequest?.token || !verificationRequest?.user?.email) {
    return verificationRequest;
  }

  const verifyUrl = buildEmailVerificationUrl(verificationRequest.token);

  sendEmailSilently(() =>
    sendEmailVerificationEmail({
      toEmail: verificationRequest.user.email,
      displayName:
        verificationRequest.user.display_name ||
        verificationRequest.user.username ||
        verificationRequest.user.email,
      verifyUrl,
      expiresAt: verificationRequest.expiresAt,
    })
  );

  return verificationRequest;
}

async function completeBrowserLogin({
  res,
  req,
  user,
  preferredWorkspaceId = "",
  welcomeEmail = false,
}) {
  const claims = await buildAuthClaimsForUser(user, preferredWorkspaceId);
  setAuthSession(res, claims);
  const loggedInUser = (await touchUserLastLogin(user.id)) || user;

  if (welcomeEmail) {
    sendEmailSilently(() =>
      sendWelcomeEmail({
        toEmail: loggedInUser.email,
        displayName:
          loggedInUser.display_name || loggedInUser.username || loggedInUser.email,
        username: loggedInUser.username,
      })
    );
  } else {
    sendEmailSilently(() =>
      sendLoginNotificationEmail({
        toEmail: loggedInUser.email,
        displayName:
          loggedInUser.display_name || loggedInUser.username || loggedInUser.email,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || "",
      })
    );
  }

  return loggedInUser;
}

const signupIpRateLimit = buildIpRateLimiter({
  key: "auth-signup-ip",
  windowMs: 60 * 60 * 1000,
  maxRequests: 8,
  blockMs: 60 * 60 * 1000,
  errorMessage: "Too many signup attempts. Please try again later.",
  onLimit: (req) => {
    logAuthEvent("signup_ip_rate_limited", req, {}, "warn");
  },
});

const signupIdentityRateLimit = createRateLimiter({
  key: "auth-signup-identity",
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  blockMs: 60 * 60 * 1000,
  errorMessage: "Too many signup attempts. Please try again later.",
  keyFn: (req) => {
    const email = normalizeRateLimitIdentity(req.body?.email);
    return email || String(req.ip || "").trim() || "unknown";
  },
  onLimit: (req) => {
    logAuthEvent("signup_rate_limited", req, {
      email: maskEmail(req.body?.email),
    }, "warn");
  },
});

const loginIpRateLimit = buildIpRateLimiter({
  key: "auth-login-ip",
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many login attempts. Please wait and try again.",
  onLimit: (req) => {
    logAuthEvent("login_ip_rate_limited", req, {}, "warn");
  },
});

const loginIdentityRateLimit = createRateLimiter({
  key: "auth-login-identity",
  windowMs: 15 * 60 * 1000,
  maxRequests: 6,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many login attempts. Please wait and try again.",
  keyFn: (req) => {
    const email = normalizeRateLimitIdentity(req.body?.email);
    const ip = String(req.ip || "").trim() || "unknown";
    return email ? `${ip}:${email}` : ip;
  },
  onLimit: (req) => {
    logAuthEvent("login_rate_limited", req, {
      email: maskEmail(req.body?.email),
    }, "warn");
  },
});

const forgotPasswordRateLimit = buildIpRateLimiter({
  key: "auth-forgot-password-ip",
  windowMs: 30 * 60 * 1000,
  maxRequests: 8,
  blockMs: 30 * 60 * 1000,
  errorMessage: "Too many password reset requests. Please try again later.",
  onLimit: (req) => {
    logAuthEvent("password_reset_ip_rate_limited", req, {}, "warn");
  },
});

const forgotPasswordIdentityRateLimit = createRateLimiter({
  key: "auth-forgot-password-identity",
  windowMs: 30 * 60 * 1000,
  maxRequests: 3,
  blockMs: 30 * 60 * 1000,
  errorMessage: "Too many password reset requests. Please try again later.",
  keyFn: (req) => {
    const email = normalizeRateLimitIdentity(req.body?.email);
    return email || String(req.ip || "").trim() || "unknown";
  },
  onLimit: (req) => {
    logAuthEvent("password_reset_rate_limited", req, {
      email: maskEmail(req.body?.email),
    }, "warn");
  },
});

const resetPasswordRateLimit = buildIpRateLimiter({
  key: "auth-reset-password-ip",
  windowMs: 30 * 60 * 1000,
  maxRequests: 8,
  blockMs: 30 * 60 * 1000,
  errorMessage: "Too many password reset attempts. Please try again later.",
  onLimit: (req) => {
    logAuthEvent("password_reset_completion_rate_limited", req, {}, "warn");
  },
});

const resendVerificationRateLimit = buildIpRateLimiter({
  key: "auth-resend-verification-ip",
  windowMs: 30 * 60 * 1000,
  maxRequests: 6,
  blockMs: 30 * 60 * 1000,
  errorMessage: "Too many verification requests. Please try again later.",
  onLimit: (req) => {
    logAuthEvent("resend_verification_rate_limited", req, {}, "warn");
  },
});

const verifyEmailRateLimit = buildIpRateLimiter({
  key: "auth-verify-email-ip",
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many verification attempts. Please try again later.",
  onLimit: (req) => {
    logAuthEvent("email_verification_rate_limited", req, {}, "warn");
  },
});

const oauthStartRateLimit = buildIpRateLimiter({
  key: "auth-oauth-start-ip",
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many authentication attempts. Please try again later.",
  onLimit: (req) => {
    logAuthEvent("oauth_start_rate_limited", req, {}, "warn");
  },
});

const oauthCallbackRateLimit = buildIpRateLimiter({
  key: "auth-oauth-callback-ip",
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  blockMs: 20 * 60 * 1000,
  errorMessage: "Too many authentication callbacks. Please try again later.",
  onLimit: (req) => {
    logAuthEvent("oauth_callback_rate_limited", req, {}, "warn");
  },
});

router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.post(
  "/signup",
  signupIpRateLimit,
  signupIdentityRateLimit,
  asyncHandler(async (req, res) => {
    const email = assertEmail(req.body?.email, "email");
    const password = assertStrongPassword(req.body?.password, "password");
    const localPart = email.split("@")[0] || "user";
    const username = assertSlug(
      req.body?.username ? req.body.username : slugify(localPart),
      "username"
    );
    const timezone = assertTimezone(req.body?.timezone || "UTC");

    const existingUser = await getUserByEmailWithPassword(email);
    if (existingUser) {
      if (!existingUser.email_verified_at) {
        await queueEmailVerification(existingUser, req);
        logAuthEvent("signup_pending_verification", req, { email: maskEmail(email) }, "warn");
        return res.status(409).json({
          error: "This email already has a pending account. Check your inbox to verify it before logging in.",
          code: "EMAIL_VERIFICATION_REQUIRED",
        });
      }
      logAuthEvent("signup_duplicate_email", req, { email: maskEmail(email) }, "warn");
      return res.status(409).json({ error: "Email already in use." });
    }

    const passwordHash = await hashPassword(password);

    let user = null;
    const baseUsername = username;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate =
        attempt === 0
          ? baseUsername
          : `${baseUsername}-${Math.random().toString(36).substring(2, 7)}`;
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

    clearAuthSession(res);
    await queueEmailVerification(user, req);
    logAuthEvent("signup_succeeded", req, {
      userId: user.id,
      email: maskEmail(user.email),
    });

    res.status(201).json({
      message:
        "Account created. Check your email to verify your address before logging in.",
      emailVerificationRequired: true,
      user: buildUserPayload(user),
    });
  })
);

router.post(
  "/login",
  loginIpRateLimit,
  loginIdentityRateLimit,
  asyncHandler(async (req, res) => {
    const email = assertEmail(req.body?.email, "email");
    const password = assertString(req.body?.password, "password", {
      min: 1,
      max: 200,
      trim: false,
      normalize: false,
    });
    const requestedWorkspaceId = assertOptionalString(req.body?.workspaceId, "workspaceId", {
      max: 80,
    });

    const user = await getUserByEmailWithPassword(email);
    if (!user || !user.password_hash) {
      clearAuthSession(res);
      logAuthEvent("login_failed", req, { email: maskEmail(email), reason: "unknown_user" }, "warn");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      clearAuthSession(res);
      logAuthEvent("login_failed", req, { email: maskEmail(email), userId: user.id, reason: "bad_password" }, "warn");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (needsPasswordRehash(user.password_hash)) {
      const upgradedHash = await hashPassword(password, "password", { validate: false });
      user.password_hash = upgradedHash;
      await updateUserPasswordHash(user.id, upgradedHash);
    }

    if (!user.email_verified_at) {
      clearAuthSession(res);
      await queueEmailVerification(user, req);
      logAuthEvent("login_blocked_unverified", req, {
        userId: user.id,
        email: maskEmail(user.email),
      }, "warn");
      return res.status(403).json({
        error: "Verify your email before logging in. A new verification link has been sent.",
        code: "EMAIL_VERIFICATION_REQUIRED",
      });
    }

    if (user.two_factor_enabled) {
      const claims = await buildAuthClaimsForUser(user, requestedWorkspaceId);
      setTempAuthSession(res, claims);
      logAuthEvent("login_requires_2fa", req, {
        userId: user.id,
        email: maskEmail(user.email),
      });
      return res.json({
        requires2FA: true,
        message: "Two-factor authentication required.",
      });
    }

    const loggedInUser = await completeBrowserLogin({
      res,
      req,
      user,
      preferredWorkspaceId: requestedWorkspaceId,
    });
    logAuthEvent("login_succeeded", req, {
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
  "/resend-verification",
  resendVerificationRateLimit,
  asyncHandler(async (req, res) => {
    const email = assertEmail(req.body?.email, "email");
    const verificationRequest = await resendVerificationForEmail(email, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    if (verificationRequest?.token && verificationRequest?.user?.email) {
      const verifyUrl = buildEmailVerificationUrl(verificationRequest.token);
      sendEmailSilently(() =>
        sendEmailVerificationEmail({
          toEmail: verificationRequest.user.email,
          displayName:
            verificationRequest.user.display_name ||
            verificationRequest.user.username ||
            verificationRequest.user.email,
          verifyUrl,
          expiresAt: verificationRequest.expiresAt,
        })
      );
    }

    logAuthEvent("resend_verification_requested", req, {
      email: maskEmail(email),
    });

    res.json({
      message:
        "If that account exists and is not yet verified, a new verification link has been sent.",
    });
  })
);

router.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  forgotPasswordIdentityRateLimit,
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
          displayName:
            resetRequest.user.displayName ||
            resetRequest.user.username ||
            resetRequest.user.email,
          resetUrl,
          expiresAt: resetRequest.expiresAt,
        })
      );
    }

    logAuthEvent("password_reset_requested", req, {
      email: maskEmail(email),
    });

    res.json({
      message: "If an account exists for this email, a secure password reset link has been sent.",
    });
  })
);

router.post(
  "/reset-password",
  resetPasswordRateLimit,
  asyncHandler(async (req, res) => {
    const token = assertString(req.body?.token, "token", { min: 24, max: 300 });
    const password = assertStrongPassword(req.body?.password, "password");
    const confirmPassword = assertString(req.body?.confirmPassword, "confirmPassword", {
      min: env.auth.passwordMinLength,
      max: 200,
      trim: false,
      normalize: false,
    });

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    clearAuthSession(res);
    await resetPasswordWithToken({ token, password });
    logAuthEvent("password_reset_completed", req, {});
    res.json({ message: "Password reset successful. You can now log in." });
  })
);

router.get(
  "/verify-email",
  verifyEmailRateLimit,
  async (req, res, next) => {
    const token = String(req.query?.token || "").trim();
    const wantsJson = req.accepts(["html", "json"]) === "json";

    try {
      const user = await verifyEmailWithToken(token);
      logAuthEvent("email_verified", req, {
        userId: user.id,
        email: maskEmail(user.email),
      });
      sendEmailSilently(() =>
        sendWelcomeEmail({
          toEmail: user.email,
          displayName: user.display_name || user.username || user.email,
          username: user.username,
        })
      );

      if (wantsJson) {
        return res.json({ message: "Email verified. You can now log in." });
      }
      return res.redirect("/login.html?verified=1");
    } catch (error) {
      logAuthEvent("email_verification_failed", req, {
        reason: error?.message || "verification_failed",
      }, "warn");
      if (wantsJson) return next(error);
      return res.redirect("/login.html?error=verification_failed");
    }
  }
);

router.post("/logout", (req, res) => {
  logAuthEvent("logout", req, {});
  clearAuthSession(res);
  res.json({ ok: true });
});

router.get(
  "/google",
  oauthStartRateLimit,
  (req, res, next) => {
    if (!env.google.clientId || !env.google.clientSecret) {
      return res.status(500).json({
        error:
          "Google login is not configured on this server. Please contact the administrator.",
      });
    }
    next();
  },
  passport.authenticate("google-auth", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  oauthCallbackRateLimit,
  (req, res, next) => {
    if (!env.google.clientId || !env.google.clientSecret) {
      return res.status(500).json({ error: "Google login is not configured on this server." });
    }
    next();
  },
  (req, res, next) => {
    passport.authenticate("google-auth", { session: false }, (err, user, info) => {
      if (err) {
        logAuthEvent("google_oauth_failed", req, { reason: err?.message || "auth_failed" }, "warn");
        return res.redirect("/login.html?error=auth_failed");
      }
      if (!user) {
        logAuthEvent("google_oauth_missing_user", req, { info: info?.message || "" }, "warn");
        return res.redirect("/login.html?error=no_user");
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  asyncHandler(async (req, res) => {
    if (req.user.two_factor_enabled) {
      const claims = await buildAuthClaimsForUser(req.user);
      setTempAuthSession(res, claims);
      return res.redirect("/verify-2fa.html");
    }

    await completeBrowserLogin({
      res,
      req,
      user: req.user,
      welcomeEmail: Boolean(req.user.justCreated),
    });

    res.redirect("/dashboard");
  })
);

router.get(
  "/microsoft",
  oauthStartRateLimit,
  (req, res, next) => {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return res.status(500).json({
        error:
          "Microsoft login is not configured on this server. Please contact the administrator.",
      });
    }
    next();
  },
  passport.authenticate("microsoft-auth", {
    prompt: "select_account",
  })
);

router.get(
  "/microsoft/callback",
  oauthCallbackRateLimit,
  (req, res, next) => {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return res.status(500).json({
        error: "Microsoft login is not configured on this server.",
      });
    }
    next();
  },
  passport.authenticate("microsoft-auth", {
    session: false,
    failureRedirect: "/login.html",
  }),
  asyncHandler(async (req, res) => {
    if (req.user.two_factor_enabled) {
      const claims = await buildAuthClaimsForUser(req.user);
      setTempAuthSession(res, claims);
      return res.redirect("/verify-2fa.html");
    }

    await completeBrowserLogin({
      res,
      req,
      user: req.user,
      welcomeEmail: Boolean(req.user.justCreated),
    });

    res.redirect("/dashboard");
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
      session: {
        expiresInSeconds: env.auth.sessionTtlSeconds,
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

    const user = await updateUserProfile(req.auth.userId, {
      avatarUrl,
      displayName,
      username,
    });
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
