const { query, withTransaction } = require("../db/pool");
const { badRequest } = require("../utils/http-error");
const {
  assertBoolean,
  assertEmail,
  assertJsonObject,
  assertOptionalString,
} = require("../utils/validation");
const { assertFeature, assertLimit } = require("./entitlements.service");
const { resolveWorkspaceMembership } = require("./workspace.service");
const {
  normalizeGoogleRedirectUri,
  resolveGoogleRedirectUri,
  normalizeGoogleCalendarReturnPath,
} = require("../utils/google-calendar-oauth");

const INTEGRATION_CATALOG = [
  {
    key: "zoom",
    name: "Zoom",
    category: "Video",
    description: "Include Zoom details in your MeetScheduling events.",
    iconText: "Z",
    iconBg: "#2d8cff",
    popularRank: 1,
  },
  {
    key: "salesforce",
    name: "Salesforce",
    category: "CRM",
    description:
      "Create and update records as meetings are scheduled. Route meetings via Salesforce lookup.",
    iconText: "SF",
    iconBg: "#0ea5e9",
    popularRank: 2,
  },
  {
    key: "google-meet",
    name: "Google Meet",
    category: "Video",
    description: "Include Google Meet details in your MeetScheduling events.",
    iconText: "GM",
    iconBg: "#0f9d58",
    popularRank: 3,
  },
  {
    key: "hubspot",
    name: "HubSpot",
    category: "CRM",
    description: "Sync meeting data to your CRM and enrich routing decisions.",
    iconText: "HS",
    iconBg: "#f97316",
    popularRank: 4,
  },
  {
    key: "google-calendar",
    name: "Google Calendar",
    category: "Calendar",
    description: "Add events to your calendar and prevent double-booking.",
    iconText: "31",
    iconBg: "#3b82f6",
    popularRank: 5,
  },
  {
    key: "outlook-calendar-plugin",
    name: "Outlook Calendar Plug-in",
    category: "Calendar",
    description: "Add events to your desktop calendar and prevent double-booking.",
    iconText: "OL",
    iconBg: "#2563eb",
    popularRank: 6,
  },
  {
    key: "microsoft-teams-conferencing",
    name: "Microsoft Teams Conferencing",
    category: "Video",
    description: "Include Microsoft Teams conferencing details in events.",
    iconText: "TM",
    iconBg: "#6366f1",
    popularRank: 7,
  },
  {
    key: "calendly-for-chrome",
    name: "Calendly for Chrome",
    category: "Browser",
    description: "Access and share availability on any web page.",
    iconText: "CH",
    iconBg: "#f59e0b",
    popularRank: 8,
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Collect payment before your meetings.",
    iconText: "S",
    iconBg: "#6366f1",
    popularRank: 9,
  },
  {
    key: "zapier",
    name: "Zapier",
    category: "Automation",
    description: "Create no-code automations with the tools you use.",
    iconText: "ZP",
    iconBg: "#f97316",
    popularRank: 10,
  },
  {
    key: "paypal",
    name: "PayPal",
    category: "Payments",
    description: "Collect payment before the meeting.",
    iconText: "PP",
    iconBg: "#1d4ed8",
    popularRank: 11,
  },
  {
    key: "slack",
    name: "Slack",
    category: "Messaging",
    description: "Access and share your MeetScheduling links in Slack.",
    iconText: "SL",
    iconBg: "#10b981",
    popularRank: 12,
  },
  {
    key: "api-and-webhooks",
    name: "API and webhooks",
    category: "Developer",
    description: "Build custom integrations with MeetScheduling data.",
    iconText: "API",
    iconBg: "#475569",
    popularRank: 13,
    adminOnly: true,
  },
  {
    key: "meetscheduling-iphone-app",
    name: "MeetScheduling iPhone app",
    category: "Mobile",
    description: "Access meetings and share availability on the go.",
    iconText: "iOS",
    iconBg: "#111827",
    popularRank: 14,
  },
  {
    key: "meetscheduling-android-app",
    name: "MeetScheduling Android app",
    category: "Mobile",
    description: "Access meetings and availability on the go.",
    iconText: "AND",
    iconBg: "#22c55e",
    popularRank: 15,
  },
  {
    key: "microsoft-teams-chat",
    name: "Microsoft Teams Chat",
    category: "Messaging",
    description: "Get personal notifications for your MeetScheduling events.",
    iconText: "TC",
    iconBg: "#4f46e5",
    popularRank: 16,
  },
  {
    key: "microsoft-dynamics-365",
    name: "Microsoft Dynamics 365",
    category: "CRM",
    description: "Create and update records as meetings are scheduled.",
    iconText: "D365",
    iconBg: "#4f46e5",
    popularRank: 17,
    adminOnly: true,
  },
  {
    key: "exchange-calendar",
    name: "Exchange Calendar",
    category: "Calendar",
    description: "Add events to your calendar and prevent double-booking.",
    iconText: "EX",
    iconBg: "#2563eb",
    popularRank: 18,
  },
  {
    key: "gmail-for-workflows",
    name: "Gmail for Workflows",
    category: "Email",
    description: "Send automated emails from your Gmail account.",
    iconText: "G",
    iconBg: "#ef4444",
    popularRank: 19,
  },
  {
    key: "outlook-for-workflows",
    name: "Outlook for Workflows",
    category: "Email",
    description: "Send automated emails from your Outlook account.",
    iconText: "OUT",
    iconBg: "#0ea5e9",
    popularRank: 20,
  },
  {
    key: "office-365-calendar",
    name: "Office 365 Calendar",
    category: "Calendar",
    description: "Add events to your calendar and prevent double-booking.",
    iconText: "O365",
    iconBg: "#2563eb",
    popularRank: 21,
  },
  {
    key: "apple-calendar",
    name: "Apple Calendar",
    category: "Calendar",
    description: "Sync iCloud calendar events and avoid scheduling conflicts.",
    iconText: "AC",
    iconBg: "#111827",
    popularRank: 22,
  },
  {
    key: "power-automate",
    name: "Power Automate",
    category: "Automation",
    description: "Create no-code automations with Microsoft tools.",
    iconText: "PA",
    iconBg: "#3b82f6",
    popularRank: 22,
    adminOnly: true,
  },
  {
    key: "google-analytics",
    name: "Google Analytics",
    category: "Analytics",
    description: "Track engagement and conversion on booking pages.",
    iconText: "GA",
    iconBg: "#f59e0b",
    popularRank: 23,
    adminOnly: true,
  },
  {
    key: "meta-pixel",
    name: "Meta Pixel",
    category: "Analytics",
    description: "Track booking page events with Meta Pixel.",
    iconText: "FB",
    iconBg: "#2563eb",
    popularRank: 24,
    adminOnly: true,
  },
  {
    key: "marketo",
    name: "Marketo",
    category: "CRM",
    description: "Route form responses to the right booking pages.",
    iconText: "MK",
    iconBg: "#6d28d9",
    popularRank: 25,
    adminOnly: true,
  },
  {
    key: "single-sign-on",
    name: "Single sign-on",
    category: "Security",
    description: "Provision users and enforce single sign-on.",
    iconText: "SSO",
    iconBg: "#64748b",
    popularRank: 26,
    adminOnly: true,
  },
  {
    key: "linkedin-messaging",
    name: "LinkedIn Messaging",
    category: "Messaging",
    description: "Access and share availability directly in LinkedIn.",
    iconText: "IN",
    iconBg: "#0a66c2",
    popularRank: 27,
  },
  {
    key: "gong",
    name: "Gong",
    category: "Sales",
    description: "Access and share your availability in Gong.",
    iconText: "GG",
    iconBg: "#7c3aed",
    popularRank: 28,
    adminOnly: true,
  },
  {
    key: "mailchimp",
    name: "Mailchimp",
    category: "Marketing",
    description: "Create and update contacts as meetings are scheduled.",
    iconText: "MC",
    iconBg: "#111827",
    popularRank: 29,
  },
  {
    key: "calendly-for-firefox",
    name: "Calendly for Firefox",
    category: "Browser",
    description: "Access and share availability from your browser.",
    iconText: "FF",
    iconBg: "#f97316",
    popularRank: 30,
  },
  {
    key: "calendly-for-outlook",
    name: "Calendly for Outlook",
    category: "Calendar",
    description: "Access and share availability from your Outlook inbox.",
    iconText: "CO",
    iconBg: "#2563eb",
    popularRank: 31,
  },
  {
    key: "calendly-for-intercom",
    name: "Calendly for Intercom",
    category: "Messaging",
    description: "Embed booking pages in Intercom chat.",
    iconText: "IC",
    iconBg: "#0f172a",
    popularRank: 32,
  },
  {
    key: "pardot",
    name: "Pardot",
    category: "CRM",
    description: "Qualify and route leads to the right booking pages.",
    iconText: "PD",
    iconBg: "#0ea5e9",
    popularRank: 33,
    adminOnly: true,
  },
  {
    key: "okta",
    name: "Okta",
    category: "Security",
    description: "Provision users and enforce single sign-on.",
    iconText: "OK",
    iconBg: "#1d4ed8",
    popularRank: 34,
    adminOnly: true,
  },
  {
    key: "microsoft-azure",
    name: "Microsoft Azure",
    category: "Security",
    description: "Provision users and enforce single sign-on.",
    iconText: "AZ",
    iconBg: "#0ea5e9",
    popularRank: 35,
    adminOnly: true,
  },
  {
    key: "calendly-for-edge",
    name: "Calendly for Edge",
    category: "Browser",
    description: "Access and share availability on any web page.",
    iconText: "ED",
    iconBg: "#0284c7",
    popularRank: 36,
  },
  {
    key: "webex",
    name: "Webex",
    category: "Video",
    description: "Include Webex details in your MeetScheduling events.",
    iconText: "WX",
    iconBg: "#06b6d4",
    popularRank: 37,
  },
  {
    key: "squarespace",
    name: "Squarespace",
    category: "Website",
    description: "Embed your booking page on your website.",
    iconText: "SQ",
    iconBg: "#111827",
    popularRank: 38,
  },
  {
    key: "wix",
    name: "Wix",
    category: "Website",
    description: "Embed your booking page on your website.",
    iconText: "WX",
    iconBg: "#111827",
    popularRank: 39,
  },
  {
    key: "wordpress",
    name: "WordPress",
    category: "Website",
    description: "Embed your booking page on your website.",
    iconText: "WP",
    iconBg: "#334155",
    popularRank: 40,
  },
  {
    key: "goto-meeting",
    name: "GoTo Meeting",
    category: "Video",
    description: "Include GoTo Meeting details in your events.",
    iconText: "GT",
    iconBg: "#111827",
    popularRank: 41,
  },
  {
    key: "duo",
    name: "Duo",
    category: "Security",
    description: "Enforce single sign-on for users.",
    iconText: "DU",
    iconBg: "#65a30d",
    popularRank: 42,
    adminOnly: true,
  },
  {
    key: "onelogin",
    name: "OneLogin",
    category: "Security",
    description: "Provision users and enforce single sign-on.",
    iconText: "1",
    iconBg: "#111827",
    popularRank: 43,
    adminOnly: true,
  },
  {
    key: "ping-identity",
    name: "Ping Identity",
    category: "Security",
    description: "Enforce SSO for your users' MeetScheduling accounts.",
    iconText: "PI",
    iconBg: "#b91c1c",
    popularRank: 44,
    adminOnly: true,
  },
  {
    key: "developer-api",
    name: "Developer API",
    category: "Developer",
    description: "Use API keys to automate scheduling and sync metadata.",
    iconText: "DEV",
    iconBg: "#334155",
    popularRank: 45,
    adminOnly: true,
  },
];

