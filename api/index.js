const express = require("express");
const authRoutes = require("../src/routes/auth.routes");
const eventTypesRoutes = require("../src/routes/event-types.routes");
const availabilityRoutes = require("../src/routes/availability.routes");
const publicRoutes = require("../src/routes/public.routes");
const dashboardRoutes = require("../src/routes/dashboard.routes");
const integrationsRoutes = require("../src/routes/integrations.routes");
const contactsRoutes = require("../src/routes/contacts.routes");
const workflowsRoutes = require("../src/routes/workflows.routes");
const routingRoutes = require("../src/routes/routing.routes");
const landingPageRoutes = require("../src/routes/landing-page.routes");
const { notFoundHandler, errorHandler } = require("../src/middleware/error-handler");

const app = express();

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
  res.json({ ok: true, service: "meetscheduling-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/event-types", eventTypesRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/integrations", integrationsRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/workflows", workflowsRoutes);
app.use("/api/routing", routingRoutes);
app.use("/api/landing-page", landingPageRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
