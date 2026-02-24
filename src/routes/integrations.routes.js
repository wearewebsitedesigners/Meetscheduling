const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertBoolean, assertOptionalString } = require("../utils/validation");
const {
  listIntegrationsForUser,
  connectIntegration,
  connectAllIntegrations,
  configureIntegration,
  setIntegrationConnection,
  disconnectAllIntegrations,
  removeIntegration,
  listCalendarConnectionsForUser,
  connectCalendarForUser,
  syncCalendarForUser,
  updateCalendarSettingsForUser,
  disconnectCalendarForUser,
  getGoogleCalendarAuthUrl,
  handleGoogleCalendarCallback,
} = require("../services/integrations.service");

const router = express.Router();

// --- PUBLIC ROUTES (No requireAuth) ---

// OAuth Callback from Google Calendar
router.get(
  "/google-calendar/callback",
  asyncHandler(async (req, res) => {
    const code = req.query.code;
    const state = req.query.state; // We encode userId in state

    if (!code || !state) {
      return res.redirect("/dashboard.html?tab=integrations&error=missing_oauth_params");
    }

    try {
      await handleGoogleCalendarCallback(state, code);
      res.redirect("/dashboard.html?tab=integrations&success=google_calendar_connected");
    } catch (err) {
      console.error("Google Calendar OAuth error:", err);
      res.redirect(`/dashboard.html?tab=integrations&error=${encodeURIComponent(err.message)}`);
    }
  })
);


// --- PROTECTED ROUTES ---
router.use(requireAuth);

// Get OAuth URL to redirect to Google
router.get(
  "/google-calendar/auth-url",
  asyncHandler(async (req, res) => {
    const url = await getGoogleCalendarAuthUrl(req.auth.userId);
    res.json({ url });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tab = req.query.tab || "discover";
    const filter = req.query.filter || "all";
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const sort = req.query.sort || "most_popular";

    const payload = await listIntegrationsForUser(req.auth.userId, {
      tab,
      filter,
      search,
      sort,
    });
    res.json(payload);
  })
);

router.post(
  "/connect",
  asyncHandler(async (req, res) => {
    const integration = await connectIntegration(req.auth.userId, req.body || {});
    res.status(201).json({ integration });
  })
);

router.post(
  "/connect-all",
  asyncHandler(async (req, res) => {
    const accountEmail = assertOptionalString(req.body?.accountEmail, "accountEmail", {
      max: 320,
    });
    const integrations = await connectAllIntegrations(req.auth.userId, accountEmail);
    res.json({
      integrations,
      count: integrations.length,
    });
  })
);

router.post(
  "/disconnect-all",
  asyncHandler(async (req, res) => {
    const result = await disconnectAllIntegrations(req.auth.userId);
    res.json(result);
  })
);

router.get(
  "/calendars",
  asyncHandler(async (req, res) => {
    const payload = await listCalendarConnectionsForUser(req.auth.userId);
    res.json(payload);
  })
);

router.post(
  "/calendars/connect",
  asyncHandler(async (req, res) => {
    const provider = assertOptionalString(req.body?.provider, "provider", { max: 80 });
    const accountEmail = assertOptionalString(req.body?.accountEmail, "accountEmail", {
      max: 320,
    });
    const calendar = await connectCalendarForUser(req.auth.userId, {
      provider,
      accountEmail,
    });
    res.status(201).json({ calendar });
  })
);

router.post(
  "/calendars/:provider/sync",
  asyncHandler(async (req, res) => {
    const sync = await syncCalendarForUser(req.auth.userId, req.params.provider);
    res.json(sync);
  })
);

router.post(
  "/calendars/:provider/disconnect",
  asyncHandler(async (req, res) => {
    const result = await disconnectCalendarForUser(req.auth.userId, req.params.provider);
    res.json(result);
  })
);

router.patch(
  "/calendars/settings",
  asyncHandler(async (req, res) => {
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "selectedProvider")) {
      const selectedProvider = req.body.selectedProvider;
      if (selectedProvider === null || selectedProvider === "") {
        updates.selectedProvider = null;
      } else {
        updates.selectedProvider = assertOptionalString(selectedProvider, "selectedProvider", {
          max: 80,
        });
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "includeBuffers")) {
      updates.includeBuffers = assertBoolean(req.body.includeBuffers, "includeBuffers");
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "autoSync")) {
      updates.autoSync = assertBoolean(req.body.autoSync, "autoSync");
    }

    const settings = await updateCalendarSettingsForUser(req.auth.userId, updates);
    res.json({ settings });
  })
);

router.patch(
  "/:provider/configure",
  asyncHandler(async (req, res) => {
    const integration = await configureIntegration(
      req.auth.userId,
      req.params.provider,
      req.body || {}
    );
    res.json({ integration });
  })
);

router.patch(
  "/:provider/connection",
  asyncHandler(async (req, res) => {
    const connected = assertBoolean(req.body?.connected, "connected");
    const integration = await setIntegrationConnection(
      req.auth.userId,
      req.params.provider,
      connected
    );
    res.json({ integration });
  })
);

router.post(
  "/:provider/connect",
  asyncHandler(async (req, res) => {
    const integration = await setIntegrationConnection(
      req.auth.userId,
      req.params.provider,
      true
    );
    res.json({ integration });
  })
);

router.post(
  "/:provider/disconnect",
  asyncHandler(async (req, res) => {
    const integration = await setIntegrationConnection(
      req.auth.userId,
      req.params.provider,
      false
    );
    res.json({ integration });
  })
);

router.delete(
  "/:provider",
  asyncHandler(async (req, res) => {
    const result = await removeIntegration(req.auth.userId, req.params.provider);
    res.json(result);
  })
);

module.exports = router;
