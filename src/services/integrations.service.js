const { query, withTransaction } = require("../db/pool");
const { badRequest } = require("../utils/http-error");
const { assertEmail, assertOptionalString } = require("../utils/validation");

const INTEGRATION_CATALOG = [
  {
    key: "zoom",
    name: "Zoom",
    category: "Video",
    description: "Include Zoom details in your Meetscheduling events.",
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
    description: "Include Google Meet details in your Meetscheduling events.",
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
    description: "Access and share your Meetscheduling links in Slack.",
    iconText: "SL",
    iconBg: "#10b981",
    popularRank: 12,
  },
  {
    key: "api-and-webhooks",
    name: "API and webhooks",
    category: "Developer",
    description: "Build custom integrations with Meetscheduling data.",
    iconText: "API",
    iconBg: "#475569",
    popularRank: 13,
    adminOnly: true,
  },
  {
    key: "meetscheduling-iphone-app",
    name: "Meetscheduling iPhone app",
    category: "Mobile",
    description: "Access meetings and share availability on the go.",
    iconText: "iOS",
    iconBg: "#111827",
    popularRank: 14,
  },
  {
    key: "meetscheduling-android-app",
    name: "Meetscheduling Android app",
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
    description: "Get personal notifications for your Meetscheduling events.",
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
    description: "Include Webex details in your Meetscheduling events.",
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
    description: "Enforce SSO for your users' Meetscheduling accounts.",
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
  const known = CATALOG_BY_KEY.get(row.provider);
  const connected = !!row.connected;
  const displayName = (row.display_name || "").trim();
  const metadata = sanitizePublicMetadata(row.metadata);
  return {
    id: row.id,
    key: row.provider,
    name: displayName || known?.name || row.provider,
    category: row.category || known?.category || "Automation",
    description:
      metadata?.description ||
      known?.description ||
      "Connect this app with your scheduling workflow.",
    connected,
    accountEmail: row.account_email || "",
    lastSync: formatLastSync(row.last_synced_at || row.updated_at, connected),
    adminOnly: typeof row.admin_only === "boolean" ? row.admin_only : !!known?.adminOnly,
    iconText: row.icon_text || known?.iconText || initials(displayName || row.provider),
    iconBg: row.icon_bg || known?.iconBg || "#1f6feb",
    popularRank: Number.isFinite(Number(metadata?.popularRank))
      ? Number(metadata.popularRank)
      : Number(known?.popularRank || rank + 1),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listUserIntegrationRows(userId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        user_id,
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
      WHERE user_id = $1
      ORDER BY updated_at DESC
    `,
    [userId],
    client
  );
  return result.rows;
}

async function listUserCalendarRows(userId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        user_id,
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
      WHERE user_id = $1
        AND provider = ANY($2::text[])
      ORDER BY updated_at DESC
    `,
    [userId, Array.from(CALENDAR_PROVIDER_KEYS)],
    client
  );
  return result.rows;
}

async function getCalendarSettingsRow(userId, client = null) {
  const result = await query(
    `
      SELECT
        user_id,
        selected_provider,
        include_buffers,
        auto_sync,
        created_at,
        updated_at
      FROM user_calendar_settings
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
    client
  );
  return result.rows[0] || null;
}

async function upsertCalendarSettings(userId, input = {}, client = null) {
  const existing = await getCalendarSettingsRow(userId, client);
  const selectedProvider =
    Object.prototype.hasOwnProperty.call(input, "selectedProvider")
      ? input.selectedProvider === null || input.selectedProvider === ""
        ? null
        : normalizeCalendarProviderKey(input.selectedProvider)
      : existing?.selected_provider || null;
  const includeBuffers =
    Object.prototype.hasOwnProperty.call(input, "includeBuffers")
      ? !!input.includeBuffers
      : existing?.include_buffers || false;
  const autoSync =
    Object.prototype.hasOwnProperty.call(input, "autoSync")
      ? !!input.autoSync
      : existing?.auto_sync || false;

  const result = await query(
    `
      INSERT INTO user_calendar_settings (
        user_id,
        selected_provider,
        include_buffers,
        auto_sync,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE
      SET
        selected_provider = EXCLUDED.selected_provider,
        include_buffers = EXCLUDED.include_buffers,
        auto_sync = EXCLUDED.auto_sync,
        updated_at = NOW()
      RETURNING
        user_id,
        selected_provider,
        include_buffers,
        auto_sync,
        created_at,
        updated_at
    `,
    [userId, selectedProvider, includeBuffers, autoSync],
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
    payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? payload.metadata
      : {};

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
        metadata.description || known?.description || "Connected with Meetscheduling.",
      popularRank:
        Number.isFinite(Number(metadata.popularRank))
          ? Number(metadata.popularRank)
          : Number(known?.popularRank || INTEGRATION_CATALOG.length + 1),
    },
  };
}

async function upsertIntegration(userId, normalizedPayload, client = null) {
  const row = await query(
    `
      INSERT INTO user_integrations (
        user_id,
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
      VALUES ($1,$2,$3,TRUE,$4,$5,$6,$7,$8,$9::jsonb,NOW(),NOW())
      ON CONFLICT (user_id, provider)
      DO UPDATE
      SET
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
      userId,
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
  userId,
  { tab = "discover", filter = "all", search = "", sort = "most_popular" } = {}
) {
  const safeTab = normalizeTab(tab);
  const safeFilter = normalizeFilter(filter);
  const safeSort = normalizeSort(sort);

  const rows = await listUserIntegrationRows(userId);
  const merged = buildMergedItems(rows);
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

async function connectIntegration(userId, payload) {
  const normalized = normalizeConnectPayload(payload || {});
  if (normalized.provider === "google-calendar") {
    throw badRequest("Use Google OAuth to connect Google Calendar");
  }
  const row = await upsertIntegration(userId, normalized);
  return mapRowToItem(row, normalized.metadata.popularRank || 9999);
}

async function connectAllIntegrations(userId, accountEmail = "") {
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
        userId,
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

async function configureIntegration(userId, provider, payload = {}) {
  const safeProvider = normalizeProviderKey(provider);
  const accountEmailRaw = assertOptionalString(payload.accountEmail, "accountEmail", {
    max: 320,
  });
  const accountEmail = accountEmailRaw ? assertEmail(accountEmailRaw, "accountEmail") : "";
  const metadata =
    payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
      ? payload.metadata
      : {};

  const result = await query(
    `
      UPDATE user_integrations
      SET
        account_email = $1,
        metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
        connected = TRUE,
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $3 AND provider = $4
      RETURNING
        id,
        user_id,
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
    [accountEmail, JSON.stringify(metadata), userId, safeProvider]
  );

  if (!result.rows[0]) {
    return connectIntegration(userId, {
      provider: safeProvider,
      accountEmail,
      metadata,
    });
  }

  return mapRowToItem(result.rows[0], 9999);
}

async function setIntegrationConnection(userId, provider, connected) {
  const safeProvider = normalizeProviderKey(provider);
  if (!ENABLED_INTEGRATION_KEYS.has(safeProvider)) {
    throw badRequest("Only Google Calendar and Google Meet are available in Integrations");
  }
  if (safeProvider === "google-calendar" && !!connected) {
    throw badRequest("Use Google OAuth to connect Google Calendar");
  }
  const result = await query(
    `
      UPDATE user_integrations
      SET
        connected = $1,
        last_synced_at = CASE WHEN $1 = TRUE THEN NOW() ELSE last_synced_at END,
        updated_at = NOW()
      WHERE user_id = $2 AND provider = $3
      RETURNING
        id,
        user_id,
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
    [!!connected, userId, safeProvider]
  );

  if (!result.rows[0] && connected) {
    return connectIntegration(userId, { provider: safeProvider });
  }

  if (!result.rows[0]) {
    return {
      key: safeProvider,
      connected: false,
    };
  }

  return mapRowToItem(result.rows[0], 9999);
}

async function disconnectAllIntegrations(userId) {
  const result = await query(
    `
      UPDATE user_integrations
      SET connected = FALSE, updated_at = NOW()
      WHERE user_id = $1 AND connected = TRUE
    `,
    [userId]
  );
  return { updated: result.rowCount || 0 };
}

async function removeIntegration(userId, provider) {
  const safeProvider = normalizeProviderKey(provider);
  const result = await query(
    `
      DELETE FROM user_integrations
      WHERE user_id = $1 AND provider = $2
    `,
    [userId, safeProvider]
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

async function listCalendarConnectionsForUser(userId) {
  const [rows, settings] = await Promise.all([
    listUserCalendarRows(userId),
    getCalendarSettingsRow(userId),
  ]);

  const existingByProvider = new Map(rows.map((row) => [row.provider, mapRowToItem(row, 9999)]));
  const calendars = Object.values(CALENDAR_PROVIDER_DETAILS).map((details) => {
    const existing = existingByProvider.get(details.provider);
    if (existing) return mapCalendarRecord(existing);
    return {
      id: details.provider,
      providerKey: details.provider,
      provider: details.name,
      accountEmail: "",
      connected: false,
      checkCount: 1,
      lastSync: "Never",
      syncStatus: "disconnected",
    };
  });

  const selectedProvider =
    settings?.selected_provider && CALENDAR_PROVIDER_KEYS.has(settings.selected_provider)
      ? settings.selected_provider
      : calendars.find((item) => item.connected)?.providerKey || null;

  return {
    calendars,
    selectedProvider,
    includeBuffers: settings?.include_buffers || false,
    autoSync: settings?.auto_sync || false,
  };
}

async function connectCalendarForUser(userId, payload = {}) {
  const provider = normalizeCalendarProviderKey(payload.provider || payload.providerKey);
  if (provider === "google-calendar") {
    throw badRequest("Use Google OAuth to connect Google Calendar");
  }
  const accountEmail = assertEmail(
    assertOptionalString(payload.accountEmail, "accountEmail", { max: 320 }),
    "accountEmail"
  );

  const row = await upsertIntegration(userId, buildCalendarConnectPayload(provider, accountEmail));
  const mapped = mapRowToItem(row, 9999);
  const settings = await upsertCalendarSettings(userId, {});

  if (!settings.selected_provider || !CALENDAR_PROVIDER_KEYS.has(settings.selected_provider)) {
    await upsertCalendarSettings(userId, { selectedProvider: provider });
  }

  return mapCalendarRecord(mapped);
}

async function syncCalendarForUser(userId, provider) {
  const providerKey = normalizeCalendarProviderKey(provider);

  const existingRows = await listUserCalendarRows(userId);
  const existing = existingRows.find((row) => row.provider === providerKey);
  if (!existing || !existing.connected) {
    throw badRequest("Connect this calendar account first");
  }

  const upcomingCountResult = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM bookings
      WHERE user_id = $1
        AND status = 'confirmed'
        AND start_at_utc >= NOW()
        AND start_at_utc < NOW() + INTERVAL '30 days'
    `,
    [userId]
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
      WHERE user_id = $2 AND provider = $3
      RETURNING
        id,
        user_id,
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
      userId,
      providerKey,
    ]
  );

  const mapped = mapRowToItem(result.rows[0], 9999);
  return {
    calendar: mapCalendarRecord(mapped),
    syncedBookingsCount: upcomingCount,
  };
}

async function updateCalendarSettingsForUser(userId, payload = {}) {
  const updates = {};
  if (Object.prototype.hasOwnProperty.call(payload, "selectedProvider")) {
    updates.selectedProvider = payload.selectedProvider;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "includeBuffers")) {
    updates.includeBuffers = !!payload.includeBuffers;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "autoSync")) {
    updates.autoSync = !!payload.autoSync;
  }

  const settings = await upsertCalendarSettings(userId, updates);
  return {
    selectedProvider: settings.selected_provider,
    includeBuffers: settings.include_buffers,
    autoSync: settings.auto_sync,
  };
}

async function disconnectCalendarForUser(userId, provider) {
  const providerKey = normalizeCalendarProviderKey(provider);
  const integration = await setIntegrationConnection(userId, providerKey, false);
  const settings = await getCalendarSettingsRow(userId);
  if (settings?.selected_provider === providerKey) {
    await upsertCalendarSettings(userId, { selectedProvider: null });
  }
  return {
    providerKey,
    connected: false,
    integration,
  };
}

// --- GOOGLE CALENDAR OAUTH ---
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const env = require("../config/env");
const {
  encryptTokenPayload,
  decryptTokenPayload,
} = require("../utils/integration-token-crypto");

const GOOGLE_PROVIDER_KEY = "google-calendar";
const GOOGLE_OAUTH_STATE_PURPOSE = "google_calendar_oauth";
const GOOGLE_TOKEN_FIELDS = [
  "access_token",
  "refresh_token",
  "scope",
  "token_type",
  "expiry_date",
  "id_token",
];

function ensureGoogleOAuthConfigured() {
  if (!env.google.clientId || !env.google.clientSecret) {
    throw badRequest("Google Calendar OAuth is not configured on this server");
  }
}

function normalizeGoogleRedirectUri(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function resolveGoogleRedirectUri(redirectUriCandidate = "") {
  const candidate = normalizeGoogleRedirectUri(redirectUriCandidate);
  if (candidate) return candidate;

  const fromEnv = normalizeGoogleRedirectUri(env.google.redirectUri);
  if (fromEnv) return fromEnv;

  return `${String(env.appBaseUrl || "http://localhost:8080").replace(/\/+$/, "")}/api/integrations/google-calendar/callback`;
}

function getOAuth2Client(redirectUriCandidate = "") {
  ensureGoogleOAuthConfigured();
  const redirectUri = resolveGoogleRedirectUri(redirectUriCandidate);
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

function readGoogleTokensFromMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};

  const oauthBlock =
    metadata.oauth && typeof metadata.oauth === "object" && !Array.isArray(metadata.oauth)
      ? metadata.oauth
      : null;
  if (oauthBlock?.encryptedTokens) {
    const decrypted = decryptTokenPayload(oauthBlock.encryptedTokens);
    if (decrypted) return sanitizeGoogleTokens(decrypted);
  }

  // Backward compatibility for previously saved plaintext token metadata.
  return sanitizeGoogleTokens(metadata);
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

function encodeGoogleOAuthState(userId) {
  return jwt.sign(
    {
      purpose: GOOGLE_OAUTH_STATE_PURPOSE,
      userId: String(userId),
    },
    env.jwtSecret,
    { expiresIn: "15m" }
  );
}

function encodeGoogleOAuthStateWithRedirect(userId, redirectUri = "") {
  const payload = {
    purpose: GOOGLE_OAUTH_STATE_PURPOSE,
    userId: String(userId),
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
      redirectUri: normalizeGoogleRedirectUri(decoded.redirectUri || ""),
    };
  } catch {
    throw badRequest("Invalid or expired OAuth state");
  }
}

async function getGoogleCalendarAuthUrl(userId, redirectUriCandidate = "") {
  const redirectUri = resolveGoogleRedirectUri(redirectUriCandidate);
  const client = getOAuth2Client(redirectUri);
  const state = encodeGoogleOAuthStateWithRedirect(userId, redirectUri);
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
  return {
    authUrl,
    redirectUri,
  };
}

async function getGoogleCalendarConnectionStatusForUser(userIdStr) {
  const existingRows = await listUserCalendarRows(userIdStr);
  const googleCal = existingRows.find((row) => row.provider === GOOGLE_PROVIDER_KEY);
  const tokens = readGoogleTokensFromMetadata(googleCal?.metadata || {});
  const hasRefreshToken = Boolean(tokens.refresh_token);
  const hasWriteScope = hasGoogleCalendarWriteScope(tokens);
  const hasUsableToken = hasRefreshToken || hasUsableAccessToken(tokens);
  return {
    connected: Boolean(googleCal?.connected) && hasWriteScope && hasUsableToken,
    hasRefreshToken,
    hasWriteScope,
    hasUsableToken,
    integrationId: googleCal?.id || null,
    accountEmail: googleCal?.account_email || "",
  };
}

async function handleGoogleCalendarCallback(stateToken, code, redirectUriCandidate = "") {
  const statePayload = decodeGoogleOAuthState(stateToken);
  const userIdStr = statePayload.userId;
  const redirectUri = statePayload.redirectUri || resolveGoogleRedirectUri(redirectUriCandidate);
  const client = getOAuth2Client(redirectUri);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let accountEmail = "";
  try {
    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const userInfo = await oauth2.userinfo.get();
    accountEmail = String(userInfo?.data?.email || "").trim().toLowerCase();
  } catch (err) {
    console.error("Could not fetch user info for Google Calendar", err);
  }

  const existingRows = await listUserCalendarRows(userIdStr);
  const existingGoogle = existingRows.find((row) => row.provider === GOOGLE_PROVIDER_KEY);
  const mergedTokens = mergeGoogleTokens(
    readGoogleTokensFromMetadata(existingGoogle?.metadata || {}),
    tokens || {}
  );
  const metadata = buildGoogleOAuthMetadata(existingGoogle?.metadata || {}, mergedTokens);
  const details = CALENDAR_PROVIDER_DETAILS[GOOGLE_PROVIDER_KEY];

  await upsertIntegration(userIdStr, {
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
    },
  });

  const settings = await upsertCalendarSettings(userIdStr, {});
  if (!settings.selected_provider) {
    await upsertCalendarSettings(userIdStr, { selectedProvider: GOOGLE_PROVIDER_KEY });
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

  const client = getOAuth2Client();
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
  getGoogleCalendarAuthUrl,
  handleGoogleCalendarCallback,
  getAuthenticatedGoogleClient,
};
