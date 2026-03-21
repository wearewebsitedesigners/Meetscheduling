const path = require("path");
const express = require("express");
const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const auth2FaRoutes = require("./routes/2fa.routes");
const eventTypesRoutes = require("./routes/event-types.routes");
const availabilityRoutes = require("./routes/availability.routes");
const publicRoutes = require("./routes/public.routes");
const pagePublicRoutes = require("./routes/page-public.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const landingBuilderRoutes = require("./routes/landing-builder.routes");
const landingPublicRoutes = require("./routes/landing-public.routes");
const domainPublicRoutes = require("./routes/domain-public.routes");
const integrationsRoutes = require("./routes/integrations.routes");
const domainsRoutes = require("./routes/domains.routes");
const contactsRoutes = require("./routes/contacts.routes");
const workflowsRoutes = require("./routes/workflows.routes");
const routingRoutes = require("./routes/routing.routes");
const workspaceRoutes = require("./routes/workspace.routes");
const chatRoutes = require("./routes/chat.routes");
const inboxRoutes = require("./routes/inbox.routes");
const filesRoutes = require("./routes/files.routes");
const galleryRoutes = require("./routes/gallery.routes");
const postsRoutes = require("./routes/posts.routes");
const invoicesRoutes = require("./routes/invoices.routes");
const invoiceTemplatesRoutes = require("./routes/invoice-templates.routes");
const landingPageRoutes = require("./routes/landing-page.routes");
const uploadsRoutes = require("./routes/uploads.routes");
const billingRoutes = require("./routes/billing.routes");
const billingWebhookRoutes = require("./routes/billing-webhook.routes");
const { protectedApiRateLimit } = require("./middleware/api-abuse-protection");
const {
  apiRateLimit,
  applySecurityHeaders,
  assignRequestId,
  auditApiRequests,
  detectSuspiciousTraffic,
  enforceHttps,
  sanitizeIncomingRequest,
} = require("./middleware/request-security");
const resolveCustomDomain = require("./middleware/resolve-custom-domain");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");

function buildApp() {
  const app = express();
  const staticRoot = path.resolve(__dirname, "..");
  const dashboardShellPath = path.join(staticRoot, "dashboard.html");

  const sendDashboardShell = (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(dashboardShellPath);
  };

  const redirectToDashboardSection = (req, res, section = "") => {
    const safeSection = String(section || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
    const queryStart = String(req.originalUrl || "").indexOf("?");
    const query = queryStart === -1 ? "" : String(req.originalUrl).slice(queryStart);
    const target = safeSection ? `/dashboard/${safeSection}${query}` : `/dashboard${query}`;
    res.redirect(302, target);
  };

  const sendCustomDomainInactivePage = (req, res) => {
    res.status(404).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Domain not active | MeetScheduling</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: radial-gradient(circle at top, rgba(37,99,235,.12), transparent 28%), #f4f7fb;
        color: #0f172a;
      }
      .card {
        width: min(560px, calc(100vw - 32px));
        border-radius: 28px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(255,255,255,.82);
        padding: 32px;
        box-shadow: 0 24px 80px rgba(15,23,42,.08);
        backdrop-filter: blur(18px);
      }
      h1 { margin: 0 0 12px; font-size: 32px; line-height: 1.1; }
      p { margin: 0; color: #475569; line-height: 1.7; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Custom domain not active</h1>
      <p>This domain exists in MeetScheduling, but it is not verified and active yet. Check the DNS record, wait for propagation, and run verification again from the dashboard.</p>
    </main>
  </body>
</html>`);
  };

  app.disable("x-powered-by");
  if (env.security.trustProxy) {
    app.set("trust proxy", env.security.trustProxy);
  }

  app.use(assignRequestId);
  app.use(detectSuspiciousTraffic);
  app.use(enforceHttps);
  app.use(applySecurityHeaders);
  app.use(auditApiRequests);

  app.use(resolveCustomDomain);

  // PayPal webhook verification requires exact raw body.
  app.use(
    "/api/billing/paypal/webhook",
    express.raw({ type: "application/json", limit: "2mb" }),
    billingWebhookRoutes
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));
  app.use(sanitizeIncomingRequest);

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      service: "meetscheduling-api",
      time: new Date().toISOString(),
    });
  });

  const passport = require("./passport-setup");

  app.use(passport.initialize());
  app.use("/api", apiRateLimit);
  app.use("/api/auth", authRoutes);
  app.use("/api/auth/2fa", auth2FaRoutes);

  app.use("/api/domains", protectedApiRateLimit, domainsRoutes);
  app.use("/api/event-types", protectedApiRateLimit, eventTypesRoutes);
  app.use("/api/public/domain", domainPublicRoutes);
  app.use("/api", pagePublicRoutes);
  app.use("/api/dashboard/pages", protectedApiRateLimit, landingBuilderRoutes);
  app.use("/api/availability", protectedApiRateLimit, availabilityRoutes);
  app.use("/api/public/page", landingPublicRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/dashboard", protectedApiRateLimit, dashboardRoutes);
  app.use("/api/integrations", protectedApiRateLimit, integrationsRoutes);
  app.use("/api/contacts", protectedApiRateLimit, contactsRoutes);
  app.use("/api/workflows", protectedApiRateLimit, workflowsRoutes);
  app.use("/api/routing", protectedApiRateLimit, routingRoutes);
  app.use("/api/workspace", protectedApiRateLimit, workspaceRoutes);
  app.use("/api/chat", protectedApiRateLimit, chatRoutes);
  app.use("/api/inbox", protectedApiRateLimit, inboxRoutes);
  app.use("/api/files", protectedApiRateLimit, filesRoutes);
  app.use("/api/gallery", protectedApiRateLimit, galleryRoutes);
  app.use("/api/posts", protectedApiRateLimit, postsRoutes);
  app.use("/api/invoices", protectedApiRateLimit, invoicesRoutes);
  app.use("/api/invoice-templates", protectedApiRateLimit, invoiceTemplatesRoutes);
  app.use("/api/landing-page", protectedApiRateLimit, landingPageRoutes);
  app.use("/api/uploads", protectedApiRateLimit, uploadsRoutes);
  app.use("/api/billing", protectedApiRateLimit, billingRoutes);

  app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(staticRoot, "assets", "favicon.svg"));
  });

  // Serve BIMI logo from standard well-known location.
  app.get("/.well-known/bimi.svg", (req, res) => {
    res.type("image/svg+xml");
    res.sendFile(path.join(staticRoot, ".well-known", "bimi.svg"));
  });

  app.get("/book/:slug", (req, res) => {
    res.sendFile(path.join(staticRoot, "book.html"));
  });

  app.get("/schedule/:slug", (req, res) => {
    res.sendFile(path.join(staticRoot, "book.html"));
  });

  app.get("/dashboard/page-builder", (req, res) => {
    res.redirect(302, "/dashboard/landing-page-builder/home");
  });

  app.get("/dashboard/page-builder/:pageId", (req, res) => {
    res.redirect(302, `/dashboard/landing-page-builder/${encodeURIComponent(req.params.pageId)}`);
  });

  app.get("/dashboard/landing-page", (req, res) => {
    sendDashboardShell(req, res);
  });

  app.get("/dashboard/landing-page/list", (req, res) => {
    redirectToDashboardSection(req, res, "landing-page");
  });

  app.get("/dashboard/landing-page/:pageId/editor", (req, res) => {
    res.redirect(302, `/dashboard/landing-page-builder/${encodeURIComponent(req.params.pageId)}`);
  });

  app.get("/dashboard/landing-page-builder", (req, res) => {
    sendDashboardShell(req, res);
  });

  app.get("/dashboard/landing-page-builder/:pageId", (req, res) => {
    sendDashboardShell(req, res);
  });

  app.get("/dashboard", (req, res) => {
    sendDashboardShell(req, res);
  });

  app.get("/dashboard/:page", (req, res) => {
    sendDashboardShell(req, res);
  });

  app.get("/dashboard/*", (req, res) => {
    sendDashboardShell(req, res);
  });

  app.get(
    /^\/(meetings|scheduling|availability|contacts|workflows|integrations|routing|landing-page|analytics|admin|account)(\/.*)?$/,
    (req, res) => {
      redirectToDashboardSection(req, res, req.params[0]);
    }
  );

  app.get("/dashboard.html", (req, res) => {
    redirectToDashboardSection(req, res);
  });

  app.get("/dashboard.html/*", (req, res) => {
    const firstSegment = String(req.params[0] || "").split("/")[0];
    redirectToDashboardSection(req, res, firstSegment);
  });

  app.get("/app", (req, res) => {
    redirectToDashboardSection(req, res);
  });

  app.get("/app/landing-page-builder", (req, res) => {
    res.redirect(302, "/dashboard/landing-page-builder/home");
  });

  app.get("/app/landing-page-builder/:pageId", (req, res) => {
    res.redirect(302, `/dashboard/landing-page-builder/${encodeURIComponent(req.params.pageId)}`);
  });

  app.get("/app/:page", (req, res) => {
    redirectToDashboardSection(req, res, req.params.page);
  });

  app.get("/app/*", (req, res) => {
    const firstSegment = String(req.params[0] || "").split("/")[0];
    redirectToDashboardSection(req, res, firstSegment);
  });

  app.get("/classic-dashboard", (req, res) => {
    redirectToDashboardSection(req, res);
  });

  app.get("/classic-dashboard/*", (req, res) => {
    redirectToDashboardSection(req, res);
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

  app.get("/pricing", (req, res) => {
    res.sendFile(path.join(staticRoot, "pricing.html"));
  });

  app.get("/pricing.html", (req, res) => {
    res.sendFile(path.join(staticRoot, "pricing.html"));
  });

  app.get("/privacy", (req, res) => {
    res.sendFile(path.join(staticRoot, "privacy.html"));
  });

  app.get("/privacy.html", (req, res) => {
    res.sendFile(path.join(staticRoot, "privacy.html"));
  });

  app.get("/privacy-policy", (req, res) => {
    res.redirect(302, "/privacy");
  });

  app.get("/privacy-policy.html", (req, res) => {
    res.redirect(302, "/privacy");
  });

  app.get("/terms", (req, res) => {
    res.sendFile(path.join(staticRoot, "terms.html"));
  });

  app.get("/terms.html", (req, res) => {
    res.sendFile(path.join(staticRoot, "terms.html"));
  });

  app.get("/legal", (req, res) => {
    res.redirect(302, "/terms");
  });

  app.get("/legal.html", (req, res) => {
    res.redirect(302, "/terms");
  });

  app.get("/reset-password", (req, res) => {
    res.sendFile(path.join(staticRoot, "reset-password.html"));
  });

  app.get("/reset-password.html", (req, res) => {
    res.sendFile(path.join(staticRoot, "reset-password.html"));
  });

  app.get("/", (req, res, next) => {
    if (!req.customDomain) return next();
    const accept = String(req.headers.accept || "");
    if (!accept.includes("text/html")) return next();

    const status = String(req.customDomain.status || "").trim().toLowerCase();
    if (!["active", "verified", "ssl_pending"].includes(status)) {
      return sendCustomDomainInactivePage(req, res);
    }

    const targetFile = req.customDomain.targetType === "booking_page"
      ? "booking.html"
      : "landing-page-public.html";
    return res.sendFile(path.join(staticRoot, targetFile));
  });

  app.use(
    "/assets",
    express.static(path.join(staticRoot, "assets"), {
      immutable: true,
      maxAge: "1y",
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          return;
        }
        if (/\.(js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // Keep static serving after explicit dashboard/login/pricing routes
  // so route-level redirects are not bypassed by existing root HTML files.
  app.use(express.static(staticRoot));

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
      "classic-dashboard",
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
      "reset-password",
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
