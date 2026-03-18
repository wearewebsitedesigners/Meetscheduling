const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertBoolean, assertOptionalString } = require("../utils/validation");
const {
  resolveGoogleRedirectUri,
  resolveGoogleCalendarReturnPath,
  buildGoogleCalendarAppRedirect,
} = require("../utils/google-calendar-oauth");
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
  getVerifiedGoogleCalendarConnectionStatus,
  getGoogleCalendarAuthUrl,
  handleGoogleCalendarCallback,
  readGoogleCalendarOAuthStateContext,
} = require("../services/integrations.service");

const router = express.Router();

function buildCallbackUrl(req) {
  return resolveGoogleRedirectUri({ req });
}

// --- PUBLIC ROUTES (No requireAuth) ---

// OAuth Callback from Google Calendar
router.get(
  "/google-calendar/callback",
  asyncHandler(async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    const stateContext = readGoogleCalendarOAuthStateContext(state);
    const oauthError = assertOptionalString(req.query.error, "error", { max: 120 });
    const oauthErrorDescription = assertOptionalString(
      req.query.error_description,
      "error_description",
      { max: 500 }
    );

    if (oauthError) {
      console.error("Google Calendar OAuth callback returned an error:", {
        error: oauthError,
        errorDescription: oauthErrorDescription || "",
        stateDecoded: stateContext,
        redirectUri: buildCallbackUrl(req),
      });
      return res.redirect(
        buildGoogleCalendarAppRedirect(req, stateContext?.returnPath, {
          error: "google_oauth_denied",
          trace: stateContext?.traceId || "",
        })
      );
    }

    if (!code || !state) {
      console.error("Google Calendar OAuth callback is missing code/state", {
        hasCode: Boolean(code),
        hasState: Boolean(state),
        redirectUri: buildCallbackUrl(req),
      });
      return res.redirect(
        buildGoogleCalendarAppRedirect(req, stateContext?.returnPath, {
          error: "missing_oauth_params",
          trace: stateContext?.traceId || "",
        })
      );
    }

    try {
      const result = await handleGoogleCalendarCallback({
        stateToken: state,
        code,
        redirectUriCandidate: buildCallbackUrl(req),
      });
      res.redirect(
        buildGoogleCalendarAppRedirect(req, result.returnPath, {
          success: "google_calendar_connected",
          trace: result.traceId || "",
        })
      );
    } catch (err) {
      console.error("Google Calendar OAuth error:", err);
      const errorCode =
        String(err?.oauthErrorCode || "").trim() || "google_calendar_connect_failed";
      res.redirect(
        buildGoogleCalendarAppRedirect(req, err?.oauthReturnPath || stateContext?.returnPath, {
          error: errorCode,
          trace: String(err?.oauthTraceId || "").trim(),
        })
      );
    }
  })
);


// --- PROTECTED ROUTES ---
router.use(requireAuth);

// Get OAuth URL to redirect to Google
router.get(
  "/google-calendar/auth-url",
  asyncHandler(async (req, res) => {
    const requestedReturnPath = assertOptionalString(req.query.returnPath, "returnPath", {
      max: 500,
    });
    const returnPath = resolveGoogleCalendarReturnPath({
      returnPath: requestedReturnPath,
      req,
    });
    const { authUrl, redirectUri, returnPath: normalizedReturnPath, traceId } =
      await getGoogleCalendarAuthUrl(
        {
          userId: req.auth.userId,
          workspaceId: req.auth.workspaceId,
        },
        {
          redirectUriCandidate: buildCallbackUrl(req),
          returnPath,
        }
      );
    res.json({ url: authUrl, redirectUri, returnPath: normalizedReturnPath, traceId });
  })
);

router.get(
  "/google-calendar/status",
  asyncHandler(async (req, res) => {
    const status = await getVerifiedGoogleCalendarConnectionStatus({
      userId: req.auth.userId,
      workspaceId: req.auth.workspaceId,
      forceLog: true,
      logContext: "status_endpoint",
    });
    res.json({ status });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const tab = req.query.tab || "discover";
    const filter = req.query.filter || "all";
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const sort = req.query.sort || "most_popular";

    const payload = await listIntegrationsForUser(req.auth.workspaceId, {
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
    const integration = await connectIntegration(req.auth.workspaceId, req.body || {});
    res.status(201).json({ integration });
  })
);

router.post(
  "/connect-all",
  asyncHandler(async (req, res) => {
    const accountEmail = assertOptionalString(req.body?.accountEmail, "accountEmail", {
      max: 320,
    });
    const integrations = await connectAllIntegrations(req.auth.workspaceId, accountEmail);
    res.json({
      integrations,
      count: integrations.length,
    });
  })
);

router.post(
  "/disconnect-all",
  asyncHandler(async (req, res) => {
    const result = await disconnectAllIntegrations(req.auth.workspaceId);
    res.json(result);
  })
);

router.get(
  "/calendars",
  asyncHandler(async (req, res) => {
    const payload = await listCalendarConnectionsForUser(req.auth.workspaceId);
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
    const calendar = await connectCalendarForUser(req.auth.workspaceId, {
      provider,
      accountEmail,
    });
    res.status(201).json({ calendar });
  })
);

router.post(
  "/calendars/:provider/sync",
  asyncHandler(async (req, res) => {
    const sync = await syncCalendarForUser(req.auth.workspaceId, req.params.provider);
    res.json(sync);
  })
);

router.post(
  "/calendars/:provider/disconnect",
  asyncHandler(async (req, res) => {
    const result = await disconnectCalendarForUser(req.auth.workspaceId, req.params.provider);
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

    const settings = await updateCalendarSettingsForUser(req.auth.workspaceId, updates);
    res.json({ settings });
  })
);

router.patch(
  "/:provider/configure",
  asyncHandler(async (req, res) => {
    const integration = await configureIntegration(
      req.auth.workspaceId,
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
      req.auth.workspaceId,
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
      req.auth.workspaceId,
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
      req.auth.workspaceId,
      req.params.provider,
      false
    );
    res.json({ integration });
  })
);

router.delete(
  "/:provider",
  asyncHandler(async (req, res) => {
    const result = await removeIntegration(req.auth.workspaceId, req.params.provider);
    res.json(result);
  })
);

module.exports = router;
