const path = require("path");
const express = require("express");
const authRoutes = require("./routes/auth.routes");
const auth2FaRoutes = require("./routes/2fa.routes");
const eventTypesRoutes = require("./routes/event-types.routes");
const availabilityRoutes = require("./routes/availability.routes");
const publicRoutes = require("./routes/public.routes");
const pagePublicRoutes = require("./routes/page-public.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const landingBuilderRoutes = require("./routes/landing-builder.routes");
const landingPublicRoutes = require("./routes/landing-public.routes");
const integrationsRoutes = require("./routes/integrations.routes");
const contactsRoutes = require("./routes/contacts.routes");
const workflowsRoutes = require("./routes/workflows.routes");
const routingRoutes = require("./routes/routing.routes");
const landingPageRoutes = require("./routes/landing-page.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");

function buildApp() {
  const app = express();
  const staticRoot = path.resolve(__dirname, "..");

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      service: "meetscheduling-api",
      time: new Date().toISOString(),
    });
  });

  const passport = require("./passport-setup");

  app.use("/api/auth", authRoutes);
  app.use("/api/auth/2fa", auth2FaRoutes);
  app.use(passport.initialize());

  app.use("/api/event-types", eventTypesRoutes);
  app.use("/api", pagePublicRoutes);
  app.use("/api/dashboard/pages", landingBuilderRoutes);
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/public/page", landingPublicRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/integrations", integrationsRoutes);
  app.use("/api/contacts", contactsRoutes);
  app.use("/api/workflows", workflowsRoutes);
  app.use("/api/routing", routingRoutes);
  app.use("/api/landing-page", landingPageRoutes);

  app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(staticRoot, "assets", "favicon.svg"));
  });

  app.use(express.static(staticRoot));

  app.get("/book/:slug", (req, res) => {
    res.sendFile(path.join(staticRoot, "book.html"));
  });

  app.get("/schedule/:slug", (req, res) => {
    res.sendFile(path.join(staticRoot, "book.html"));
  });

  app.get("/dashboard/page-builder", (req, res) => {
    res.redirect(302, "/dashboard/landing-page");
  });

  app.get("/dashboard/page-builder/:pageId", (req, res) => {
    res.redirect(302, `/dashboard/landing-page/${encodeURIComponent(req.params.pageId)}/editor`);
  });

  app.get("/dashboard/landing-page", (req, res) => {
    res.redirect(302, "/dashboard/landing-page/default/editor");
  });

  app.get("/dashboard/landing-page/list", (req, res) => {
    res.sendFile(path.join(staticRoot, "landing-page-list.html"));
  });

  app.get("/dashboard/landing-page/:pageId/editor", (req, res) => {
    res.sendFile(path.join(staticRoot, "landing-page-editor.html"));
  });

  app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(staticRoot, "dashboard.html"));
  });

  app.get("/dashboard/*", (req, res) => {
    res.sendFile(path.join(staticRoot, "dashboard.html"));
  });

  app.get(
    /^\/(meetings|scheduling|availability|contacts|workflows|integrations|routing|landing-page|analytics|admin|account)(\/.*)?$/,
    (req, res) => {
      res.sendFile(path.join(staticRoot, "dashboard.html"));
    }
  );

  app.get("/dashboard.html", (req, res) => {
    res.sendFile(path.join(staticRoot, "dashboard.html"));
  });

  app.get("/dashboard.html/*", (req, res) => {
    res.sendFile(path.join(staticRoot, "dashboard.html"));
  });

  app.get("/app", (req, res) => {
    res.sendFile(path.join(staticRoot, "dashboard.html"));
  });

  app.get("/app/*", (req, res) => {
    res.sendFile(path.join(staticRoot, "dashboard.html"));
  });

  app.get("/login", (req, res) => {
    res.sendFile(path.join(staticRoot, "login.html"));
  });

  app.get("/login.html", (req, res) => {
    res.sendFile(path.join(staticRoot, "login.html"));
  });

  app.get("/signup", (req, res) => {
    res.sendFile(path.join(staticRoot, "signup.html"));
  });

  app.get("/signup.html", (req, res) => {
    res.sendFile(path.join(staticRoot, "signup.html"));
  });

  app.get("/forgot-password", (req, res) => {
    res.sendFile(path.join(staticRoot, "forgot-password.html"));
  });

  app.get("/forgot-password.html", (req, res) => {
    res.sendFile(path.join(staticRoot, "forgot-password.html"));
  });

  app.get("/:username", (req, res, next) => {
    const accept = String(req.headers.accept || "");
    if (!accept.includes("text/html")) {
      return next();
    }

    const username = String(req.params.username || "")
      .trim()
      .toLowerCase();
    const reserved = new Set([
      "",
      "api",
      "assets",
      "dashboard",
      "meetings",
      "scheduling",
      "availability",
      "contacts",
      "workflows",
      "integrations",
      "routing",
      "landing-page",
      "analytics",
      "admin",
      "account",
      "app",
      "login",
      "signup",
      "forgot-password",
      "booking",
      "book",
      "schedule",
      "styles.css",
      "dashboard.css",
      "dashboard.js",
      "login.css",
      "login.js",
      "app.js",
      "index.html",
      "favicon.ico",
      "robots.txt",
      "sitemap.xml",
      "privacy",
      "legal",
      "status",
      "cookie-settings",
      "pricing",
      "product",
      "solutions",
      "resources",
      "about",
      "contact",
      "help-center",
      "developers",
      "community",
      "blog",
      "case-studies",
      "security",
      "careers",
      "press",
      "terms",
      "privacy-policy",
      "cookie-policy",
    ]);
    if (reserved.has(username) || username.includes(".")) {
      return next();
    }

    return res.sendFile(path.join(staticRoot, "landing-page-public.html"));
  });

  app.get("/:username/:slug", (req, res) => {
    res.sendFile(path.join(staticRoot, "booking.html"));
  });

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const accept = String(req.headers.accept || "");
    if (!accept.includes("text/html")) return next();
    res.sendFile(path.join(staticRoot, "index.html"));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = buildApp;
