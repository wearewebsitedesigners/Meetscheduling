const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const MicrosoftStrategy = require("passport-microsoft").Strategy;
const env = require("./config/env");
const { getUserByEmail, createUser } = require("./services/users.service");
const { markUserEmailVerified } = require("./services/email-verification.service");
const { slugify } = require("./utils/slug");

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

class MissingCredentialStrategy extends passport.Strategy {
  constructor(name, provider) {
    super();
    this.name = name;
    this.provider = provider;
  }
  authenticate(req, options) {
    this.fail({ message: `${this.provider} login is not configured on this server. Please contact the administrator.` }, 500);
  }
}

async function findOrCreateSocialUser({ email, displayName }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const baseName = slugify(normalizedEmail.split("@")[0]) || "user";
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    const verifiedUser = existingUser.email_verified_at
      ? existingUser
      : await markUserEmailVerified(existingUser.id);
    return { user: verifiedUser || existingUser, justCreated: false };
  }

  try {
    const created = await createUser({
      email: normalizedEmail,
      username: `${baseName}-${Math.random().toString(36).substring(2, 7)}`,
      displayName: displayName || normalizedEmail.split("@")[0],
      timezone: "UTC",
      plan: "free",
      emailVerifiedAt: new Date(),
    });
    return { user: created, justCreated: true };
  } catch (error) {
    if (error && error.code === "23505") {
      const foundAfterConflict = await getUserByEmail(normalizedEmail);
      if (foundAfterConflict) return { user: foundAfterConflict, justCreated: false };
    }
    throw error;
  }
}

if (env.google.clientId && env.google.clientSecret) {
  passport.use(
    "google-auth",
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: `${env.appBaseUrl}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const { user, justCreated } = await findOrCreateSocialUser({
            email,
            displayName: profile.displayName || email.split("@")[0],
          });
          return done(null, { ...user, justCreated });
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
} else {
  passport.use("google-auth", new MissingCredentialStrategy("google-auth", "Google"));
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  passport.use(
    "microsoft-auth",
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: `${env.appBaseUrl}/api/auth/microsoft/callback`,
        scope: ["user.read"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const { user, justCreated } = await findOrCreateSocialUser({
            email,
            displayName: profile.displayName || email.split("@")[0],
          });
          return done(null, { ...user, justCreated });
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
} else {
  passport.use("microsoft-auth", new MissingCredentialStrategy("microsoft-auth", "Microsoft"));
}

module.exports = passport;
