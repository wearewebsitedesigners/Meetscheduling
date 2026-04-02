const express = require("express");
const asyncHandler = require("../middleware/async-handler");
const { requireAuth } = require("../middleware/auth");
const { assertBoolean, assertOptionalString } = require("../utils/validation");
const {
  getCalendarReminderSettings,
  saveCalendarReminderSettings,
} = require("../services/calendar-reminders.service");
const { sendBookingConfirmation, isSmtpConfigured } = require("../services/email.service");
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
    const tab = assertOptionalString(req.query.tab, "tab", { max: 40 }) || "discover";
    const filter = assertOptionalString(req.query.filter, "filter", { max: 40 }) || "all";
    const search = assertOptionalString(req.query.search, "search", { max: 200 });
    const sort = assertOptionalString(req.query.sort, "sort", { max: 40 }) || "most_popular";

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

// ---------------------------------------------------------------------------
// Calendar Reminders integration
// ---------------------------------------------------------------------------

/**
 * GET /api/integrations/calendar-reminders/settings
 * Returns the current calendar reminder settings for the authenticated workspace.
 */
router.get(
  "/calendar-reminders/settings",
  asyncHandler(async (req, res) => {
    const settings = await getCalendarReminderSettings(req.auth.workspaceId);
    res.json({ settings });
  })
);

/**
 * POST /api/integrations/calendar-reminders/settings
 * Save calendar reminder settings for the authenticated workspace.
 *
 * Body: { enabled, reminderTimings, eventTitleTemplate, emailRemindersEnabled }
 */
router.post(
  "/calendar-reminders/settings",
  asyncHandler(async (req, res) => {
    const body = req.body || {};

    const enabled = assertBoolean(body.enabled ?? false, "enabled");
    const emailRemindersEnabled = assertBoolean(
      body.emailRemindersEnabled ?? false,
      "emailRemindersEnabled"
    );
    const eventTitleTemplate = assertOptionalString(
      body.eventTitleTemplate,
      "eventTitleTemplate",
      { max: 200 }
    ) || "{{eventTitle}} with {{inviteeName}}";

    // reminderTimings: array of integers (minutes), default [1440, 60, 15]
    const rawTimings = Array.isArray(body.reminderTimings)
      ? body.reminderTimings
      : [1440, 60, 15];
    const reminderTimings = rawTimings
      .map(Number)
      .filter((t) => Number.isFinite(t) && t > 0 && t <= 10080)
      .slice(0, 5);

    const settings = await saveCalendarReminderSettings(req.auth.workspaceId, {
      enabled,
      reminderTimings,
      eventTitleTemplate,
      emailRemindersEnabled,
    });

    res.json({ settings });
  })
);

/**
 * POST /api/integrations/calendar-reminders/test
 * Send a test calendar invite to the authenticated user's email.
 */
router.post(
  "/calendar-reminders/test",
  asyncHandler(async (req, res) => {
    if (!isSmtpConfigured()) {
      return res.status(400).json({
        error: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM to your environment.",
      });
    }

    const { query } = require("../db/pool");
    const userRes = await query(
      "SELECT email, display_name FROM users WHERE id = $1",
      [req.auth.userId]
    );
    const user = userRes.rows[0];
    if (!user?.email) {
      return res.status(400).json({ error: "User email not found." });
    }

    const settings = await getCalendarReminderSettings(req.auth.workspaceId);
    const now = new Date();
    const startUtc = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endUtc = new Date(now.getTime() + 90 * 60 * 1000);   // 1.5 hours from now

    const startLocal = {
      date: startUtc.toISOString().slice(0, 10),
      time: startUtc.toTimeString().slice(0, 5),
    };
    const endLocal = {
      date: endUtc.toISOString().slice(0, 10),
      time: endUtc.toTimeString().slice(0, 5),
    };

    try {
      await sendBookingConfirmation({
        toEmail: user.email,
        inviteeName: user.display_name || "You",
        hostEmail: user.email,
        hostName: user.display_name || "MeetScheduling",
        eventTitle: "Test Meeting",
        startLocal,
        endLocal,
        timezone: "UTC",
        startUtc,
        endUtc,
        locationType: "online",
        meetingLink: "",
        meetingLinkStatus: "unavailable",
        reminderTimingsMinutes: settings.reminderTimings,
        organizerEmail: user.email,
        organizerName: user.display_name || "MeetScheduling",
      });

      res.json({
        sent: true,
        message: `Test calendar invite sent to ${user.email}. Check your inbox for an .ics attachment.`,
      });
    } catch (err) {
      res.status(500).json({
        sent: false,
        error: "Failed to send test invite: " + (err?.message || "Unknown error"),
      });
    }
  })
);

module.exports = router;