const ENABLED_INTEGRATION_KEYS = new Set(["google-calendar", "google-meet"]);
const CATALOG_BY_KEY = new Map(INTEGRATION_CATALOG.map((item) => [item.key, item]));
const FILTERS = new Set(["all", "connected", "available"]);
const TABS = new Set(["Discover", "Manage", "discover", "manage"]);
const CALENDAR_PROVIDER_ALIASES = new Map([
  ["google", "google-calendar"],
  ["google-calendar", "google-calendar"],
  ["googlecal", "google-calendar"],
  ["gmail", "google-calendar"],
  ["microsoft", "office-365-calendar"],
  ["office365", "office-365-calendar"],
  ["office-365", "office-365-calendar"],
  ["office-365-calendar", "office-365-calendar"],
  ["outlook", "office-365-calendar"],
  ["outlook-calendar-plugin", "office-365-calendar"],
  ["exchange", "office-365-calendar"],
  ["exchange-calendar", "office-365-calendar"],
  ["apple", "apple-calendar"],
  ["apple-calendar", "apple-calendar"],
  ["icloud", "apple-calendar"],
  ["icloud-calendar", "apple-calendar"],
]);
const CALENDAR_PROVIDER_KEYS = new Set(["google-calendar", "office-365-calendar", "apple-calendar"]);

const CALENDAR_PROVIDER_DETAILS = Object.freeze({
  "google-calendar": {
    provider: "google-calendar",
    name: "Google Calendar",
    category: "Calendar",
    iconText: "31",
    iconBg: "#3b82f6",
    description: "Add events to your calendar and prevent double-booking.",
    popularRank: 5,
  },
  "office-365-calendar": {
    provider: "office-365-calendar",
    name: "Microsoft Calendar",
    category: "Calendar",
    iconText: "MS",
    iconBg: "#2563eb",
    description: "Add events to Outlook and Office calendars and prevent double-booking.",
    popularRank: 21,
  },
  "apple-calendar": {
    provider: "apple-calendar",
    name: "Apple Calendar",
    category: "Calendar",
    iconText: "AC",
    iconBg: "#111827",
    description: "Sync iCloud calendar events and avoid scheduling conflicts.",
    popularRank: 22,
  },
});

function normalizeProviderKey(raw) {
  const value = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(value)) {
    throw badRequest("provider is invalid");
  }
  return value;
}

function tryNormalizeProviderKey(raw) {
  try {
    return normalizeProviderKey(raw);
  } catch {
    return "";
  }
}

function normalizeCalendarProviderKey(raw) {
  const normalized = normalizeProviderKey(raw);
  const mapped =
    CALENDAR_PROVIDER_ALIASES.get(normalized) ||
    CALENDAR_PROVIDER_ALIASES.get(normalized.replace(/-/g, ""));
  if (!mapped || !CALENDAR_PROVIDER_KEYS.has(mapped)) {
    throw badRequest("calendar provider is invalid");
  }
  return mapped;
}

function getCanonicalCalendarProviderKey(raw) {
  const normalized = tryNormalizeProviderKey(raw);
  if (!normalized) return "";
  return (
    CALENDAR_PROVIDER_ALIASES.get(normalized) ||
    CALENDAR_PROVIDER_ALIASES.get(normalized.replace(/-/g, "")) ||
    (CALENDAR_PROVIDER_KEYS.has(normalized) ? normalized : "")
  );
}

function normalizeStoredSelectedProvider(raw) {
  const canonical = getCanonicalCalendarProviderKey(raw);
  return canonical || null;
}

function normalizeSort(raw) {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "a-z" || value === "a_z" || value === "az") return "a_z";
  if (value === "category") return "category";
  return "most_popular";
}

function normalizeFilter(raw) {
  const value = String(raw || "all")
    .trim()
    .toLowerCase();
  return FILTERS.has(value) ? value : "all";
}

function normalizeTab(raw) {
  const value = String(raw || "discover").trim();
  if (!TABS.has(value)) return "discover";
  return value.toLowerCase();
}

function initials(text) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "APP";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function formatLastSync(value, connected) {
  if (!connected) return "Disconnected";
  if (!value) return "Just now";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  const deltaMs = Date.now() - date.getTime();
  if (deltaMs < 60_000) return "Just now";
  if (deltaMs < 3_600_000) return `${Math.max(1, Math.floor(deltaMs / 60_000))}m ago`;
  if (deltaMs < 86_400_000) return `${Math.max(1, Math.floor(deltaMs / 3_600_000))}h ago`;
  return date.toISOString().slice(0, 10);
}

function sanitizePublicMetadata(rawMetadata) {
  if (!rawMetadata || typeof rawMetadata !== "object" || Array.isArray(rawMetadata)) {
    return {};
  }

  const safe = { ...rawMetadata };
  if (safe.oauth && typeof safe.oauth === "object" && !Array.isArray(safe.oauth)) {
    const oauth = { ...safe.oauth };
    delete oauth.encryptedTokens;
    safe.oauth = oauth;
  }

  return safe;
}

