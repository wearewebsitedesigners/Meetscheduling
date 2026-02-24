const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const MicrosoftStrategy = require("passport-microsoft").Strategy;
const { getOrCreateUser } = require("./services/users.service");
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

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    "google-auth",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.APP_BASE_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const baseName = slugify(email.split("@")[0]) || "user";
          const user = await getOrCreateUser({
            email,
            username: baseName + "-" + Math.random().toString(36).substring(2, 7),
            displayName: profile.displayName || email.split("@")[0],
            timezone: "UTC",
            plan: "free",
          });
          return done(null, user);
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
        callbackURL: `${process.env.APP_BASE_URL}/api/auth/microsoft/callback`,
        scope: ["user.read"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const baseName = slugify(email.split("@")[0]) || "user";
          const user = await getOrCreateUser({
            email,
            username: baseName + "-" + Math.random().toString(36).substring(2, 7),
            displayName: profile.displayName || email.split("@")[0],
            timezone: "UTC",
            plan: "free",
          });
          return done(null, user);
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