function mapRowToItem(row, rank) {
  const providerKey = getCanonicalCalendarProviderKey(row.provider) || row.provider;
  const known = CATALOG_BY_KEY.get(providerKey);
  const connected = !!row.connected;
  const displayName = (row.display_name || "").trim();
  const metadata = sanitizePublicMetadata(row.metadata);
  return {
    id: row.id,
    key: providerKey,
    workspaceId: row.workspace_id || row.user_id || null,
    name: displayName || known?.name || providerKey,
    category: row.category || known?.category || "Automation",
    description:
      metadata?.description ||
      known?.description ||
      "Connect this app with your scheduling workflow.",
    connected,
    accountEmail: row.account_email || "",
    lastSync: formatLastSync(row.last_synced_at || row.updated_at, connected),
    adminOnly: typeof row.admin_only === "boolean" ? row.admin_only : !!known?.adminOnly,
    iconText: row.icon_text || known?.iconText || initials(displayName || providerKey),
    iconBg: row.icon_bg || known?.iconBg || "#1f6feb",
    popularRank: Number.isFinite(Number(metadata?.popularRank))
      ? Number(metadata.popularRank)
      : Number(known?.popularRank || rank + 1),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listUserIntegrationRows(workspaceId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        user_id,
        workspace_id,
        provider,
        account_email,
        connected,
        category,
        display_name,
        icon_text,
        icon_bg,
        admin_only,
        metadata,
        last_synced_at,
        created_at,
        updated_at
      FROM user_integrations
      WHERE workspace_id = $1
      ORDER BY updated_at DESC
    `,
    [workspaceId],
    client
  );
  return result.rows;
}

async function listUserCalendarRows(workspaceId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        user_id,
        workspace_id,
        provider,
        account_email,
        connected,
        category,
        display_name,
        icon_text,
        icon_bg,
        admin_only,
        metadata,
        last_synced_at,
        created_at,
        updated_at
      FROM user_integrations
      WHERE workspace_id = $1
      ORDER BY connected DESC, updated_at DESC
    `,
    [workspaceId],
    client
  );

  const deduped = [];
  const seen = new Set();
  for (const row of result.rows) {
    const providerKey = getCanonicalCalendarProviderKey(row.provider);
    if (!providerKey || seen.has(providerKey)) {
      continue;
    }
    deduped.push({
      ...row,
      provider: providerKey,
    });
    seen.add(providerKey);
  }

  return deduped;
}

async function getCalendarSettingsRow(workspaceId, client = null) {
  const result = await query(
    `
      SELECT
        user_id,
        workspace_id,
        selected_provider,
        include_buffers,
        auto_sync,
        created_at,
        updated_at
      FROM user_calendar_settings
      WHERE workspace_id = $1
      LIMIT 1
    `,
    [workspaceId],
    client
  );
  return result.rows[0] || null;
}

async function upsertCalendarSettings(workspaceId, input = {}, client = null) {
  const existing = await getCalendarSettingsRow(workspaceId, client);
  const selectedProvider =
    Object.prototype.hasOwnProperty.call(input, "selectedProvider")
      ? input.selectedProvider === null || input.selectedProvider === ""
        ? null
        : normalizeCalendarProviderKey(input.selectedProvider)
      : normalizeStoredSelectedProvider(existing?.selected_provider);
  const includeBuffers =
    Object.prototype.hasOwnProperty.call(input, "includeBuffers")
      ? !!input.includeBuffers
      : existing?.include_buffers || false;
  const autoSync =
    Object.prototype.hasOwnProperty.call(input, "autoSync")
      ? !!input.autoSync
      : existing?.auto_sync || false;

  // `user_calendar_settings` still has a legacy uniqueness path keyed by `user_id`.
  // Persist the workspace-scoped row under the workspace principal so reads, limits,
  // and selection stay aligned with the active workspace.
  const result = existing
    ? await query(
        `
          UPDATE user_calendar_settings
          SET
            user_id = $1,
            workspace_id = $2,
            selected_provider = $3,
            include_buffers = $4,
            auto_sync = $5,
            updated_at = NOW()
          WHERE workspace_id = $2
          RETURNING
            user_id,
            workspace_id,
            selected_provider,
            include_buffers,
            auto_sync,
            created_at,
            updated_at
      `,
        [workspaceId, workspaceId, selectedProvider, includeBuffers, autoSync],
        client
      )
    : await query(
        `
          INSERT INTO user_calendar_settings (
            user_id,
            workspace_id,
            selected_provider,
            include_buffers,
            auto_sync,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (user_id)
          DO UPDATE
          SET
            workspace_id = EXCLUDED.workspace_id,
            selected_provider = EXCLUDED.selected_provider,
            include_buffers = EXCLUDED.include_buffers,
            auto_sync = EXCLUDED.auto_sync,
            updated_at = NOW()
          RETURNING
            user_id,
            workspace_id,
            selected_provider,
            include_buffers,
            auto_sync,
            created_at,
            updated_at
      `,
        [workspaceId, workspaceId, selectedProvider, includeBuffers, autoSync],
        client
      );

  return result.rows[0];
}

function mapCalendarRecord(item) {
  return {
    id: item.key,
    providerKey: item.key,
    provider: item.name,
    accountEmail: item.accountEmail || "",
    connected: !!item.connected,
    checkCount: 1,
    lastSync: item.lastSync || "Never",
    syncStatus:
      typeof item.metadata?.syncStatus === "string" && item.metadata.syncStatus.trim()
        ? item.metadata.syncStatus
        : item.connected
          ? "connected"
          : "disconnected",
    reason:
      typeof item.metadata?.connectionReason === "string" && item.metadata.connectionReason.trim()
        ? item.metadata.connectionReason
        : "",
    hasWriteScope: !!item.metadata?.hasWriteScope,
    hasRefreshToken: !!item.metadata?.hasRefreshToken,
    hasUsableToken: !!item.metadata?.hasUsableToken,
    tokenSource:
      typeof item.metadata?.tokenSource === "string" ? item.metadata.tokenSource : "",
    tokenDecryptFailed: !!item.metadata?.tokenDecryptFailed,
  };
}

function buildMergedItems(rows) {
  const rowsByProvider = new Map(rows.map((row) => [row.provider, row]));
  const items = [];
  const enabledCatalog = INTEGRATION_CATALOG.filter((item) =>
    ENABLED_INTEGRATION_KEYS.has(item.key)
  );

  for (const catalogItem of enabledCatalog) {
    const row = rowsByProvider.get(catalogItem.key);
    if (row) {
      items.push(mapRowToItem(row, catalogItem.popularRank));
      rowsByProvider.delete(catalogItem.key);
      continue;
    }
    items.push({
      id: `catalog-${catalogItem.key}`,
      key: catalogItem.key,
      name: catalogItem.name,
      category: catalogItem.category,
      description: catalogItem.description,
      connected: false,
      accountEmail: "",
      lastSync: "Never",
      adminOnly: !!catalogItem.adminOnly,
      iconText: catalogItem.iconText,
      iconBg: catalogItem.iconBg,
      popularRank: catalogItem.popularRank,
      metadata: {},
      createdAt: null,
      updatedAt: null,
    });
  }

  if (rowsByProvider.size) {
    let offset = enabledCatalog.length + 1;
    rowsByProvider.forEach((row) => {
      if (!ENABLED_INTEGRATION_KEYS.has(row.provider)) {
        return;
      }
      items.push(mapRowToItem(row, offset));
      offset += 1;
    });
  }

  return items;
}

function deriveGoogleCalendarStatusFromRow(calendarRow, diagnostics = {}) {
  if (!calendarRow) {
    return {
      connected: false,
      rowConnected: false,
      hasWriteScope: false,
      hasRefreshToken: false,
      hasUsableAccessToken: false,
      hasUsableToken: false,
      accountEmail: "",
      reason: "missing_row",
      tokenSource: "none",
      tokenDecryptFailed: false,
    };
  }

  const tokenInspection = inspectGoogleTokensFromMetadata(calendarRow.metadata || {}, diagnostics);
  const tokens = tokenInspection.tokens;
  const rowConnected = Boolean(calendarRow.connected);
  const hasWriteScope = hasGoogleCalendarWriteScope(tokens);
  const hasRefreshToken = Boolean(tokens.refresh_token);
  const hasUsableAccessTokenValue = hasUsableAccessToken(tokens);
  const hasUsableToken = hasRefreshToken || hasUsableAccessTokenValue;
  const connected = rowConnected && hasWriteScope && hasUsableToken;
  let reason = "connected";
  if (!rowConnected) {
    reason = "disconnected";
  } else if (tokenInspection.decryptFailed) {
    reason = "token_decrypt_failed";
  } else if (!Object.keys(tokens).length) {
    reason = "missing_tokens";
  } else if (!hasWriteScope) {
    reason = "missing_scope";
  } else if (!hasUsableToken) {
    reason = hasRefreshToken ? "missing_access_token" : "missing_refresh_token";
  }

  if (diagnostics?.traceId || diagnostics?.forceLog) {
    logGoogleOAuth(
      String(diagnostics.traceId || "").trim(),
      "calendar_status_flags",
      {
        logContext: String(diagnostics.logContext || "").trim(),
        scopeId: String(diagnostics.scopeId || "").trim(),
        rowConnected,
        scope: String(tokens.scope || "").trim(),
        hasWriteScope,
        hasRefreshToken,
        hasAccessToken: Boolean(tokens.access_token),
        expiryDate:
          Number.isFinite(Number(tokens.expiry_date)) && Number(tokens.expiry_date) > 0
            ? Number(tokens.expiry_date)
            : null,
        hasUsableAccessToken: hasUsableAccessTokenValue,
        hasUsableToken,
        decryptFailed: tokenInspection.decryptFailed,
        tokenSource: tokenInspection.source,
        reason,
      },
      { force: true }
    );
  }

  return {
    connected,
    rowConnected,
    hasWriteScope,
    hasRefreshToken,
    hasUsableAccessToken: hasUsableAccessTokenValue,
    hasUsableToken,
    accountEmail: String(calendarRow.account_email || "").trim().toLowerCase(),
    reason,
    tokenSource: tokenInspection.source,
    tokenDecryptFailed: tokenInspection.decryptFailed,
  };
}

function applyGoogleConnectionState(items, rows) {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const rowsByProvider = new Map(rows.map((row) => [row.provider, row]));

  const googleCalendarRow = rowsByProvider.get(GOOGLE_PROVIDER_KEY) || null;
  const googleCalendarStatus = deriveGoogleCalendarStatusFromRow(googleCalendarRow);
  const googleCalendarItem = byKey.get(GOOGLE_PROVIDER_KEY) || null;

  if (googleCalendarItem) {
    googleCalendarItem.connected = googleCalendarStatus.connected;
    googleCalendarItem.accountEmail = googleCalendarStatus.connected
      ? googleCalendarStatus.accountEmail || googleCalendarItem.accountEmail || ""
      : "";
    googleCalendarItem.lastSync = googleCalendarStatus.connected
      ? googleCalendarItem.lastSync || "Just now"
      : googleCalendarRow
        ? "Disconnected"
        : "Never";
    googleCalendarItem.metadata = {
      ...(googleCalendarItem.metadata && typeof googleCalendarItem.metadata === "object"
        ? googleCalendarItem.metadata
        : {}),
      syncStatus: googleCalendarStatus.connected ? "connected" : "disconnected",
      connectionReason: googleCalendarStatus.reason,
      hasWriteScope: googleCalendarStatus.hasWriteScope,
      hasRefreshToken: googleCalendarStatus.hasRefreshToken,
      hasUsableToken: googleCalendarStatus.hasUsableToken,
      tokenSource: googleCalendarStatus.tokenSource,
      tokenDecryptFailed: googleCalendarStatus.tokenDecryptFailed,
    };
  }

  const googleMeetItem = byKey.get("google-meet") || null;
  if (googleMeetItem) {
    const connectedViaCalendar = googleCalendarStatus.connected;
    googleMeetItem.connected = connectedViaCalendar;
    googleMeetItem.accountEmail = connectedViaCalendar
      ? googleCalendarStatus.accountEmail || googleMeetItem.accountEmail || ""
      : "";
    googleMeetItem.lastSync = connectedViaCalendar
      ? googleCalendarItem?.lastSync || googleMeetItem.lastSync || "Just now"
      : googleCalendarRow
        ? "Disconnected"
        : "Never";
    googleMeetItem.metadata = {
      ...(googleMeetItem.metadata && typeof googleMeetItem.metadata === "object"
        ? googleMeetItem.metadata
        : {}),
      syncStatus: connectedViaCalendar ? "connected" : "pending_calendar_connection",
      connectedVia: "google-calendar",
      connectionReason: googleCalendarStatus.reason,
    };
  }

  return items;
}

function applyFilters(items, { tab, filter, search }) {
  const searchTerm = String(search || "").trim().toLowerCase();
  return items.filter((item) => {
    if (tab === "manage" && !item.connected) return false;
    if (filter === "connected" && !item.connected) return false;
    if (filter === "available" && item.connected) return false;
    if (!searchTerm) return true;
    const haystack = `${item.name} ${item.category} ${item.description}`.toLowerCase();
    return haystack.includes(searchTerm);
  });
}

function applySort(items, sort) {
  const list = [...items];
  list.sort((a, b) => {
    if (sort === "a_z") return a.name.localeCompare(b.name);
    if (sort === "category") {
      const byCategory = a.category.localeCompare(b.category);
      return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name);
    }
    if (a.connected !== b.connected) return a.connected ? -1 : 1;
    return Number(a.popularRank || 9999) - Number(b.popularRank || 9999);
  });
  return list;
}

function normalizeConnectPayload(payload) {
  const provider = normalizeProviderKey(payload.provider || payload.key || payload.name);
  if (!ENABLED_INTEGRATION_KEYS.has(provider)) {
    throw badRequest("Only Google Calendar and Google Meet are available in Integrations");
  }
  const known = CATALOG_BY_KEY.get(provider);
  const displayName = assertOptionalString(payload.displayName, "displayName", {
    max: 120,
  });
  const category = assertOptionalString(payload.category, "category", { max: 80 });
  const iconText = assertOptionalString(payload.iconText, "iconText", { max: 8 });
  const iconBg = assertOptionalString(payload.iconBg, "iconBg", { max: 32 });
  const accountEmailRaw = assertOptionalString(payload.accountEmail, "accountEmail", {
    max: 320,
  });
  const accountEmail = accountEmailRaw ? assertEmail(accountEmailRaw, "accountEmail") : "";
  const metadata =
    payload.metadata === undefined ? {} : assertJsonObject(payload.metadata, "metadata");

  return {
    provider,
    displayName: displayName || known?.name || provider,
    category: category || known?.category || "Automation",
    iconText: iconText || known?.iconText || initials(displayName || known?.name || provider),
    iconBg: iconBg || known?.iconBg || "#1f6feb",
    adminOnly: typeof known?.adminOnly === "boolean" ? known.adminOnly : false,
    accountEmail,
    metadata: {
      ...metadata,
      description:
        metadata.description || known?.description || "Connected with MeetScheduling.",
      popularRank:
        Number.isFinite(Number(metadata.popularRank))
          ? Number(metadata.popularRank)
          : Number(known?.popularRank || INTEGRATION_CATALOG.length + 1),
    },
  };
}

async function upsertIntegration(workspaceId, normalizedPayload, client = null) {
  const existing = await query(
    `
      SELECT id
      FROM user_integrations
      WHERE workspace_id = $1
        AND provider = $2
      ORDER BY updated_at DESC, created_at DESC, id DESC
      LIMIT 1
    `,
    [workspaceId, normalizedPayload.provider],
    client
  );

  // `user_integrations` still has a legacy uniqueness path keyed by `user_id`.
  // Persist the workspace-scoped row under the workspace principal so callback save,
  // status verification, and downstream booking reads resolve the same record.
  const row = existing.rows[0]
    ? await query(
        `
          UPDATE user_integrations
          SET
            user_id = $1,
            workspace_id = $2,
            account_email = $3,
            connected = TRUE,
            category = $4,
            display_name = $5,
            icon_text = $6,
            icon_bg = $7,
            admin_only = $8,
            metadata = $9::jsonb,
            last_synced_at = NOW(),
            updated_at = NOW()
          WHERE id = $10
          RETURNING
            id,
            user_id,
            workspace_id,
            provider,
            account_email,
            connected,
            category,
            display_name,
            icon_text,
            icon_bg,
            admin_only,
            metadata,
            last_synced_at,
            created_at,
            updated_at
      `,
        [
          workspaceId,
          workspaceId,
          normalizedPayload.accountEmail,
          normalizedPayload.category,
          normalizedPayload.displayName,
          normalizedPayload.iconText,
          normalizedPayload.iconBg,
          normalizedPayload.adminOnly,
          JSON.stringify(normalizedPayload.metadata || {}),
          existing.rows[0].id,
        ],
        client
      )
    : await query(
        `
          INSERT INTO user_integrations (
            user_id,
            workspace_id,
            provider,
            account_email,
            connected,
            category,
            display_name,
            icon_text,
            icon_bg,
            admin_only,
            metadata,
            last_synced_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,TRUE,$5,$6,$7,$8,$9,$10::jsonb,NOW(),NOW())
          ON CONFLICT (user_id, provider)
          DO UPDATE
          SET
            workspace_id = EXCLUDED.workspace_id,
            account_email = EXCLUDED.account_email,
            connected = TRUE,
            category = EXCLUDED.category,
            display_name = EXCLUDED.display_name,
            icon_text = EXCLUDED.icon_text,
            icon_bg = EXCLUDED.icon_bg,
            admin_only = EXCLUDED.admin_only,
            metadata = EXCLUDED.metadata,
            last_synced_at = NOW(),
            updated_at = NOW()
          RETURNING
            id,
            user_id,
            workspace_id,
            provider,
            account_email,
            connected,
            category,
            display_name,
            icon_text,
            icon_bg,
            admin_only,
            metadata,
            last_synced_at,
            created_at,
            updated_at
      `,
        [
          workspaceId,
          workspaceId,
          normalizedPayload.provider,
          normalizedPayload.accountEmail,
          normalizedPayload.category,
          normalizedPayload.displayName,
          normalizedPayload.iconText,
          normalizedPayload.iconBg,
          normalizedPayload.adminOnly,
          JSON.stringify(normalizedPayload.metadata || {}),
        ],
        client
      );
  return row.rows[0];
}

async function listIntegrationsForUser(
  workspaceId,
  { tab = "discover", filter = "all", search = "", sort = "most_popular" } = {}
) {
  const safeTab = normalizeTab(tab);
  const safeFilter = normalizeFilter(filter);
  const safeSort = normalizeSort(sort);

  const rows = await listUserIntegrationRows(workspaceId);
  const merged = applyGoogleConnectionState(buildMergedItems(rows), rows);
  const filtered = applyFilters(merged, {
    tab: safeTab,
    filter: safeFilter,
    search,
  });
  const items = applySort(filtered, safeSort);
  const connectedCount = merged.filter((item) => item.connected).length;

  return {
    tab: safeTab,
    filter: safeFilter,
    sort: safeSort,
    search: String(search || ""),
    totalCount: merged.length,
    connectedCount,
    items,
  };
}

async function connectIntegration(workspaceId, payload) {
  const normalized = normalizeConnectPayload(payload || {});
  if (normalized.provider === "google-calendar") {
    throw badRequest("Use Google OAuth to connect Google Calendar");
  }
  if (normalized.provider === "google-meet") {
    const calendarStatus = await getGoogleCalendarConnectionStatusForUser(workspaceId);
    if (!calendarStatus.connected) {
      throw badRequest("Connect Google Calendar first to enable Google Meet");
    }
    normalized.accountEmail = normalized.accountEmail || calendarStatus.accountEmail || "";
  }
  const row = await upsertIntegration(workspaceId, normalized);
  return mapRowToItem(row, normalized.metadata.popularRank || 9999);
}

async function connectAllIntegrations(workspaceId, accountEmail = "") {
  const safeEmail = accountEmail
    ? assertEmail(assertOptionalString(accountEmail, "accountEmail", { max: 320 }))
    : "";

  const result = await withTransaction(async (client) => {
    const rows = [];
    for (const item of INTEGRATION_CATALOG) {
      if (!ENABLED_INTEGRATION_KEYS.has(item.key)) {
        continue;
      }
      if (item.key === "google-calendar") {
        continue;
      }
      const row = await upsertIntegration(
        workspaceId,
        {
          provider: item.key,
          displayName: item.name,
          category: item.category,
          iconText: item.iconText,
          iconBg: item.iconBg,
          adminOnly: !!item.adminOnly,
          accountEmail: safeEmail,
          metadata: {
            description: item.description,
            popularRank: item.popularRank,
          },
        },
        client
      );
      rows.push(row);
    }
    return rows;
  });

  return result.map((row, index) => mapRowToItem(row, index + 1));
}

async function configureIntegration(workspaceId, provider, payload = {}) {
  const safeProvider = normalizeProviderKey(provider);
  const accountEmailRaw = assertOptionalString(payload.accountEmail, "accountEmail", {
    max: 320,
  });
  const accountEmail = accountEmailRaw ? assertEmail(accountEmailRaw, "accountEmail") : "";
  const metadata =
    payload.metadata === undefined ? {} : assertJsonObject(payload.metadata, "metadata");

  const result = await query(
    `
      UPDATE user_integrations
      SET
        account_email = $1,
        metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
        connected = TRUE,
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE workspace_id = $3 AND provider = $4
      RETURNING
        id,
        user_id,
        workspace_id,
        provider,
        account_email,
        connected,
        category,
        display_name,
        icon_text,
        icon_bg,
        admin_only,
        metadata,
        last_synced_at,
        created_at,
        updated_at
    `,
    [accountEmail, JSON.stringify(metadata), workspaceId, safeProvider]
  );

  if (!result.rows[0]) {
    return connectIntegration(workspaceId, {
      provider: safeProvider,
      accountEmail,
      metadata,
    });
  }

  return mapRowToItem(result.rows[0], 9999);
}

async function setIntegrationConnection(workspaceId, provider, connected) {
  const safeProvider = normalizeProviderKey(provider);
  if (!ENABLED_INTEGRATION_KEYS.has(safeProvider)) {
    throw badRequest("Only Google Calendar and Google Meet are available in Integrations");
  }
  if (safeProvider === "google-calendar" && !!connected) {
    throw badRequest("Use Google OAuth to connect Google Calendar");
  }
  if (safeProvider === "google-meet" && !!connected) {
    const calendarStatus = await getGoogleCalendarConnectionStatusForUser(workspaceId);
    if (!calendarStatus.connected) {
      throw badRequest("Connect Google Calendar first to enable Google Meet");
    }
    const details = CATALOG_BY_KEY.get("google-meet");
    const row = await upsertIntegration(workspaceId, {
      provider: "google-meet",
      displayName: details?.name || "Google Meet",
      category: details?.category || "Video",
      iconText: details?.iconText || "GM",
      iconBg: details?.iconBg || "#0f9d58",
      adminOnly: false,
      accountEmail: calendarStatus.accountEmail || "",
      metadata: {
        description: details?.description || "Include Google Meet details in your MeetScheduling events.",
        popularRank: Number(details?.popularRank || 3),
        syncStatus: "connected",
        syncSource: "calendar",
      },
    });
    return mapRowToItem(row, Number(details?.popularRank || 3));
  }
  const result = await query(
    `
      UPDATE user_integrations
      SET
        connected = $1,
        last_synced_at = CASE WHEN $1 = TRUE THEN NOW() ELSE last_synced_at END,
        updated_at = NOW()
      WHERE workspace_id = $2 AND provider = $3
      RETURNING
        id,
        user_id,
        workspace_id,
        provider,
        account_email,
        connected,
        category,
        display_name,
        icon_text,
        icon_bg,
        admin_only,
        metadata,
        last_synced_at,
        created_at,
        updated_at
    `,
    [!!connected, workspaceId, safeProvider]
  );

  if (safeProvider === "google-calendar" && !connected) {
    await query(
      `
        UPDATE user_integrations
        SET connected = FALSE, updated_at = NOW()
        WHERE workspace_id = $1 AND provider = 'google-meet'
      `,
      [workspaceId]
    );
  }

  if (!result.rows[0] && connected) {
    return connectIntegration(workspaceId, { provider: safeProvider });
  }

  if (!result.rows[0]) {
    return {
      key: safeProvider,
      connected: false,
    };
  }

  return mapRowToItem(result.rows[0], 9999);
}

async function disconnectAllIntegrations(workspaceId) {
  const result = await query(
    `
      UPDATE user_integrations
      SET connected = FALSE, updated_at = NOW()
      WHERE workspace_id = $1 AND connected = TRUE
    `,
    [workspaceId]
  );
  return { updated: result.rowCount || 0 };
}

async function removeIntegration(workspaceId, provider) {
  const safeProvider = normalizeProviderKey(provider);
  const result = await query(
    `
      DELETE FROM user_integrations
      WHERE workspace_id = $1 AND provider = $2
    `,
    [workspaceId, safeProvider]
  );
  return { deleted: result.rowCount || 0 };
}

function buildCalendarConnectPayload(providerKey, accountEmail) {
  const details = CALENDAR_PROVIDER_DETAILS[providerKey];
  if (!details) {
    throw badRequest("calendar provider is invalid");
  }

  return {
    provider: details.provider,
    displayName: details.name,
    category: details.category,
    iconText: details.iconText,
    iconBg: details.iconBg,
    adminOnly: false,
    accountEmail,
    metadata: {
      description: details.description,
      popularRank: details.popularRank,
      syncStatus: "connected",
      syncSource: "manual",
    },
  };
}

async function listCalendarConnectionsForUser(workspaceId) {
  const [rows, settings] = await Promise.all([
    listUserCalendarRows(workspaceId),
    getCalendarSettingsRow(workspaceId),
  ]);
  const googleCalendarStatus = await getGoogleCalendarConnectionStatusForUser(workspaceId, {
    forceLog: true,
    logContext: "calendars_endpoint.google",
  });

  const existingByProvider = new Map(rows.map((row) => [row.provider, mapRowToItem(row, 9999)]));
  const calendars = Object.values(CALENDAR_PROVIDER_DETAILS).map((details) => {
    const existing = existingByProvider.get(details.provider);
    if (existing) {
      const mapped = { ...existing };
      if (details.provider === GOOGLE_PROVIDER_KEY) {
        mapped.connected = googleCalendarStatus.connected;
        mapped.accountEmail = googleCalendarStatus.connected ? mapped.accountEmail : "";
        mapped.lastSync = googleCalendarStatus.connected
          ? mapped.lastSync || "Just now"
          : googleCalendarStatus.rowFound
            ? "Disconnected"
            : "Never";
        mapped.metadata = {
          ...(mapped.metadata && typeof mapped.metadata === "object" ? mapped.metadata : {}),
          syncStatus: googleCalendarStatus.connected ? "connected" : "disconnected",
          connectionReason: googleCalendarStatus.reason,
          rowConnected: googleCalendarStatus.rowConnected,
          rowFound: googleCalendarStatus.rowFound,
          hasWriteScope: googleCalendarStatus.hasWriteScope,
          hasRefreshToken: googleCalendarStatus.hasRefreshToken,
          hasUsableAccessToken: googleCalendarStatus.hasUsableAccessToken,
          hasUsableToken: googleCalendarStatus.hasUsableToken,
          tokenSource: googleCalendarStatus.tokenSource,
          tokenDecryptFailed: googleCalendarStatus.tokenDecryptFailed,
        };
      }
      return mapCalendarRecord(mapped);
    }
    return {
      id: details.provider,
      providerKey: details.provider,
      provider: details.name,
      accountEmail: "",
      connected: false,
      checkCount: 1,
      lastSync: "Never",
      syncStatus: "disconnected",
      reason: details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.reason : "",
      rowConnected: details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.rowConnected : false,
      rowFound: details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.rowFound : false,
      hasWriteScope: details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.hasWriteScope : false,
      hasRefreshToken:
        details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.hasRefreshToken : false,
      hasUsableAccessToken:
        details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.hasUsableAccessToken : false,
      hasUsableToken:
        details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.hasUsableToken : false,
      tokenSource: details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.tokenSource : "none",
      tokenDecryptFailed:
        details.provider === GOOGLE_PROVIDER_KEY ? googleCalendarStatus.tokenDecryptFailed : false,
    };
  });

  const selectedProvider =
    normalizeStoredSelectedProvider(settings?.selected_provider) ||
    calendars.find((item) => item.connected)?.providerKey ||
    null;

  return {
    calendars,
    selectedProvider,
    includeBuffers: settings?.include_buffers || false,
    autoSync: settings?.auto_sync || false,
  };
}

async function connectCalendarForUser(workspaceId, payload = {}) {
  const provider = normalizeCalendarProviderKey(payload.provider || payload.providerKey);
  if (provider === "google-calendar") {
    throw badRequest("Use Google OAuth to connect Google Calendar");
  }
  await assertFeature(workspaceId, "availability");

  const existingRows = await listUserCalendarRows(workspaceId);
  const alreadyConnected = existingRows.find(
    (item) => item.provider === provider && item.connected
  );
  if (!alreadyConnected) {
    const connectedCount = existingRows.filter((item) => item.connected).length;
    await assertLimit(workspaceId, "calendars_limit", connectedCount);
  }

  const accountEmail = assertEmail(
    assertOptionalString(payload.accountEmail, "accountEmail", { max: 320 }),
    "accountEmail"
  );

  const row = await upsertIntegration(
    workspaceId,
    buildCalendarConnectPayload(provider, accountEmail)
  );
  const mapped = mapRowToItem(row, 9999);
  const settings = await upsertCalendarSettings(workspaceId, {});

  if (!normalizeStoredSelectedProvider(settings.selected_provider)) {
    await upsertCalendarSettings(workspaceId, { selectedProvider: provider });
  }

  return mapCalendarRecord(mapped);
}

async function syncCalendarForUser(workspaceId, provider) {
  const providerKey = normalizeCalendarProviderKey(provider);

  const existingRows = await listUserCalendarRows(workspaceId);
  const existing = existingRows.find((row) => row.provider === providerKey);
  if (!existing || !existing.connected) {
    throw badRequest("Connect this calendar account first");
  }

  const upcomingCountResult = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM bookings
      WHERE workspace_id = $1
        AND status = 'confirmed'
        AND start_at_utc >= NOW()
        AND start_at_utc < NOW() + INTERVAL '30 days'
    `,
    [workspaceId]
  );
  const upcomingCount = Number(upcomingCountResult.rows[0]?.count || 0);

  const result = await query(
    `
      UPDATE user_integrations
      SET
        connected = TRUE,
        last_synced_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
        updated_at = NOW()
      WHERE workspace_id = $2 AND provider = $3
      RETURNING
        id,
        user_id,
        workspace_id,
        provider,
        account_email,
        connected,
        category,
        display_name,
        icon_text,
        icon_bg,
        admin_only,
        metadata,
        last_synced_at,
        created_at,
        updated_at
    `,
    [
      JSON.stringify({
        syncStatus: "success",
        syncSource: "manual",
        syncedBookingsCount: upcomingCount,
      }),
      workspaceId,
      providerKey,
    ]
  );

  const mapped = mapRowToItem(result.rows[0], 9999);
  return {
    calendar: mapCalendarRecord(mapped),
    syncedBookingsCount: upcomingCount,
  };
}

async function updateCalendarSettingsForUser(workspaceId, payload = {}) {
  const updates = {};
  if (Object.prototype.hasOwnProperty.call(payload, "selectedProvider")) {
    updates.selectedProvider = payload.selectedProvider;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "includeBuffers")) {
    updates.includeBuffers = assertBoolean(payload.includeBuffers, "includeBuffers");
  }
  if (Object.prototype.hasOwnProperty.call(payload, "autoSync")) {
    updates.autoSync = assertBoolean(payload.autoSync, "autoSync");
  }

  const settings = await upsertCalendarSettings(workspaceId, updates);
  return {
    selectedProvider: settings.selected_provider,
    includeBuffers: settings.include_buffers,
    autoSync: settings.auto_sync,
  };
}

async function disconnectCalendarForUser(workspaceId, provider) {
  const providerKey = normalizeCalendarProviderKey(provider);
  const integration = await setIntegrationConnection(workspaceId, providerKey, false);
  const settings = await getCalendarSettingsRow(workspaceId);
  if (normalizeStoredSelectedProvider(settings?.selected_provider) === providerKey) {
    await upsertCalendarSettings(workspaceId, { selectedProvider: null });
  }
  return {
    providerKey,
    connected: false,
    integration,
  };
}

// --- GOOGLE CALENDAR OAUTH ---
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const env = require("../config/env");
const {
  encryptTokenPayload,
  decryptTokenPayloadDetailed,
} = require("../utils/integration-token-crypto");

const GOOGLE_PROVIDER_KEY = "google-calendar";
const GOOGLE_OAUTH_STATE_PURPOSE = "google_calendar_oauth";
const GOOGLE_CALENDAR_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];
const GOOGLE_TOKEN_FIELDS = [
  "access_token",
  "refresh_token",
  "scope",
  "token_type",
  "expiry_date",
  "id_token",
];

function createGoogleOAuthTraceId() {
  return crypto.randomBytes(6).toString("hex");
}

function shouldLogGoogleOAuth(force = false) {
  return force || !!env.googleOAuthDebug || env.nodeEnv !== "production";
}

function maskLogValue(value, { prefix = 8, suffix = 4 } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length <= prefix + suffix) return `${raw.slice(0, Math.max(1, prefix))}…`;
  return `${raw.slice(0, prefix)}…${raw.slice(-suffix)}`;
}

function summarizeErrorForLog(error) {
  if (!error) return null;
  return {
    message: error.message || String(error),
    code: error.code || "",
    status: Number(error.status || 0) || undefined,
    oauthErrorCode: error.oauthErrorCode || "",
  };
}

function logGoogleOAuth(traceId, step, details = {}, { level = "info", force = false } = {}) {
  if (!shouldLogGoogleOAuth(force || level === "error" || level === "warn")) {
    return;
  }

  const payload =
    details && typeof details === "object" && !Array.isArray(details)
      ? JSON.stringify(details)
      : String(details || "");
  const prefix = `[google-calendar-oauth:${traceId || "no-trace"}] ${step}`;
  const message = payload && payload !== "{}" ? `${prefix} ${payload}` : prefix;
  const logger = typeof console[level] === "function" ? console[level] : console.log;
  logger(message);
}

function createGoogleOAuthError(message, oauthErrorCode, extra = {}) {
  const error = badRequest(message);
  error.oauthErrorCode = oauthErrorCode;
  Object.assign(error, extra);
  return error;
}

function parseGoogleApiErrorStatus(error) {
  const status = Number(
    error?.code ||
    error?.status ||
    error?.response?.status ||
    error?.response?.data?.error?.code ||
    0
  );
  return Number.isFinite(status) ? status : 0;
}

function isGoogleCalendarAuthorizationError(error) {
  const status = parseGoogleApiErrorStatus(error);
  if (status === 401 || status === 403) return true;
  const message = String(error?.message || "").toLowerCase();
  return /not connected|authorized|authorization expired|reconnect|invalid[_ ]grant|unauthenticated/.test(
    message
  );
}

function ensureGoogleOAuthConfigured() {
  if (!env.google.clientId || !env.google.clientSecret) {
    throw badRequest("Google Calendar OAuth is not configured on this server");
  }
}

function getOAuth2Client(redirectUriCandidate = "") {
  ensureGoogleOAuthConfigured();
  const redirectUri = resolveGoogleRedirectUri({ redirectUriCandidate });
  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    redirectUri
  );
}

function sanitizeGoogleTokens(tokens) {
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) return {};
  const out = {};
  GOOGLE_TOKEN_FIELDS.forEach((key) => {
    const value = tokens[key];
    if (value === undefined || value === null || value === "") return;
    if (key === "expiry_date") {
      const asNum = Number(value);
      if (Number.isFinite(asNum) && asNum > 0) out[key] = asNum;
      return;
    }
    out[key] = String(value);
  });
  return out;
}

function mergeGoogleTokens(existingTokens = {}, nextTokens = {}) {
  const safeExisting = sanitizeGoogleTokens(existingTokens);
  const safeIncoming = sanitizeGoogleTokens(nextTokens);
  const merged = {
    ...safeExisting,
    ...safeIncoming,
  };
  if (!merged.refresh_token && safeExisting.refresh_token) {
    merged.refresh_token = safeExisting.refresh_token;
  }
  return merged;
}

function stripLegacyTokenFields(metadata = {}) {
  const safe = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? { ...metadata } : {};
  GOOGLE_TOKEN_FIELDS.forEach((field) => {
    delete safe[field];
  });
  return safe;
}

function summarizeGoogleTokenStorage(metadata = {}) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      hasMetadata: false,
      hasOauthBlock: false,
      hasEncryptedTokens: false,
      storedScope: "",
      storedHasRefreshTokenFlag: false,
    };
  }

  const oauthBlock =
    metadata.oauth && typeof metadata.oauth === "object" && !Array.isArray(metadata.oauth)
      ? metadata.oauth
      : null;

  return {
    hasMetadata: true,
    hasOauthBlock: Boolean(oauthBlock),
    hasEncryptedTokens: Boolean(oauthBlock?.encryptedTokens),
    storedScope: typeof oauthBlock?.scope === "string" ? oauthBlock.scope.trim() : "",
    storedHasRefreshTokenFlag: Boolean(oauthBlock?.hasRefreshToken),
  };
}

function getTokenCryptoLogState() {
  const integrationTokenSecretConfigured = Boolean(String(env.integrationTokenSecret || "").trim());
  const jwtSecretConfigured = Boolean(String(env.jwtSecret || "").trim());
  return {
    integrationTokenSecretConfigured,
    jwtSecretConfigured,
    tokenCryptoKeySource: integrationTokenSecretConfigured ? "INTEGRATION_TOKEN_SECRET" : "missing",
    tokenCryptoFallbackEnabled: false,
  };
}

function inspectGoogleTokensFromMetadata(metadata = {}, diagnostics = {}) {
  const traceId = String(diagnostics?.traceId || "").trim();
  const scopeId = String(diagnostics?.scopeId || "").trim();
  const logContext = String(diagnostics?.logContext || "").trim();
  const shouldLogInspection = Boolean(traceId || diagnostics?.forceLog);
  const storage = summarizeGoogleTokenStorage(metadata);
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    if (shouldLogInspection) {
      logGoogleOAuth(
        traceId,
        "token_storage_inspected",
        {
          logContext,
          scopeId,
          ...storage,
          decryptReturnedNull: false,
        },
        { force: true }
      );
    }
    return {
      tokens: {},
      source: "none",
      hasEncryptedTokens: false,
      decryptFailed: false,
    };
  }

  const oauthBlock =
    metadata.oauth && typeof metadata.oauth === "object" && !Array.isArray(metadata.oauth)
      ? metadata.oauth
      : null;
  if (oauthBlock?.encryptedTokens) {
    const decryptResult = decryptTokenPayloadDetailed(oauthBlock.encryptedTokens);
    const decrypted = decryptResult.payload;
    const decryptedTokens = sanitizeGoogleTokens(decrypted || {});
    if (!decryptedTokens.scope && typeof oauthBlock.scope === "string" && oauthBlock.scope.trim()) {
      decryptedTokens.scope = oauthBlock.scope.trim();
    }
    if (shouldLogInspection) {
      logGoogleOAuth(
        traceId,
        "token_storage_inspected",
        {
          logContext,
          scopeId,
          ...storage,
          decryptReturnedNull: !decrypted,
          decryptKeySource: decryptResult.keySource || "",
          decryptAttemptedKeySources: decryptResult.attemptedKeySources || [],
          decryptFailureReason: decryptResult.failureReason || "",
          decryptedScope: String(decryptedTokens.scope || "").trim(),
          decryptedHasRefreshToken: Boolean(decryptedTokens.refresh_token),
          decryptedHasAccessToken: Boolean(decryptedTokens.access_token),
          decryptedExpiryDate:
            Number.isFinite(Number(decryptedTokens.expiry_date)) &&
            Number(decryptedTokens.expiry_date) > 0
              ? Number(decryptedTokens.expiry_date)
              : null,
          decryptedHasUsableAccessToken: hasUsableAccessToken(decryptedTokens),
          ...getTokenCryptoLogState(),
        },
        { force: true }
      );
    }
    if (decrypted) {
      const sanitized = sanitizeGoogleTokens(decrypted);
      if (!sanitized.scope && typeof oauthBlock.scope === "string" && oauthBlock.scope.trim()) {
        sanitized.scope = oauthBlock.scope.trim();
      }
      return {
        tokens: sanitized,
        source: "oauth.encryptedTokens",
        hasEncryptedTokens: true,
        decryptFailed: false,
      };
    }
    return {
      tokens: {},
      source: "oauth.encryptedTokens",
      hasEncryptedTokens: true,
      decryptFailed: true,
    };
  }

  if (shouldLogInspection) {
    logGoogleOAuth(
      traceId,
      "token_storage_inspected",
      {
        logContext,
        scopeId,
        ...storage,
        decryptReturnedNull: false,
      },
      { force: true }
    );
  }

  const legacyOauthSanitized = sanitizeGoogleTokens(oauthBlock || {});
  if (Object.keys(legacyOauthSanitized).length > 0) {
    if (
      !legacyOauthSanitized.scope &&
      typeof oauthBlock?.scope === "string" &&
      oauthBlock.scope.trim()
    ) {
      legacyOauthSanitized.scope = oauthBlock.scope.trim();
    }
    return {
      tokens: legacyOauthSanitized,
      source: "oauth.legacy",
      hasEncryptedTokens: false,
      decryptFailed: false,
    };
  }

  // Backward compatibility for previously saved plaintext token metadata.
  const sanitized = sanitizeGoogleTokens(metadata);
  if (!sanitized.scope && typeof oauthBlock?.scope === "string" && oauthBlock.scope.trim()) {
    sanitized.scope = oauthBlock.scope.trim();
  }
  return {
    tokens: sanitized,
    source: Object.keys(sanitized).length > 0 ? "metadata.legacy" : "none",
    hasEncryptedTokens: false,
    decryptFailed: false,
  };
}

function readGoogleTokensFromMetadata(metadata = {}, diagnostics = {}) {
  const traceId = String(diagnostics?.traceId || "").trim();
  const scopeId = String(diagnostics?.scopeId || "").trim();
  const logContext = String(diagnostics?.logContext || "").trim();
  const inspection = inspectGoogleTokensFromMetadata(metadata, diagnostics);
  if (traceId || diagnostics?.forceLog) {
    logGoogleOAuth(
      traceId,
      "token_read_resolved",
      {
        logContext,
        scopeId,
        source: inspection.source,
        decryptFailed: inspection.decryptFailed,
        scope: String(inspection.tokens.scope || "").trim(),
        hasRefreshToken: Boolean(inspection.tokens.refresh_token),
        hasAccessToken: Boolean(inspection.tokens.access_token),
        expiryDate:
          Number.isFinite(Number(inspection.tokens.expiry_date)) &&
          Number(inspection.tokens.expiry_date) > 0
            ? Number(inspection.tokens.expiry_date)
            : null,
        hasUsableAccessToken: hasUsableAccessToken(inspection.tokens),
      },
      { force: true }
    );
  }
  return inspection.tokens;
}

function buildGoogleOAuthMetadata(existingMetadata = {}, tokens = {}) {
  const providerDetails = CALENDAR_PROVIDER_DETAILS[GOOGLE_PROVIDER_KEY];
  const baseMetadata = stripLegacyTokenFields(existingMetadata);
  const mergedTokens = sanitizeGoogleTokens(tokens);
  const encryptedTokens = encryptTokenPayload(mergedTokens);
  const existingOauth =
    baseMetadata.oauth && typeof baseMetadata.oauth === "object" && !Array.isArray(baseMetadata.oauth)
      ? baseMetadata.oauth
      : {};

  return {
    ...baseMetadata,
    description:
      typeof baseMetadata.description === "string" && baseMetadata.description.trim()
        ? baseMetadata.description
        : providerDetails.description,
    popularRank: Number.isFinite(Number(baseMetadata.popularRank))
      ? Number(baseMetadata.popularRank)
      : providerDetails.popularRank,
    oauth: {
      ...existingOauth,
      provider: GOOGLE_PROVIDER_KEY,
      encryptedTokens,
      hasRefreshToken: Boolean(mergedTokens.refresh_token),
      scope: mergedTokens.scope || existingOauth.scope || "",
      expiryDate:
        Number.isFinite(Number(mergedTokens.expiry_date))
          ? Number(mergedTokens.expiry_date)
          : existingOauth.expiryDate || null,
      tokenUpdatedAt: new Date().toISOString(),
      version: 1,
    },
  };
}

function hasGoogleCalendarWriteScope(tokens = {}) {
  const rawScope = String(tokens.scope || "").trim();
  if (!rawScope) return false;
  const scopes = rawScope
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return (
    scopes.includes("https://www.googleapis.com/auth/calendar") ||
    scopes.includes("https://www.googleapis.com/auth/calendar.events")
  );
}

function hasUsableAccessToken(tokens = {}) {
  const accessToken = String(tokens.access_token || "").trim();
  if (!accessToken) return false;
  const expiry = Number(tokens.expiry_date || 0);
  if (!Number.isFinite(expiry) || expiry <= 0) return true;
  return expiry > Date.now() + 30_000;
}

function encodeGoogleOAuthStateWithRedirect({
  userId,
  workspaceId,
  redirectUri = "",
  returnPath = "",
  traceId = "",
}) {
  const payload = {
    purpose: GOOGLE_OAUTH_STATE_PURPOSE,
    userId: String(userId),
    workspaceId: String(workspaceId || userId),
    returnPath: normalizeGoogleCalendarReturnPath(returnPath),
    traceId: String(traceId || createGoogleOAuthTraceId()),
  };
  const safeRedirectUri = normalizeGoogleRedirectUri(redirectUri);
  if (safeRedirectUri) payload.redirectUri = safeRedirectUri;
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
}

function decodeGoogleOAuthState(stateToken) {
  try {
    const decoded = jwt.verify(String(stateToken || ""), env.jwtSecret);
    if (decoded?.purpose !== GOOGLE_OAUTH_STATE_PURPOSE || !decoded?.userId) {
      throw new Error("Invalid state payload");
    }
    return {
      userId: String(decoded.userId),
      workspaceId: String(decoded.workspaceId || decoded.userId),
      redirectUri: normalizeGoogleRedirectUri(decoded.redirectUri || ""),
      returnPath: normalizeGoogleCalendarReturnPath(decoded.returnPath || ""),
      traceId: String(decoded.traceId || ""),
    };
  } catch {
    throw createGoogleOAuthError(
      "Invalid or expired OAuth state",
      "invalid_or_expired_oauth_state"
    );
  }
}

async function ensureGoogleOAuthWorkspaceAccess(userId, workspaceId) {
  try {
    return await resolveWorkspaceMembership(userId, workspaceId);
  } catch (error) {
    throw createGoogleOAuthError(
      "OAuth state does not match an active workspace membership",
      "google_calendar_workspace_access_invalid",
      { cause: error }
    );
  }
}

function readGoogleCalendarOAuthStateContext(stateToken) {
  try {
    return decodeGoogleOAuthState(stateToken);
  } catch {
    return null;
  }
}

function classifyGoogleStatusVerificationError(status = {}) {
  const reason = String(status?.reason || "").trim().toLowerCase();
  if (reason === "missing_scope") {
    return "google_scope_missing";
  }
  if (
    reason === "missing_row" ||
    reason === "missing_tokens" ||
    reason === "missing_refresh_token" ||
    reason === "missing_access_token" ||
    reason === "token_decrypt_failed"
  ) {
    return "google_tokens_not_persisted";
  }
  return "google_status_verification_failed";
}

async function getGoogleCalendarAuthUrl(authContext, redirectUriCandidateOrOptions = "") {
  const userId = String(authContext?.userId || "");
  const workspaceId = String(authContext?.workspaceId || authContext?.userId || "");
  const options =
    redirectUriCandidateOrOptions &&
    typeof redirectUriCandidateOrOptions === "object" &&
    !Array.isArray(redirectUriCandidateOrOptions)
      ? redirectUriCandidateOrOptions
      : { redirectUriCandidate: redirectUriCandidateOrOptions };
  const traceId = createGoogleOAuthTraceId();
  const redirectUri = resolveGoogleRedirectUri({
    redirectUriCandidate: options.redirectUriCandidate,
  });
  const returnPath = normalizeGoogleCalendarReturnPath(options.returnPath || "");
  const client = getOAuth2Client(redirectUri);
  const state = encodeGoogleOAuthStateWithRedirect({
    userId,
    workspaceId,
    redirectUri,
    returnPath,
    traceId,
  });
  logGoogleOAuth(traceId, "auth_url_generated", {
    userId,
    workspaceId,
    redirectUri,
    returnPath,
    scope: GOOGLE_CALENDAR_OAUTH_SCOPES,
    accessType: "offline",
    prompt: "consent",
  });
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_CALENDAR_OAUTH_SCOPES,
    state,
  });
  return {
    authUrl,
    redirectUri,
    returnPath,
    traceId,
  };
}

async function getGoogleCalendarConnectionStatusForUser(userIdStr, diagnostics = {}) {
  const scopeId = String(userIdStr || "").trim();
  const traceId = String(diagnostics?.traceId || "").trim();
  const logContext = String(diagnostics?.logContext || "").trim();
  const existingRows = await listUserCalendarRows(scopeId);
  const googleCal = existingRows.find((row) => row.provider === GOOGLE_PROVIDER_KEY);
  const storage = summarizeGoogleTokenStorage(googleCal?.metadata || {});
  const status = deriveGoogleCalendarStatusFromRow(googleCal, {
    traceId,
    scopeId,
    logContext,
    forceLog: diagnostics?.forceLog,
  });
  const resolved = {
    connected: status.connected,
    rowConnected: status.rowConnected,
    hasRefreshToken: status.hasRefreshToken,
    hasWriteScope: status.hasWriteScope,
    hasUsableAccessToken: status.hasUsableAccessToken,
    hasUsableToken: status.hasUsableToken,
    integrationId: googleCal?.id || null,
    accountEmail: status.accountEmail || "",
    reason: status.reason,
    tokenSource: status.tokenSource,
    tokenDecryptFailed: status.tokenDecryptFailed,
    rowFound: Boolean(googleCal),
  };

  if (resolved.connected && diagnostics?.validateAccess) {
    try {
      await getAuthenticatedGoogleClient(scopeId);
      if (traceId || diagnostics?.forceLog) {
        logGoogleOAuth(
          traceId,
          "calendar_access_validated",
          {
            logContext,
            scopeId,
            connected: true,
          },
          { force: true }
        );
      }
    } catch (error) {
      const authIssue = isGoogleCalendarAuthorizationError(error);
      if (traceId || diagnostics?.forceLog) {
        logGoogleOAuth(
          traceId,
          "calendar_access_validation_failed",
          {
            logContext,
            scopeId,
            authIssue,
            status: parseGoogleApiErrorStatus(error),
            error: summarizeErrorForLog(error),
          },
          { level: authIssue ? "warn" : "error", force: true }
        );
      }
      if (authIssue) {
        resolved.connected = false;
        resolved.hasUsableAccessToken = false;
        resolved.hasUsableToken = false;
        resolved.reason = "authorization_expired";
      }
    }
  }

  if (traceId || diagnostics?.forceLog) {
    logGoogleOAuth(
      traceId,
      "calendar_status_resolved",
      {
        logContext,
        scopeId,
        rowFound: resolved.rowFound,
        integrationId: resolved.integrationId,
        connected: resolved.connected,
        rowConnected: resolved.rowConnected,
        hasWriteScope: resolved.hasWriteScope,
        hasRefreshToken: resolved.hasRefreshToken,
        hasUsableAccessToken: resolved.hasUsableAccessToken,
        hasUsableToken: resolved.hasUsableToken,
        accountEmail: resolved.accountEmail,
        reason: resolved.reason,
        tokenSource: resolved.tokenSource,
        tokenDecryptFailed: resolved.tokenDecryptFailed,
        ...storage,
        ...getTokenCryptoLogState(),
      },
      { force: true }
    );
  }
  return resolved;
}

async function getVerifiedGoogleCalendarConnectionStatus(authContext = {}) {
  const workspaceId = String(
    authContext?.workspaceId || authContext?.scopeId || authContext?.userId || ""
  );
  const userId = String(authContext?.userId || "");
  const traceId = String(authContext?.traceId || "").trim();
  const forceLog = Boolean(authContext?.forceLog);
  const logContext = String(authContext?.logContext || "verified_status").trim();
  const workspaceStatus = await getGoogleCalendarConnectionStatusForUser(workspaceId, {
    traceId,
    forceLog,
    logContext: `${logContext}.workspace`,
    validateAccess: true,
  });
  let userScopeStatus = null;

  if (userId && userId !== workspaceId) {
    userScopeStatus = await getGoogleCalendarConnectionStatusForUser(userId, {
      traceId,
      forceLog,
      logContext: `${logContext}.user`,
    });
  }

  const workspaceMismatch = Boolean(
    userScopeStatus &&
      userScopeStatus.integrationId &&
      (!workspaceStatus.integrationId || !workspaceStatus.connected)
  );

  const resolved = {
    scope: "workspace",
    workspaceId,
    userId: userId || null,
    connected: workspaceStatus.connected,
    rowFound: workspaceStatus.rowFound,
    rowConnected: workspaceStatus.rowConnected,
    hasRefreshToken: workspaceStatus.hasRefreshToken,
    hasWriteScope: workspaceStatus.hasWriteScope,
    hasUsableAccessToken: workspaceStatus.hasUsableAccessToken,
    hasUsableToken: workspaceStatus.hasUsableToken,
    integrationId: workspaceStatus.integrationId,
    accountEmail: workspaceStatus.accountEmail,
    reason: workspaceMismatch ? "workspace_mismatch" : workspaceStatus.reason,
    tokenSource: workspaceStatus.tokenSource,
    tokenDecryptFailed: workspaceStatus.tokenDecryptFailed,
    workspaceMismatch,
    userScopeStatus: userScopeStatus
      ? {
          connected: userScopeStatus.connected,
          integrationId: userScopeStatus.integrationId,
          accountEmail: userScopeStatus.accountEmail,
          reason: userScopeStatus.reason,
        }
      : null,
  };
  if (traceId || forceLog) {
    logGoogleOAuth(traceId, "verified_status_resolved", resolved, { force: true });
  }
  return resolved;
}

async function handleGoogleCalendarCallback(
  stateTokenOrPayload,
  codeArg = "",
  redirectUriCandidateArg = ""
) {
  const request =
    stateTokenOrPayload && typeof stateTokenOrPayload === "object" && !Array.isArray(stateTokenOrPayload)
      ? stateTokenOrPayload
      : {
          stateToken: stateTokenOrPayload,
          code: codeArg,
          redirectUriCandidate: redirectUriCandidateArg,
        };

  const incomingCode = String(request.code || "").trim();
  const incomingState = String(request.stateToken || "").trim();
  const preflightTraceId = createGoogleOAuthTraceId();

  logGoogleOAuth(preflightTraceId, "callback_received", {
    code: maskLogValue(incomingCode, { prefix: 10, suffix: 6 }),
    state: maskLogValue(incomingState, { prefix: 10, suffix: 6 }),
    redirectUriCandidate: normalizeGoogleRedirectUri(request.redirectUriCandidate || ""),
  });

  let statePayload;
  try {
    statePayload = decodeGoogleOAuthState(incomingState);
  } catch (error) {
    error.oauthTraceId = error.oauthTraceId || preflightTraceId;
    logGoogleOAuth(preflightTraceId, "state_validation_failed", summarizeErrorForLog(error), {
      level: "error",
      force: true,
    });
    throw error;
  }
  const traceId = statePayload.traceId || preflightTraceId;
  const userIdStr = statePayload.userId;
  const workspaceId = statePayload.workspaceId || userIdStr;
  const returnPath = normalizeGoogleCalendarReturnPath(statePayload.returnPath || "");
  const redirectUri =
    statePayload.redirectUri ||
    resolveGoogleRedirectUri({ redirectUriCandidate: request.redirectUriCandidate });

  logGoogleOAuth(traceId, "state_validated", {
    userId: userIdStr,
    workspaceId,
    redirectUri,
    returnPath,
  });

  try {
    await ensureGoogleOAuthWorkspaceAccess(userIdStr, workspaceId);
  } catch (error) {
    error.oauthTraceId = error.oauthTraceId || traceId;
    logGoogleOAuth(traceId, "workspace_membership_failed", summarizeErrorForLog(error), {
      level: "error",
      force: true,
    });
    throw error;
  }
  logGoogleOAuth(traceId, "workspace_membership_confirmed", {
    userId: userIdStr,
    workspaceId,
  });

  const client = getOAuth2Client(redirectUri);

  let tokenResponse;
  try {
    tokenResponse = await client.getToken(incomingCode);
  } catch (error) {
    logGoogleOAuth(traceId, "token_exchange_failed", summarizeErrorForLog(error), {
      level: "error",
      force: true,
    });
    throw createGoogleOAuthError(
      "Google token exchange failed",
      "google_token_exchange_failed",
      {
        oauthTraceId: traceId,
        cause: error,
      }
    );
  }

  const tokens = tokenResponse?.tokens || {};
  client.setCredentials(tokens);
  logGoogleOAuth(traceId, "token_exchange_succeeded", {
    scope: String(tokens.scope || "").trim(),
    hasRefreshToken: Boolean(tokens.refresh_token),
    tokenType: String(tokens.token_type || "").trim(),
    expiryDate:
      Number.isFinite(Number(tokens.expiry_date)) && Number(tokens.expiry_date) > 0
        ? Number(tokens.expiry_date)
        : null,
  });

  let accountEmail = "";
  try {
    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const userInfo = await oauth2.userinfo.get();
    accountEmail = String(userInfo?.data?.email || "").trim().toLowerCase();
    logGoogleOAuth(traceId, "userinfo_loaded", {
      accountEmail,
    });
  } catch (error) {
    logGoogleOAuth(traceId, "userinfo_lookup_failed", summarizeErrorForLog(error), {
      level: "warn",
      force: true,
    });
  }

  try {
    const existingRows = await listUserCalendarRows(workspaceId);
    const existingConnectedCount = existingRows.filter((item) => item.connected).length;
    const existingGoogleConnected = existingRows.find(
      (item) => item.provider === GOOGLE_PROVIDER_KEY && item.connected
    );
    if (!existingGoogleConnected) {
      await assertLimit(workspaceId, "calendars_limit", existingConnectedCount);
    }
    const existingGoogle = existingRows.find((row) => row.provider === GOOGLE_PROVIDER_KEY);
    const mergedTokens = mergeGoogleTokens(
      readGoogleTokensFromMetadata(existingGoogle?.metadata || {}, {
        traceId,
        scopeId: workspaceId,
        logContext: "oauth_callback.existing_row",
        forceLog: true,
      }),
      tokens
    );
    if (!String(mergedTokens.scope || "").trim()) {
      mergedTokens.scope = GOOGLE_CALENDAR_OAUTH_SCOPES.join(" ");
    }

    logGoogleOAuth(traceId, "tokens_prepared_for_persistence", {
      scope: String(mergedTokens.scope || "").trim(),
      hasRefreshToken: Boolean(mergedTokens.refresh_token),
      existingRowId: existingGoogle?.id || null,
      existingAccountEmail: existingGoogle?.account_email || "",
    });

    if (!hasGoogleCalendarWriteScope(mergedTokens)) {
      throw createGoogleOAuthError(
        "Google Calendar write scope missing from OAuth tokens",
        "google_scope_missing",
        {
          oauthTraceId: traceId,
          returnedScope: String(mergedTokens.scope || "").trim(),
          oauthReturnPath: returnPath,
        }
      );
    }

    const metadata = buildGoogleOAuthMetadata(existingGoogle?.metadata || {}, mergedTokens);
    const details = CALENDAR_PROVIDER_DETAILS[GOOGLE_PROVIDER_KEY];

    const savedCalendarRow = await upsertIntegration(workspaceId, {
      provider: GOOGLE_PROVIDER_KEY,
      displayName: details.name,
      category: details.category,
      iconText: details.iconText,
      iconBg: details.iconBg,
      adminOnly: false,
      accountEmail: accountEmail || existingGoogle?.account_email || "",
      metadata: {
        ...metadata,
        syncStatus: "connected",
        syncSource: "oauth",
        workspaceId,
        connectedByUserId: userIdStr,
      },
    });
    logGoogleOAuth(traceId, "calendar_row_saved", {
      integrationId: savedCalendarRow.id,
      workspaceId: savedCalendarRow.workspace_id || workspaceId,
      accountEmail: savedCalendarRow.account_email || "",
      connected: !!savedCalendarRow.connected,
      hasOauthBlock: summarizeGoogleTokenStorage(savedCalendarRow.metadata || metadata).hasOauthBlock,
      hasEncryptedTokens: summarizeGoogleTokenStorage(savedCalendarRow.metadata || metadata)
        .hasEncryptedTokens,
      storedScope: summarizeGoogleTokenStorage(savedCalendarRow.metadata || metadata).storedScope,
      storedHasRefreshTokenFlag: summarizeGoogleTokenStorage(savedCalendarRow.metadata || metadata)
        .storedHasRefreshTokenFlag,
    });

    const readbackRows = await listUserCalendarRows(workspaceId);
    const readbackGoogleRow = readbackRows.find((row) => row.provider === GOOGLE_PROVIDER_KEY) || null;
    const readbackStorage = summarizeGoogleTokenStorage(readbackGoogleRow?.metadata || {});
    const readbackTokens = readGoogleTokensFromMetadata(readbackGoogleRow?.metadata || {}, {
      traceId,
      scopeId: workspaceId,
      logContext: "oauth_callback.saved_row_readback",
      forceLog: true,
    });
    const readbackStatus = deriveGoogleCalendarStatusFromRow(readbackGoogleRow, {
      traceId,
      scopeId: workspaceId,
      logContext: "oauth_callback.saved_row_readback",
      forceLog: true,
    });
    logGoogleOAuth(
      traceId,
      "calendar_row_readback",
      {
        rowFound: Boolean(readbackGoogleRow),
        rowConnected: Boolean(readbackGoogleRow?.connected),
        connected: readbackStatus.connected,
        accountEmail: String(readbackGoogleRow?.account_email || "").trim().toLowerCase(),
        hasMetadata: readbackStorage.hasMetadata,
        hasOauthBlock: readbackStorage.hasOauthBlock,
        hasEncryptedTokens: readbackStorage.hasEncryptedTokens,
        storedScope: readbackStorage.storedScope,
        storedHasRefreshTokenFlag: readbackStorage.storedHasRefreshTokenFlag,
        decryptedScope: String(readbackTokens.scope || "").trim(),
        decryptedHasRefreshToken: Boolean(readbackTokens.refresh_token),
        decryptedHasAccessToken: Boolean(readbackTokens.access_token),
        decryptedExpiryDate:
          Number.isFinite(Number(readbackTokens.expiry_date)) &&
          Number(readbackTokens.expiry_date) > 0
            ? Number(readbackTokens.expiry_date)
            : null,
        decryptedHasUsableAccessToken: hasUsableAccessToken(readbackTokens),
        hasWriteScope: readbackStatus.hasWriteScope,
        hasRefreshToken: readbackStatus.hasRefreshToken,
        hasUsableAccessToken: readbackStatus.hasUsableAccessToken,
        hasUsableToken: readbackStatus.hasUsableToken,
        tokenDecryptFailed: readbackStatus.tokenDecryptFailed,
        reason: readbackStatus.reason,
      },
      { force: true }
    );

    if (!readbackStatus.connected) {
      throw createGoogleOAuthError(
        "Google Calendar row saved but immediate readback failed",
        classifyGoogleStatusVerificationError(readbackStatus),
        {
          oauthTraceId: traceId,
          oauthReturnPath: returnPath,
          status: {
            ...readbackStatus,
            rowFound: Boolean(readbackGoogleRow),
          },
        }
      );
    }

    const meetDetails = CATALOG_BY_KEY.get("google-meet");
    if (meetDetails) {
      const savedMeetRow = await upsertIntegration(workspaceId, {
        provider: "google-meet",
        displayName: meetDetails.name,
        category: meetDetails.category,
        iconText: meetDetails.iconText,
        iconBg: meetDetails.iconBg,
        adminOnly: false,
        accountEmail: accountEmail || existingGoogle?.account_email || "",
        metadata: {
          description: meetDetails.description,
          popularRank: meetDetails.popularRank,
          syncStatus: "connected",
          syncSource: "google-calendar-oauth",
          workspaceId,
          connectedByUserId: userIdStr,
        },
      });
      logGoogleOAuth(traceId, "meet_row_saved", {
        integrationId: savedMeetRow.id,
        workspaceId: savedMeetRow.workspace_id || workspaceId,
        connected: !!savedMeetRow.connected,
      });
    }

    const settings = await upsertCalendarSettings(workspaceId, {});
    let finalSettings = settings;
    if (!normalizeStoredSelectedProvider(settings.selected_provider)) {
      finalSettings = await upsertCalendarSettings(workspaceId, {
        selectedProvider: GOOGLE_PROVIDER_KEY,
      });
    }
    logGoogleOAuth(traceId, "calendar_settings_saved", {
      workspaceId,
      selectedProvider: finalSettings.selected_provider || "",
      includeBuffers: !!finalSettings.include_buffers,
      autoSync: !!finalSettings.auto_sync,
    });

    const finalStatus = await getVerifiedGoogleCalendarConnectionStatus({
      workspaceId,
      userId: userIdStr,
      traceId,
      forceLog: true,
      logContext: "oauth_callback.post_save",
    });
    logGoogleOAuth(traceId, "post_save_status_check", finalStatus, {
      force: true,
    });

    if (!finalStatus.connected) {
      throw createGoogleOAuthError(
        "Google Calendar saved but verification failed",
        classifyGoogleStatusVerificationError(finalStatus),
        {
          oauthTraceId: traceId,
          oauthReturnPath: returnPath,
          status: finalStatus,
        }
      );
    }

    return {
      traceId,
      workspaceId,
      userId: userIdStr,
      returnPath,
      accountEmail: finalStatus.accountEmail || accountEmail,
      connected: finalStatus.connected,
    };
  } catch (error) {
    error.oauthTraceId = error.oauthTraceId || traceId;
    error.oauthReturnPath = error.oauthReturnPath || returnPath;
    logGoogleOAuth(traceId, "callback_processing_failed", summarizeErrorForLog(error), {
      level: "error",
      force: true,
    });
    if (error.oauthErrorCode) {
      throw error;
    }
    throw createGoogleOAuthError(
      "Google Calendar connection failed during persistence",
      "google_calendar_connect_failed",
      {
        oauthTraceId: traceId,
        cause: error,
      }
    );
  }
}

async function getAuthenticatedGoogleClient(userIdStr) {
  const existingRows = await listUserCalendarRows(userIdStr);
  const googleCal = existingRows.find((row) => row.provider === GOOGLE_PROVIDER_KEY);
  let metadata = googleCal?.metadata || {};
  let tokens = readGoogleTokensFromMetadata(metadata);

  if (!googleCal || !googleCal.connected) {
    throw badRequest("Host has not connected or authorized Google Calendar");
  }
  if (!hasGoogleCalendarWriteScope(tokens)) {
    throw badRequest("Google Calendar permissions are missing. Reconnect in Integrations.");
  }
  if (!tokens.refresh_token && !hasUsableAccessToken(tokens)) {
    throw badRequest("Host has not connected or authorized Google Calendar");
  }

  // Pass the configured redirect URI explicitly so token refreshes use the
  // same URI that was registered with Google during the initial OAuth flow.
  const client = getOAuth2Client(env.google.redirectUri || "");
  client.setCredentials(tokens);

  client.on("tokens", async (nextTokens) => {
    if (!nextTokens || typeof nextTokens !== "object") return;
    try {
      tokens = mergeGoogleTokens(tokens, nextTokens);
      metadata = buildGoogleOAuthMetadata(metadata, tokens);
      await query(
        `
          UPDATE user_integrations
          SET metadata = $1::jsonb, updated_at = NOW()
          WHERE id = $2
        `,
        [JSON.stringify(metadata), googleCal.id]
      );
    } catch (error) {
      console.error("Failed to persist refreshed Google OAuth tokens:", error?.message || error);
    }
  });

  try {
    await client.getAccessToken();
  } catch (error) {
    throw badRequest("Google Calendar authorization expired. Reconnect in Integrations.");
  }

  return google.calendar({ version: "v3", auth: client });
}


module.exports = {
  INTEGRATION_CATALOG,
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
  getGoogleCalendarConnectionStatusForUser,
  getVerifiedGoogleCalendarConnectionStatus,
  getGoogleCalendarAuthUrl,
  handleGoogleCalendarCallback,
  readGoogleCalendarOAuthStateContext,
  getAuthenticatedGoogleClient,
};
