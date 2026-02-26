const STORAGE_KEY = "meetscheduling_dashboard_v2";
const SIDEBAR_COLLAPSE_KEY = "meetscheduling_sidebar_collapsed_v1";
const AUTH_TOKEN_KEY = "meetscheduling_auth_token";
const AUTH_USER_KEY = "meetscheduling_auth_user";
const DASHBOARD_THEME_OPTIONS = Object.freeze(["light", "dark"]);
const DEFAULT_INTEGRATION_ACCOUNT = "sales.wearewebsitedesigners@gmail.com";
const CALENDAR_CONNECT_PROMPT = "google, microsoft, apple";
const CALENDAR_PROVIDER_CHOICES = Object.freeze([
  { key: "google-calendar", label: "Google Calendar", mark: "31" },
  { key: "office-365-calendar", label: "Microsoft Calendar", mark: "MS" },
  { key: "apple-calendar", label: "Apple Calendar", mark: "AC" },
]);

const MEETING_TABS = ["Upcoming", "Past", "Date Range"];
const SCHEDULING_TABS = ["Event types", "Single-use links", "Meeting polls"];
const AVAILABILITY_TABS = ["Schedules", "Calendar settings", "Advanced settings"];
const ANALYTICS_TABS = ["Events", "Routing"];
const ADMIN_SECURITY_TABS = ["Data deletion", "Activity log", "Booking"];
const ADMIN_LOGIN_TABS = ["Single sign-on", "User provisioning", "Domain control"];
const ADMIN_PERMISSIONS_TABS = ["Event types", "Workflows", "Invitations"];
const ADMIN_BILLING_COMPARE_TABS = [
  "View All",
  "Core features",
  "Customizations",
  "Team tools",
  "Integrations",
  "Security and control",
  "Support",
];
const ACCOUNT_PAGES = [
  "profile",
  "branding",
  "my-link",
  "communication-settings",
  "login-preferences",
  "security",
  "cookie-settings",
];
const ACCOUNT_SECURITY_TABS = ["Booking", "Google Authenticator"];
const APP_SECTIONS = [
  "scheduling",
  "meetings",
  "availability",
  "contacts",
  "workflows",
  "integrations",
  "routing",
  "landing-page",
  "analytics",
  "admin",
  "account",
];
const LANDING_LEAD_STATUS_FILTERS = ["all", "new", "contacted", "won", "closed"];
const CONTACT_FILTERS = ["all", "lead", "customer", "vip"];
const WORKFLOW_FILTERS = ["all", "active", "paused", "draft"];
const INTEGRATION_FILTERS = ["all", "connected", "available"];
const INTEGRATION_TABS = ["Discover", "Manage"];
const INTEGRATION_SORT_OPTIONS = ["Most popular", "A-Z", "Category"];
const INTEGRATION_VISIBLE_KEYS = new Set(["google-calendar", "google-meet"]);
const INTEGRATION_DETAIL_KEYS = new Set(["google-meet"]);
const INTEGRATION_LOGO_PATHS = Object.freeze({
  "google-calendar": "/assets/logos/google-calendar-brand.svg",
  "google-meet": "/assets/logos/google-meet-brand.svg",
});
const ROUTING_FILTERS = ["all", "active", "paused"];
const LANGUAGE_OPTIONS = ["English", "Hindi", "French", "Spanish"];
const DATE_FORMAT_OPTIONS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
const TIME_FORMAT_OPTIONS = ["12h (am/pm)", "24h"];
const COUNTRY_OPTIONS = ["United States", "India", "United Kingdom", "Canada"];
const DAY_DEFS = [
  { short: "S", name: "Sunday" },
  { short: "M", name: "Monday" },
  { short: "T", name: "Tuesday" },
  { short: "W", name: "Wednesday" },
  { short: "T", name: "Thursday" },
  { short: "F", name: "Friday" },
  { short: "S", name: "Saturday" },
];
const TIMEZONES = [
  "Central Time - US & Canada",
  "Eastern Time - US & Canada",
  "Pacific Time - US & Canada",
  "Greenwich Mean Time",
  "India Standard Time",
];
const TIME_PICKER_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hour24 = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const suffix = hour24 >= 12 ? "pm" : "am";
  const displayHour = hour24 % 12 || 12;
  return {
    value,
    label: `${displayHour}:${String(minutes).padStart(2, "0")}${suffix}`,
  };
});
const TIMEZONE_LABEL_TO_IANA = {
  "Central Time - US & Canada": "America/Chicago",
  "Eastern Time - US & Canada": "America/New_York",
  "Pacific Time - US & Canada": "America/Los_Angeles",
  "Greenwich Mean Time": "Etc/UTC",
  "India Standard Time": "Asia/Kolkata",
};
const IANA_TO_TIMEZONE_LABEL = Object.fromEntries(
  Object.entries(TIMEZONE_LABEL_TO_IANA).map(([label, iana]) => [iana, label])
);
const EVENT_TYPE_KIND_OPTIONS = [
  "One-on-One",
  "Group",
  "Round robin",
  "Collective",
];
const EVENT_TYPE_LOCATION_OPTIONS = [
  "Google Meet",
  "Zoom",
  "Custom",
  "In-person",
  "No location set",
];
const LOCATION_LABEL_TO_API = {
  "Google Meet": "google_meet",
  Zoom: "zoom",
  Custom: "custom",
  "In-person": "in_person",
  "No location set": "custom",
};
const LOCATION_API_TO_LABEL = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  custom: "Custom",
  in_person: "In-person",
};
const EVENT_TYPE_ACCENT_COLORS = ["#8a5de7", "#2d7ff9", "#1aa77b", "#ff9a3e", "#ce5fd3"];
const INTEGRATION_LIBRARY = [
  {
    key: "zoom",
    name: "Zoom",
    category: "Video",
    description: "Include Zoom details in your Meetscheduling events.",
    iconText: "Z",
    iconBg: "#2d8cff",
    popularRank: 1,
    connectedByDefault: true,
  },
  {
    key: "salesforce",
    name: "Salesforce",
    category: "CRM",
    description:
      "Create and update records as meetings are scheduled. Plus, route meetings via real time Salesforce lookup.",
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
    connectedByDefault: true,
  },
  {
    key: "hubspot",
    name: "HubSpot",
    category: "CRM",
    description:
      "Sync meeting data to your CRM. Add instant account-matched scheduling to your routing forms.",
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
    connectedByDefault: true,
  },
  {
    key: "outlook-calendar-plugin",
    name: "Outlook Calendar Plug-in",
    category: "Calendar",
    description: "Add events to your desktop calendar and prevent double-booking.",
    iconText: "OL",
    iconBg: "#2563eb",
    popularRank: 6,
    connectedByDefault: true,
  },
  {
    key: "ms-teams-conferencing",
    name: "Microsoft Teams Conferencing",
    category: "Video",
    description: "Include Teams conferencing details in your Meetscheduling events.",
    iconText: "TM",
    iconBg: "#6366f1",
    popularRank: 7,
  },
  {
    key: "calendly-chrome",
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
    key: "api-webhooks",
    name: "API and webhooks",
    category: "Developer",
    description: "Build custom integrations with Meetscheduling data.",
    iconText: "API",
    iconBg: "#475569",
    popularRank: 13,
    adminOnly: true,
  },
  {
    key: "iphone-app",
    name: "Meetscheduling iPhone app",
    category: "Mobile",
    description: "Access meetings and share availability on the go.",
    iconText: "iOS",
    iconBg: "#111827",
    popularRank: 14,
  },
  {
    key: "android-app",
    name: "Meetscheduling Android app",
    category: "Mobile",
    description: "Access meetings and availability on the go.",
    iconText: "AND",
    iconBg: "#22c55e",
    popularRank: 15,
  },
  {
    key: "ms-teams-chat",
    name: "Microsoft Teams Chat",
    category: "Messaging",
    description: "Get personal notifications for your Meetscheduling events.",
    iconText: "TC",
    iconBg: "#4f46e5",
    popularRank: 16,
  },
  {
    key: "microsoft-dynamics",
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
    key: "gmail-workflows",
    name: "Gmail for Workflows",
    category: "Email",
    description: "Send automated emails from your Gmail account.",
    iconText: "G",
    iconBg: "#ef4444",
    popularRank: 19,
  },
  {
    key: "outlook-workflows",
    name: "Outlook for Workflows",
    category: "Email",
    description: "Send automated emails from your Outlook account.",
    iconText: "OL",
    iconBg: "#2563eb",
    popularRank: 20,
  },
  {
    key: "office-365-calendar",
    name: "Office 365 Calendar",
    category: "Calendar",
    description: "Add events to your calendar and prevent double-booking.",
    iconText: "365",
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
    description: "Create no-code automations with the tools you use.",
    iconText: "PA",
    iconBg: "#3b82f6",
    popularRank: 22,
    adminOnly: true,
  },
  {
    key: "google-analytics",
    name: "Google Analytics",
    category: "Analytics",
    description: "Track engagement with your booking pages.",
    iconText: "GA",
    iconBg: "#f59e0b",
    popularRank: 23,
    adminOnly: true,
  },
  {
    key: "meta-pixel",
    name: "Meta Pixel",
    category: "Analytics",
    description: "Track engagement with your booking pages.",
    iconText: "FB",
    iconBg: "#2563eb",
    popularRank: 24,
    adminOnly: true,
  },
  {
    key: "marketo",
    name: "Marketo",
    category: "Marketing",
    description:
      "Use form responses to qualify and route leads to the right booking pages and update records as meetings are scheduled.",
    iconText: "MK",
    iconBg: "#4f46e5",
    popularRank: 25,
    adminOnly: true,
  },
  {
    key: "single-sign-on",
    name: "Single sign-on",
    category: "Security",
    description: "Provision users and enforce single sign-on for their Meetscheduling accounts.",
    iconText: "SSO",
    iconBg: "#64748b",
    popularRank: 26,
    adminOnly: true,
  },
  {
    key: "linkedin-messaging",
    name: "LinkedIn Messaging",
    category: "Messaging",
    description: "Access and share your availability in LinkedIn.",
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
    key: "calendly-firefox",
    name: "Meetscheduling for Firefox",
    category: "Browser",
    description: "Access and share availability on any web page.",
    iconText: "FF",
    iconBg: "#f97316",
    popularRank: 30,
  },
  {
    key: "calendly-outlook",
    name: "Meetscheduling for Outlook",
    category: "Browser",
    description: "Access and share availability from your Outlook inbox.",
    iconText: "OUT",
    iconBg: "#2563eb",
    popularRank: 31,
  },
  {
    key: "calendly-intercom",
    name: "Meetscheduling for Intercom",
    category: "Messaging",
    description: "Embed your booking page in Intercom chat.",
    iconText: "IC",
    iconBg: "#0f172a",
    popularRank: 32,
  },
  {
    key: "pardot",
    name: "Pardot",
    category: "Marketing",
    description: "Use form responses to qualify and route your leads to the right booking pages.",
    iconText: "PD",
    iconBg: "#0ea5e9",
    popularRank: 33,
    adminOnly: true,
  },
  {
    key: "okta",
    name: "Okta",
    category: "Security",
    description: "Provision users and enforce single sign-on for their Meetscheduling accounts.",
    iconText: "OK",
    iconBg: "#1e40af",
    popularRank: 34,
    adminOnly: true,
  },
  {
    key: "microsoft-azure",
    name: "Microsoft Azure",
    category: "Security",
    description: "Provision users and enforce single sign-on for their Meetscheduling accounts.",
    iconText: "AZ",
    iconBg: "#0ea5e9",
    popularRank: 35,
    adminOnly: true,
  },
  {
    key: "calendly-edge",
    name: "Meetscheduling for Edge",
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
    description: "Include GoTo Meeting details in your Meetscheduling events.",
    iconText: "GT",
    iconBg: "#111827",
    popularRank: 41,
  },
  {
    key: "duo",
    name: "Duo",
    category: "Security",
    description: "Enforce single sign-on for your users' Meetscheduling accounts.",
    iconText: "DU",
    iconBg: "#65a30d",
    popularRank: 42,
    adminOnly: true,
  },
  {
    key: "onelogin",
    name: "OneLogin",
    category: "Security",
    description: "Provision users and enforce single sign-on for their Meetscheduling accounts.",
    iconText: "1",
    iconBg: "#111827",
    popularRank: 43,
    adminOnly: true,
  },
  {
    key: "ping-identity",
    name: "Ping Identity",
    category: "Security",
    description: "Enforce single sign-on for your users' Meetscheduling accounts.",
    iconText: "PI",
    iconBg: "#b91c1c",
    popularRank: 44,
    adminOnly: true,
  },
  {
    key: "calendly-api",
    name: "Developer API",
    category: "Developer",
    description: "Use API keys to automate scheduling and sync metadata.",
    iconText: "DEV",
    iconBg: "#334155",
    popularRank: 45,
    adminOnly: true,
  },
];
const INTEGRATION_LIBRARY_BY_NAME = new Map(
  INTEGRATION_LIBRARY.map((item) => [item.name.toLowerCase(), item])
);

const HOLIDAY_DATA = {
  "United States": [
    { name: "New Year's Day", next: "1 Jan 2027" },
    { name: "Martin Luther King, Jr. Day", next: "18 Jan 2027" },
    { name: "Presidents' Day", next: "15 Feb 2027" },
    { name: "Easter Sunday", next: "5 Apr" },
    { name: "Memorial Day", next: "25 May" },
    { name: "Juneteenth National Independence Day", next: "19 Jun" },
    { name: "Independence Day", next: "4 Jul" },
    { name: "Labor Day", next: "7 Sep" },
    { name: "Columbus Day", next: "12 Oct" },
    { name: "Veterans Day", next: "11 Nov" },
    { name: "Thanksgiving", next: "26 Nov" },
    { name: "Day after Thanksgiving (Black Friday)", next: "27 Nov" },
    { name: "Christmas Eve", next: "24 Dec" },
    { name: "Christmas Day", next: "25 Dec" },
    { name: "New Year's Eve", next: "31 Dec" },
  ],
  India: [
    { name: "Republic Day", next: "26 Jan" },
    { name: "Holi", next: "24 Mar" },
    { name: "Good Friday", next: "29 Mar" },
    { name: "Independence Day", next: "15 Aug" },
    { name: "Gandhi Jayanti", next: "2 Oct" },
    { name: "Dussehra", next: "12 Oct" },
    { name: "Diwali", next: "1 Nov" },
    { name: "Christmas Day", next: "25 Dec" },
  ],
  "United Kingdom": [
    { name: "New Year's Day", next: "1 Jan" },
    { name: "Good Friday", next: "29 Mar" },
    { name: "Easter Monday", next: "1 Apr" },
    { name: "Early May bank holiday", next: "6 May" },
    { name: "Spring bank holiday", next: "27 May" },
    { name: "Summer bank holiday", next: "26 Aug" },
    { name: "Christmas Day", next: "25 Dec" },
    { name: "Boxing Day", next: "26 Dec" },
  ],
};

const ADMIN_BILLING_CATEGORIES = [
  {
    name: "Core features",
    rows: [
      { label: "Meeting polls", values: { free: "check", standard: "check", teams: "check", enterprise: "check" } },
      { label: "One-on-ones", values: { free: "Only 1", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Group event types", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Round robin event types", values: { free: "", standard: "", teams: "check", enterprise: "check" } },
      { label: "Email notifications", values: { free: "check", standard: "check", teams: "check", enterprise: "check" } },
    ],
  },
  {
    name: "Customizations",
    rows: [
      { label: "Custom branding on the booking page", values: { free: "check", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Remove Meetscheduling branding", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Custom cancellation policy message", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Custom colors for embedded widgets", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
    ],
  },
  {
    name: "Team tools",
    rows: [
      { label: "View analytics and insights", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Enforce branding for the organization", values: { free: "", standard: "", teams: "check", enterprise: "check" } },
      { label: "Create and lock managed events", values: { free: "", standard: "", teams: "check", enterprise: "check" } },
    ],
  },
  {
    name: "Integrations",
    rows: [
      { label: "Connect Zoom, Meet, Teams", values: { free: "check", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Connect multiple calendars", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Webhooks for meeting data", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Connect Stripe and PayPal", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Connect Salesforce and Marketo", values: { free: "", standard: "", teams: "check", enterprise: "check" } },
    ],
  },
  {
    name: "Security and control",
    rows: [
      { label: "Data deletion for compliance", values: { free: "check", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Data deletion API", values: { free: "", standard: "", teams: "", enterprise: "check" } },
      { label: "SAML single sign-on (SSO)", values: { free: "", standard: "", teams: "Add-on", enterprise: "check" } },
      { label: "SCIM user provisioning", values: { free: "", standard: "", teams: "", enterprise: "check" } },
      { label: "Domain control and account oversight", values: { free: "", standard: "", teams: "", enterprise: "check" } },
    ],
  },
  {
    name: "Support",
    rows: [
      { label: "Email support", values: { free: "check", standard: "check", teams: "check", enterprise: "Expedited" } },
      { label: "Live chat support", values: { free: "", standard: "check", teams: "check", enterprise: "check" } },
      { label: "Phone support", values: { free: "", standard: "", teams: "", enterprise: "check" } },
      { label: "Dedicated account partner", values: { free: "", standard: "", teams: "", enterprise: "check" } },
    ],
  },
];

const byId = (id) => document.getElementById(id);
const sidebar = byId("sidebar");
const sidebarOverlay = byId("sidebar-overlay");
const sectionTabsEl = byId("section-tabs");
const pageTitleEl = byId("page-title");
const pageHelpEl = byId("page-help");
const pageContextEl = byId("page-context");
const pageActionsEl = byId("page-actions");
const viewRoot = byId("view-root");
const mobileMenuBtn = byId("mobile-menu-btn");
const sidebarCollapseBtn = byId("sidebar-collapse-btn");
const headerCreateBtn = byId("header-create-btn");
const sidebarCreateBtn = byId("sidebar-create-btn");
const createMenu = byId("create-menu");
const profileMenuBtn = byId("profile-menu-btn");
const profileMenu = byId("profile-menu");
const themeToggleBtn = byId("theme-toggle-btn");
const toastEl = byId("toast");

let toastTimer = null;
let state = loadState();
let isSidebarCollapsed = loadSidebarCollapsePreference();
let openEventTypeMenuId = null;
let openMeetingDetailsId = null;
let openAvailabilityTimePickerKey = null;
let availabilitySyncTimer = null;
let calendarSettingsSyncTimer = null;
let integrationsSearchTimer = null;
let contactsSearchTimer = null;
let workflowsSearchTimer = null;
let routingSearchTimer = null;
let availabilityDateSpecificDraft = createAvailabilityDateSpecificDraft();
const createMenuSections = {
  adminTemplates: false,
  moreWays: false,
};

applyDashboardTheme(state.theme);
bindEvents();
renderCreateMenu();
render();

function formatIntegrationOAuthError(raw) {
  const value = String(raw || "").trim();
  if (!value) return "Could not connect Google Calendar";
  if (value === "missing_oauth_params") {
    return "Google Calendar connection failed. Please try again.";
  }
  if (value === "invalid_or_expired_oauth_state") {
    return "Google Calendar connection expired. Please reconnect.";
  }
  if (value === "google_calendar_connect_failed") {
    return "Google Calendar connection failed. Please try again.";
  }
  return `Google Calendar connection failed: ${value.replace(/_/g, " ")}`;
}

const urlParams = new URLSearchParams(window.location.search);
const urlToken = urlParams.get("token");
const urlTab = urlParams.get("tab");
const oauthSuccess = urlParams.get("success");
const oauthError = urlParams.get("error");

let startupToastMessage = "";
if (urlToken) {
  localStorage.setItem(AUTH_TOKEN_KEY, urlToken);
}
if (urlTab === "integrations") {
  state.activeSection = "integrations";
  state.integrations.activeTab = "Manage";
}
if (oauthSuccess === "google_calendar_connected") {
  startupToastMessage = "Google Calendar connected";
}
if (oauthError) {
  startupToastMessage = formatIntegrationOAuthError(oauthError);
}
if (urlToken || urlTab || oauthSuccess || oauthError) {
  window.history.replaceState({}, document.title, window.location.pathname);
}

bootstrapDashboard()
  .then(() => {
    if (startupToastMessage) showToast(startupToastMessage);
  })
  .catch((error) => {
    showToast(error?.message || "Dashboard sync failed");
  });

function loadState() {
  const fallback = createDefaultState();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return normalizeState(parsed, fallback);
  } catch {
    return fallback;
  }
}

function applyDashboardTheme(nextTheme) {
  const theme = DASHBOARD_THEME_OPTIONS.includes(nextTheme) ? nextTheme : "light";
  document.documentElement.setAttribute("data-theme", theme);
  if (state && typeof state === "object") {
    state.theme = theme;
  }

  if (!(themeToggleBtn instanceof HTMLButtonElement)) return;

  const isDark = theme === "dark";
  themeToggleBtn.classList.toggle("is-dark", isDark);
  themeToggleBtn.setAttribute("aria-pressed", String(isDark));
  themeToggleBtn.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );

  const labelEl = themeToggleBtn.querySelector(".theme-toggle-label");
  if (labelEl instanceof HTMLElement) {
    labelEl.textContent = isDark ? "Dark" : "Light";
  }
}

function normalizeState(raw, fallback) {
  if (!raw || typeof raw !== "object") return fallback;
  const merged = structuredCloneOrFallback(fallback);

  if (APP_SECTIONS.includes(raw.activeSection)) {
    merged.activeSection = raw.activeSection;
  }

  if (DASHBOARD_THEME_OPTIONS.includes(raw.theme)) {
    merged.theme = raw.theme;
  }

  if (raw.meetings && typeof raw.meetings === "object") {
    if (MEETING_TABS.includes(raw.meetings.activeTab)) {
      merged.meetings.activeTab = raw.meetings.activeTab;
    }
    if (typeof raw.meetings.showBuffers === "boolean") {
      merged.meetings.showBuffers = raw.meetings.showBuffers;
    }
    if (raw.meetings.events && typeof raw.meetings.events === "object") {
      MEETING_TABS.forEach((tab) => {
        if (Array.isArray(raw.meetings.events[tab])) {
          merged.meetings.events[tab] = raw.meetings.events[tab];
        }
      });
    }
  }

  if (raw.scheduling && typeof raw.scheduling === "object") {
    if (SCHEDULING_TABS.includes(raw.scheduling.activeTab)) {
      merged.scheduling.activeTab = raw.scheduling.activeTab;
    }
    if (typeof raw.scheduling.search === "string") {
      merged.scheduling.search = raw.scheduling.search;
    }
    if (typeof raw.scheduling.filter === "string") {
      merged.scheduling.filter = raw.scheduling.filter;
    }
    if (Array.isArray(raw.scheduling.eventTypes)) {
      merged.scheduling.eventTypes = raw.scheduling.eventTypes.map((item, index) =>
        normalizeEventTypeRecord(item, index)
      );
    }
    if (Array.isArray(raw.scheduling.singleUseLinks)) {
      merged.scheduling.singleUseLinks = raw.scheduling.singleUseLinks;
    }
    if (Array.isArray(raw.scheduling.meetingPolls)) {
      merged.scheduling.meetingPolls = raw.scheduling.meetingPolls;
    }
  }

  if (raw.availability && typeof raw.availability === "object") {
    if (AVAILABILITY_TABS.includes(raw.availability.activeTab)) {
      merged.availability.activeTab = raw.availability.activeTab;
    }
    if (["List", "Calendar"].includes(raw.availability.view)) {
      merged.availability.view = raw.availability.view;
    }
    if (TIMEZONES.includes(raw.availability.timezone)) {
      merged.availability.timezone = raw.availability.timezone;
    }
    if (Array.isArray(raw.availability.weeklyHours)) {
      merged.availability.weeklyHours = raw.availability.weeklyHours.map((row, index) => ({
        day: DAY_DEFS[index]?.short || row.day || "S",
        label: DAY_DEFS[index]?.name || row.label || "Day",
        enabled: typeof row.enabled === "boolean" ? row.enabled : true,
        intervals: Array.isArray(row.intervals) && row.intervals.length
          ? row.intervals.map((slot) => ({
            id: slot.id || makeId("slot"),
            start: sanitizeTime(slot.start),
            end: sanitizeTime(slot.end),
          }))
          : [{ id: makeId("slot"), start: "00:00", end: "23:45" }],
      }));
    }
    if (Array.isArray(raw.availability.dateSpecific)) {
      merged.availability.dateSpecific = raw.availability.dateSpecific.map((row) => ({
        id: row.id || makeId("date"),
        date: row.date || todayIso(),
        start: sanitizeTime(row.start),
        end: sanitizeTime(row.end),
      }));
    }

    if (raw.availability.calendar && typeof raw.availability.calendar === "object") {
      if (Array.isArray(raw.availability.calendar.connected)) {
        merged.availability.calendar.connected = raw.availability.calendar.connected.map((item) => {
          const providerKey =
            typeof item.providerKey === "string" && item.providerKey.trim()
              ? item.providerKey.trim()
              : normalizeCalendarProviderInput(item.provider || "") || sanitizeSlug(item.provider || "");
          return {
            id: item.id || providerKey || makeId("cal"),
            provider: item.provider || getCalendarProviderLabel(providerKey),
            providerKey,
            email: item.email || "user@example.com",
            checkCount: Number.isFinite(item.checkCount) ? item.checkCount : 1,
            lastSync: item.lastSync || "Never",
            syncStatus: item.syncStatus || "connected",
          };
        });
      }
      if (typeof raw.availability.calendar.selectedCalendarId === "string") {
        merged.availability.calendar.selectedCalendarId =
          raw.availability.calendar.selectedCalendarId;
      }
      if (typeof raw.availability.calendar.includeBuffers === "boolean") {
        merged.availability.calendar.includeBuffers =
          raw.availability.calendar.includeBuffers;
      }
      if (typeof raw.availability.calendar.autoSync === "boolean") {
        merged.availability.calendar.autoSync = raw.availability.calendar.autoSync;
      }
    }

    if (raw.availability.advanced && typeof raw.availability.advanced === "object") {
      if (Array.isArray(raw.availability.advanced.meetingLimits)) {
        merged.availability.advanced.meetingLimits =
          raw.availability.advanced.meetingLimits;
      }
      if (HOLIDAY_DATA[raw.availability.advanced.country]) {
        merged.availability.advanced.country = raw.availability.advanced.country;
      }
      if (
        raw.availability.advanced.holidayToggles &&
        typeof raw.availability.advanced.holidayToggles === "object"
      ) {
        merged.availability.advanced.holidayToggles =
          raw.availability.advanced.holidayToggles;
      }
    }
  }

  if (raw.analytics && typeof raw.analytics === "object") {
    if (ANALYTICS_TABS.includes(raw.analytics.activeTab)) {
      merged.analytics.activeTab = raw.analytics.activeTab;
    }
  }

  if (raw.contacts && typeof raw.contacts === "object") {
    if (typeof raw.contacts.search === "string") {
      merged.contacts.search = raw.contacts.search;
    }
    if (CONTACT_FILTERS.includes(raw.contacts.filter)) {
      merged.contacts.filter = raw.contacts.filter;
    }
    if (Array.isArray(raw.contacts.items)) {
      merged.contacts.items = raw.contacts.items.map((item) => ({
        id: item.id || makeId("ctc"),
        name: item.name || "Contact",
        email: item.email || "contact@example.com",
        company: item.company || "Company",
        type: item.type === "Customer" ? "Customer" : "Lead",
        tags: Array.isArray(item.tags)
          ? item.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
          : [],
        notes: typeof item.notes === "string" ? item.notes : "",
        lastMeeting: typeof item.lastMeeting === "string" ? item.lastMeeting : "Never",
      }));
    }
  }

  if (raw.workflows && typeof raw.workflows === "object") {
    if (typeof raw.workflows.search === "string") {
      merged.workflows.search = raw.workflows.search;
    }
    if (WORKFLOW_FILTERS.includes(raw.workflows.filter)) {
      merged.workflows.filter = raw.workflows.filter;
    }
    if (Array.isArray(raw.workflows.items)) {
      merged.workflows.items = raw.workflows.items.map((item) => ({
        id: item.id || makeId("wfl"),
        name: item.name || "Workflow",
        trigger: item.trigger || "After booking",
        channel: item.channel || "Email",
        offset: item.offset || "24 hours before",
        status: ["active", "paused", "draft"].includes(item.status)
          ? item.status
          : "draft",
        lastRun: item.lastRun || "Never",
      }));
    }
  }

  if (raw.integrations && typeof raw.integrations === "object") {
    if (INTEGRATION_TABS.includes(raw.integrations.activeTab)) {
      merged.integrations.activeTab = raw.integrations.activeTab;
    }
    if (typeof raw.integrations.search === "string") {
      merged.integrations.search = raw.integrations.search;
    }
    if (INTEGRATION_FILTERS.includes(raw.integrations.filter)) {
      merged.integrations.filter = raw.integrations.filter;
    }
    if (INTEGRATION_SORT_OPTIONS.includes(raw.integrations.sort)) {
      merged.integrations.sort = raw.integrations.sort;
    }
    if (typeof raw.integrations.showBanner === "boolean") {
      merged.integrations.showBanner = raw.integrations.showBanner;
    }
    if (
      typeof raw.integrations.detailKey === "string" &&
      INTEGRATION_DETAIL_KEYS.has(raw.integrations.detailKey)
    ) {
      merged.integrations.detailKey = raw.integrations.detailKey;
    } else {
      merged.integrations.detailKey = "";
    }
    if (Array.isArray(raw.integrations.items)) {
      merged.integrations.items = raw.integrations.items
        .map((item, index) => normalizeIntegrationRecord(item, index))
        .filter((item) => INTEGRATION_VISIBLE_KEYS.has(item.key));
    }
  }

  if (raw.routing && typeof raw.routing === "object") {
    if (typeof raw.routing.search === "string") {
      merged.routing.search = raw.routing.search;
    }
    if (ROUTING_FILTERS.includes(raw.routing.filter)) {
      merged.routing.filter = raw.routing.filter;
    }
    if (Array.isArray(raw.routing.forms)) {
      merged.routing.forms = raw.routing.forms.map((item) => ({
        id: item.id || makeId("rtf"),
        name: item.name || "Routing form",
        destination: item.destination || "Sales team",
        priority: item.priority === "high" ? "high" : "normal",
        active: typeof item.active === "boolean" ? item.active : true,
        submissionsToday: Number.isFinite(item.submissionsToday)
          ? Math.max(0, item.submissionsToday)
          : 0,
        conversionRate: Number.isFinite(item.conversionRate)
          ? Math.max(0, Math.min(100, item.conversionRate))
          : 0,
      }));
    }
    if (Array.isArray(raw.routing.leads)) {
      merged.routing.leads = raw.routing.leads.map((item) => ({
        id: item.id || makeId("lead"),
        name: item.name || "Prospect",
        email: item.email || "lead@example.com",
        company: item.company || "Company",
        status: ["New", "Pending", "Routed"].includes(item.status)
          ? item.status
          : "New",
        routeTo: item.routeTo || "Unassigned",
        submittedAt: item.submittedAt || new Date().toISOString(),
      }));
    }
  }

  const rawLanding = raw["landing-page"];
  if (rawLanding && typeof rawLanding === "object") {
    if (LANDING_LEAD_STATUS_FILTERS.includes(rawLanding.leadsStatus)) {
      merged["landing-page"].leadsStatus = rawLanding.leadsStatus;
    }
    if (typeof rawLanding.loading === "boolean") {
      merged["landing-page"].loading = rawLanding.loading;
    }
    if (typeof rawLanding.saving === "boolean") {
      merged["landing-page"].saving = rawLanding.saving;
    }
    if (Array.isArray(rawLanding.leads)) {
      merged["landing-page"].leads = rawLanding.leads.map((item) => ({
        id: item.id || makeId("lead"),
        name: item.name || "Lead",
        email: item.email || "lead@example.com",
        company: item.company || "",
        phone: item.phone || "",
        query: item.query || "",
        sourceUrl: item.sourceUrl || "",
        eventTypeTitle: item.eventTypeTitle || "",
        status: LANDING_LEAD_STATUS_FILTERS.includes(String(item.status || "").toLowerCase())
          ? String(item.status || "").toLowerCase()
          : "new",
        createdAt: item.createdAt || new Date().toISOString(),
      }));
    }

    if (rawLanding.page && typeof rawLanding.page === "object") {
      const page = rawLanding.page;
      const target = merged["landing-page"].page;
      const stringFields = [
        "username",
        "displayName",
        "headline",
        "subheadline",
        "aboutText",
        "ctaLabel",
        "profileImageUrl",
        "coverImageUrl",
        "primaryColor",
        "featuredEventTypeId",
      ];
      stringFields.forEach((field) => {
        if (typeof page[field] === "string") {
          target[field] = page[field];
        }
      });
      if (typeof page.contactFormEnabled === "boolean") {
        target.contactFormEnabled = page.contactFormEnabled;
      }
      if (typeof page.isPublished === "boolean") {
        target.isPublished = page.isPublished;
      }
      if (Array.isArray(page.services)) {
        target.services = page.services
          .map((item) => ({
            title: String(item?.title || "").trim(),
            description: String(item?.description || "").trim(),
          }))
          .filter((item) => item.title);
      }
      if (Array.isArray(page.gallery)) {
        target.gallery = page.gallery
          .map((item) => ({
            url: String(item?.url || "").trim(),
            alt: String(item?.alt || "").trim(),
          }))
          .filter((item) => item.url);
      }
      if (Array.isArray(page.eventTypes)) {
        target.eventTypes = page.eventTypes
          .map((item) => ({
            id: String(item?.id || "").trim(),
            title: String(item?.title || "").trim(),
            slug: String(item?.slug || "").trim(),
            durationMinutes: Number(item?.durationMinutes) || 30,
            locationType: String(item?.locationType || "").trim(),
          }))
          .filter((item) => item.id && item.title);
      }
    }
  }

  if (raw.admin && typeof raw.admin === "object") {
    const pages = [
      "dashboard",
      "users",
      "groups",
      "login",
      "billing",
      "security",
      "permissions",
      "managed-events",
      "managed-workflows",
    ];
    if (pages.includes(raw.admin.activePage)) {
      merged.admin.activePage = raw.admin.activePage;
    }
    if (raw.admin.usersTab === "Pending" || raw.admin.usersTab === "Active") {
      merged.admin.usersTab = raw.admin.usersTab;
    }
    if (ADMIN_LOGIN_TABS.includes(raw.admin.loginTab)) {
      merged.admin.loginTab = raw.admin.loginTab;
    }
    if (ADMIN_SECURITY_TABS.includes(raw.admin.securityTab)) {
      merged.admin.securityTab = raw.admin.securityTab;
    }
    if (ADMIN_PERMISSIONS_TABS.includes(raw.admin.permissionsTab)) {
      merged.admin.permissionsTab = raw.admin.permissionsTab;
    }
    if (
      raw.admin.billingCycle === "yearly" ||
      raw.admin.billingCycle === "monthly"
    ) {
      merged.admin.billingCycle = raw.admin.billingCycle;
    }
    if (ADMIN_BILLING_COMPARE_TABS.includes(raw.admin.billingCompareTab)) {
      merged.admin.billingCompareTab = raw.admin.billingCompareTab;
    }
    if (
      raw.admin.permissionCreateShared === "all-members" ||
      raw.admin.permissionCreateShared === "no-one"
    ) {
      merged.admin.permissionCreateShared = raw.admin.permissionCreateShared;
    }
    if (typeof raw.admin.securityBookingSearch === "string") {
      merged.admin.securityBookingSearch = raw.admin.securityBookingSearch;
    }
    if (Array.isArray(raw.admin.securityBookingEvents)) {
      merged.admin.securityBookingEvents = raw.admin.securityBookingEvents.map(
        (item) => ({
          id: item.id || makeId("book"),
          name: item.name || "Event type",
          verification: !!item.verification,
          type: item.type || "One-on-One",
          ownedBy: item.ownedBy || "Owner",
          team: item.team || "-",
          lastEdited: item.lastEdited || "N/A",
        })
      );
    }
    if (Array.isArray(raw.admin.users)) {
      merged.admin.users = raw.admin.users.map((item) => ({
        id: item.id || makeId("usr"),
        name: item.name || "User",
        email: item.email || "user@example.com",
        status: item.status === "Pending" ? "Pending" : "Active",
      }));
    }
    if (Array.isArray(raw.admin.groups)) {
      merged.admin.groups = raw.admin.groups.map((item) => ({
        id: item.id || makeId("grp"),
        name: item.name || "Group",
        members: Number(item.members) || 0,
      }));
    }
    if (Array.isArray(raw.admin.managedEvents)) {
      merged.admin.managedEvents = raw.admin.managedEvents.map((item) => ({
        id: item.id || makeId("mevt"),
        title: item.title || "Managed event",
        owner: item.owner || "Admin",
      }));
    }
    if (Array.isArray(raw.admin.managedWorkflows)) {
      merged.admin.managedWorkflows = raw.admin.managedWorkflows.map((item) => ({
        id: item.id || makeId("mwf"),
        title: item.title || "Workflow",
        trigger: item.trigger || "After booking",
      }));
    }
  }

  if (raw.account && typeof raw.account === "object") {
    if (ACCOUNT_PAGES.includes(raw.account.activePage)) {
      merged.account.activePage = raw.account.activePage;
    }

    if (
      raw.account.profile &&
      typeof raw.account.profile === "object" &&
      raw.account.profileSaved &&
      typeof raw.account.profileSaved === "object"
    ) {
      const fields = [
        "name",
        "welcomeMessage",
        "language",
        "dateFormat",
        "timeFormat",
        "country",
        "timezone",
      ];
      fields.forEach((field) => {
        if (typeof raw.account.profile[field] === "string") {
          merged.account.profile[field] = raw.account.profile[field];
        }
        if (typeof raw.account.profileSaved[field] === "string") {
          merged.account.profileSaved[field] = raw.account.profileSaved[field];
        }
      });
    }

    if (
      raw.account.branding &&
      typeof raw.account.branding === "object" &&
      raw.account.brandingSaved &&
      typeof raw.account.brandingSaved === "object"
    ) {
      const textFields = ["logoUrl", "logoText"];
      const boolFields = [
        "applyOrgLogo",
        "useMeetschedulingBranding",
        "applyOrgBranding",
      ];
      textFields.forEach((field) => {
        if (typeof raw.account.branding[field] === "string") {
          merged.account.branding[field] = raw.account.branding[field];
        }
        if (typeof raw.account.brandingSaved[field] === "string") {
          merged.account.brandingSaved[field] = raw.account.brandingSaved[field];
        }
      });
      boolFields.forEach((field) => {
        if (typeof raw.account.branding[field] === "boolean") {
          merged.account.branding[field] = raw.account.branding[field];
        }
        if (typeof raw.account.brandingSaved[field] === "boolean") {
          merged.account.brandingSaved[field] = raw.account.brandingSaved[field];
        }
      });
    }

    if (
      raw.account.myLink &&
      typeof raw.account.myLink === "object" &&
      raw.account.myLinkSaved &&
      typeof raw.account.myLinkSaved === "object"
    ) {
      if (typeof raw.account.myLink.slug === "string") {
        merged.account.myLink.slug = raw.account.myLink.slug;
      }
      if (typeof raw.account.myLinkSaved.slug === "string") {
        merged.account.myLinkSaved.slug = raw.account.myLinkSaved.slug;
      }
    }

    if (
      raw.account.communication &&
      typeof raw.account.communication === "object" &&
      typeof raw.account.communication.emailWhenAddedToEventType === "boolean"
    ) {
      merged.account.communication.emailWhenAddedToEventType =
        raw.account.communication.emailWhenAddedToEventType;
    }

    if (
      raw.account.loginPreferences &&
      typeof raw.account.loginPreferences === "object"
    ) {
      if (
        raw.account.loginPreferences.provider === "google" ||
        raw.account.loginPreferences.provider === "microsoft"
      ) {
        merged.account.loginPreferences.provider =
          raw.account.loginPreferences.provider;
      }
      if (typeof raw.account.loginPreferences.connected === "boolean") {
        merged.account.loginPreferences.connected =
          raw.account.loginPreferences.connected;
      }
      if (typeof raw.account.loginPreferences.email === "string") {
        merged.account.loginPreferences.email = raw.account.loginPreferences.email;
      }
    }

    if (raw.account.security && typeof raw.account.security === "object") {
      if (ACCOUNT_SECURITY_TABS.includes(raw.account.security.activeTab)) {
        merged.account.security.activeTab = raw.account.security.activeTab;
      }
      if (typeof raw.account.security.bookingSearch === "string") {
        merged.account.security.bookingSearch = raw.account.security.bookingSearch;
      }
      if (Array.isArray(raw.account.security.bookingEvents)) {
        merged.account.security.bookingEvents = raw.account.security.bookingEvents.map(
          (item) => ({
            id: item.id || makeId("abook"),
            name: item.name || "Event type",
            verification: !!item.verification,
            type: item.type || "One-on-One",
            ownedBy: item.ownedBy || "Owner",
            team: item.team || "",
            lastEdited: item.lastEdited || "N/A",
          })
        );
      }
      if (typeof raw.account.security.googleAuthenticatorEnabled === "boolean") {
        merged.account.security.googleAuthenticatorEnabled =
          raw.account.security.googleAuthenticatorEnabled;
      }
      if (typeof raw.account.security.googleAuthenticatorSecret === "string") {
        merged.account.security.googleAuthenticatorSecret =
          raw.account.security.googleAuthenticatorSecret;
      }
      if (Array.isArray(raw.account.security.backupCodes)) {
        merged.account.security.backupCodes = raw.account.security.backupCodes
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
      if (typeof raw.account.security.lastEnabledAt === "string") {
        merged.account.security.lastEnabledAt = raw.account.security.lastEnabledAt;
      }
    }

    if (raw.account.cookies && typeof raw.account.cookies === "object") {
      ["necessary", "functional", "analytics", "marketing"].forEach((field) => {
        if (typeof raw.account.cookies[field] === "boolean") {
          merged.account.cookies[field] = raw.account.cookies[field];
        }
      });
    }
  }

  ensureAvailabilityIntegrity(merged);
  ensureAccountIntegrity(merged);
  return merged;
}

function createDefaultState() {
  const holidayToggles = {};
  Object.keys(HOLIDAY_DATA).forEach((country) => {
    holidayToggles[country] = {};
    HOLIDAY_DATA[country].forEach((holiday) => {
      holidayToggles[country][holiday.name] = true;
    });
  });

  return {
    activeSection: "meetings",
    theme: "light",
    meetings: {
      activeTab: "Upcoming",
      showBuffers: true,
      events: {
        Upcoming: [],
        Past: [],
        "Date Range": [],
      },
    },
    scheduling: {
      activeTab: "Meeting polls",
      search: "",
      filter: "all",
      eventTypes: [
        {
          id: makeId("evt"),
          name: "30 Minute Meeting",
          description: "Share your availability for discovery calls and onboarding check-ins.",
          duration: 30,
          slug: "30-minute-meeting",
          active: true,
          locationType: "No location set",
          eventKind: "One-on-One",
          availabilityLabel: "Weekdays, 9 am - 5 pm",
          color: "#8a5de7",
          internalNote: "",
          inviteeLanguage: "English",
          secret: false,
        },
        {
          id: makeId("evt"),
          name: "Consultation",
          description: "Longer consultation for premium clients.",
          duration: 45,
          slug: "consultation",
          active: true,
          locationType: "Google Meet",
          eventKind: "One-on-One",
          availabilityLabel: "Mon-Fri, 11 am - 6 pm",
          color: "#2d7ff9",
          internalNote: "",
          inviteeLanguage: "English",
          secret: false,
        },
      ],
      singleUseLinks: [],
      meetingPolls: [],
    },
    availability: {
      activeTab: "Schedules",
      view: "List",
      timezone: "Central Time - US & Canada",
      weeklyHours: DAY_DEFS.map((day) => ({
        day: day.short,
        label: day.name,
        enabled: true,
        intervals: [{ id: makeId("slot"), start: "00:00", end: "23:45" }],
      })),
      dateSpecific: [],
      calendar: {
        connected: [
          {
            id: "google-calendar",
            provider: "Google Calendar",
            providerKey: "google-calendar",
            email: "sales.wearewebsitedesigners@gmail.com",
            checkCount: 1,
            lastSync: "Just now",
            syncStatus: "connected",
          },
        ],
        selectedCalendarId: "google-calendar",
        includeBuffers: false,
        autoSync: false,
      },
      advanced: {
        meetingLimits: [],
        country: "United States",
        holidayToggles,
      },
    },
    analytics: {
      activeTab: "Events",
    },
    contacts: {
      search: "",
      filter: "all",
      items: [
        {
          id: makeId("ctc"),
          name: "Ananya Kapoor",
          email: "ananya@acme.com",
          company: "Acme Inc.",
          type: "Lead",
          tags: ["VIP"],
          notes: "Interested in 30-min onboarding session.",
          lastMeeting: "2026-02-18",
        },
        {
          id: makeId("ctc"),
          name: "Ryan Brooks",
          email: "ryan@northlane.io",
          company: "Northlane",
          type: "Customer",
          tags: ["Renewal"],
          notes: "Weekly sync every Tuesday.",
          lastMeeting: "2026-02-19",
        },
      ],
    },
    workflows: {
      search: "",
      filter: "all",
      items: [
        {
          id: makeId("wfl"),
          name: "Booking reminder",
          trigger: "24h before event",
          channel: "Email",
          offset: "24 hours before",
          status: "active",
          lastRun: "2026-02-20 09:30",
        },
        {
          id: makeId("wfl"),
          name: "No-show follow up",
          trigger: "1h after no-show",
          channel: "Email + SMS",
          offset: "1 hour after",
          status: "paused",
          lastRun: "2026-02-17 15:20",
        },
        {
          id: makeId("wfl"),
          name: "Post-meeting thank you",
          trigger: "2h after event",
          channel: "Email",
          offset: "2 hours after",
          status: "draft",
          lastRun: "Never",
        },
      ],
    },
    integrations: {
      activeTab: "Discover",
      search: "",
      filter: "all",
      sort: "Most popular",
      showBanner: true,
      detailKey: "",
      items: buildDefaultIntegrationItems(),
    },
    routing: {
      search: "",
      filter: "all",
      forms: [
        {
          id: makeId("rtf"),
          name: "Inbound demo requests",
          destination: "Sales Team",
          priority: "high",
          active: true,
          submissionsToday: 6,
          conversionRate: 58,
        },
        {
          id: makeId("rtf"),
          name: "Support escalation",
          destination: "Customer Success",
          priority: "normal",
          active: false,
          submissionsToday: 2,
          conversionRate: 84,
        },
      ],
      leads: [
        {
          id: makeId("lead"),
          name: "Ivy Thompson",
          email: "ivy@growthlabs.io",
          company: "GrowthLabs",
          status: "New",
          routeTo: "Unassigned",
          submittedAt: "2026-02-20 10:10",
        },
        {
          id: makeId("lead"),
          name: "Kabir Mehta",
          email: "kabir@northlane.io",
          company: "Northlane",
          status: "Routed",
          routeTo: "Sales Team",
          submittedAt: "2026-02-20 09:42",
        },
      ],
    },
    "landing-page": {
      loading: true,
      saving: false,
      leadsStatus: "all",
      page: {
        username: "meetscheduling",
        displayName: "Divayanshu",
        headline: "Book time with Divayanshu",
        subheadline: "Turn website visitors into booked meetings",
        aboutText:
          "Describe your services, add social proof, and let prospects book instantly.",
        ctaLabel: "Book a meeting",
        profileImageUrl: "",
        coverImageUrl: "",
        primaryColor: "#1a73e8",
        services: [
          {
            title: "Consulting call",
            description: "Strategy and growth consultation to unlock your next milestone.",
          },
        ],
        gallery: [],
        featuredEventTypeId: "",
        contactFormEnabled: true,
        isPublished: true,
        eventTypes: [],
      },
      leads: [],
    },
    admin: {
      activePage: "users",
      usersTab: "Active",
      loginTab: "Single sign-on",
      securityTab: "Booking",
      permissionsTab: "Event types",
      billingCycle: "yearly",
      billingCompareTab: "View All",
      permissionCreateShared: "all-members",
      securityBookingSearch: "",
      securityBookingEvents: [
        {
          id: "book-1",
          name: "wearewebsitedesigners",
          verification: false,
          type: "One-on-One",
          ownedBy: "Divayanshu",
          team: "",
          lastEdited: "23 August 2025",
        },
      ],
      users: [
        {
          id: "usr-1",
          name: "Divayanshu",
          email: "sales.wearewebsitedesigners@gmail.com",
          status: "Active",
        },
      ],
      groups: [],
      managedEvents: [],
      managedWorkflows: [],
    },
    account: {
      activePage: "profile",
      profile: {
        name: "Divayanshu",
        welcomeMessage:
          "Welcome to my scheduling page. Please follow the instructions to add an event to my calendar.",
        language: "English",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h (am/pm)",
        country: "United States",
        timezone: "Central Time - US & Canada",
      },
      profileSaved: {
        name: "Divayanshu",
        welcomeMessage:
          "Welcome to my scheduling page. Please follow the instructions to add an event to my calendar.",
        language: "English",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h (am/pm)",
        country: "United States",
        timezone: "Central Time - US & Canada",
      },
      branding: {
        logoUrl: "",
        logoText: "WU",
        applyOrgLogo: true,
        useMeetschedulingBranding: true,
        applyOrgBranding: true,
      },
      brandingSaved: {
        logoUrl: "",
        logoText: "WU",
        applyOrgLogo: true,
        useMeetschedulingBranding: true,
        applyOrgBranding: true,
      },
      myLink: {
        slug: "wearewebsitedesigners",
      },
      myLinkSaved: {
        slug: "wearewebsitedesigners",
      },
      communication: {
        emailWhenAddedToEventType: true,
      },
      loginPreferences: {
        provider: "google",
        connected: true,
        email: "graphixdesigners786@gmail.com",
      },
      security: {
        activeTab: "Booking",
        bookingSearch: "",
        bookingEvents: [
          {
            id: "abook-1",
            name: "wearewebsitedesigners",
            verification: false,
            type: "One-on-One",
            ownedBy: "Divayanshu",
            team: "",
            lastEdited: "23 August 2025",
          },
        ],
        googleAuthenticatorEnabled: false,
        googleAuthenticatorSecret: generateAuthenticatorSecret(),
        backupCodes: [],
        lastEnabledAt: "",
      },
      cookies: {
        necessary: true,
        functional: true,
        analytics: false,
        marketing: false,
      },
    },
  };
}

function ensureAvailabilityIntegrity(nextState) {
  if (!nextState.availability.calendar.connected.length) {
    nextState.availability.calendar.selectedCalendarId = "";
  } else {
    const found = nextState.availability.calendar.connected.find(
      (item) => item.id === nextState.availability.calendar.selectedCalendarId
    );
    if (!found) {
      nextState.availability.calendar.selectedCalendarId =
        nextState.availability.calendar.connected[0].id;
    }
  }

  Object.keys(HOLIDAY_DATA).forEach((country) => {
    if (!nextState.availability.advanced.holidayToggles[country]) {
      nextState.availability.advanced.holidayToggles[country] = {};
    }
    HOLIDAY_DATA[country].forEach((holiday) => {
      if (
        typeof nextState.availability.advanced.holidayToggles[country][holiday.name] !==
        "boolean"
      ) {
        nextState.availability.advanced.holidayToggles[country][holiday.name] = true;
      }
    });
  });
}

function ensureAccountIntegrity(nextState) {
  const account = nextState.account;
  if (!account) return;

  if (!ACCOUNT_PAGES.includes(account.activePage)) {
    account.activePage = "profile";
  }

  if (!LANGUAGE_OPTIONS.includes(account.profile.language)) {
    account.profile.language = "English";
  }
  if (!LANGUAGE_OPTIONS.includes(account.profileSaved.language)) {
    account.profileSaved.language = "English";
  }
  if (!DATE_FORMAT_OPTIONS.includes(account.profile.dateFormat)) {
    account.profile.dateFormat = "DD/MM/YYYY";
  }
  if (!DATE_FORMAT_OPTIONS.includes(account.profileSaved.dateFormat)) {
    account.profileSaved.dateFormat = "DD/MM/YYYY";
  }
  if (!TIME_FORMAT_OPTIONS.includes(account.profile.timeFormat)) {
    account.profile.timeFormat = "12h (am/pm)";
  }
  if (!TIME_FORMAT_OPTIONS.includes(account.profileSaved.timeFormat)) {
    account.profileSaved.timeFormat = "12h (am/pm)";
  }
  if (!COUNTRY_OPTIONS.includes(account.profile.country)) {
    account.profile.country = "United States";
  }
  if (!COUNTRY_OPTIONS.includes(account.profileSaved.country)) {
    account.profileSaved.country = "United States";
  }
  if (!TIMEZONES.includes(account.profile.timezone)) {
    account.profile.timezone = "Central Time - US & Canada";
  }
  if (!TIMEZONES.includes(account.profileSaved.timezone)) {
    account.profileSaved.timezone = "Central Time - US & Canada";
  }

  if (
    account.loginPreferences.provider !== "google" &&
    account.loginPreferences.provider !== "microsoft"
  ) {
    account.loginPreferences.provider = "google";
  }

  if (!ACCOUNT_SECURITY_TABS.includes(account.security.activeTab)) {
    account.security.activeTab = "Booking";
  }

  if (typeof account.cookies.necessary !== "boolean") {
    account.cookies.necessary = true;
  }
  account.cookies.necessary = true;

  if (!Array.isArray(account.security.backupCodes)) {
    account.security.backupCodes = [];
  }
}

async function openQrModal() {
  try {
    const payload = await apiRequest("/api/auth/2fa/setup", { method: "POST" });
    const modal = document.getElementById("qr-modal");
    const imgContainer = document.getElementById("qr-code-img-container");
    const secretElem = document.getElementById("qr-code-secret");
    const inputElem = document.getElementById("qr-code-input");

    // The backend provides back a string `payload.qrCode`. If it is a data URL, put it in an img tag.
    if (payload.qrCode && payload.qrCode.startsWith("data:image")) {
      imgContainer.innerHTML = `<img src="${payload.qrCode}" alt="2FA QR Code" width="200" height="200" />`;
    } else {
      imgContainer.innerHTML = payload.qrCode || "";
    }
    secretElem.textContent = payload.secret || "";
    inputElem.value = ""; // clear previous input

    // Store secret temporarily in state if needed, though not strictly required
    // until verified.
    state.account.security._temp_secret = payload.secret;

    modal.removeAttribute("hidden");
  } catch (error) {
    showToast(error?.message || "Could not start 2FA setup");
  }
}

function closeQrModal() {
  const modal = document.getElementById("qr-modal");
  if (modal) {
    modal.setAttribute("hidden", "true");
  }
}

async function submitQrModal() {
  const inputElem = document.getElementById("qr-code-input");
  const code = inputElem.value.trim();

  if (!code || code.length !== 6) {
    showToast("Please enter a valid 6-digit code");
    return;
  }

  try {
    const verifyPayload = await apiRequest("/api/auth/2fa/verify-setup", {
      method: "POST",
      body: JSON.stringify({ code })
    });

    state.account.security.googleAuthenticatorEnabled = true;
    state.account.security.googleAuthenticatorSecret = state.account.security._temp_secret || "";
    state.account.security.backupCodes = verifyPayload.backupCodes || [];
    state.account.security.lastEnabledAt = new Date().toISOString();
    delete state.account.security._temp_secret;
    saveState();
    render();

    closeQrModal();
    alert(`2FA Enabled successfully.\n\nIMPORTANT: Save these backup codes somewhere safe. You will only see them once.\n\n${verifyPayload.backupCodes.join('\n')}`);

  } catch (error) {
    showToast(error?.message || "Invalid verification code");
  }
}

async function disableTwoFactorAuth() {
  try {
    const confirmPassword = prompt("Please enter your password to confirm disabling 2FA:");
    if (!confirmPassword) return;

    await apiRequest("/api/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ password: confirmPassword })
    });

    state.account.security.googleAuthenticatorEnabled = false;
    state.account.security.googleAuthenticatorSecret = "";
    state.account.security.backupCodes = [];
    saveState();
    render();
    showToast("Google Authenticator disabled");
  } catch (error) {
    showToast(error?.message || "Could not disable 2FA");
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function structuredCloneOrFallback(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateAuthenticatorSecret() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const groups = [];
  for (let group = 0; group < 4; group += 1) {
    let value = "";
    for (let index = 0; index < 4; index += 1) {
      value += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    groups.push(value);
  }
  return groups.join("-");
}

function generateBackupCodes() {
  return Array.from({ length: 8 }, () =>
    Math.random().toString(36).slice(2, 10).toUpperCase()
  );
}

function sanitizeSlug(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCurrentTimeForTimezone(label) {
  const map = {
    "Central Time - US & Canada": "America/Chicago",
    "Eastern Time - US & Canada": "America/New_York",
    "Pacific Time - US & Canada": "America/Los_Angeles",
    "Greenwich Mean Time": "Etc/UTC",
    "India Standard Time": "Asia/Kolkata",
  };
  const timeZone = map[label] || "Etc/UTC";
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}

function getInitials(value, fallback = "WU") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const parts = text.split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function sanitizeTime(raw) {
  if (typeof raw !== "string") return "00:00";
  const ok = /^([01]\d|2[0-3]):([0-5]\d)$/.test(raw);
  return ok ? raw : "00:00";
}

function formatTimeOptionLabel(rawTime) {
  const [hourRaw, minuteRaw] = sanitizeTime(rawTime).split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")}${suffix}`;
}

function renderCompactTimePicker({
  value,
  pickerKey,
  field,
  scope,
  dayIndex = "",
  slotIndex = "",
}) {
  const safeValue = sanitizeTime(value);
  const isOpen = openAvailabilityTimePickerKey === pickerKey;
  const numericDayIndex = Number(dayIndex);
  const openUp =
    scope === "weekly" && Number.isFinite(numericDayIndex) && numericDayIndex >= 4;
  const safeKey = escapeHtml(pickerKey);
  const safeField = escapeHtml(field);
  const safeScope = escapeHtml(scope);
  const safeDay = dayIndex === "" ? "" : String(dayIndex);
  const safeSlot = slotIndex === "" ? "" : String(slotIndex);

  return `
    <div class="time-picker${openUp ? " opens-up" : ""}">
      <button
        class="time-input time-select-trigger${isOpen ? " open" : ""}"
        type="button"
        data-action="toggle-time-picker"
        data-picker-key="${safeKey}"
        aria-expanded="${isOpen ? "true" : "false"}"
      >
        <span>${escapeHtml(formatTimeOptionLabel(safeValue))}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
      </button>
      <div class="time-select-menu${isOpen ? " open" : ""}" role="listbox">
        ${TIME_PICKER_OPTIONS.map((option) => `
          <button
            class="time-select-option${option.value === safeValue ? " active" : ""}"
            type="button"
            role="option"
            aria-selected="${option.value === safeValue ? "true" : "false"}"
            data-action="pick-time-option"
            data-picker-key="${safeKey}"
            data-scope="${safeScope}"
            data-field="${safeField}"
            data-day-index="${safeDay}"
            data-slot-index="${safeSlot}"
            data-value="${option.value}"
          >${option.label}</button>
        `).join("")}
      </div>
    </div>
  `;
}

function isJoinableMeetingUrl(rawLink, locationType = "") {
  const value = String(rawLink || "").trim();
  if (!value) return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (!(url.protocol === "https:" || url.protocol === "http:")) return false;

  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (locationType === "google_meet" || host === "meet.google.com") {
    if (host !== "meet.google.com") return false;
    if (/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(path)) return true;
    if (/^\/lookup\//i.test(path)) return true;
    return false;
  }

  if (locationType === "zoom" || host === "zoom.us" || host.endsWith(".zoom.us")) {
    if (!(host === "zoom.us" || host.endsWith(".zoom.us"))) return false;
    return /^\/(j|my|wc|s)\//i.test(path);
  }

  return true;
}

function normalizeCalendarProviderInput(raw) {
  const normalized = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
  const alias = {
    google: "google-calendar",
    "google-calendar": "google-calendar",
    gmail: "google-calendar",
    microsoft: "office-365-calendar",
    outlook: "office-365-calendar",
    "office-365-calendar": "office-365-calendar",
    office365: "office-365-calendar",
    exchange: "office-365-calendar",
    apple: "apple-calendar",
    "apple-calendar": "apple-calendar",
    icloud: "apple-calendar",
  };
  return alias[normalized] || "";
}

function getCalendarProviderConfig(providerKey) {
  return CALENDAR_PROVIDER_CHOICES.find((item) => item.key === providerKey) || null;
}

function getCalendarProviderLabel(providerKey) {
  return getCalendarProviderConfig(providerKey)?.label || "Calendar";
}

function getCalendarProviderMark(providerKey) {
  return getCalendarProviderConfig(providerKey)?.mark || "31";
}

function normalizeIntegrationRecord(item, index = 0) {
  const safe = item && typeof item === "object" ? item : {};
  const safeName =
    typeof safe.name === "string" && safe.name.trim()
      ? safe.name.trim()
      : `Integration ${index + 1}`;
  const template = INTEGRATION_LIBRARY_BY_NAME.get(safeName.toLowerCase()) || null;

  const fallbackIconText = safeName
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  const connected = !!safe.connected;
  const account =
    typeof safe.account === "string"
      ? safe.account.trim()
      : typeof safe.account_email === "string"
        ? safe.account_email.trim()
        : "";

  return {
    id: safe.id || makeId("int"),
    key:
      typeof safe.key === "string" && safe.key.trim()
        ? safe.key.trim()
        : template?.key || sanitizeSlug(safeName),
    name: safeName,
    category:
      typeof safe.category === "string" && safe.category.trim()
        ? safe.category.trim()
        : template?.category || "Automation",
    description:
      typeof safe.description === "string" && safe.description.trim()
        ? safe.description.trim()
        : template?.description || "Connect this app with your scheduling workflow.",
    connected,
    account,
    lastSync:
      typeof safe.lastSync === "string" && safe.lastSync.trim()
        ? safe.lastSync.trim()
        : connected
          ? "Just now"
          : "Never",
    adminOnly: typeof safe.adminOnly === "boolean" ? safe.adminOnly : !!template?.adminOnly,
    iconText:
      typeof safe.iconText === "string" && safe.iconText.trim()
        ? safe.iconText.trim().slice(0, 4)
        : template?.iconText || fallbackIconText || "APP",
    iconBg:
      typeof safe.iconBg === "string" && safe.iconBg.trim()
        ? safe.iconBg.trim()
        : template?.iconBg || "#1f6feb",
    popularRank: Number.isFinite(safe.popularRank)
      ? Number(safe.popularRank)
      : Number(template?.popularRank || index + 1),
    installedAt: Number.isFinite(safe.installedAt)
      ? Number(safe.installedAt)
      : Date.now() - index * 60000,
  };
}

function buildDefaultIntegrationItems() {
  const defaultAccount = DEFAULT_INTEGRATION_ACCOUNT;
  return INTEGRATION_LIBRARY.filter((entry) =>
    INTEGRATION_VISIBLE_KEYS.has(entry.key)
  ).map((entry, index) =>
    normalizeIntegrationRecord(
      {
        ...entry,
        connected: !!entry.connectedByDefault,
        account: entry.connectedByDefault ? defaultAccount : "",
        lastSync: entry.connectedByDefault ? "Just now" : "Never",
        installedAt: Date.now() - index * 1800000,
      },
      index
    )
  );
}

function normalizeEventTypeRecord(item, index = 0) {
  const safe = item && typeof item === "object" ? item : {};
  const safeName =
    typeof safe.name === "string" && safe.name.trim()
      ? safe.name.trim()
      : "30 Minute Meeting";
  const safeSlug = sanitizeSlug(typeof safe.slug === "string" ? safe.slug : safeName);
  const safeDuration = Math.max(5, Number(safe.duration) || 30);
  const safeLocation = EVENT_TYPE_LOCATION_OPTIONS.includes(safe.locationType)
    ? safe.locationType
    : "No location set";
  const safeKind = EVENT_TYPE_KIND_OPTIONS.includes(safe.eventKind)
    ? safe.eventKind
    : "One-on-One";
  const safeLanguage = LANGUAGE_OPTIONS.includes(safe.inviteeLanguage)
    ? safe.inviteeLanguage
    : "English";
  const safeCustomLocation =
    typeof safe.customLocationValue === "string" ? safe.customLocationValue : "";

  return {
    id: safe.id || makeId("evt"),
    name: safeName,
    description: typeof safe.description === "string" ? safe.description : "",
    duration: safeDuration,
    slug: safeSlug || `event-${Date.now()}-${index + 1}`,
    active: safe.active !== false,
    locationType: safeLocation,
    eventKind: safeKind,
    availabilityLabel:
      typeof safe.availabilityLabel === "string" && safe.availabilityLabel.trim()
        ? safe.availabilityLabel.trim()
        : "Weekdays, 9 am - 5 pm",
    color:
      typeof safe.color === "string" && safe.color.trim()
        ? safe.color.trim()
        : EVENT_TYPE_ACCENT_COLORS[index % EVENT_TYPE_ACCENT_COLORS.length],
    internalNote: typeof safe.internalNote === "string" ? safe.internalNote : "",
    inviteeLanguage: safeLanguage,
    secret: !!safe.secret,
    customLocationValue: safeCustomLocation,
    bufferBeforeMin: Math.max(0, Number(safe.bufferBeforeMin) || 0),
    bufferAfterMin: Math.max(0, Number(safe.bufferAfterMin) || 0),
    maxBookingsPerDay: Math.max(0, Number(safe.maxBookingsPerDay) || 0),
  };
}

function getEventTypeById(id) {
  return state.scheduling.eventTypes.find((item) => item.id === id) || null;
}

function makeUniqueEventSlug(baseSlug, excludeId = null) {
  const root = sanitizeSlug(baseSlug) || "event";
  let candidate = root;
  let counter = 2;

  while (
    state.scheduling.eventTypes.some(
      (item) =>
        item.id !== excludeId &&
        sanitizeSlug(item.slug || "") === sanitizeSlug(candidate)
    )
  ) {
    candidate = `${root}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function getEventTypeBookingUrl(item) {
  const username = sanitizeSlug(state.account.myLink.slug) || "meetscheduling";
  const slug = sanitizeSlug(item.slug) || "event";
  return `${window.location.origin}/${username}/${slug}`;
}

function copyTextToClipboard(text) {
  const value = String(text || "");
  if (!value) return Promise.resolve(false);

  if (navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(value)
      .then(() => true)
      .catch(() => false);
  }

  const fallbackInput = document.createElement("textarea");
  fallbackInput.value = value;
  fallbackInput.setAttribute("readonly", "true");
  fallbackInput.style.position = "absolute";
  fallbackInput.style.left = "-9999px";
  document.body.appendChild(fallbackInput);
  fallbackInput.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  fallbackInput.remove();
  return Promise.resolve(copied);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function createAvailabilityDateSpecificDraft(overrides = {}) {
  return {
    open: false,
    date: todayIso(),
    start: "09:00",
    end: "17:00",
    sourceId: "",
    ...overrides,
  };
}

function openAvailabilityDateSpecificDraft(presetDate) {
  const safeDate =
    typeof presetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(presetDate)
      ? presetDate
      : todayIso();
  const existing =
    state.availability.dateSpecific.find((row) => row.date === safeDate) || null;

  availabilityDateSpecificDraft = createAvailabilityDateSpecificDraft({
    open: true,
    date: safeDate,
    start: sanitizeTime(existing?.start || "09:00"),
    end: sanitizeTime(existing?.end || "17:00"),
    sourceId: existing?.id || "",
  });
}

function closeAvailabilityDateSpecificDraft() {
  availabilityDateSpecificDraft = createAvailabilityDateSpecificDraft();
}

function getAuthToken() {
  return String(localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();
}

function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function persistAuthUser(nextUser) {
  try {
    if (!nextUser || typeof nextUser !== "object") return;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
  } catch {
    // ignore localStorage errors
  }
}

function clearSessionAndRedirect() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  window.location.replace("/login");
}

function browserTimezone() {
  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return resolved || "UTC";
}

function uiSortToApi(sortLabel) {
  if (sortLabel === "A-Z") return "a_z";
  if (sortLabel === "Category") return "category";
  return "most_popular";
}

function apiSortToUi(sortValue) {
  if (sortValue === "a_z") return "A-Z";
  if (sortValue === "category") return "Category";
  return "Most popular";
}

function asUiTimezoneLabel(iana) {
  if (typeof iana !== "string") return "Central Time - US & Canada";
  return IANA_TO_TIMEZONE_LABEL[iana] || "Central Time - US & Canada";
}

function asIanaTimezone(value) {
  if (TIMEZONE_LABEL_TO_IANA[value]) return TIMEZONE_LABEL_TO_IANA[value];
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return browserTimezone();
  }
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  if (!token) {
    clearSessionAndRedirect();
    throw new Error("Session expired. Please log in again.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {};
    }
  }

  if (response.status === 401) {
    clearSessionAndRedirect();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Request failed");
  }

  return payload;
}

function mapApiLocationToUi(locationType, customLocation) {
  if (locationType === "custom") {
    const placeholder = String(customLocation || "")
      .trim()
      .toLowerCase();
    if (!placeholder || placeholder === "to be defined" || placeholder === "tbd") {
      return "No location set";
    }
  }
  return LOCATION_API_TO_LABEL[locationType] || "Custom";
}

function mapUiLocationToApi(locationLabel, customLocationValue = "") {
  const type = LOCATION_LABEL_TO_API[locationLabel] || "google_meet";
  if (type !== "custom") {
    return { locationType: type, customLocation: "" };
  }
  if (locationLabel === "No location set") {
    return { locationType: "custom", customLocation: "To be defined" };
  }
  const normalized = String(customLocationValue || "").trim();
  return {
    locationType: "custom",
    customLocation: normalized || "Custom location",
  };
}

function mapApiEventTypeToUi(row, index = 0, existing = null) {
  const fallback = existing || {};
  const locationType = mapApiLocationToUi(row.location_type, row.custom_location);
  return normalizeEventTypeRecord(
    {
      id: row.id,
      name: row.title,
      description: row.description || "",
      duration: Number(row.duration_minutes) || 30,
      slug: row.slug,
      active: row.is_active !== false,
      locationType,
      eventKind: fallback.eventKind || "One-on-One",
      availabilityLabel: fallback.availabilityLabel || "Weekdays, 9 am - 5 pm",
      color:
        fallback.color ||
        EVENT_TYPE_ACCENT_COLORS[index % EVENT_TYPE_ACCENT_COLORS.length],
      internalNote: fallback.internalNote || "",
      inviteeLanguage: fallback.inviteeLanguage || "English",
      secret: fallback.secret || false,
      customLocationValue:
        typeof row.custom_location === "string" ? row.custom_location : "",
      bufferBeforeMin: Number(row.buffer_before_min) || 0,
      bufferAfterMin: Number(row.buffer_after_min) || 0,
      maxBookingsPerDay: Number(row.max_bookings_per_day) || 0,
    },
    index
  );
}

function buildEventTypePayloadFromUi(item) {
  const mappedLocation = mapUiLocationToApi(
    item.locationType,
    item.customLocationValue
  );
  const normalizedSlug = sanitizeSlug(item.slug || item.name);
  const safeSlug =
    normalizedSlug.length >= 2 ? normalizedSlug : `${normalizedSlug || "event"}-meeting`;
  return {
    title: item.name,
    description: item.description || "",
    durationMinutes: Math.max(5, Number(item.duration) || 30),
    slug: safeSlug,
    locationType: mappedLocation.locationType,
    customLocation: mappedLocation.customLocation,
    bufferBeforeMin: Math.max(0, Number(item.bufferBeforeMin) || 0),
    bufferAfterMin: Math.max(0, Number(item.bufferAfterMin) || 0),
    maxBookingsPerDay: Math.max(0, Number(item.maxBookingsPerDay) || 0),
  };
}

function mapApiBookingToMeeting(booking) {
  const title = booking.eventTitle || "Meeting";
  const localStart = booking.startLocal || {};
  const localEnd = booking.endLocal || {};
  return {
    id: booking.id,
    title,
    inviteeName: booking.inviteeName || "Unknown",
    inviteeEmail: booking.inviteeEmail || "",
    meetingLink: booking.meetingLink || "",
    meetingLinkStatus: booking.meetingLinkStatus || "pending_generation",
    calendarProvider: booking.calendarProvider || "",
    calendarEventId: booking.calendarEventId || "",
    locationType: booking.locationType || "",
    startDate: localStart.date || "",
    startTime: localStart.time || "",
    startIso: localStart.iso || "",
    endTime: localEnd.time || "",
    endIso: localEnd.iso || "",
    startAtUtc: booking.startAtUtc || "",
    endAtUtc: booking.endAtUtc || "",
    visitorTimezone: booking.visitorTimezone || "",
    notes: booking.notes || "",
    createdAt: booking.createdAt || "",
    time: `${localStart.date || ""} ${localStart.time || ""}`.trim(),
    status: booking.status === "canceled" ? "Canceled" : "Confirmed",
  };
}

function normalizeMeetingClockLabel(rawValue) {
  const value = String(rawValue || "").trim();
  const match = value.match(/^(\d{1,2}):([0-5]\d)\s*([AP]M)$/i);
  if (!match) return value;
  const hour = String(Math.max(1, Math.min(12, Number(match[1]) || 0)));
  const minutes = match[2];
  const suffix = match[3].toLowerCase();
  return minutes === "00" ? `${hour} ${suffix}` : `${hour}:${minutes} ${suffix}`;
}

function getMeetingTimeRangeLabel(item) {
  const start = normalizeMeetingClockLabel(item.startTime);
  const end = normalizeMeetingClockLabel(item.endTime);
  if (start && end) return `${start} - ${end}`;
  return item.time || "Time unavailable";
}

function getMeetingDateKey(item) {
  const localDate = String(item.startDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return localDate;
  const fallbackUtc = String(item.startAtUtc || "").trim();
  if (!fallbackUtc) return "unknown";
  const parsed = new Date(fallbackUtc);
  if (Number.isNaN(parsed.getTime())) return "unknown";
  return parsed.toISOString().slice(0, 10);
}

function formatMeetingDateHeading(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) return "Date unavailable";
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMeetingCreatedDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function describeMeetingLocation(locationType) {
  if (locationType === "google_meet") return "This is a Google Meet web conference.";
  if (locationType === "zoom") return "This is a Zoom web conference.";
  if (locationType === "in_person") return "This is an in-person meeting.";
  return "Meeting location details were shared in confirmation.";
}

function hasConnectedGoogleCalendarIntegration() {
  return state.integrations.items.some(
    (item) => item.key === "google-calendar" && item.connected
  );
}

function getMeetingLinkPendingCopy(event, googleCalendarConnected) {
  const status = String(event?.meetingLinkStatus || "").trim().toLowerCase();
  const locationType = String(event?.locationType || "").trim().toLowerCase();

  if (locationType === "google_meet") {
    if (status === "pending_calendar_connection" || !googleCalendarConnected) {
      return "Meeting link pending. Connect Google Calendar in Integrations.";
    }
    if (status === "generation_failed") {
      return "Meeting link could not be generated. Reconnect Google Calendar and try again.";
    }
    return "Meeting link pending. Google Meet link is being generated.";
  }

  if (locationType === "zoom") {
    return "Meeting link pending. Add a valid Zoom link in your event settings.";
  }

  return "";
}

function mapApiIntegrationToUi(item, index = 0) {
  return normalizeIntegrationRecord(
    {
      id: item.id || `catalog-${item.key}`,
      key: item.key,
      name: item.name,
      category: item.category,
      description: item.description,
      connected: !!item.connected,
      account: item.accountEmail || "",
      lastSync: item.lastSync || (item.connected ? "Just now" : "Never"),
      adminOnly: !!item.adminOnly,
      iconText: item.iconText,
      iconBg: item.iconBg,
      popularRank: Number(item.popularRank) || index + 1,
      installedAt: Date.now() - index * 120000,
    },
    index
  );
}

function formatUiDateTime(value, fallback = "Never") {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleString();
}

function mapApiContactToUi(contact) {
  return {
    id: contact.id || makeId("ctc"),
    name: contact.name || "Contact",
    email: contact.email || "contact@example.com",
    company: contact.company || "Company",
    type: contact.type === "Customer" ? "Customer" : "Lead",
    tags: Array.isArray(contact.tags) ? contact.tags : [],
    notes: typeof contact.notes === "string" ? contact.notes : "",
    lastMeeting:
      typeof contact.lastMeeting === "string" && contact.lastMeeting.trim()
        ? contact.lastMeeting
        : "Never",
  };
}

function mapApiWorkflowToUi(workflow) {
  return {
    id: workflow.id || makeId("wfl"),
    name: workflow.name || "Workflow",
    trigger: workflow.trigger || "After booking",
    channel: workflow.channel || "Email",
    offset: workflow.offset || "24 hours before",
    status: ["active", "paused", "draft"].includes(workflow.status)
      ? workflow.status
      : "draft",
    lastRun: formatUiDateTime(workflow.lastRun, "Never"),
  };
}

function mapApiRoutingFormToUi(form) {
  return {
    id: form.id || makeId("rtf"),
    name: form.name || "Routing form",
    destination: form.destination || "Sales Team",
    priority: form.priority === "high" ? "high" : "normal",
    active: form.active !== false,
    submissionsToday: Number.isFinite(Number(form.submissionsToday))
      ? Number(form.submissionsToday)
      : 0,
    conversionRate: Number.isFinite(Number(form.conversionRate))
      ? Number(form.conversionRate)
      : 0,
  };
}

function mapApiRoutingLeadToUi(lead) {
  return {
    id: lead.id || makeId("lead"),
    name: lead.name || "Lead",
    email: lead.email || "lead@example.com",
    company: lead.company || "Company",
    status: ["New", "Pending", "Routed"].includes(lead.status)
      ? lead.status
      : "New",
    routeTo: lead.routeTo || "Unassigned",
    submittedAt: formatUiDateTime(lead.submittedAt, "Now"),
  };
}

function mapApiLandingPageToUi(landingPage = {}, previous = null) {
  const fallback = previous || {};
  const eventTypes = Array.isArray(landingPage.eventTypes)
    ? landingPage.eventTypes
      .map((item) => ({
        id: String(item?.id || "").trim(),
        title: String(item?.title || "").trim(),
        slug: String(item?.slug || "").trim(),
        durationMinutes: Number(item?.durationMinutes) || 30,
        locationType: String(item?.locationType || "").trim(),
      }))
      .filter((item) => item.id && item.title)
    : Array.isArray(fallback.eventTypes)
      ? fallback.eventTypes
      : [];

  return {
    username: landingPage.username || fallback.username || "meetscheduling",
    displayName: landingPage.displayName || fallback.displayName || "User",
    headline:
      landingPage.headline ||
      fallback.headline ||
      `Book time with ${landingPage.displayName || fallback.displayName || "our team"}`,
    subheadline:
      landingPage.subheadline ||
      fallback.subheadline ||
      "Turn website visitors into booked meetings",
    aboutText:
      landingPage.aboutText ||
      fallback.aboutText ||
      "Explain your services and capture qualified leads.",
    ctaLabel: landingPage.ctaLabel || fallback.ctaLabel || "Book a meeting",
    profileImageUrl: landingPage.profileImageUrl || fallback.profileImageUrl || "",
    coverImageUrl: landingPage.coverImageUrl || fallback.coverImageUrl || "",
    primaryColor: landingPage.primaryColor || fallback.primaryColor || "#1a73e8",
    services: Array.isArray(landingPage.services)
      ? landingPage.services
        .map((item) => ({
          title: String(item?.title || "").trim(),
          description: String(item?.description || "").trim(),
        }))
        .filter((item) => item.title)
      : Array.isArray(fallback.services)
        ? fallback.services
        : [],
    gallery: Array.isArray(landingPage.gallery)
      ? landingPage.gallery
        .map((item) => ({
          url: String(item?.url || "").trim(),
          alt: String(item?.alt || "").trim(),
        }))
        .filter((item) => item.url)
      : Array.isArray(fallback.gallery)
        ? fallback.gallery
        : [],
    featuredEventTypeId:
      landingPage.featuredEventTypeId || fallback.featuredEventTypeId || "",
    contactFormEnabled:
      typeof landingPage.contactFormEnabled === "boolean"
        ? landingPage.contactFormEnabled
        : typeof fallback.contactFormEnabled === "boolean"
          ? fallback.contactFormEnabled
          : true,
    isPublished:
      typeof landingPage.isPublished === "boolean"
        ? landingPage.isPublished
        : typeof fallback.isPublished === "boolean"
          ? fallback.isPublished
          : true,
    eventTypes,
  };
}

function mapApiLandingLeadToUi(lead = {}) {
  return {
    id: lead.id || makeId("lead"),
    name: lead.name || "Lead",
    email: lead.email || "lead@example.com",
    company: lead.company || "",
    phone: lead.phone || "",
    query: lead.query || "",
    sourceUrl: lead.sourceUrl || "",
    eventTypeTitle: lead.eventTypeTitle || "",
    status: LANDING_LEAD_STATUS_FILTERS.includes(String(lead.status || "").toLowerCase())
      ? String(lead.status || "").toLowerCase()
      : "new",
    createdAt: lead.createdAt || new Date().toISOString(),
  };
}

function syncCalendarConnectionsFromIntegrations() {
  const connectedCalendars = state.integrations.items.filter(
    (item) =>
      item.connected && String(item.category || "").toLowerCase() === "calendar"
  );
  const existingByProvider = new Map(
    state.availability.calendar.connected.map((item) => [item.providerKey, item])
  );

  state.availability.calendar.connected = connectedCalendars.map((item, index) => {
    const providerKey = item.key || sanitizeSlug(item.name || String(index + 1));
    const existing = existingByProvider.get(providerKey);
    return {
      id: providerKey,
      provider: getCalendarProviderLabel(providerKey) || item.name,
      providerKey,
      email: item.account || existing?.email || DEFAULT_INTEGRATION_ACCOUNT,
      checkCount: Number.isFinite(existing?.checkCount) ? existing.checkCount : 1,
      lastSync: item.lastSync || existing?.lastSync || "Never",
      syncStatus: item.connected ? "connected" : existing?.syncStatus || "disconnected",
    };
  });
  ensureAvailabilityIntegrity(state);
}

function applyUserFromApi(user) {
  if (!user || typeof user !== "object") return;
  const authUser = getAuthUser() || {};
  const nextAuthUser = {
    ...authUser,
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    timezone: user.timezone,
    plan: user.plan,
  };
  persistAuthUser(nextAuthUser);

  if (user.displayName) {
    state.account.profile.name = user.displayName;
    state.account.profileSaved.name = user.displayName;
  }

  if (user.username) {
    state.account.myLink.slug = user.username;
    state.account.myLinkSaved.slug = user.username;
  }

  if (user.email) {
    state.account.loginPreferences.email = user.email;
  }
  state.account.loginPreferences.connected = true;
  if (typeof authUser.provider === "string") {
    const rawProvider = authUser.provider.toLowerCase();
    state.account.loginPreferences.provider =
      rawProvider === "microsoft" ? "microsoft" : "google";
  }
  state.account.profile.timezone = asUiTimezoneLabel(user.timezone);
  state.account.profileSaved.timezone = asUiTimezoneLabel(user.timezone);

  state.admin.users = [
    {
      id: user.id || "usr-1",
      name: user.displayName || "User",
      email: user.email || "user@example.com",
      status: "Active",
    },
  ];
}

async function loadEventTypesFromApi() {
  const payload = await apiRequest("/api/event-types?includeInactive=true");
  const rows = Array.isArray(payload.eventTypes) ? payload.eventTypes : [];
  const existingById = new Map(
    state.scheduling.eventTypes.map((item) => [String(item.id), item])
  );
  state.scheduling.eventTypes = rows.map((row, index) =>
    mapApiEventTypeToUi(row, index, existingById.get(String(row.id)) || null)
  );
}

function buildUiWeeklyHoursFromApi(rows) {
  const grouped = new Map();
  DAY_DEFS.forEach((_, idx) => grouped.set(idx, []));
  rows.forEach((row) => {
    const day = Number(row.weekday);
    if (!Number.isInteger(day) || day < 0 || day > 6 || !row.is_available) return;
    grouped.get(day).push({
      id: row.id || makeId("slot"),
      start: sanitizeTime(row.start_time),
      end: sanitizeTime(row.end_time),
    });
  });

  return DAY_DEFS.map((day, index) => {
    const intervals = grouped.get(index) || [];
    return {
      day: day.short,
      label: day.name,
      enabled: intervals.length > 0,
      intervals:
        intervals.length > 0
          ? intervals
          : [{ id: makeId("slot"), start: "09:00", end: "17:00" }],
    };
  });
}

async function loadAvailabilityFromApi() {
  const payload = await apiRequest("/api/availability");
  const weekly = Array.isArray(payload.weekly) ? payload.weekly : [];
  const overrides = Array.isArray(payload.overrides) ? payload.overrides : [];

  state.availability.weeklyHours = buildUiWeeklyHoursFromApi(weekly);
  state.availability.dateSpecific = overrides
    .filter((row) => row.is_available && row.start_time && row.end_time)
    .map((row) => ({
      id: row.id || makeId("date"),
      date:
        typeof row.override_date === "string"
          ? row.override_date.slice(0, 10)
          : new Date(row.override_date || Date.now()).toISOString().slice(0, 10),
      start: sanitizeTime(row.start_time),
      end: sanitizeTime(row.end_time),
    }));
  ensureAvailabilityIntegrity(state);
}

async function loadBookingsFromApi() {
  const timezone = browserTimezone();
  const [allPayload, upcomingPayload] = await Promise.all([
    apiRequest(
      `/api/dashboard/bookings?timezone=${encodeURIComponent(
        timezone
      )}&status=all`
    ),
    apiRequest(
      `/api/dashboard/bookings/upcoming?timezone=${encodeURIComponent(
        timezone
      )}&limit=100`
    ),
  ]);

  const allRows = Array.isArray(allPayload.bookings) ? allPayload.bookings : [];
  const upcomingRows = Array.isArray(upcomingPayload.bookings)
    ? upcomingPayload.bookings
    : [];

  const nowMs = Date.now();
  const pastRows = allRows.filter((row) => {
    const startMs = Date.parse(row.startAtUtc || "");
    return Number.isFinite(startMs) && startMs < nowMs;
  });

  state.meetings.events.Upcoming = upcomingRows.map(mapApiBookingToMeeting);
  state.meetings.events.Past = pastRows.map(mapApiBookingToMeeting);
  state.meetings.events["Date Range"] = allRows.map(mapApiBookingToMeeting);
}

async function loadContactsFromApi() {
  const payload = await apiRequest(
    `/api/contacts?search=${encodeURIComponent(
      state.contacts.search || ""
    )}&filter=${encodeURIComponent(state.contacts.filter || "all")}`
  );
  const rows = Array.isArray(payload.contacts) ? payload.contacts : [];
  state.contacts.items = rows.map(mapApiContactToUi);
}

async function loadWorkflowsFromApi() {
  const payload = await apiRequest(
    `/api/workflows?search=${encodeURIComponent(
      state.workflows.search || ""
    )}&filter=${encodeURIComponent(state.workflows.filter || "all")}`
  );
  const rows = Array.isArray(payload.workflows) ? payload.workflows : [];
  state.workflows.items = rows.map(mapApiWorkflowToUi);
}

async function loadRoutingFromApi() {
  const payload = await apiRequest(
    `/api/routing?search=${encodeURIComponent(
      state.routing.search || ""
    )}&filter=${encodeURIComponent(state.routing.filter || "all")}`
  );
  const forms = Array.isArray(payload.forms) ? payload.forms : [];
  const leads = Array.isArray(payload.leads) ? payload.leads : [];
  state.routing.forms = forms.map(mapApiRoutingFormToUi);
  state.routing.leads = leads.map(mapApiRoutingLeadToUi);
}

async function loadLandingPageFromApi(status = state["landing-page"].leadsStatus) {
  const safeStatus = LANDING_LEAD_STATUS_FILTERS.includes(String(status || "").toLowerCase())
    ? String(status || "").toLowerCase()
    : "all";
  const [pagePayload, leadsPayload] = await Promise.all([
    apiRequest("/api/landing-page"),
    apiRequest(
      `/api/landing-page/leads?status=${encodeURIComponent(safeStatus)}&limit=120`
    ),
  ]);
  state["landing-page"].page = mapApiLandingPageToUi(
    pagePayload.landingPage || {},
    state["landing-page"].page
  );
  state["landing-page"].leads = (Array.isArray(leadsPayload.leads) ? leadsPayload.leads : []).map(
    mapApiLandingLeadToUi
  );
  state["landing-page"].leadsStatus = safeStatus;
  state["landing-page"].loading = false;
}

async function saveLandingPageRemote() {
  const page = state["landing-page"].page;
  state["landing-page"].saving = true;
  render();
  try {
    const payload = {
      headline: page.headline,
      subheadline: page.subheadline,
      aboutText: page.aboutText,
      ctaLabel: page.ctaLabel,
      profileImageUrl: page.profileImageUrl,
      coverImageUrl: page.coverImageUrl,
      primaryColor: page.primaryColor,
      services: page.services,
      gallery: page.gallery,
      featuredEventTypeId: page.featuredEventTypeId || null,
      contactFormEnabled: !!page.contactFormEnabled,
      isPublished: !!page.isPublished,
    };
    const response = await apiRequest("/api/landing-page", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    state["landing-page"].page = mapApiLandingPageToUi(
      response.landingPage || {},
      state["landing-page"].page
    );
    saveState();
    render();
    showToast("Landing page saved");
  } finally {
    state["landing-page"].saving = false;
  }
}

async function updateLandingLeadStatusRemote(leadId, status) {
  const response = await apiRequest(`/api/landing-page/leads/${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const updated = mapApiLandingLeadToUi(response.lead || {});
  state["landing-page"].leads = state["landing-page"].leads.map((item) =>
    item.id === leadId ? updated : item
  );
  saveState();
  render();
  showToast("Lead status updated");
}

async function refreshIntegrationsFromApi(nextTab = null) {
  const targetTab = INTEGRATION_TABS.includes(nextTab)
    ? nextTab
    : state.integrations.activeTab;
  const tab = targetTab.toLowerCase();
  const filter = state.integrations.filter || "all";
  const search = state.integrations.search || "";
  const sort = uiSortToApi(state.integrations.sort);

  const payload = await apiRequest(
    `/api/integrations?tab=${encodeURIComponent(tab)}&filter=${encodeURIComponent(
      filter
    )}&search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}`
  );

  state.integrations.activeTab = tab === "manage" ? "Manage" : "Discover";
  state.integrations.filter = payload.filter || "all";
  state.integrations.sort = apiSortToUi(payload.sort);
  state.integrations.search = payload.search || search;
  state.integrations.items = (Array.isArray(payload.items) ? payload.items : [])
    .map((item, index) => mapApiIntegrationToUi(item, index))
    .filter((item) => INTEGRATION_VISIBLE_KEYS.has(item.key));
  if (
    state.integrations.detailKey &&
    !state.integrations.items.some((item) => item.key === state.integrations.detailKey)
  ) {
    state.integrations.detailKey = "";
  }
  syncCalendarConnectionsFromIntegrations();
}

async function refreshCalendarSettingsFromApi() {
  const payload = await apiRequest("/api/integrations/calendars");
  const calendars = Array.isArray(payload.calendars) ? payload.calendars : [];
  const connected = calendars
    .filter((item) => item && item.connected)
    .map((item, index) => {
      const providerKey =
        typeof item.providerKey === "string" && item.providerKey.trim()
          ? item.providerKey.trim()
          : normalizeCalendarProviderInput(item.provider || "") || `calendar-${index + 1}`;
      return {
        id: providerKey,
        provider: item.provider || getCalendarProviderLabel(providerKey),
        providerKey,
        email: item.accountEmail || DEFAULT_INTEGRATION_ACCOUNT,
        checkCount: Number.isFinite(Number(item.checkCount)) ? Number(item.checkCount) : 1,
        lastSync: item.lastSync || "Never",
        syncStatus: item.syncStatus || "connected",
      };
    });

  state.availability.calendar.connected = connected;
  state.availability.calendar.selectedCalendarId =
    typeof payload.selectedProvider === "string" && payload.selectedProvider.trim()
      ? payload.selectedProvider.trim()
      : connected[0]?.id || "";
  state.availability.calendar.includeBuffers = !!payload.includeBuffers;
  state.availability.calendar.autoSync = !!payload.autoSync;
  ensureAvailabilityIntegrity(state);
}

async function bootstrapDashboard() {
  const token = getAuthToken();
  if (!token) {
    clearSessionAndRedirect();
    return;
  }

  const me = await apiRequest("/api/auth/me");
  applyUserFromApi(me.user);

  const tasks = await Promise.allSettled([
    loadEventTypesFromApi(),
    loadAvailabilityFromApi(),
    loadBookingsFromApi(),
    refreshIntegrationsFromApi(state.integrations.activeTab),
    refreshCalendarSettingsFromApi(),
    loadContactsFromApi(),
    loadWorkflowsFromApi(),
    loadRoutingFromApi(),
    loadLandingPageFromApi(),
  ]);

  tasks.forEach((task) => {
    if (task.status === "rejected") {
      showToast(task.reason?.message || "Some dashboard data could not be loaded");
    }
  });

  saveState();
  render();
}

function queueAvailabilitySync() {
  if (availabilitySyncTimer) clearTimeout(availabilitySyncTimer);
  availabilitySyncTimer = window.setTimeout(() => {
    syncAvailabilityToApi().catch((error) => {
      showToast(error?.message || "Availability sync failed");
    });
  }, 650);
}

function queueCalendarSettingsSync() {
  if (calendarSettingsSyncTimer) clearTimeout(calendarSettingsSyncTimer);
  calendarSettingsSyncTimer = window.setTimeout(() => {
    syncCalendarSettingsToApi().catch((error) => {
      showToast(error?.message || "Calendar settings sync failed");
    });
  }, 450);
}

async function syncCalendarSettingsToApi() {
  const selected = state.availability.calendar.connected.find(
    (item) => item.id === state.availability.calendar.selectedCalendarId
  );
  await apiRequest("/api/integrations/calendars/settings", {
    method: "PATCH",
    body: JSON.stringify({
      selectedProvider: selected?.providerKey || null,
      includeBuffers: !!state.availability.calendar.includeBuffers,
      autoSync: !!state.availability.calendar.autoSync,
    }),
  });
}

async function syncAvailabilityToApi() {
  const weeklySlots = [];
  state.availability.weeklyHours.forEach((day, weekday) => {
    if (!day.enabled) return;
    day.intervals.forEach((slot) => {
      const startTime = sanitizeTime(slot.start);
      const endTime = sanitizeTime(slot.end);
      if (!startTime || !endTime || startTime >= endTime) return;
      weeklySlots.push({
        weekday,
        startTime,
        endTime,
        isAvailable: true,
      });
    });
  });

  await apiRequest("/api/availability/weekly", {
    method: "PUT",
    body: JSON.stringify({ slots: weeklySlots }),
  });

  const current = await apiRequest("/api/availability");
  const currentOverrides = Array.isArray(current.overrides) ? current.overrides : [];
  for (const row of currentOverrides) {
    await apiRequest(`/api/availability/overrides/${encodeURIComponent(row.id)}`, {
      method: "DELETE",
    }).catch(() => null);
  }

  for (const row of state.availability.dateSpecific) {
    const startTime = sanitizeTime(row.start);
    const endTime = sanitizeTime(row.end);
    if (!startTime || !endTime || startTime >= endTime) continue;
    await apiRequest("/api/availability/overrides", {
      method: "POST",
      body: JSON.stringify({
        overrideDate: row.date,
        isAvailable: true,
        startTime,
        endTime,
      }),
    });
  }
}

async function createEventTypeRemote(seed, successMessage = "Event type added") {
  const payload = buildEventTypePayloadFromUi(seed);
  const response = await apiRequest("/api/event-types", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const created = mapApiEventTypeToUi(response.eventType, 0, seed);
  state.scheduling.eventTypes = [
    created,
    ...state.scheduling.eventTypes.filter((item) => item.id !== created.id),
  ];
  saveState();
  render();
  showToast(successMessage);
  return created;
}

async function updateEventTypeRemote(eventTypeId, updates) {
  const index = state.scheduling.eventTypes.findIndex((item) => item.id === eventTypeId);
  if (index < 0) return;
  const current = state.scheduling.eventTypes[index];
  const merged = { ...current, ...updates };
  const payload = buildEventTypePayloadFromUi(merged);

  const response = await apiRequest(
    `/api/event-types/${encodeURIComponent(eventTypeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
  const updated = mapApiEventTypeToUi(response.eventType, index, merged);
  state.scheduling.eventTypes.splice(index, 1, updated);
  saveState();
  render();
}

async function setEventTypeActiveRemote(eventTypeId, isActive) {
  const index = state.scheduling.eventTypes.findIndex((item) => item.id === eventTypeId);
  if (index < 0) return;

  const response = await apiRequest(
    `/api/event-types/${encodeURIComponent(eventTypeId)}/active`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive: !!isActive }),
    }
  );
  const existing = state.scheduling.eventTypes[index];
  const updated = mapApiEventTypeToUi(response.eventType, index, existing);
  state.scheduling.eventTypes.splice(index, 1, updated);
  saveState();
  render();
}

async function deleteEventTypeRemote(eventTypeId) {
  await apiRequest(`/api/event-types/${encodeURIComponent(eventTypeId)}`, {
    method: "DELETE",
  });
  state.scheduling.eventTypes = state.scheduling.eventTypes.filter(
    (item) => item.id !== eventTypeId
  );
  saveState();
  render();
}

async function duplicateEventTypeRemote(eventTypeId) {
  const item = getEventTypeById(eventTypeId);
  if (!item) return;
  const duplicateName = `${item.name} (Copy)`;
  const created = await createEventTypeRemote(
    {
      ...item,
      id: makeId("evt"),
      name: duplicateName,
      slug: makeUniqueEventSlug(duplicateName),
      active: false,
    },
    "Event type duplicated"
  );
  await setEventTypeActiveRemote(created.id, false);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 1800);
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest("#theme-toggle-btn")) {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      applyDashboardTheme(nextTheme);
      saveState();
      return;
    }

    const sectionBtn = target.closest("[data-section]");
    if (sectionBtn) {
      const section = sectionBtn.dataset.section;
      if (section) {
        state.activeSection = section;
        openEventTypeMenuId = null;
        if (section === "integrations") {
          refreshIntegrationsFromApi(state.integrations.activeTab).catch(() => null);
        }
        if (section === "meetings") {
          loadBookingsFromApi()
            .then(() => {
              saveState();
              render();
            })
            .catch(() => null);
        }
        if (section === "contacts") {
          loadContactsFromApi()
            .then(() => {
              saveState();
              render();
            })
            .catch(() => null);
        }
        if (section === "workflows") {
          loadWorkflowsFromApi()
            .then(() => {
              saveState();
              render();
            })
            .catch(() => null);
        }
        if (section === "routing") {
          loadRoutingFromApi()
            .then(() => {
              saveState();
              render();
            })
            .catch(() => null);
        }
        if (section === "landing-page") {
          state["landing-page"].loading = true;
          loadLandingPageFromApi(state["landing-page"].leadsStatus)
            .then(() => {
              saveState();
              render();
            })
            .catch((error) => {
              state["landing-page"].loading = false;
              showToast(error?.message || "Could not load landing page");
              render();
            });
        }
        closeSidebar();
        saveState();
        render();
      }
      return;
    }

    if (target.closest("#profile-menu-btn")) {
      toggleProfileMenu();
      return;
    }

    if (
      target.closest("#header-create-btn") ||
      target.closest("#sidebar-create-btn")
    ) {
      const trigger =
        target.closest("#header-create-btn") || target.closest("#sidebar-create-btn");
      toggleCreateMenu(trigger);
      return;
    }

    const createSectionTrigger = target.closest("[data-create-section]");
    if (createSectionTrigger) {
      const section = createSectionTrigger.dataset.createSection;
      if (section && section in createMenuSections) {
        createMenuSections[section] = !createMenuSections[section];
        renderCreateMenu();
      }
      return;
    }

    const createOption = target.closest("[data-create]");
    if (createOption) {
      const type = createOption.dataset.create;
      if (type) handleCreate(type);
      closeCreateMenu();
      return;
    }

    const profileAction = target.closest("#profile-menu [data-action]");
    if (profileAction) {
      const action = profileAction.dataset.action;
      if (action) handleGlobalAction(action);
      closeProfileMenu();
      return;
    }

    if (
      createMenu &&
      !createMenu.hidden &&
      !target.closest("#create-menu") &&
      !target.closest("#header-create-btn") &&
      !target.closest("#sidebar-create-btn")
    ) {
      closeCreateMenu();
    }

    if (
      profileMenu &&
      !profileMenu.hidden &&
      !target.closest("#profile-menu") &&
      !target.closest("#profile-menu-btn")
    ) {
      closeProfileMenu();
    }

    if (openEventTypeMenuId && !target.closest(".event-type-menu-shell")) {
      openEventTypeMenuId = null;
      render();
    }
  });

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      if (!sidebar || !sidebarOverlay) return;
      if (sidebar.classList.contains("open")) closeSidebar();
      else openSidebar();
    });
  }

  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener("click", () => {
      if (window.innerWidth <= 1120) return;
      isSidebarCollapsed = !isSidebarCollapsed;
      saveSidebarCollapsePreference(isSidebarCollapsed);
      applySidebarCollapse();
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }

  if (sectionTabsEl) {
    sectionTabsEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab]");
      if (!button) return;

      const tab = button.dataset.tab;
      if (!tab) return;

      if (state.activeSection === "scheduling" && SCHEDULING_TABS.includes(tab)) {
        state.scheduling.activeTab = tab;
        state.scheduling.search = "";
        state.scheduling.filter = "all";
        openEventTypeMenuId = null;
      }

      if (
        state.activeSection === "availability" &&
        AVAILABILITY_TABS.includes(tab)
      ) {
        state.availability.activeTab = tab;
      }

      if (
        state.activeSection === "integrations" &&
        INTEGRATION_TABS.includes(tab)
      ) {
        state.integrations.detailKey = "";
        state.integrations.activeTab = tab;
        refreshIntegrationsFromApi(tab).catch((error) => {
          showToast(error?.message || "Could not load integrations");
        });
      }

      saveState();
      render();
    });
  }

  if (viewRoot) {
    viewRoot.addEventListener("click", onViewClick);
    viewRoot.addEventListener("change", onViewChange);
    viewRoot.addEventListener("input", onViewInput);
  }

  if (pageActionsEl) {
    pageActionsEl.addEventListener("click", onViewClick);
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1120) closeSidebar();
    applySidebarCollapse();
    if (createMenu && !createMenu.hidden) {
      closeCreateMenu();
    }
  });
}

function onViewClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    if (openAvailabilityTimePickerKey) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !target.closest(".time-picker")) {
        openAvailabilityTimePickerKey = null;
        render();
      }
    }
    return;
  }
  const action = button.dataset.action;
  if (!action) return;
  if (action !== "toggle-time-picker" && action !== "pick-time-option") {
    openAvailabilityTimePickerKey = null;
  }

  switch (action) {
    case "set-meeting-tab": {
      const tab = button.dataset.tab;
      if (MEETING_TABS.includes(tab)) {
        state.meetings.activeTab = tab;
        openMeetingDetailsId = null;
        saveState();
        render();
      }
      break;
    }
    case "toggle-time-picker": {
      const pickerKey = String(button.dataset.pickerKey || "").trim();
      if (!pickerKey) break;
      openAvailabilityTimePickerKey =
        openAvailabilityTimePickerKey === pickerKey ? null : pickerKey;
      render();
      break;
    }
    case "pick-time-option": {
      const scope = String(button.dataset.scope || "");
      const field = String(button.dataset.field || "");
      const value = sanitizeTime(String(button.dataset.value || ""));

      if (scope === "weekly") {
        const dayIndex = Number(button.dataset.dayIndex);
        const slotIndex = Number(button.dataset.slotIndex);
        const day = state.availability.weeklyHours[dayIndex];
        const slot = day?.intervals?.[slotIndex];
        if (!slot || (field !== "start" && field !== "end")) break;
        slot[field] = value;
        openAvailabilityTimePickerKey = null;
        saveState();
        render();
        queueAvailabilitySync();
        break;
      }

      if (scope === "date-specific" && (field === "start" || field === "end")) {
        availabilityDateSpecificDraft[field] = value;
        openAvailabilityTimePickerKey = null;
        render();
      }
      break;
    }
    case "toggle-meeting-details": {
      const id = String(button.dataset.id || "").trim();
      if (!id) break;
      openMeetingDetailsId = openMeetingDetailsId === id ? null : id;
      render();
      break;
    }
    case "meeting-mark-no-show": {
      const id = String(button.dataset.id || "").trim();
      if (!id) break;
      MEETING_TABS.forEach((tab) => {
        state.meetings.events[tab] = (state.meetings.events[tab] || []).map((item) =>
          String(item.id) === id ? { ...item, status: "No-show" } : item
        );
      });
      saveState();
      render();
      showToast("Marked as no-show");
      break;
    }
    case "meeting-edit-event-type": {
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      openMeetingDetailsId = null;
      saveState();
      render();
      showToast("Open Event types to edit");
      break;
    }
    case "meeting-schedule-again": {
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      openMeetingDetailsId = null;
      saveState();
      render();
      showToast("Open Event types to share a new booking link");
      break;
    }
    case "meeting-view-contact": {
      const email = String(button.dataset.email || "").trim();
      state.activeSection = "contacts";
      if (email) state.contacts.search = email;
      openMeetingDetailsId = null;
      saveState();
      render();
      if (email) {
        showToast("Contact opened");
      }
      break;
    }
    case "open-integrations": {
      state.activeSection = "integrations";
      state.integrations.activeTab = "Manage";
      state.integrations.detailKey = "";
      openMeetingDetailsId = null;
      refreshIntegrationsFromApi("Manage").catch(() => null);
      saveState();
      render();
      break;
    }
    case "cancel-meeting":
    case "remove-meeting": {
      const id = button.dataset.id;
      apiRequest(`/api/dashboard/bookings/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Canceled from dashboard" }),
      })
        .then(() => loadBookingsFromApi())
        .then(() => {
          openMeetingDetailsId = null;
          saveState();
          render();
          showToast("Meeting canceled");
        })
        .catch(() => {
          const tab = state.meetings.activeTab;
          state.meetings.events[tab] = state.meetings.events[tab].filter(
            (item) => item.id !== id
          );
          if (String(openMeetingDetailsId || "") === String(id)) {
            openMeetingDetailsId = null;
          }
          saveState();
          render();
          showToast("Meeting removed");
        });
      break;
    }
    case "meetings-export":
    case "meetings-filter":
      showToast("Action captured in demo mode");
      break;
    case "create-event-type":
      openEventTypeMenuId = null;
      createEventType();
      break;
    case "open-scheduling-landing": {
      const id =
        button.dataset.id ||
        state.scheduling.eventTypes.find((item) => item.active)?.id ||
        state.scheduling.eventTypes[0]?.id;
      const item = id ? getEventTypeById(id) : null;
      if (!item) {
        showToast("Create an event type first");
        break;
      }
      window.open(getEventTypeBookingUrl(item), "_blank", "noopener");
      showToast("Opening booking page");
      break;
    }
    case "copy-event-link": {
      const id = button.dataset.id;
      const item = getEventTypeById(id);
      if (!item) return;
      copyTextToClipboard(getEventTypeBookingUrl(item)).then((copied) => {
        showToast(copied ? "Booking link copied" : "Copy failed");
      });
      break;
    }
    case "toggle-event-type-menu": {
      const id = button.dataset.id;
      if (!id) return;
      openEventTypeMenuId = openEventTypeMenuId === id ? null : id;
      render();
      break;
    }
    case "view-event-booking-page": {
      const id = button.dataset.id;
      const item = getEventTypeById(id);
      if (!item) return;
      openEventTypeMenuId = null;
      window.open(getEventTypeBookingUrl(item), "_blank", "noopener");
      showToast("Opening booking page");
      break;
    }
    case "edit-event-type": {
      const id = button.dataset.id;
      const item = getEventTypeById(id);
      if (!item) return;

      const nextName = prompt("Event title", item.name);
      if (nextName === null) return;
      const safeName = String(nextName || "").trim() || item.name;

      const durationInput = prompt("Duration in minutes", String(item.duration));
      if (durationInput === null) return;
      const nextDuration = Math.max(5, Number(durationInput) || item.duration || 30);

      const locationHint = EVENT_TYPE_LOCATION_OPTIONS.join(" / ");
      const locationInput = prompt(
        `Location type (${locationHint})`,
        item.locationType
      );
      if (locationInput === null) return;
      const safeLocation = EVENT_TYPE_LOCATION_OPTIONS.find(
        (entry) => entry.toLowerCase() === String(locationInput || "").trim().toLowerCase()
      );

      const kindHint = EVENT_TYPE_KIND_OPTIONS.join(" / ");
      const kindInput = prompt(`Event kind (${kindHint})`, item.eventKind);
      if (kindInput === null) return;
      const safeKind = EVENT_TYPE_KIND_OPTIONS.find(
        (entry) => entry.toLowerCase() === String(kindInput || "").trim().toLowerCase()
      );

      const availability = prompt("Availability label", item.availabilityLabel);
      if (availability === null) return;

      const description = prompt("Description", item.description || "");
      if (description === null) return;

      const slugInput = prompt("Slug", item.slug);
      if (slugInput === null) return;
      const nextSlug = makeUniqueEventSlug(slugInput || safeName, item.id);

      const nextLocation = safeLocation || item.locationType;
      let customLocationValue = item.customLocationValue || "";
      if (nextLocation === "Custom") {
        const customLocationInput = prompt(
          "Custom location",
          customLocationValue || "Google Meet link"
        );
        if (customLocationInput === null) return;
        customLocationValue = String(customLocationInput || "").trim();
      } else if (nextLocation === "No location set") {
        customLocationValue = "To be defined";
      } else {
        customLocationValue = "";
      }

      openEventTypeMenuId = null;
      updateEventTypeRemote(item.id, {
        name: safeName,
        duration: nextDuration,
        locationType: nextLocation,
        customLocationValue,
        eventKind: safeKind || item.eventKind,
        availabilityLabel:
          String(availability || "").trim() || item.availabilityLabel,
        description: String(description || "").trim(),
        slug: nextSlug,
      })
        .then(() => {
          showToast("Event type updated");
        })
        .catch((error) => {
          showToast(error?.message || "Could not update event type");
        });
      break;
    }
    case "add-event-to-website": {
      const id = button.dataset.id;
      const item = getEventTypeById(id);
      if (!item) return;
      const embedCode = `<iframe src="${getEventTypeBookingUrl(
        item
      )}" width="100%" height="760" frameborder="0"></iframe>`;
      copyTextToClipboard(embedCode).then((copied) => {
        showToast(copied ? "Embed code copied" : "Copy failed");
      });
      openEventTypeMenuId = null;
      render();
      break;
    }
    case "add-event-note": {
      const id = button.dataset.id;
      const item = getEventTypeById(id);
      if (!item) return;
      const nextNote = prompt("Internal note", item.internalNote || "");
      if (nextNote === null) return;
      item.internalNote = String(nextNote || "").trim();
      openEventTypeMenuId = null;
      saveState();
      render();
      showToast(item.internalNote ? "Internal note saved" : "Internal note cleared");
      break;
    }
    case "change-event-language": {
      const id = button.dataset.id;
      const item = getEventTypeById(id);
      if (!item) return;
      const nextLanguage = prompt(
        `Invitee language (${LANGUAGE_OPTIONS.join(", ")})`,
        item.inviteeLanguage
      );
      if (nextLanguage === null) return;
      const selected = LANGUAGE_OPTIONS.find(
        (entry) => entry.toLowerCase() === String(nextLanguage).trim().toLowerCase()
      );
      if (!selected) {
        showToast("Language not available");
        return;
      }
      item.inviteeLanguage = selected;
      openEventTypeMenuId = null;
      saveState();
      render();
      showToast(`Invitee language: ${selected}`);
      break;
    }
    case "toggle-event-secret": {
      const id = button.dataset.id;
      const item = getEventTypeById(id);
      if (!item) return;
      item.secret = !item.secret;
      openEventTypeMenuId = null;
      saveState();
      render();
      showToast(item.secret ? "Booking page set to secret" : "Booking page is public");
      break;
    }
    case "duplicate-event-type": {
      const id = button.dataset.id;
      openEventTypeMenuId = null;
      duplicateEventTypeRemote(id).catch((error) => {
        showToast(error?.message || "Could not duplicate event type");
      });
      break;
    }
    case "delete-event-type": {
      const id = button.dataset.id;
      openEventTypeMenuId = null;
      deleteEventTypeRemote(id)
        .then(() => {
          showToast("Event type deleted");
        })
        .catch((error) => {
          showToast(error?.message || "Could not delete event type");
        });
      break;
    }
    case "create-single-link":
      createSingleUseLink();
      break;
    case "delete-single-link": {
      const id = button.dataset.id;
      state.scheduling.singleUseLinks = state.scheduling.singleUseLinks.filter(
        (item) => item.id !== id
      );
      saveState();
      render();
      break;
    }
    case "copy-single-link": {
      const id = button.dataset.id;
      const item = state.scheduling.singleUseLinks.find((entry) => entry.id === id);
      if (!item) return;
      const url = `https://meetscheduling.app/s/${item.slug}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => { });
      }
      showToast("Link copied");
      break;
    }
    case "create-poll":
      createMeetingPoll();
      break;
    case "toggle-poll-status": {
      const id = button.dataset.id;
      const poll = state.scheduling.meetingPolls.find((item) => item.id === id);
      if (!poll) return;
      poll.status = poll.status === "open" ? "closed" : "open";
      saveState();
      render();
      break;
    }
    case "delete-poll": {
      const id = button.dataset.id;
      state.scheduling.meetingPolls = state.scheduling.meetingPolls.filter(
        (item) => item.id !== id
      );
      saveState();
      render();
      break;
    }
    case "set-availability-view": {
      const view = button.dataset.view;
      if (view === "List" || view === "Calendar") {
        state.availability.view = view;
        saveState();
        render();
      }
      break;
    }
    case "toggle-day": {
      const dayIndex = Number(button.dataset.dayIndex);
      const day = state.availability.weeklyHours[dayIndex];
      if (!day) return;
      day.enabled = !day.enabled;
      saveState();
      render();
      queueAvailabilitySync();
      break;
    }
    case "add-interval": {
      const dayIndex = Number(button.dataset.dayIndex);
      const day = state.availability.weeklyHours[dayIndex];
      if (!day) return;
      if (!day.enabled) {
        day.enabled = true;
        saveState();
        render();
        queueAvailabilitySync();
        break;
      }
      const last = day.intervals[day.intervals.length - 1];
      day.intervals.push({
        id: makeId("slot"),
        start: last?.start || "09:00",
        end: last?.end || "17:00",
      });
      saveState();
      render();
      queueAvailabilitySync();
      break;
    }
    case "remove-interval": {
      const dayIndex = Number(button.dataset.dayIndex);
      const slotIndex = Number(button.dataset.slotIndex);
      const day = state.availability.weeklyHours[dayIndex];
      if (!day) return;
      if (day.intervals.length <= 1) {
        day.enabled = false;
        saveState();
        render();
        queueAvailabilitySync();
        break;
      }
      day.intervals.splice(slotIndex, 1);
      saveState();
      render();
      queueAvailabilitySync();
      break;
    }
    case "copy-day": {
      const dayIndex = Number(button.dataset.dayIndex);
      const nextIndex = dayIndex + 1 > 6 ? 0 : dayIndex + 1;
      const source = state.availability.weeklyHours[dayIndex];
      const target = state.availability.weeklyHours[nextIndex];
      if (!source || !target) return;
      target.enabled = source.enabled;
      target.intervals = source.intervals.map((slot) => ({
        id: makeId("slot"),
        start: slot.start,
        end: slot.end,
      }));
      saveState();
      render();
      showToast(`Copied ${source.label} to ${target.label}`);
      queueAvailabilitySync();
      break;
    }
    case "add-date-specific": {
      const date = button.dataset.date;
      openAvailabilityDateSpecificDraft(date);
      render();
      break;
    }
    case "cancel-date-specific": {
      closeAvailabilityDateSpecificDraft();
      render();
      break;
    }
    case "save-date-specific": {
      const { date, start, end, sourceId } = availabilityDateSpecificDraft;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        showToast("Select a valid date");
        break;
      }

      const safeStart = sanitizeTime(start);
      const safeEnd = sanitizeTime(end);
      if (safeStart >= safeEnd) {
        showToast("End time must be after start time");
        break;
      }

      const existingIndex = state.availability.dateSpecific.findIndex((row) =>
        sourceId ? row.id === sourceId : row.date === date
      );

      if (existingIndex >= 0) {
        state.availability.dateSpecific[existingIndex] = {
          ...state.availability.dateSpecific[existingIndex],
          date,
          start: safeStart,
          end: safeEnd,
        };
      } else {
        state.availability.dateSpecific.push({
          id: makeId("date"),
          date,
          start: safeStart,
          end: safeEnd,
        });
      }

      state.availability.dateSpecific.sort((a, b) => a.date.localeCompare(b.date));
      closeAvailabilityDateSpecificDraft();
      saveState();
      render();
      queueAvailabilitySync();
      break;
    }
    case "remove-date-specific": {
      const id = button.dataset.id;
      state.availability.dateSpecific = state.availability.dateSpecific.filter(
        (item) => item.id !== id
      );
      if (availabilityDateSpecificDraft.sourceId === id) {
        closeAvailabilityDateSpecificDraft();
      }
      saveState();
      render();
      queueAvailabilitySync();
      break;
    }
    case "connect-calendar":
      connectCalendar();
      break;
    case "sync-calendar": {
      const provider = button.dataset.provider;
      if (!provider) return;
      syncCalendarByProvider(provider);
      break;
    }
    case "remove-calendar": {
      const id = button.dataset.id;
      const calendar = state.availability.calendar.connected.find((item) => item.id === id);
      state.availability.calendar.connected = state.availability.calendar.connected.filter(
        (item) => item.id !== id
      );
      if (calendar) {
        const providerKey =
          String(calendar.providerKey || "").trim() ||
          sanitizeSlug(calendar.provider || "");
        if (providerKey) {
          apiRequest(
            `/api/integrations/calendars/${encodeURIComponent(providerKey)}/disconnect`,
            {
              method: "POST",
            }
          )
            .then(() =>
              Promise.all([
                refreshIntegrationsFromApi(state.integrations.activeTab),
                refreshCalendarSettingsFromApi(),
              ])
            )
            .then(() => {
              ensureAvailabilityIntegrity(state);
              saveState();
              render();
            })
            .catch(() => {
              ensureAvailabilityIntegrity(state);
              saveState();
              render();
            });
          break;
        }
      }
      ensureAvailabilityIntegrity(state);
      saveState();
      render();
      break;
    }
    case "add-meeting-limit":
      addMeetingLimit();
      break;
    case "remove-meeting-limit": {
      const id = button.dataset.id;
      state.availability.advanced.meetingLimits =
        state.availability.advanced.meetingLimits.filter((item) => item.id !== id);
      saveState();
      render();
      break;
    }
    case "set-analytics-tab": {
      const tab = button.dataset.tab;
      if (ANALYTICS_TABS.includes(tab)) {
        state.analytics.activeTab = tab;
        saveState();
        render();
      }
      break;
    }
    case "create-contact":
      createContact();
      break;
    case "edit-contact": {
      const id = button.dataset.id;
      const item = state.contacts.items.find((entry) => entry.id === id);
      if (!item) return;
      const name = prompt("Contact name", item.name);
      if (name === null) return;
      const email = prompt("Contact email", item.email);
      if (email === null) return;
      const company = prompt("Company", item.company);
      if (company === null) return;
      const type = prompt("Type (Lead/Customer)", item.type);
      if (type === null) return;

      const normalizedEmail = String(email || "").trim().toLowerCase();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
      if (!validEmail) {
        showToast("Enter a valid contact email");
        return;
      }
      updateContactRemote(
        id,
        {
          name: String(name || "").trim() || item.name,
          email: normalizedEmail,
          company: String(company || "").trim() || item.company,
          type:
            String(type || "").trim().toLowerCase() === "customer"
              ? "Customer"
              : "Lead",
        },
        "Contact updated"
      ).catch((error) => {
        showToast(error?.message || "Could not update contact");
      });
      break;
    }
    case "delete-contact": {
      const id = button.dataset.id;
      deleteContactRemote(id).catch((error) => {
        showToast(error?.message || "Could not delete contact");
      });
      break;
    }
    case "toggle-contact-vip": {
      const id = button.dataset.id;
      toggleContactVipRemote(id).catch((error) => {
        showToast(error?.message || "Could not update contact");
      });
      break;
    }
    case "create-workflow":
      createWorkflow();
      break;
    case "toggle-workflow-status": {
      const id = button.dataset.id;
      toggleWorkflowStatusRemote(id).catch((error) => {
        showToast(error?.message || "Could not update workflow");
      });
      break;
    }
    case "duplicate-workflow": {
      const id = button.dataset.id;
      duplicateWorkflowRemote(id).catch((error) => {
        showToast(error?.message || "Could not duplicate workflow");
      });
      break;
    }
    case "run-workflow": {
      const id = button.dataset.id;
      runWorkflowRemote(id).catch((error) => {
        showToast(error?.message || "Could not run workflow");
      });
      break;
    }
    case "delete-workflow": {
      const id = button.dataset.id;
      deleteWorkflowRemote(id).catch((error) => {
        showToast(error?.message || "Could not delete workflow");
      });
      break;
    }
    case "connect-integration":
      connectIntegration();
      break;
    case "open-integration-detail": {
      const key = String(button.dataset.key || "").trim();
      openIntegrationDetailByKey(key);
      break;
    }
    case "back-integrations-list":
      state.integrations.detailKey = "";
      saveState();
      render();
      break;
    case "manage-calendar-connection":
      openAvailabilityCalendarSettings();
      break;
    case "connect-google-calendar-oauth":
      startGoogleCalendarOAuth().catch((error) => {
        showToast(error?.message || "Could not connect Google Calendar");
      });
      break;
    case "connect-all-integrations":
      setAllIntegrationsConnection(true);
      break;
    case "disconnect-all-integrations":
      setAllIntegrationsConnection(false);
      break;
    case "toggle-integration": {
      const id = button.dataset.id;
      toggleIntegrationById(id);
      break;
    }
    case "configure-integration": {
      const id = button.dataset.id;
      configureIntegrationById(id);
      break;
    }
    case "delete-integration": {
      const id = button.dataset.id;
      deleteIntegrationById(id);
      break;
    }
    case "dismiss-integration-banner":
      state.integrations.showBanner = false;
      saveState();
      render();
      break;
    case "switch-integrations-tab": {
      const tab = button.dataset.tab;
      if (!INTEGRATION_TABS.includes(tab)) return;
      state.integrations.activeTab = tab;
      refreshIntegrationsFromApi(tab).catch((error) => {
        showToast(error?.message || "Could not load integrations");
      });
      saveState();
      render();
      break;
    }
    case "create-routing-form":
      createRoutingForm();
      break;
    case "toggle-routing-form": {
      const id = button.dataset.id;
      const form = state.routing.forms.find((entry) => entry.id === id);
      if (!form) return;
      updateRoutingFormRemote(
        id,
        { active: !form.active },
        !form.active ? "Routing form enabled" : "Routing form paused"
      ).catch((error) => {
        showToast(error?.message || "Could not update routing form");
      });
      break;
    }
    case "delete-routing-form": {
      const id = button.dataset.id;
      deleteRoutingFormRemote(id).catch((error) => {
        showToast(error?.message || "Could not delete routing form");
      });
      break;
    }
    case "route-lead": {
      const id = button.dataset.id;
      const lead = state.routing.leads.find((entry) => entry.id === id);
      if (!lead) return;
      const destination = prompt(
        "Route lead to team",
        state.routing.forms[0]?.destination || lead.routeTo || "Sales Team"
      );
      if (!destination) return;
      routeLeadRemote(id, destination.trim()).catch((error) => {
        showToast(error?.message || "Could not route lead");
      });
      break;
    }
    case "add-routing-lead":
      createRoutingLead();
      break;
    case "landing-save":
      saveLandingPageRemote().catch((error) => {
        state["landing-page"].saving = false;
        showToast(error?.message || "Could not save landing page");
        render();
      });
      break;
    case "landing-preview": {
      const username =
        sanitizeSlug(state["landing-page"].page.username) ||
        sanitizeSlug(state.account.myLink.slug) ||
        "meetscheduling";
      window.open(`/${username}`, "_blank", "noopener");
      break;
    }
    case "landing-copy-link": {
      const username =
        sanitizeSlug(state["landing-page"].page.username) ||
        sanitizeSlug(state.account.myLink.slug) ||
        "meetscheduling";
      copyTextToClipboard(`${window.location.origin}/${username}`).then((copied) => {
        showToast(copied ? "Landing page link copied" : "Copy failed");
      });
      break;
    }
    case "landing-add-service": {
      const services = state["landing-page"].page.services;
      if (services.length >= 8) {
        showToast("Maximum 8 services allowed");
        break;
      }
      services.push({
        title: "New service",
        description: "Describe your offer and who it is for.",
      });
      saveState();
      render();
      break;
    }
    case "landing-remove-service": {
      const index = Number(button.dataset.index);
      const services = state["landing-page"].page.services;
      if (!Number.isInteger(index) || index < 0 || index >= services.length) return;
      services.splice(index, 1);
      saveState();
      render();
      break;
    }
    case "landing-add-gallery": {
      const gallery = state["landing-page"].page.gallery;
      if (gallery.length >= 8) {
        showToast("Maximum 8 gallery images allowed");
        break;
      }
      gallery.push({ url: "", alt: "" });
      saveState();
      render();
      break;
    }
    case "landing-remove-gallery": {
      const index = Number(button.dataset.index);
      const gallery = state["landing-page"].page.gallery;
      if (!Number.isInteger(index) || index < 0 || index >= gallery.length) return;
      gallery.splice(index, 1);
      saveState();
      render();
      break;
    }
    case "landing-refresh-leads":
      state["landing-page"].loading = true;
      render();
      loadLandingPageFromApi(state["landing-page"].leadsStatus)
        .then(() => {
          saveState();
          render();
          showToast("Leads refreshed");
        })
        .catch((error) => {
          state["landing-page"].loading = false;
          showToast(error?.message || "Could not refresh leads");
          render();
        });
      break;
    case "admin-back-home":
      state.activeSection = "meetings";
      saveState();
      render();
      break;
    case "admin-set-page": {
      const page = button.dataset.page;
      const pages = [
        "dashboard",
        "users",
        "groups",
        "login",
        "billing",
        "security",
        "permissions",
        "managed-events",
        "managed-workflows",
      ];
      if (pages.includes(page)) {
        state.admin.activePage = page;
        saveState();
        render();
      }
      break;
    }
    case "admin-users-tab": {
      const tab = button.dataset.tab;
      if (tab === "Active" || tab === "Pending") {
        state.admin.usersTab = tab;
        saveState();
        render();
      }
      break;
    }
    case "admin-security-tab": {
      const tab = button.dataset.tab;
      if (ADMIN_SECURITY_TABS.includes(tab)) {
        state.admin.securityTab = tab;
        saveState();
        render();
      }
      break;
    }
    case "admin-login-tab": {
      const tab = button.dataset.tab;
      if (ADMIN_LOGIN_TABS.includes(tab)) {
        state.admin.loginTab = tab;
        saveState();
        render();
      }
      break;
    }
    case "admin-permissions-tab": {
      const tab = button.dataset.tab;
      if (ADMIN_PERMISSIONS_TABS.includes(tab)) {
        state.admin.permissionsTab = tab;
        saveState();
        render();
      }
      break;
    }
    case "admin-billing-tab": {
      const tab = button.dataset.tab;
      if (ADMIN_BILLING_COMPARE_TABS.includes(tab)) {
        state.admin.billingCompareTab = tab;
        saveState();
        render();
      }
      break;
    }
    case "admin-billing-cycle": {
      const cycle = button.dataset.cycle;
      if (cycle === "yearly" || cycle === "monthly") {
        state.admin.billingCycle = cycle;
        saveState();
        render();
      }
      break;
    }
    case "admin-save-permissions":
      saveState();
      showToast("Permissions saved");
      break;
    case "admin-cancel-permissions":
      state.admin.permissionCreateShared = "all-members";
      saveState();
      render();
      break;
    case "admin-invite-user":
      inviteUser();
      break;
    case "admin-create-group":
      createGroup();
      break;
    case "admin-create-managed-event":
      createManagedEvent();
      break;
    case "admin-create-managed-workflow": {
      const title = prompt("Managed workflow title", "Reminder workflow");
      if (!title) return;
      state.admin.managedWorkflows.push({
        id: makeId("mwf"),
        title: title.trim(),
        trigger: "After booking",
      });
      saveState();
      render();
      break;
    }
    case "admin-remove-managed-event": {
      const id = button.dataset.id;
      state.admin.managedEvents = state.admin.managedEvents.filter(
        (item) => item.id !== id
      );
      saveState();
      render();
      break;
    }
    case "admin-remove-managed-workflow": {
      const id = button.dataset.id;
      state.admin.managedWorkflows = state.admin.managedWorkflows.filter(
        (item) => item.id !== id
      );
      saveState();
      render();
      break;
    }
    case "admin-security-contact":
      showToast("Contact sales clicked");
      break;
    case "admin-billing-select":
      showToast("Plan selected in demo mode");
      break;
    case "admin-upgrade":
      showToast("Upgrade flow in demo mode");
      break;
    case "account-back-home":
      state.activeSection = "meetings";
      saveState();
      render();
      break;
    case "account-set-page": {
      const page = button.dataset.page;
      if (!ACCOUNT_PAGES.includes(page)) return;
      state.account.activePage = page;
      saveState();
      render();
      break;
    }
    case "account-save-profile":
      state.account.profileSaved = structuredCloneOrFallback(state.account.profile);
      saveState();
      showToast("Profile saved");
      break;
    case "account-cancel-profile":
      state.account.profile = structuredCloneOrFallback(state.account.profileSaved);
      saveState();
      render();
      showToast("Profile changes discarded");
      break;
    case "account-delete-account":
      showToast("Delete account request captured");
      break;
    case "account-save-branding":
      state.account.brandingSaved = structuredCloneOrFallback(state.account.branding);
      saveState();
      showToast("Branding saved");
      break;
    case "account-cancel-branding":
      state.account.branding = structuredCloneOrFallback(state.account.brandingSaved);
      saveState();
      render();
      showToast("Branding changes discarded");
      break;
    case "account-update-logo": {
      const value = prompt(
        "Logo image URL (leave blank to use initials)",
        state.account.branding.logoUrl || ""
      );
      if (value === null) return;
      const nextUrl = String(value || "").trim();
      state.account.branding.logoUrl = nextUrl;
      if (!nextUrl) {
        const text = prompt(
          "Logo initials (1-3 letters)",
          state.account.branding.logoText || "WU"
        );
        if (text) {
          state.account.branding.logoText = text.trim().slice(0, 3).toUpperCase();
        }
      }
      saveState();
      render();
      break;
    }
    case "account-remove-logo":
      state.account.branding.logoUrl = "";
      saveState();
      render();
      showToast("Logo removed");
      break;
    case "account-save-link": {
      const slug = sanitizeSlug(state.account.myLink.slug);
      if (!slug) {
        showToast("Enter a valid link");
        return;
      }
      state.account.myLink.slug = slug;
      state.account.myLinkSaved.slug = slug;
      saveState();
      render();
      showToast("Public link updated");
      break;
    }
    case "account-cancel-link":
      state.account.myLink.slug = state.account.myLinkSaved.slug;
      saveState();
      render();
      showToast("Link changes discarded");
      break;
    case "account-login-unlink":
      state.account.loginPreferences.connected = false;
      saveState();
      render();
      showToast("Account unlinked");
      break;
    case "account-login-link-google":
      state.account.loginPreferences.connected = true;
      state.account.loginPreferences.provider = "google";
      if (!state.account.loginPreferences.email) {
        state.account.loginPreferences.email = "yourname@gmail.com";
      }
      saveState();
      render();
      showToast("Google account connected");
      break;
    case "account-login-change-email": {
      const email = prompt(
        "Google account email",
        state.account.loginPreferences.email || "yourname@gmail.com"
      );
      if (!email) return;
      const normalized = String(email).trim().toLowerCase();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
      if (!valid) {
        showToast("Enter a valid email");
        return;
      }
      state.account.loginPreferences.email = normalized;
      state.account.loginPreferences.connected = true;
      state.account.loginPreferences.provider = "google";
      saveState();
      render();
      showToast("Login email changed");
      break;
    }
    case "account-login-switch-provider":
      state.account.loginPreferences.provider =
        state.account.loginPreferences.provider === "google"
          ? "microsoft"
          : "google";
      saveState();
      render();
      showToast(
        state.account.loginPreferences.provider === "google"
          ? "Switched to Google login"
          : "Switched to Microsoft login"
      );
      break;
    case "account-security-tab": {
      const tab = button.dataset.tab;
      if (!ACCOUNT_SECURITY_TABS.includes(tab)) return;
      state.account.security.activeTab = tab;
      saveState();
      render();
      break;
    }
    case "account-enable-2fa":
      openQrModal();
      break;
    case "close-qr-modal":
      closeQrModal();
      break;
    case "submit-qr-modal":
      submitQrModal();
      break;
    case "account-disable-2fa":
      disableTwoFactorAuth();
      break;
    case "account-regenerate-codes":
      // Optional for MVP: We can either implement an endpoint for this or hide the button.
      // Since we don't have a dedicated "regenerate only" endpoint for backup codes without disabling 2FA,
      showToast("To regenerate backup codes, please disable and re-enable 2FA.");
      break;
    case "account-save-cookies":
      saveState();
      showToast("Cookie preferences saved");
      break;
    case "account-contact-support":
      showToast("Support page opened");
      break;
    case "account-logout":
      localStorage.removeItem("meetscheduling_auth_token");
      localStorage.removeItem("meetscheduling_auth_user");
      showToast("Logged out");
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 400);
      break;
    default:
      break;
  }
}

function onViewChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.matches('[data-action="set-show-buffers"]')) {
    state.meetings.showBuffers = target.checked;
    saveState();
    return;
  }

  if (target.matches('[data-action="scheduling-filter"]')) {
    state.scheduling.filter = String(target.value || "all");
    saveState();
    render();
    return;
  }

  if (target.matches('[data-action="contacts-filter"]')) {
    const value = String(target.value || "all");
    if (CONTACT_FILTERS.includes(value)) {
      state.contacts.filter = value;
      loadContactsFromApi()
        .then(() => {
          saveState();
          render();
        })
        .catch((error) => {
          showToast(error?.message || "Could not apply contact filter");
        });
      saveState();
      render();
    }
    return;
  }

  if (target.matches('[data-action="workflows-filter"]')) {
    const value = String(target.value || "all");
    if (WORKFLOW_FILTERS.includes(value)) {
      state.workflows.filter = value;
      loadWorkflowsFromApi()
        .then(() => {
          saveState();
          render();
        })
        .catch((error) => {
          showToast(error?.message || "Could not apply workflow filter");
        });
      saveState();
      render();
    }
    return;
  }

  if (target.matches('[data-action="integrations-filter"]')) {
    const value = String(target.value || "all");
    if (INTEGRATION_FILTERS.includes(value)) {
      state.integrations.filter = value;
      refreshIntegrationsFromApi(state.integrations.activeTab).catch((error) => {
        showToast(error?.message || "Could not apply integration filter");
      });
      saveState();
      render();
    }
    return;
  }

  if (target.matches('[data-action="integrations-sort"]')) {
    const value = String(target.value || "Most popular");
    if (INTEGRATION_SORT_OPTIONS.includes(value)) {
      state.integrations.sort = value;
      refreshIntegrationsFromApi(state.integrations.activeTab).catch((error) => {
        showToast(error?.message || "Could not apply integration sort");
      });
      saveState();
      render();
    }
    return;
  }

  if (target.matches('[data-action="routing-filter"]')) {
    const value = String(target.value || "all");
    if (ROUTING_FILTERS.includes(value)) {
      state.routing.filter = value;
      loadRoutingFromApi()
        .then(() => {
          saveState();
          render();
        })
        .catch((error) => {
          showToast(error?.message || "Could not apply routing filter");
        });
      saveState();
      render();
    }
    return;
  }

  if (target.matches('[data-action="landing-featured-event"]')) {
    state["landing-page"].page.featuredEventTypeId = String(target.value || "");
    saveState();
    return;
  }

  if (target.matches('[data-action="landing-toggle"]')) {
    const field = target.dataset.field;
    if (field === "contactFormEnabled" || field === "isPublished") {
      state["landing-page"].page[field] = !!target.checked;
      saveState();
    }
    return;
  }

  if (target.matches('[data-action="landing-leads-status"]')) {
    const status = String(target.value || "all").toLowerCase();
    if (!LANDING_LEAD_STATUS_FILTERS.includes(status)) return;
    state["landing-page"].leadsStatus = status;
    state["landing-page"].loading = true;
    saveState();
    render();
    loadLandingPageFromApi(status)
      .then(() => {
        saveState();
        render();
      })
      .catch((error) => {
        state["landing-page"].loading = false;
        showToast(error?.message || "Could not load leads");
        render();
      });
    return;
  }

  if (target.matches('[data-action="landing-lead-status"]')) {
    const leadId = target.dataset.id;
    const status = String(target.value || "new").toLowerCase();
    if (!leadId || !LANDING_LEAD_STATUS_FILTERS.includes(status) || status === "all") {
      return;
    }
    updateLandingLeadStatusRemote(leadId, status).catch((error) => {
      showToast(error?.message || "Could not update lead");
      loadLandingPageFromApi(state["landing-page"].leadsStatus)
        .then(() => {
          saveState();
          render();
        })
        .catch(() => null);
    });
    return;
  }

  if (target.matches('[data-action="toggle-event-type"]')) {
    const id = target.dataset.id;
    const item = state.scheduling.eventTypes.find((entry) => entry.id === id);
    if (!item) return;
    setEventTypeActiveRemote(id, target.checked)
      .then(() => {
        showToast(target.checked ? "Event type turned on" : "Event type turned off");
      })
      .catch((error) => {
        target.checked = item.active;
        showToast(error?.message || "Could not update event type");
      });
    return;
  }

  if (target.matches('[data-action="set-timezone"]')) {
    if (TIMEZONES.includes(target.value)) {
      state.availability.timezone = target.value;
      saveState();
    }
    return;
  }

  if (target.matches('[data-action="date-specific-draft"]')) {
    const field = target.dataset.field;
    if (field === "date") {
      availabilityDateSpecificDraft.date = String(target.value || "").slice(0, 10);
      return;
    }
    if (field === "start" || field === "end") {
      availabilityDateSpecificDraft[field] = sanitizeTime(String(target.value || ""));
    }
    return;
  }

  if (target.matches('[data-action="set-calendar-target"]')) {
    state.availability.calendar.selectedCalendarId = target.value;
    saveState();
    queueCalendarSettingsSync();
    return;
  }

  if (target.matches('[data-action="set-calendar-option"]')) {
    const field = target.dataset.field;
    if (field === "includeBuffers" || field === "autoSync") {
      state.availability.calendar[field] = target.checked;
      saveState();
      queueCalendarSettingsSync();
    }
    return;
  }

  if (target.matches('[data-action="set-country"]')) {
    if (HOLIDAY_DATA[target.value]) {
      state.availability.advanced.country = target.value;
      ensureAvailabilityIntegrity(state);
      saveState();
      render();
    }
    return;
  }

  if (target.matches('[data-action="toggle-holiday"]')) {
    const country = state.availability.advanced.country;
    const index = Number(target.dataset.holidayIndex);
    const holiday = HOLIDAY_DATA[country][index];
    if (!holiday) return;
    state.availability.advanced.holidayToggles[country][holiday.name] = target.checked;
    saveState();
    return;
  }

  if (target.matches('[data-action="admin-permission-choice"]')) {
    const value = target.value;
    if (value === "all-members" || value === "no-one") {
      state.admin.permissionCreateShared = value;
      saveState();
    }
    return;
  }

  if (target.matches('[data-action="admin-booking-verification"]')) {
    const id = target.dataset.id;
    const row = state.admin.securityBookingEvents.find((item) => item.id === id);
    if (!row) return;
    row.verification = target.checked;
    saveState();
    return;
  }

  if (target.matches('[data-action="account-profile-field"]')) {
    const field = target.dataset.field;
    if (!field || !(field in state.account.profile)) return;
    state.account.profile[field] = String(target.value || "");
    saveState();
    return;
  }

  if (target.matches('[data-action="account-branding-toggle"]')) {
    const field = target.dataset.field;
    if (!field || !(field in state.account.branding)) return;
    state.account.branding[field] = target.checked;
    saveState();
    return;
  }

  if (target.matches('[data-action="account-communication-toggle"]')) {
    const field = target.dataset.field;
    if (!field || !(field in state.account.communication)) return;
    state.account.communication[field] = target.checked;
    saveState();
    showToast("Saved automatically");
    return;
  }

  if (target.matches('[data-action="account-security-booking-verification"]')) {
    const id = target.dataset.id;
    const row = state.account.security.bookingEvents.find((item) => item.id === id);
    if (!row) return;
    row.verification = target.checked;
    saveState();
    return;
  }

  if (target.matches('[data-action="account-cookie-toggle"]')) {
    const field = target.dataset.field;
    if (!field || !(field in state.account.cookies)) return;
    if (field === "necessary") {
      target.checked = true;
      state.account.cookies.necessary = true;
    } else {
      state.account.cookies[field] = target.checked;
    }
    saveState();
    return;
  }

  if (target.matches('[data-action="interval-change"]')) {
    const dayIndex = Number(target.dataset.dayIndex);
    const slotIndex = Number(target.dataset.slotIndex);
    const field = target.dataset.field;
    const day = state.availability.weeklyHours[dayIndex];
    const slot = day?.intervals?.[slotIndex];
    if (!slot || (field !== "start" && field !== "end")) return;
    slot[field] = sanitizeTime(target.value);
    saveState();
    queueAvailabilitySync();
    return;
  }
}

function onViewInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.matches('[data-action="scheduling-search"]')) {
    state.scheduling.search = target.value || "";
    render();
    return;
  }

  if (target.matches('[data-action="contacts-search"]')) {
    state.contacts.search = target.value || "";
    if (contactsSearchTimer) clearTimeout(contactsSearchTimer);
    contactsSearchTimer = window.setTimeout(() => {
      loadContactsFromApi()
        .then(() => {
          saveState();
          render();
        })
        .catch((error) => {
          showToast(error?.message || "Could not search contacts");
        });
    }, 220);
    render();
    return;
  }

  if (target.matches('[data-action="workflows-search"]')) {
    state.workflows.search = target.value || "";
    if (workflowsSearchTimer) clearTimeout(workflowsSearchTimer);
    workflowsSearchTimer = window.setTimeout(() => {
      loadWorkflowsFromApi()
        .then(() => {
          saveState();
          render();
        })
        .catch((error) => {
          showToast(error?.message || "Could not search workflows");
        });
    }, 220);
    render();
    return;
  }

  if (target.matches('[data-action="integrations-search"]')) {
    state.integrations.search = target.value || "";
    if (integrationsSearchTimer) clearTimeout(integrationsSearchTimer);
    integrationsSearchTimer = window.setTimeout(() => {
      refreshIntegrationsFromApi(state.integrations.activeTab).catch((error) => {
        showToast(error?.message || "Could not search integrations");
      });
    }, 240);
    render();
    return;
  }

  if (target.matches('[data-action="routing-search"]')) {
    state.routing.search = target.value || "";
    if (routingSearchTimer) clearTimeout(routingSearchTimer);
    routingSearchTimer = window.setTimeout(() => {
      loadRoutingFromApi()
        .then(() => {
          saveState();
          render();
        })
        .catch((error) => {
          showToast(error?.message || "Could not search routing data");
        });
    }, 220);
    render();
    return;
  }

  if (target.matches('[data-action="date-specific-draft"]')) {
    const field = target.dataset.field;
    if (field === "date") {
      availabilityDateSpecificDraft.date = String(target.value || "").slice(0, 10);
      return;
    }
    if (field === "start" || field === "end") {
      availabilityDateSpecificDraft[field] = sanitizeTime(String(target.value || ""));
    }
    return;
  }

  if (target.matches('[data-action="landing-field"]')) {
    const field = target.dataset.field;
    if (!field) return;
    const page = state["landing-page"].page;
    if (!(field in page)) return;
    page[field] = String(target.value || "");
    saveState();
    return;
  }

  if (target.matches('[data-action="landing-service-field"]')) {
    const index = Number(target.dataset.index);
    const field = target.dataset.field;
    const item = state["landing-page"].page.services[index];
    if (!item || (field !== "title" && field !== "description")) return;
    item[field] = String(target.value || "");
    saveState();
    return;
  }

  if (target.matches('[data-action="landing-gallery-field"]')) {
    const index = Number(target.dataset.index);
    const field = target.dataset.field;
    const item = state["landing-page"].page.gallery[index];
    if (!item || (field !== "url" && field !== "alt")) return;
    item[field] = String(target.value || "");
    saveState();
    return;
  }

  if (target.matches('[data-action="admin-security-search"]')) {
    state.admin.securityBookingSearch = target.value || "";
    render();
    return;
  }

  if (target.matches('[data-action="account-profile-field"]')) {
    const field = target.dataset.field;
    if (!field || !(field in state.account.profile)) return;
    state.account.profile[field] = String(target.value || "");
    return;
  }

  if (target.matches('[data-action="account-link-input"]')) {
    state.account.myLink.slug = String(target.value || "");
    return;
  }

  if (target.matches('[data-action="account-security-search"]')) {
    state.account.security.bookingSearch = target.value || "";
    render();
  }
}

function openSidebar() {
  if (!sidebar || !sidebarOverlay) return;
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("show");
}

function closeSidebar() {
  if (!sidebar || !sidebarOverlay) return;
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");
}

function loadSidebarCollapsePreference() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveSidebarCollapsePreference(value) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Ignore localStorage failures.
  }
}

function applySidebarCollapse() {
  const shouldCollapse = window.innerWidth > 1120 && isSidebarCollapsed;
  document.body.classList.toggle("sidebar-collapsed", shouldCollapse);

  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.setAttribute("aria-expanded", String(!shouldCollapse));
    sidebarCollapseBtn.setAttribute(
      "aria-label",
      shouldCollapse ? "Expand sidebar" : "Collapse sidebar"
    );
  }
}

function toggleCreateMenu(trigger) {
  if (!createMenu) return;
  const shouldOpen = createMenu.hidden;
  if (!shouldOpen) {
    closeCreateMenu();
    return;
  }

  renderCreateMenu();
  createMenu.hidden = false;
  positionCreateMenu(trigger);
  headerCreateBtn?.setAttribute("aria-expanded", "true");
  sidebarCreateBtn?.setAttribute("aria-expanded", "true");
}

function closeCreateMenu() {
  if (!createMenu) return;
  createMenu.hidden = true;
  createMenu.classList.remove("anchor-sidebar", "anchor-header");
  headerCreateBtn?.setAttribute("aria-expanded", "false");
  sidebarCreateBtn?.setAttribute("aria-expanded", "false");
}

function positionCreateMenu(trigger) {
  if (!createMenu) return;
  const anchor = trigger instanceof HTMLElement ? trigger : headerCreateBtn;
  if (!(anchor instanceof HTMLElement)) return;

  const rect = anchor.getBoundingClientRect();
  const isSidebarAnchor = anchor.id === "sidebar-create-btn";
  createMenu.classList.toggle("anchor-sidebar", isSidebarAnchor);
  createMenu.classList.toggle("anchor-header", !isSidebarAnchor);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const estimatedWidth = Math.min(680, Math.max(360, viewportWidth - 24));
  const estimatedHeight = Math.min(760, viewportHeight - 24);

  if (viewportWidth <= 900) {
    createMenu.style.left = "12px";
    createMenu.style.right = "12px";
    createMenu.style.top = "74px";
    createMenu.classList.remove("anchor-sidebar");
    createMenu.classList.add("anchor-header");
    return;
  }

  if (isSidebarAnchor) {
    const leftBase = Math.max(12, rect.right + 10);
    const topBase = Math.max(12, Math.min(rect.top - 20, viewportHeight - estimatedHeight - 12));
    createMenu.style.left = `${leftBase}px`;
    createMenu.style.top = `${topBase}px`;
    createMenu.style.right = "auto";
  } else {
    const topBase = Math.max(74, rect.bottom + 10);
    const rightBase = Math.max(12, viewportWidth - rect.right);
    createMenu.style.top = `${topBase}px`;
    createMenu.style.right = `${rightBase}px`;
    createMenu.style.left = "auto";
  }
}

function renderCreateMenu() {
  if (!createMenu) return;

  const adminOpen = createMenuSections.adminTemplates;
  const moreOpen = createMenuSections.moreWays;

  createMenu.innerHTML = `
    <div class="create-menu-shell">
      <button class="create-primary-action" type="button" data-create="meeting">
        <span class="create-icon">+</span>
        <span>Create meeting</span>
      </button>

      <div class="create-menu-group">
        <h3>Event Types</h3>
        <button class="create-option-card" type="button" data-create="eventTypeOneOnOne">
          <strong>One-on-one</strong>
          <p>1 host <span class="arrow">→</span> 1 invitee</p>
          <small>Good for coffee chats, 1:1 interviews, etc.</small>
        </button>
        <button class="create-option-card" type="button" data-create="eventTypeGroup">
          <strong>Group</strong>
          <p>1 host <span class="arrow">→</span> Multiple invitees</p>
          <small>Webinars, online classes, etc.</small>
        </button>
        <button class="create-option-card" type="button" data-create="eventTypeRoundRobin">
          <strong>Round robin</strong>
          <p>Rotating hosts <span class="arrow">→</span> 1 invitee</p>
          <small>Distribute meetings between team members.</small>
        </button>
      </div>

      <section class="create-accordion">
        <button
          class="create-accordion-toggle"
          type="button"
          data-create-section="adminTemplates"
          aria-expanded="${adminOpen ? "true" : "false"}"
        >
          <span>Admin Templates</span>
          <span class="chevron">${adminOpen ? "⌃" : "⌄"}</span>
        </button>
        <div class="create-accordion-panel" ${adminOpen ? "" : "hidden"}>
          <button class="create-option-card compact" type="button" data-create="templateOneOnOne">
            <strong>One-on-one</strong>
            <p>1 host <span class="arrow">→</span> 1 invitee</p>
            <small>Good for coffee chats, 1:1 interviews, etc.</small>
          </button>
          <button class="create-option-card compact" type="button" data-create="templateGroup">
            <strong>Group</strong>
            <p>1 host <span class="arrow">→</span> Multiple invitees</p>
            <small>Webinars, online classes, etc.</small>
          </button>
        </div>
      </section>

      <section class="create-accordion">
        <button
          class="create-accordion-toggle"
          type="button"
          data-create-section="moreWays"
          aria-expanded="${moreOpen ? "true" : "false"}"
        >
          <span>More ways to meet</span>
          <span class="chevron">${moreOpen ? "⌃" : "⌄"}</span>
        </button>
        <div class="create-accordion-panel" ${moreOpen ? "" : "hidden"}>
          <button class="create-option-card compact" type="button" data-create="eventTypeCollective">
            <strong>Collective</strong>
            <p>Multiple hosts <span class="arrow">→</span> 1 invitee</p>
            <small>Panel interviews, group sales calls, etc.</small>
          </button>
          <button class="create-option-card compact" type="button" data-create="oneOffMeeting">
            <strong>One-off meeting</strong>
            <p>Offer time outside your normal schedule</p>
            <small>Create a single-use booking link instantly.</small>
          </button>
          <button class="create-option-card compact" type="button" data-create="meetingPoll">
            <strong>Meeting poll</strong>
            <p>Let invitees vote on a time to meet</p>
            <small>Perfect for scheduling with groups.</small>
          </button>
        </div>
      </section>
    </div>
  `;
}

function toggleProfileMenu() {
  if (!profileMenu) return;
  profileMenu.hidden = !profileMenu.hidden;
  profileMenuBtn?.setAttribute("aria-expanded", String(!profileMenu.hidden));
}

function closeProfileMenu() {
  if (!profileMenu) return;
  profileMenu.hidden = true;
  profileMenuBtn?.setAttribute("aria-expanded", "false");
}

function handleGlobalAction(action) {
  switch (action) {
    case "profile-upgrade":
      state.activeSection = "admin";
      state.admin.activePage = "billing";
      showToast("Opening billing");
      break;
    case "profile-go-profile":
      state.activeSection = "account";
      state.account.activePage = "profile";
      break;
    case "profile-go-branding":
      state.activeSection = "account";
      state.account.activePage = "branding";
      break;
    case "profile-go-link":
      state.activeSection = "account";
      state.account.activePage = "my-link";
      break;
    case "profile-go-security":
      state.activeSection = "account";
      state.account.activePage = "security";
      state.account.security.activeTab = "Google Authenticator";
      break;
    case "profile-go-settings":
      state.activeSection = "account";
      state.account.activePage = "profile";
      break;
    case "profile-guide":
      showToast("Guide opened");
      break;
    case "profile-community":
      showToast("Community opened");
      break;
    case "profile-visit-site":
      showToast("Demo mode: external link disabled");
      break;
    case "profile-logout":
      localStorage.removeItem("meetscheduling_auth_token");
      localStorage.removeItem("meetscheduling_auth_user");
      showToast("Logged out (demo)");
      window.setTimeout(() => {
        window.location.href = "/login";
      }, 400);
      break;
    default:
      break;
  }
  saveState();
  render();
}

function handleCreate(type) {
  switch (type) {
    case "meeting":
      state.activeSection = "meetings";
      state.meetings.activeTab = "Upcoming";
      createMeeting();
      break;
    case "eventTypeOneOnOne":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      createEventTypeFromPreset({
        name: "One-on-one meeting",
        duration: 30,
        eventKind: "One-on-One",
        locationType: "Google Meet",
        availabilityLabel: "Weekdays, 9 am - 5 pm",
      });
      break;
    case "eventTypeGroup":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      createEventTypeFromPreset({
        name: "Group session",
        duration: 60,
        eventKind: "Group",
        locationType: "Zoom",
        availabilityLabel: "Tue/Thu, 11 am - 6 pm",
      });
      break;
    case "eventTypeRoundRobin":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      createEventTypeFromPreset({
        name: "Round robin call",
        duration: 30,
        eventKind: "Round robin",
        locationType: "Google Meet",
        availabilityLabel: "Mon-Fri, 10 am - 6 pm",
      });
      break;
    case "templateOneOnOne":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      createEventTypeFromPreset({
        name: "Template: One-on-one",
        duration: 30,
        eventKind: "One-on-One",
        locationType: "No location set",
        availabilityLabel: "Weekdays, 9 am - 5 pm",
      });
      break;
    case "templateGroup":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      createEventTypeFromPreset({
        name: "Template: Group",
        duration: 45,
        eventKind: "Group",
        locationType: "No location set",
        availabilityLabel: "Weekdays, 10 am - 4 pm",
      });
      break;
    case "eventTypeCollective":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      createEventTypeFromPreset({
        name: "Collective meeting",
        duration: 45,
        eventKind: "Collective",
        locationType: "Google Meet",
        availabilityLabel: "Mon/Wed/Fri, 1 pm - 7 pm",
      });
      break;
    case "oneOffMeeting":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Single-use links";
      createSingleUseLink();
      break;
    case "eventType":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Event types";
      createEventType();
      break;
    case "singleUseLink":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Single-use links";
      createSingleUseLink();
      break;
    case "meetingPoll":
      state.activeSection = "scheduling";
      state.scheduling.activeTab = "Meeting polls";
      createMeetingPoll();
      break;
    case "user":
      state.activeSection = "admin";
      state.admin.activePage = "users";
      inviteUser();
      break;
    case "group":
      state.activeSection = "admin";
      state.admin.activePage = "groups";
      createGroup();
      break;
    case "managedEvent":
      state.activeSection = "admin";
      state.admin.activePage = "managed-events";
      createManagedEvent();
      break;
    default:
      break;
  }
}

async function createEventTypeFromPreset(preset) {
  const name = String(preset?.name || "New event type").trim();
  const duration = Math.max(5, Number(preset?.duration) || 30);
  const eventKind = EVENT_TYPE_KIND_OPTIONS.includes(preset?.eventKind)
    ? preset.eventKind
    : "One-on-One";
  const locationType = EVENT_TYPE_LOCATION_OPTIONS.includes(preset?.locationType)
    ? preset.locationType
    : "No location set";
  const availabilityLabel =
    String(preset?.availabilityLabel || "").trim() || "Weekdays, 9 am - 5 pm";

  try {
    await createEventTypeRemote(
      {
        id: makeId("evt"),
        name,
        description: "",
        duration,
        slug: makeUniqueEventSlug(name),
        active: true,
        locationType,
        eventKind,
        availabilityLabel,
        color:
          EVENT_TYPE_ACCENT_COLORS[
          state.scheduling.eventTypes.length % EVENT_TYPE_ACCENT_COLORS.length
          ],
        internalNote: "",
        inviteeLanguage: "English",
        secret: false,
      },
      `${name} created`
    );
  } catch (error) {
    showToast(error?.message || "Could not create event type");
  }
}

function createMeeting() {
  const title = prompt("Meeting title", "New client call");
  if (!title) return;
  const date = prompt("Date (YYYY-MM-DD)", todayIso());
  if (!date) return;
  const time = prompt("Time (HH:MM)", "10:00");
  if (!time) return;

  state.meetings.events.Upcoming.unshift({
    id: makeId("mtg"),
    title: title.trim(),
    time: `${date} ${time}`,
    status: "Confirmed",
  });

  saveState();
  render();
  showToast("Meeting created");
}

async function createEventType() {
  const name = prompt("Event type name", "30 Minute Meeting");
  if (!name) return;
  const minutesRaw = prompt("Duration in minutes", "30");
  const minutes = Math.max(5, Number(minutesRaw || 30) || 30);
  const slug = makeUniqueEventSlug(name);
  const locationInput = prompt(
    `Location type (${EVENT_TYPE_LOCATION_OPTIONS.join(" / ")})`,
    "No location set"
  );
  const resolvedLocation = EVENT_TYPE_LOCATION_OPTIONS.find(
    (entry) => entry.toLowerCase() === String(locationInput || "").trim().toLowerCase()
  );
  const safeLocation = resolvedLocation || "No location set";

  let customLocationValue = "";
  if (safeLocation === "Custom") {
    const customLocationInput = prompt("Custom location", "Google Meet link");
    if (customLocationInput === null) return;
    customLocationValue = String(customLocationInput || "").trim();
  }

  try {
    await createEventTypeRemote(
      {
        id: makeId("evt"),
        name: name.trim(),
        description: "",
        duration: minutes,
        slug: slug || `event-${Date.now()}`,
        active: true,
        locationType: safeLocation,
        customLocationValue,
        eventKind: "One-on-One",
        availabilityLabel: "Weekdays, 9 am - 5 pm",
        color:
          EVENT_TYPE_ACCENT_COLORS[
          state.scheduling.eventTypes.length % EVENT_TYPE_ACCENT_COLORS.length
          ],
        internalNote: "",
        inviteeLanguage: "English",
        secret: false,
      },
      "Event type added"
    );
  } catch (error) {
    showToast(error?.message || "Could not add event type");
  }
}

function createSingleUseLink() {
  const title = prompt("Single-use link title", "Coffee chat meeting");
  if (!title) return;
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  state.scheduling.singleUseLinks.unshift({
    id: makeId("lnk"),
    title: title.trim(),
    slug: slug || `single-${Date.now()}`,
    status: "active",
    createdAt: todayIso(),
  });

  saveState();
  render();
  showToast("Single-use link created");
}

function createMeetingPoll() {
  const title = prompt("Meeting poll title", "Team planning poll");
  if (!title) return;

  state.scheduling.meetingPolls.unshift({
    id: makeId("pol"),
    title: title.trim(),
    status: "open",
    votes: 0,
    createdAt: todayIso(),
  });

  saveState();
  render();
  showToast("Meeting poll created");
}

function inviteUser() {
  const name = prompt("User name", "New user");
  if (!name) return;
  const email = prompt("User email", "new.user@example.com");
  if (!email) return;

  state.admin.users.push({
    id: makeId("usr"),
    name: name.trim(),
    email: email.trim(),
    status: "Pending",
  });
  state.admin.usersTab = "Pending";
  saveState();
  render();
  showToast("Invitation sent");
}

function createGroup() {
  const name = prompt("Group name", "Sales Team");
  if (!name) return;

  state.admin.groups.push({
    id: makeId("grp"),
    name: name.trim(),
    members: 0,
  });
  saveState();
  render();
  showToast("Group created");
}

function createManagedEvent() {
  const title = prompt("Managed event title", "Company intro call");
  if (!title) return;
  state.admin.managedEvents.push({
    id: makeId("mevt"),
    title: title.trim(),
    owner: "Admin",
  });
  saveState();
  render();
  showToast("Managed event created");
}

async function createContact() {
  const name = prompt("Contact name", "New contact");
  if (!name) return;
  const email = prompt("Contact email", "contact@example.com");
  if (!email) return;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    showToast("Enter a valid contact email");
    return;
  }
  const company = prompt("Company", "Company") || "Company";
  const rawType = prompt("Type (Lead/Customer)", "Lead") || "Lead";
  const type = rawType.trim().toLowerCase() === "customer" ? "Customer" : "Lead";
  try {
    await apiRequest("/api/contacts", {
      method: "POST",
      body: JSON.stringify({
        name: String(name || "").trim() || "Contact",
        email: normalizedEmail,
        company: String(company || "").trim() || "Company",
        type,
      }),
    });
    await loadContactsFromApi();
    saveState();
    render();
    showToast("Contact created");
  } catch (error) {
    showToast(error?.message || "Could not create contact");
  }
}

async function updateContactRemote(contactId, payload, successMessage) {
  await apiRequest(`/api/contacts/${encodeURIComponent(contactId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await loadContactsFromApi();
  saveState();
  render();
  if (successMessage) showToast(successMessage);
}

async function deleteContactRemote(contactId) {
  await apiRequest(`/api/contacts/${encodeURIComponent(contactId)}`, {
    method: "DELETE",
  });
  await loadContactsFromApi();
  saveState();
  render();
  showToast("Contact deleted");
}

async function toggleContactVipRemote(contactId) {
  const item = state.contacts.items.find((entry) => entry.id === contactId);
  if (!item) return;
  const hasVip = (item.tags || []).includes("VIP");
  const tags = hasVip
    ? (item.tags || []).filter((tag) => tag !== "VIP")
    : [...(item.tags || []), "VIP"];
  await updateContactRemote(contactId, { tags }, hasVip ? "VIP removed" : "Marked as VIP");
}

async function createWorkflow() {
  const name = prompt("Workflow name", "Booking reminder");
  if (!name) return;
  const trigger = prompt("Trigger", "24h before event") || "24h before event";
  const channel = prompt("Channel", "Email") || "Email";
  const offset = prompt("Offset", "24 hours before") || "24 hours before";
  try {
    await apiRequest("/api/workflows", {
      method: "POST",
      body: JSON.stringify({
        name: String(name || "").trim() || "Workflow",
        trigger: String(trigger || "").trim() || "After booking",
        channel: String(channel || "").trim() || "Email",
        offset: String(offset || "").trim() || "24 hours before",
        status: "draft",
      }),
    });
    await loadWorkflowsFromApi();
    saveState();
    render();
    showToast("Workflow created");
  } catch (error) {
    showToast(error?.message || "Could not create workflow");
  }
}

async function updateWorkflowRemote(workflowId, payload, successMessage = "") {
  await apiRequest(`/api/workflows/${encodeURIComponent(workflowId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await loadWorkflowsFromApi();
  saveState();
  render();
  if (successMessage) showToast(successMessage);
}

async function toggleWorkflowStatusRemote(workflowId) {
  const item = state.workflows.items.find((entry) => entry.id === workflowId);
  if (!item) return;
  const nextStatus = item.status === "active" ? "paused" : "active";
  await updateWorkflowRemote(
    workflowId,
    { status: nextStatus },
    nextStatus === "active" ? "Workflow activated" : "Workflow paused"
  );
}

async function duplicateWorkflowRemote(workflowId) {
  await apiRequest(`/api/workflows/${encodeURIComponent(workflowId)}/duplicate`, {
    method: "POST",
  });
  await loadWorkflowsFromApi();
  saveState();
  render();
  showToast("Workflow duplicated");
}

async function runWorkflowRemote(workflowId) {
  await apiRequest(`/api/workflows/${encodeURIComponent(workflowId)}/run`, {
    method: "POST",
  });
  await loadWorkflowsFromApi();
  saveState();
  render();
  showToast("Workflow run started");
}

async function deleteWorkflowRemote(workflowId) {
  await apiRequest(`/api/workflows/${encodeURIComponent(workflowId)}`, {
    method: "DELETE",
  });
  await loadWorkflowsFromApi();
  saveState();
  render();
  showToast("Workflow deleted");
}

async function connectIntegration() {
  const name = prompt("Integration name", "Custom App");
  if (!name) return;
  const safeName = String(name || "").trim();
  if (!safeName) return;

  const category = prompt("Category", "Automation") || "Automation";
  const account = prompt("Account email", DEFAULT_INTEGRATION_ACCOUNT);
  if (account === null) return;
  const normalized = String(account || "").trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    showToast("Valid account email is required");
    return;
  }

  const provider = sanitizeSlug(safeName).replace(/-/g, "-");
  try {
    await apiRequest("/api/integrations/connect", {
      method: "POST",
      body: JSON.stringify({
        provider,
        displayName: safeName,
        category: String(category || "").trim() || "Automation",
        accountEmail: normalized,
        metadata: {
          description: `Connect ${safeName} with your Meetscheduling workflow.`,
        },
      }),
    });
    await refreshIntegrationsFromApi("Manage");
    saveState();
    render();
    showToast("Integration connected");
  } catch (error) {
    showToast(error?.message || "Could not connect integration");
  }
}

async function setAllIntegrationsConnection(connected) {
  try {
    if (connected) {
      await apiRequest("/api/integrations/connect-all", {
        method: "POST",
        body: JSON.stringify({ accountEmail: DEFAULT_INTEGRATION_ACCOUNT }),
      });
      await refreshIntegrationsFromApi("Manage");
      showToast("All integrations connected");
    } else {
      await apiRequest("/api/integrations/disconnect-all", {
        method: "POST",
      });
      await refreshIntegrationsFromApi("Discover");
      showToast("All integrations disconnected");
    }
    saveState();
    render();
  } catch (error) {
    showToast(error?.message || "Could not update integrations");
  }
}

async function toggleIntegrationById(id) {
  const item = state.integrations.items.find((entry) => entry.id === id);
  if (!item) return;

  if (item.key === "google-calendar" && !item.connected) {
    try {
      await startGoogleCalendarOAuth();
    } catch (error) {
      showToast(error?.message || "Could not connect Google Calendar");
    }
    return;
  }

  try {
    await apiRequest(
      `/api/integrations/${encodeURIComponent(item.key)}/connection`,
      {
        method: "PATCH",
        body: JSON.stringify({ connected: !item.connected }),
      }
    );
    await refreshIntegrationsFromApi(state.integrations.activeTab);
    saveState();
    render();
    showToast(!item.connected ? `${item.name} connected` : `${item.name} disconnected`);
  } catch (error) {
    showToast(error?.message || "Could not update integration");
  }
}

function openAvailabilityCalendarSettings() {
  state.integrations.detailKey = "";
  state.activeSection = "availability";
  state.availability.activeTab = "Calendar settings";
  openMeetingDetailsId = null;
  refreshCalendarSettingsFromApi().catch(() => null);
  saveState();
  render();
}

function openIntegrationDetailByKey(key) {
  if (!INTEGRATION_DETAIL_KEYS.has(String(key || ""))) return;
  state.activeSection = "integrations";
  state.integrations.detailKey = key;
  saveState();
  render();
}

async function configureIntegrationById(id) {
  const item = state.integrations.items.find((entry) => entry.id === id);
  if (!item) return;

  if (item.key === "google-meet") {
    openIntegrationDetailByKey("google-meet");
    return;
  }

  if (item.key === "google-calendar") {
    openAvailabilityCalendarSettings();
    return;
  }

  const account = prompt(
    `${item.name} account email`,
    item.account || DEFAULT_INTEGRATION_ACCOUNT
  );
  if (account === null) return;
  const normalized = String(account || "").trim().toLowerCase();
  if (!normalized) {
    showToast("Account email is required");
    return;
  }

  try {
    await apiRequest(
      `/api/integrations/${encodeURIComponent(item.key)}/configure`,
      {
        method: "PATCH",
        body: JSON.stringify({ accountEmail: normalized }),
      }
    );
    await refreshIntegrationsFromApi("Manage");
    saveState();
    render();
    showToast("Integration updated");
  } catch (error) {
    showToast(error?.message || "Could not configure integration");
  }
}

async function deleteIntegrationById(id) {
  const item = state.integrations.items.find((entry) => entry.id === id);
  if (!item) return;
  try {
    await apiRequest(`/api/integrations/${encodeURIComponent(item.key)}`, {
      method: "DELETE",
    });
    await refreshIntegrationsFromApi(state.integrations.activeTab);
    saveState();
    render();
    showToast("Integration removed");
  } catch (error) {
    showToast(error?.message || "Could not remove integration");
  }
}

async function createRoutingForm() {
  const name = prompt("Routing form name", "Inbound lead form");
  if (!name) return;
  const destination = prompt("Route destination", "Sales Team") || "Sales Team";
  const priority = prompt("Priority (high/normal)", "normal") || "normal";
  try {
    await apiRequest("/api/routing/forms", {
      method: "POST",
      body: JSON.stringify({
        name: String(name || "").trim() || "Routing form",
        destination: String(destination || "").trim() || "Sales Team",
        priority:
          String(priority || "").trim().toLowerCase() === "high" ? "high" : "normal",
      }),
    });
    await loadRoutingFromApi();
    saveState();
    render();
    showToast("Routing form created");
  } catch (error) {
    showToast(error?.message || "Could not create routing form");
  }
}

async function updateRoutingFormRemote(formId, payload, successMessage = "") {
  await apiRequest(`/api/routing/forms/${encodeURIComponent(formId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await loadRoutingFromApi();
  saveState();
  render();
  if (successMessage) showToast(successMessage);
}

async function deleteRoutingFormRemote(formId) {
  await apiRequest(`/api/routing/forms/${encodeURIComponent(formId)}`, {
    method: "DELETE",
  });
  await loadRoutingFromApi();
  saveState();
  render();
  showToast("Routing form deleted");
}

async function createRoutingLead() {
  const name = prompt("Lead name", "New lead");
  if (!name) return;
  const email = prompt("Lead email", "lead@example.com");
  if (!email) return;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    showToast("Enter a valid lead email");
    return;
  }
  const company = prompt("Company", "Company") || "Company";
  try {
    await apiRequest("/api/routing/leads", {
      method: "POST",
      body: JSON.stringify({
        name: String(name || "").trim() || "Lead",
        email: normalizedEmail,
        company: String(company || "").trim() || "Company",
      }),
    });
    await loadRoutingFromApi();
    saveState();
    render();
    showToast("Lead added");
  } catch (error) {
    showToast(error?.message || "Could not add lead");
  }
}

async function routeLeadRemote(leadId, routeTo) {
  await apiRequest(`/api/routing/leads/${encodeURIComponent(leadId)}/route`, {
    method: "POST",
    body: JSON.stringify({ routeTo }),
  });
  await loadRoutingFromApi();
  saveState();
  render();
  showToast("Lead routed");
}

function addDateSpecificHours(presetDate) {
  openAvailabilityDateSpecificDraft(presetDate);
  render();
}

async function startGoogleCalendarOAuth() {
  const payload = await apiRequest("/api/integrations/google-calendar/auth-url");
  const url = String(payload?.url || "").trim();
  if (!url) throw new Error("Could not start Google Calendar OAuth");
  window.location.assign(url);
}

async function connectCalendar() {
  try {
    await startGoogleCalendarOAuth();
  } catch (error) {
    showToast(error?.message || "Could not connect Google Calendar");
  }
}

async function syncCalendarByProvider(provider) {
  const providerKey = normalizeCalendarProviderInput(provider) || String(provider || "").trim();
  if (!providerKey) return;

  try {
    const payload = await apiRequest(
      `/api/integrations/calendars/${encodeURIComponent(providerKey)}/sync`,
      {
        method: "POST",
      }
    );
    await Promise.all([
      refreshIntegrationsFromApi(state.integrations.activeTab),
      refreshCalendarSettingsFromApi(),
    ]);
    saveState();
    render();
    const syncedCount = Number(payload?.syncedBookingsCount || 0);
    showToast(
      `${getCalendarProviderLabel(providerKey)} synced${syncedCount ? ` (${syncedCount} upcoming bookings)` : ""}`
    );
  } catch (error) {
    showToast(error?.message || "Could not sync calendar");
  }
}

function addMeetingLimit() {
  const label = prompt("Limit name", "No more than 6 meetings per day");
  if (!label) return;
  const value = prompt("Max value", "6");
  if (!value) return;

  state.availability.advanced.meetingLimits.push({
    id: makeId("lim"),
    label: label.trim(),
    value: Number(value) || value,
  });

  saveState();
  render();
}

function render() {
  document.body.setAttribute("data-active-section", state.activeSection || "");
  renderSidebar();
  renderHeader();
  renderSectionTabs();
  renderView();
}

function renderSidebar() {
  document.body.classList.toggle(
    "admin-mode",
    state.activeSection === "admin" || state.activeSection === "account"
  );
  applySidebarCollapse();
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.section === state.activeSection
    );
  });
}

function renderHeader() {
  const titleMap = {
    meetings: "Meetings",
    scheduling: "Scheduling",
    availability: "Availability",
    contacts: "Contacts",
    workflows: "Workflows",
    integrations: "Integrations & apps",
    routing: "Routing",
    "landing-page": "Landing page",
    analytics: "Analytics",
    admin: getAdminPageMeta().title,
    account: getAccountPageMeta().title,
  };

  if (pageTitleEl) pageTitleEl.textContent = titleMap[state.activeSection] || "Dashboard";
  if (pageHelpEl) {
    const hideHelp =
      state.activeSection === "availability" ||
      state.activeSection === "account" ||
      (state.activeSection === "admin" &&
        ["billing", "managed-events", "managed-workflows", "groups", "users"].includes(
          state.admin.activePage
        ));
    pageHelpEl.classList.toggle("hidden", hideHelp);
  }

  if (pageContextEl) {
    const context = state.activeSection === "admin"
      ? getAdminPageMeta().context
      : state.activeSection === "account"
        ? getAccountPageMeta().context
        : "";
    pageContextEl.textContent = context;
  }

  if (pageActionsEl) {
    pageActionsEl.innerHTML = renderPageActions();
  }

  if (headerCreateBtn) {
    const adminCreateVisible = state.activeSection === "admin" &&
      ["managed-events", "managed-workflows"].includes(state.admin.activePage);
    headerCreateBtn.classList.toggle(
      "visible",
      state.activeSection === "scheduling" || adminCreateVisible
    );
  }
}

function renderSectionTabs() {
  if (!sectionTabsEl) return;
  let tabs = [];
  let active = "";

  if (state.activeSection === "scheduling") {
    tabs = SCHEDULING_TABS.map((item) => ({ value: item, label: item }));
    active = state.scheduling.activeTab;
  } else if (state.activeSection === "availability") {
    tabs = AVAILABILITY_TABS.map((item) => ({ value: item, label: item }));
    active = state.availability.activeTab;
  } else if (state.activeSection === "integrations") {
    if (!state.integrations.detailKey) {
      const connectedCount = state.integrations.items.filter((item) => item.connected).length;
      tabs = INTEGRATION_TABS.map((item) => ({
        value: item,
        label:
          item === "Discover"
            ? `Discover (${state.integrations.items.length})`
            : `Manage (${connectedCount})`,
      }));
      active = state.integrations.activeTab;
    }
  }

  sectionTabsEl.classList.toggle("hidden", tabs.length === 0);
  if (!tabs.length) {
    sectionTabsEl.innerHTML = "";
    return;
  }

  sectionTabsEl.innerHTML = tabs
    .map(
      (tab) => `
      <button class="section-tab ${tab.value === active ? "active" : ""}" type="button" data-tab="${escapeHtml(
        tab.value
      )}">
        ${escapeHtml(tab.label)}
      </button>`
    )
    .join("");
}

function renderView() {
  if (!viewRoot) return;

  if (state.activeSection === "meetings") {
    viewRoot.innerHTML = renderMeetingsView();
    return;
  }

  if (state.activeSection === "scheduling") {
    viewRoot.innerHTML = renderSchedulingView();
    return;
  }

  if (state.activeSection === "availability") {
    viewRoot.innerHTML = renderAvailabilityView();
    return;
  }

  if (state.activeSection === "contacts") {
    viewRoot.innerHTML = renderContactsView();
    return;
  }

  if (state.activeSection === "workflows") {
    viewRoot.innerHTML = renderWorkflowsView();
    return;
  }

  if (state.activeSection === "integrations") {
    viewRoot.innerHTML = renderIntegrationsView();
    return;
  }

  if (state.activeSection === "routing") {
    viewRoot.innerHTML = renderRoutingView();
    return;
  }

  if (state.activeSection === "landing-page") {
    viewRoot.innerHTML = renderLandingPageView();
    return;
  }

  if (state.activeSection === "analytics") {
    viewRoot.innerHTML = renderAnalyticsView();
    return;
  }

  if (state.activeSection === "account") {
    viewRoot.innerHTML = renderAccountView();
    return;
  }

  viewRoot.innerHTML = renderAdminView();
}

function getAdminPageMeta() {
  const map = {
    dashboard: { title: "Dashboard", context: "Admin center" },
    users: { title: "Users", context: "Organization settings" },
    groups: { title: "Groups", context: "Organization settings" },
    login: { title: "Login", context: "Organization settings" },
    billing: { title: "Billing", context: "Organization settings" },
    security: { title: "Security", context: "Organization settings" },
    permissions: { title: "Permissions", context: "Scheduling settings" },
    "managed-events": { title: "Managed events", context: "Scheduling settings" },
    "managed-workflows": {
      title: "Managed workflows",
      context: "Scheduling settings",
    },
  };
  return map[state.admin.activePage] || { title: "Admin center", context: "" };
}

function getAccountPageMeta() {
  const map = {
    profile: { title: "Profile", context: "Account details" },
    branding: { title: "Branding", context: "Account details" },
    "my-link": { title: "My link", context: "Account details" },
    "communication-settings": {
      title: "Communication settings",
      context: "Account details",
    },
    "login-preferences": { title: "Login preferences", context: "Account details" },
    security: { title: "Security", context: "Account details" },
    "cookie-settings": { title: "Cookie settings", context: "Account details" },
  };
  return map[state.account.activePage] || { title: "Account settings", context: "" };
}

function renderPageActions() {
  if (state.activeSection !== "admin") return "";
  switch (state.admin.activePage) {
    case "users":
      return '<button class="primary-btn" type="button" data-action="admin-invite-user">Invite users</button>';
    case "groups":
      return '<button class="primary-btn" type="button" data-action="admin-create-group" disabled>+ New group</button>';
    case "managed-events":
      return '<button class="primary-btn" type="button" data-action="admin-create-managed-event">+ New managed event</button>';
    case "managed-workflows":
      return '<button class="primary-btn" type="button" data-action="admin-create-managed-workflow">+ New managed workflow</button>';
    default:
      return "";
  }
}

function renderAnalyticsView() {
  const tab = state.analytics.activeTab;
  return `
    <section class="admin-tabs">
      ${ANALYTICS_TABS.map(
    (item) => `
        <button class="admin-tab ${tab === item ? "active" : ""}" type="button" data-action="set-analytics-tab" data-tab="${item}">
          ${escapeHtml(item)}
        </button>
      `
  ).join("")}
    </section>

    <section class="analytics-grid">
      <div class="analytics-counters">
        <article class="analytics-card"><p class="label">Booked events</p><p class="value">0</p></article>
        <article class="analytics-card"><p class="label">Canceled events</p><p class="value">0</p></article>
        <article class="analytics-card"><p class="label">No-shows</p><p class="value">0</p></article>
        <article class="analytics-card"><p class="label">Completion rate</p><p class="value">0%</p></article>
      </div>

      ${tab === "Events"
      ? `
          <div class="analytics-panels">
            <article class="analytics-panel"><h3>Completed events trend</h3><div class="no-data">No data available</div></article>
            <article class="analytics-panel"><h3>Event distribution by duration</h3><div class="no-data">No data available</div></article>
            <article class="analytics-panel"><h3>Popular events</h3><div class="no-data">No data available</div></article>
            <article class="analytics-panel"><h3>Popular times</h3><div class="no-data">No data available</div></article>
            <article class="analytics-panel"><h3>Users with the most events</h3><div class="no-data">No data available</div></article>
            <article class="analytics-panel"><h3>Users with the least events</h3><div class="no-data">No data available</div></article>
          </div>
        `
      : `
          <div class="analytics-panels">
            <article class="analytics-panel"><h3>Routing outcomes</h3><div class="no-data">No data available</div></article>
            <article class="analytics-panel"><h3>Average routing time</h3><div class="no-data">No data available</div></article>
            <article class="analytics-panel"><h3>Lead handoff quality</h3><div class="no-data">No data available</div></article>
          </div>
        `
    }
    </section>
  `;
}

function renderAdminView() {
  return `
    <section class="admin-shell">
      <aside class="admin-sidebar">
        <button class="admin-back" type="button" data-action="admin-back-home">&lt; Back to home</button>
        <h2>Admin center</h2>

        <div class="admin-menu-group">
          <button class="admin-menu-btn ${state.admin.activePage === "dashboard" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="dashboard">Dashboard</button>
        </div>

        <div class="admin-menu-group">
          <h3>Organization settings</h3>
          <button class="admin-menu-btn ${state.admin.activePage === "users" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="users">Users</button>
          <button class="admin-menu-btn ${state.admin.activePage === "groups" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="groups">Groups</button>
          <button class="admin-menu-btn ${state.admin.activePage === "login" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="login">Login</button>
          <button class="admin-menu-btn ${state.admin.activePage === "billing" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="billing">Billing</button>
          <button class="admin-menu-btn ${state.admin.activePage === "security" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="security">Security</button>
        </div>

        <div class="admin-menu-group">
          <h3>Scheduling settings</h3>
          <button class="admin-menu-btn ${state.admin.activePage === "permissions" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="permissions">Permissions</button>
          <button class="admin-menu-btn ${state.admin.activePage === "managed-events" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="managed-events">Managed events</button>
          <button class="admin-menu-btn ${state.admin.activePage === "managed-workflows" ? "active" : ""
    }" type="button" data-action="admin-set-page" data-page="managed-workflows">Managed workflows</button>
        </div>
      </aside>

      <div class="admin-content">
        ${renderAdminPageContent()}
      </div>
    </section>
  `;
}

function renderAdminPageContent() {
  switch (state.admin.activePage) {
    case "dashboard":
      return renderAdminDashboardPage();
    case "users":
      return renderAdminUsersPage();
    case "groups":
      return renderAdminGroupsPage();
    case "login":
      return renderAdminLoginPage();
    case "billing":
      return renderAdminBillingPage();
    case "security":
      return renderAdminSecurityPage();
    case "permissions":
      return renderAdminPermissionsPage();
    case "managed-events":
      return renderAdminManagedEventsPage();
    case "managed-workflows":
      return renderAdminManagedWorkflowsPage();
    default:
      return '<section class="panel">Admin page not available.</section>';
  }
}

function renderAdminDashboardPage() {
  return `
    <section class="admin-panel">
      <div class="admin-panel-head">
        <h2>Organization overview</h2>
        <p class="text-muted">Quick status for your workspace administration.</p>
      </div>
      <div class="admin-panel-body">
        <div class="analytics-counters">
          <article class="analytics-card"><p class="label">Users</p><p class="value">${state.admin.users.length}</p></article>
          <article class="analytics-card"><p class="label">Groups</p><p class="value">${state.admin.groups.length}</p></article>
          <article class="analytics-card"><p class="label">Managed events</p><p class="value">${state.admin.managedEvents.length}</p></article>
          <article class="analytics-card"><p class="label">Managed workflows</p><p class="value">${state.admin.managedWorkflows.length}</p></article>
        </div>
      </div>
    </section>
  `;
}

function renderAdminUsersPage() {
  const activeTab = state.admin.usersTab;
  const users = state.admin.users.filter((item) => item.status === activeTab);
  return `
    <section class="admin-tabs">
      ${["Active", "Pending"]
      .map(
        (tab) => `
          <button class="admin-tab ${activeTab === tab ? "active" : ""}" type="button" data-action="admin-users-tab" data-tab="${tab}">
            ${tab}
          </button>
        `
      )
      .join("")}
    </section>

    <section class="upsell-banner">
      <p>Upgrade to the Standard plan to access this feature and other advanced scheduling tools.</p>
      <button class="primary-btn" type="button" data-action="admin-upgrade">Explore the Standard plan</button>
    </section>

    ${users.length
      ? `
        <section class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${users
        .map(
          (user) => `
                  <tr>
                    <td>${escapeHtml(user.name)}</td>
                    <td>${escapeHtml(user.email)}</td>
                    <td><span class="status-pill ${user.status === "Active" ? "success" : "pending"}">${escapeHtml(
            user.status
          )}</span></td>
                  </tr>
                `
        )
        .join("")}
            </tbody>
          </table>
        </section>
      `
      : `
        <section class="admin-empty">
          <h3>Scheduling is better together</h3>
          <p>As you add users to your organization, they'll appear here.</p>
          <button class="primary-btn" type="button" data-action="admin-invite-user">+ Invite a teammate</button>
        </section>
      `
    }
  `;
}

function renderAdminGroupsPage() {
  return `
    <section class="upsell-banner">
      <p>Upgrade to the Teams plan to access this feature and other advanced scheduling tools.</p>
      <button class="primary-btn" type="button" data-action="admin-upgrade">Explore the Teams plan</button>
    </section>
    ${state.admin.groups.length
      ? `
      <section class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Group</th><th>Members</th></tr></thead>
          <tbody>
            ${state.admin.groups
        .map(
          (group) => `
                <tr><td>${escapeHtml(group.name)}</td><td>${group.members}</td></tr>
              `
        )
        .join("")}
          </tbody>
        </table>
      </section>`
      : `
      <section class="admin-empty">
        <h3>Organize users for better team management</h3>
        <p>Create groups based on department, job function, or location.</p>
        <button class="primary-btn" type="button" data-action="admin-create-group" disabled>+ New group</button>
      </section>`
    }
  `;
}

function renderAdminLoginPage() {
  const tab = state.admin.loginTab;
  const copyMap = {
    "Single sign-on":
      "Single sign-on (SSO) offers a simple and secure way for users to access with corporate credentials.",
    "User provisioning":
      "Automate user lifecycle management and keep identity access synchronized.",
    "Domain control":
      "Restrict and manage access by verified domains for improved security control.",
  };

  return `
    <section class="admin-tabs">
      ${ADMIN_LOGIN_TABS.map(
    (item) => `
        <button class="admin-tab ${tab === item ? "active" : ""}" type="button" data-action="admin-login-tab" data-tab="${item}">
          ${escapeHtml(item)}
        </button>
      `
  ).join("")}
    </section>
    <section class="admin-panel">
      <div class="admin-panel-body">
        <p><span class="status-pill pending">Enterprise</span></p>
        <h2>${escapeHtml(tab)}</h2>
        <p class="text-muted">${escapeHtml(copyMap[tab])}</p>
        <p class="text-muted">To learn more and set it up, visit the help center.</p>
        <button class="primary-btn" type="button" data-action="admin-security-contact">Contact us</button>
      </div>
    </section>
  `;
}

function renderAdminPermissionsPage() {
  const tab = state.admin.permissionsTab;
  return `
    <section class="admin-tabs">
      ${ADMIN_PERMISSIONS_TABS.map(
    (item) => `
        <button class="admin-tab ${tab === item ? "active" : ""}" type="button" data-action="admin-permissions-tab" data-tab="${item}">
          ${escapeHtml(item)} ${item === "Invitations" ? '<span class="status-pill pending">New</span>' : ""}
        </button>
      `
  ).join("")}
    </section>

    <section class="admin-panel">
      <div class="admin-panel-body">
        ${tab === "Event types"
      ? `
            <h2>Access to shared event types</h2>
            <p class="text-muted">Shared event types allow members of your organization to create Round Robin and Co-hosted event types.</p>
            <h3>Who can create new shared event types?</h3>
            <div class="radio-group">
              <label><input type="radio" name="permission-create" value="all-members" data-action="admin-permission-choice" ${state.admin.permissionCreateShared === "all-members" ? "checked" : ""
      } />All members of my organization</label>
              <label><input type="radio" name="permission-create" value="no-one" data-action="admin-permission-choice" ${state.admin.permissionCreateShared === "no-one" ? "checked" : ""
      } />No one</label>
            </div>
            <div class="admin-inline-row">
              <button class="soft-btn" type="button" data-action="admin-cancel-permissions">Cancel</button>
              <button class="primary-btn" type="button" data-action="admin-save-permissions">Save</button>
            </div>
          `
      : tab === "Workflows"
        ? `
            <h2>Workflow permissions</h2>
            <p class="text-muted">Control who can create and publish organization workflows.</p>
            <div class="radio-group">
              <label><input type="radio" checked />Admins only</label>
              <label><input type="radio" />Admins and Managers</label>
              <label><input type="radio" />Everyone</label>
            </div>
          `
        : `
            <h2>Invitation permissions</h2>
            <p class="text-muted">Set who can invite new members and assign roles.</p>
            <div class="radio-group">
              <label><input type="radio" checked />Admins only</label>
              <label><input type="radio" />Admins and team leads</label>
            </div>
          `
    }
      </div>
    </section>
  `;
}

function renderAdminManagedEventsPage() {
  return `
    <section class="upsell-banner">
      <p>Upgrade to the Teams plan to access this feature and other advanced scheduling tools.</p>
      <button class="primary-btn" type="button" data-action="admin-upgrade">Explore the Teams plan</button>
    </section>
    ${state.admin.managedEvents.length
      ? `
        <section class="data-list">
          ${state.admin.managedEvents
        .map(
          (item) => `
              <article class="data-item">
                <div><strong>${escapeHtml(item.title)}</strong><p>Owner: ${escapeHtml(item.owner)}</p></div>
                <button class="mini-btn" type="button" data-action="admin-remove-managed-event" data-id="${item.id}">Delete</button>
              </article>
            `
        )
        .join("")}
        </section>
      `
      : `
        <section class="admin-empty">
          <h3>Prepare standardized meetings for your team</h3>
          <p>Keep meetings consistent with admin-controlled events.</p>
          <button class="primary-btn" type="button" data-action="admin-create-managed-event" disabled>+ New managed event</button>
        </section>
      `
    }
  `;
}

function renderAdminManagedWorkflowsPage() {
  return `
    <section class="upsell-banner">
      <p>Upgrade to the Teams plan to use managed workflow automation.</p>
      <button class="primary-btn" type="button" data-action="admin-upgrade">Explore the Teams plan</button>
    </section>
    ${state.admin.managedWorkflows.length
      ? `
        <section class="data-list">
          ${state.admin.managedWorkflows
        .map(
          (item) => `
              <article class="data-item">
                <div><strong>${escapeHtml(item.title)}</strong><p>Trigger: ${escapeHtml(item.trigger)}</p></div>
                <button class="mini-btn" type="button" data-action="admin-remove-managed-workflow" data-id="${item.id}">Delete</button>
              </article>
            `
        )
        .join("")}
        </section>
      `
      : `
        <section class="admin-empty">
          <h3>No managed workflows yet</h3>
          <p>Create consistent workflow templates for your organization.</p>
          <button class="primary-btn" type="button" data-action="admin-create-managed-workflow">+ New managed workflow</button>
        </section>
      `
    }
  `;
}

function renderAdminSecurityPage() {
  const tab = state.admin.securityTab;
  return `
    <section class="admin-tabs">
      ${ADMIN_SECURITY_TABS.map(
    (item) => `
        <button class="admin-tab ${tab === item ? "active" : ""}" type="button" data-action="admin-security-tab" data-tab="${item}">
          ${escapeHtml(item)}
        </button>
      `
  ).join("")}
    </section>
    ${tab === "Booking"
      ? renderAdminSecurityBooking()
      : tab === "Activity log"
        ? renderAdminSecurityActivity()
        : renderAdminSecurityDataDeletion()
    }
  `;
}

function renderAdminSecurityBooking() {
  const query = state.admin.securityBookingSearch.trim().toLowerCase();
  const rows = state.admin.securityBookingEvents.filter((item) =>
    item.name.toLowerCase().includes(query)
  );

  return `
    <section class="admin-panel">
      <div class="admin-panel-body">
        <h2>Require email verification to book</h2>
        <p class="text-muted">For Event Types with email verification enabled, invitees must confirm their email before completing a booking.</p>
        <label class="search-box">
          <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 5.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>
          <input data-action="admin-security-search" value="${escapeHtml(
    state.admin.securityBookingSearch
  )}" placeholder="Search event types" />
        </label>

        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Verification</th>
                <th>Type</th>
                <th>Owned by</th>
                <th>Team</th>
                <th>Last edited</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length
      ? rows
        .map(
          (item) => `
                        <tr>
                          <td>${escapeHtml(item.name)}</td>
                          <td><input type="checkbox" data-action="admin-booking-verification" data-id="${item.id}" ${item.verification ? "checked" : ""
            } /></td>
                          <td>${escapeHtml(item.type)}</td>
                          <td>${escapeHtml(item.ownedBy)}</td>
                          <td>${escapeHtml(item.team || "-")}</td>
                          <td>${escapeHtml(item.lastEdited)}</td>
                        </tr>
                      `
        )
        .join("")
      : '<tr><td colspan="6">No matching event types.</td></tr>'
    }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderAdminSecurityActivity() {
  return `
    <section class="admin-panel">
      <div class="admin-panel-body">
        <h2>Activity log</h2>
        <h3>Quickly review and audit account activity</h3>
        <p class="text-muted">Available on enterprise plans, activity log lets you track:</p>
        <ul>
          <li>Attempts at logging in</li>
          <li>Connections to integrations</li>
          <li>Updates to user profiles</li>
          <li>Changes to organizational settings</li>
        </ul>
        <div class="admin-inline-row">
          <button class="primary-btn" type="button" data-action="admin-security-contact">Contact sales</button>
          <button class="soft-btn" type="button" data-action="admin-security-contact">Learn more</button>
        </div>
      </div>
    </section>
  `;
}

function renderAdminSecurityDataDeletion() {
  return `
    <section class="admin-panel">
      <div class="admin-panel-body">
        <h2>Data deletion</h2>
        <h3>Delete information from your organization</h3>
        <p class="text-muted">If needed, you can delete event information from your organization and integrations for compliance reasons.</p>
        <p class="warning-box">Once you delete information, you will not be able to recover it.</p>
        <p class="text-muted">Invitee data will be deleted <strong>7 days</strong> from the date you make the request.</p>
        <div class="divider-line"></div>
        <h3>Delete information for specific invitees</h3>
        <p class="text-muted">Enter an invitee email to remove their information from your organization.</p>
        <input class="long-input" type="email" placeholder="invitee@example.com" />
        <button class="primary-btn" type="button" data-action="admin-security-contact">Request deletion</button>
      </div>
    </section>
  `;
}

function renderAdminBillingPage() {
  return `
    <section class="admin-panel">
      <div class="admin-panel-body">
        <h2 style="text-align:center;">Choose a plan that fits</h2>
        <div class="list-calendar-toggle" style="width:fit-content;margin-inline:auto;">
          <button class="${state.admin.billingCycle === "yearly" ? "active" : ""}" type="button" data-action="admin-billing-cycle" data-cycle="yearly">Bill yearly (save up to 20%)</button>
          <button class="${state.admin.billingCycle === "monthly" ? "active" : ""}" type="button" data-action="admin-billing-cycle" data-cycle="monthly">Bill monthly</button>
        </div>
        <p class="warning-box" style="background:#fff;border-color:#b56b08;text-align:center;">You're on the free plan. Your trial ended on 7 October 2024.</p>

        <div class="pricing-cards">
          <article class="pricing-card">
            <h3>Standard</h3>
            <p class="price">${state.admin.billingCycle === "yearly" ? "$10" : "$12"} <span class="small">/seat/mo</span></p>
            <p class="text-muted">Automated and personalized scheduling experiences.</p>
            <button class="primary-btn" type="button" data-action="admin-billing-select">Select</button>
          </article>
          <article class="pricing-card popular">
            <h3>Teams</h3>
            <p class="price">${state.admin.billingCycle === "yearly" ? "$16" : "$20"} <span class="small">/seat/mo</span></p>
            <p class="text-muted">Collaborate effectively with reporting and advanced options.</p>
            <button class="primary-btn" type="button" data-action="admin-billing-select">Select</button>
          </article>
          <article class="pricing-card">
            <h3>Enterprise</h3>
            <p class="price">Starts at $15k <span class="small">/year</span></p>
            <p class="text-muted">Enterprise-level security, admin control, and support.</p>
            <button class="primary-btn" type="button" data-action="admin-billing-select">Contact sales</button>
          </article>
        </div>

        <h2 class="compare-title">Compare features by category</h2>
        <div class="billing-compare">
          <div class="compare-tabs">
            ${ADMIN_BILLING_COMPARE_TABS.map(
    (tab) => `
              <button class="compare-tab ${tab === state.admin.billingCompareTab ? "active" : ""
      }" type="button" data-action="admin-billing-tab" data-tab="${tab}">
                ${escapeHtml(tab)}
              </button>
            `
  ).join("")}
          </div>
          ${renderBillingFeatureTable()}
        </div>
      </div>
    </section>
  `;
}

function renderBillingFeatureTable() {
  const compareTab = state.admin.billingCompareTab;
  const categories =
    compareTab === "View All"
      ? ADMIN_BILLING_CATEGORIES
      : ADMIN_BILLING_CATEGORIES.filter((cat) => cat.name === compareTab);

  return `
    <table class="feature-table">
      <thead>
        <tr>
          <th>Feature</th>
          <th class="center">FREE</th>
          <th class="center">STANDARD</th>
          <th class="center">TEAMS</th>
          <th class="center">ENTERPRISE</th>
        </tr>
      </thead>
      <tbody>
        ${categories
      .map(
        (category) => `
            <tr><th colspan="5">${escapeHtml(category.name)}</th></tr>
            ${category.rows
            .map(
              (row) => `
                <tr>
                  <td>${escapeHtml(row.label)}</td>
                  ${["free", "standard", "teams", "enterprise"]
                  .map((plan) => `<td class="center">${renderFeatureValue(row.values[plan])}</td>`)
                  .join("")}
                </tr>
              `
            )
            .join("")}
          `
      )
      .join("")}
      </tbody>
    </table>
  `;
}

function renderFeatureValue(value) {
  if (!value) return "";
  if (value === "check") return '<span class="check-dot">v</span>';
  return escapeHtml(String(value));
}

function renderAccountView() {
  const menuItems = [
    { page: "profile", label: "Profile" },
    { page: "branding", label: "Branding" },
    { page: "my-link", label: "My Link" },
    { page: "communication-settings", label: "Communication settings" },
    { page: "login-preferences", label: "Login preferences" },
    { page: "security", label: "Security" },
    { page: "cookie-settings", label: "Cookie settings" },
  ];

  return `
    <section class="account-shell">
      <aside class="account-sidebar">
        <button class="account-back" type="button" data-action="account-back-home">&lt; Back to home</button>
        <h2>Account settings</h2>
        <div class="account-menu-group">
          <h3>Account</h3>
          ${menuItems
      .map(
        (item) => `
              <button class="account-menu-btn ${state.account.activePage === item.page ? "active" : ""
          }" type="button" data-action="account-set-page" data-page="${item.page}">
                ${escapeHtml(item.label)}
              </button>
            `
      )
      .join("")}
        </div>
        <div class="account-menu-foot">
          <button class="account-menu-btn" type="button" data-action="account-contact-support">Help</button>
          <button class="account-menu-btn" type="button" data-action="account-logout">Logout</button>
        </div>
      </aside>
      <div class="account-content">
        ${renderAccountPageContent()}
      </div>
    </section>
  `;
}

function renderAccountPageContent() {
  switch (state.account.activePage) {
    case "profile":
      return renderAccountProfilePage();
    case "branding":
      return renderAccountBrandingPage();
    case "my-link":
      return renderAccountLinkPage();
    case "communication-settings":
      return renderAccountCommunicationPage();
    case "login-preferences":
      return renderAccountLoginPreferencesPage();
    case "security":
      return renderAccountSecurityPage();
    case "cookie-settings":
      return renderAccountCookiePage();
    default:
      return '<section class="account-panel"><div class="account-panel-body">Page not available.</div></section>';
  }
}

function renderAccountProfilePage() {
  const profile = state.account.profile;
  const logoUrl = state.account.branding.logoUrl;
  const avatarText = getInitials(profile.name);
  const currentTime = formatCurrentTimeForTimezone(profile.timezone);
  return `
    <section class="account-panel">
      <div class="account-panel-body">
        <div class="account-avatar-row">
          ${logoUrl
      ? `<img class="account-avatar" src="${escapeHtml(logoUrl)}" alt="Profile avatar" />`
      : `<span class="account-avatar">${escapeHtml(avatarText)}</span>`
    }
          <button class="soft-btn" type="button" data-action="account-update-logo">Update</button>
          <button class="soft-btn" type="button" data-action="account-remove-logo">Remove</button>
        </div>

        <label class="account-field">
          <span>Name</span>
          <input class="account-input" type="text" data-action="account-profile-field" data-field="name" value="${escapeHtml(
      profile.name
    )}" />
        </label>

        <label class="account-field">
          <span>Welcome Message</span>
          <textarea class="account-textarea" data-action="account-profile-field" data-field="welcomeMessage">${escapeHtml(
      profile.welcomeMessage
    )}</textarea>
        </label>

        <div class="account-grid-two">
          <label class="account-field">
            <span>Language</span>
            <select class="account-select" data-action="account-profile-field" data-field="language">
              ${LANGUAGE_OPTIONS.map(
      (item) =>
        `<option value="${escapeHtml(item)}" ${profile.language === item ? "selected" : ""
        }>${escapeHtml(item)}</option>`
    ).join("")}
            </select>
          </label>
          <label class="account-field">
            <span>Date Format</span>
            <select class="account-select" data-action="account-profile-field" data-field="dateFormat">
              ${DATE_FORMAT_OPTIONS.map(
      (item) =>
        `<option value="${escapeHtml(item)}" ${profile.dateFormat === item ? "selected" : ""
        }>${escapeHtml(item)}</option>`
    ).join("")}
            </select>
          </label>
          <label class="account-field">
            <span>Time Format</span>
            <select class="account-select" data-action="account-profile-field" data-field="timeFormat">
              ${TIME_FORMAT_OPTIONS.map(
      (item) =>
        `<option value="${escapeHtml(item)}" ${profile.timeFormat === item ? "selected" : ""
        }>${escapeHtml(item)}</option>`
    ).join("")}
            </select>
          </label>
          <label class="account-field">
            <span>Country</span>
            <select class="account-select" data-action="account-profile-field" data-field="country">
              ${COUNTRY_OPTIONS.map(
      (item) =>
        `<option value="${escapeHtml(item)}" ${profile.country === item ? "selected" : ""
        }>${escapeHtml(item)}</option>`
    ).join("")}
            </select>
          </label>
        </div>

        <label class="account-field">
          <span class="account-field-label">
            <span>Time Zone</span>
            <small class="account-field-meta">Current time: ${escapeHtml(currentTime)}</small>
          </span>
          <select class="account-select" data-action="account-profile-field" data-field="timezone">
            ${TIMEZONES.map(
      (item) =>
        `<option value="${escapeHtml(item)}" ${profile.timezone === item ? "selected" : ""
        }>${escapeHtml(item)}</option>`
    ).join("")}
          </select>
        </label>

        <div class="account-actions">
          <button class="primary-btn" type="button" data-action="account-save-profile">Save Changes</button>
          <button class="soft-btn" type="button" data-action="account-cancel-profile">Cancel</button>
          <button class="danger-btn" type="button" data-action="account-delete-account">Delete Account</button>
        </div>
      </div>
    </section>
  `;
}

function renderAccountBrandingPage() {
  const branding = state.account.branding;
  const logoHtml = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="Brand logo" />`
    : `<span>${escapeHtml((branding.logoText || "WU").slice(0, 3).toUpperCase())}</span>`;

  return `
    <section class="account-panel">
      <div class="account-panel-body">
        <h3>Logo</h3>
        <p class="text-muted">Your company branding appears at the top-left corner of your scheduling page.</p>
        <label class="inline-toggle">
          <input type="checkbox" data-action="account-branding-toggle" data-field="applyOrgLogo" ${branding.applyOrgLogo ? "checked" : ""
    } />
          <span>Apply to all users in your organization</span>
        </label>

        <div class="brand-logo-frame">${logoHtml}</div>

        <div class="account-inline-actions">
          <button class="soft-btn" type="button" data-action="account-update-logo">Update</button>
          <button class="soft-btn" type="button" data-action="account-remove-logo">Remove</button>
          <span class="text-muted">JPG, GIF or PNG. Max size of 5MB.</span>
        </div>

        <div class="divider-line"></div>

        <label class="inline-toggle with-switch">
          <span>Use Meetscheduling branding</span>
          <input type="checkbox" data-action="account-branding-toggle" data-field="useMeetschedulingBranding" ${branding.useMeetschedulingBranding ? "checked" : ""
    } />
          <span class="switch"></span>
        </label>
        <p class="brand-info-box">Meetscheduling's branding will be displayed on your scheduling page, notifications, and confirmations.</p>
        <label class="inline-toggle">
          <input type="checkbox" data-action="account-branding-toggle" data-field="applyOrgBranding" ${branding.applyOrgBranding ? "checked" : ""
    } />
          <span>Apply to all users in your organization</span>
        </label>

        <div class="account-actions">
          <button class="primary-btn" type="button" data-action="account-save-branding">Save Changes</button>
          <button class="soft-btn" type="button" data-action="account-cancel-branding">Cancel</button>
        </div>
      </div>
    </section>
  `;
}

function renderAccountLinkPage() {
  return `
    <section class="account-panel">
      <div class="account-panel-body account-narrow">
        <p class="text-muted">Changing your Meetscheduling URL means all copied links will stop working and must be updated.</p>
        <label class="account-field">
          <span>My link</span>
          <div class="link-input-row">
            <span class="link-prefix">meetscheduling.com/</span>
            <input class="account-input" data-action="account-link-input" value="${escapeHtml(
    state.account.myLink.slug
  )}" />
          </div>
        </label>
        <div class="account-actions">
          <button class="primary-btn" type="button" data-action="account-save-link">Save Changes</button>
          <button class="soft-btn" type="button" data-action="account-cancel-link">Cancel</button>
        </div>
      </div>
    </section>
  `;
}

function renderAccountCommunicationPage() {
  return `
    <section class="account-panel">
      <div class="account-panel-body account-narrow">
        <h3>Email notifications when added to event types</h3>
        <label class="inline-toggle with-switch">
          <span>Receive an email when someone adds you as a host to an event type</span>
          <input type="checkbox" data-action="account-communication-toggle" data-field="emailWhenAddedToEventType" ${state.account.communication.emailWhenAddedToEventType ? "checked" : ""
    } />
          <span class="switch"></span>
        </label>
        <p class="text-muted"><strong>Your changes to this page are saved automatically.</strong></p>
      </div>
    </section>
  `;
}

function renderAccountLoginPreferencesPage() {
  const login = state.account.loginPreferences;
  const providerLabel = login.provider === "google" ? "Google" : "Microsoft";
  return `
    <section class="account-panel">
      <div class="account-panel-body account-narrow">
        <div class="login-provider-row">
          <strong>${escapeHtml(providerLabel)}</strong>
          <p class="text-muted">
            ${login.connected
      ? `You log in with a ${providerLabel} account.`
      : `No ${providerLabel} account is connected.`
    }
          </p>
        </div>

        <div class="account-inline-actions">
          ${login.connected
      ? '<button class="soft-btn" type="button" data-action="account-login-unlink">Unlink</button>'
      : '<button class="soft-btn" type="button" data-action="account-login-link-google">Connect account</button>'
    }
          <button class="soft-btn" type="button" data-action="account-login-change-email">Change email</button>
        </div>

        <div class="login-email-box">
          <strong>${escapeHtml(providerLabel)} account</strong>
          <p>${escapeHtml(login.email || "Not connected")}</p>
        </div>

        <div class="divider-line"></div>
        <button class="soft-btn" type="button" data-action="account-login-switch-provider">
          Switch to ${login.provider === "google" ? "Microsoft" : "Google"} login
        </button>
        <p class="text-muted">Please <button class="link-btn" type="button" data-action="account-contact-support">contact support</button> if you need assistance.</p>
      </div>
    </section>
  `;
}

function renderAccountSecurityPage() {
  return `
    <section class="admin-tabs">
      ${ACCOUNT_SECURITY_TABS.map(
    (item) => `
          <button class="admin-tab ${state.account.security.activeTab === item ? "active" : ""
      }" type="button" data-action="account-security-tab" data-tab="${escapeHtml(item)}">
            ${escapeHtml(item)}
          </button>
        `
  ).join("")}
    </section>
    ${state.account.security.activeTab === "Booking"
      ? renderAccountSecurityBooking()
      : renderAccountSecurityAuthenticator()
    }
  `;
}

function renderAccountSecurityBooking() {
  const query = state.account.security.bookingSearch.trim().toLowerCase();
  const rows = state.account.security.bookingEvents.filter((item) =>
    item.name.toLowerCase().includes(query)
  );

  return `
    <section class="account-panel">
      <div class="account-panel-body">
        <h2>Booking</h2>
        <h3>Require email verification to book</h3>
        <p class="text-muted">For Event Types with email verification enabled, invitees must confirm their email before completing a booking.</p>

        <label class="search-box">
          <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 5.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>
          <input data-action="account-security-search" value="${escapeHtml(
    state.account.security.bookingSearch
  )}" placeholder="Search event types" />
        </label>

        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Verification</th>
                <th>Type</th>
                <th>Owned by</th>
                <th>Team</th>
                <th>Last edited</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length
      ? rows
        .map(
          (item) => `
                        <tr>
                          <td>${escapeHtml(item.name)}</td>
                          <td><input type="checkbox" data-action="account-security-booking-verification" data-id="${item.id}" ${item.verification ? "checked" : ""
            } /></td>
                          <td>${escapeHtml(item.type)}</td>
                          <td>${escapeHtml(item.ownedBy)}</td>
                          <td>${escapeHtml(item.team || "-")}</td>
                          <td>${escapeHtml(item.lastEdited)}</td>
                        </tr>
                      `
        )
        .join("")
      : '<tr><td colspan="6">No matching event types.</td></tr>'
    }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderAccountSecurityAuthenticator() {
  const security = state.account.security;
  const enabledDate = security.lastEnabledAt
    ? new Date(security.lastEnabledAt).toLocaleString()
    : "Not enabled";
  return `
    <section class="account-panel">
      <div class="account-panel-body account-narrow">
        <h2>Google Authenticator</h2>
        <p class="text-muted">Use Google Authenticator to add two-factor authentication when logging in.</p>
        <p><strong>Status:</strong> ${security.googleAuthenticatorEnabled ? "Enabled" : "Disabled"
    }</p>
        <p><strong>Last updated:</strong> ${escapeHtml(enabledDate)}</p>

        ${security.googleAuthenticatorEnabled
      ? `
              <div class="auth-secret-box">
                <p class="text-muted">Authenticator key</p>
                <code>${escapeHtml(security.googleAuthenticatorSecret)}</code>
              </div>
              <div class="auth-code-grid">
                ${security.backupCodes
        .map((code) => `<code>${escapeHtml(code)}</code>`)
        .join("")}
              </div>
              <div class="account-actions">
                <button class="soft-btn" type="button" data-action="account-regenerate-codes">Regenerate backup codes</button>
                <button class="soft-btn" type="button" data-action="account-disable-2fa">Disable</button>
              </div>
            `
      : `
              <p class="warning-box">Two-factor authentication is currently disabled.</p>
              <button class="primary-btn" type="button" data-action="account-enable-2fa">Set up Google Authenticator</button>
            `
    }
      </div>
    </section>
  `;
}

function renderAccountCookiePage() {
  return `
    <section class="account-panel">
      <div class="account-panel-body account-narrow">
        <h3>Cookie preferences</h3>
        <p class="text-muted">Control how this app stores analytics and personalization cookies.</p>
        <div class="cookie-grid">
          <label class="inline-toggle with-switch">
            <span>Necessary cookies (required)</span>
            <input type="checkbox" data-action="account-cookie-toggle" data-field="necessary" checked disabled />
            <span class="switch"></span>
          </label>
          <label class="inline-toggle with-switch">
            <span>Functional cookies</span>
            <input type="checkbox" data-action="account-cookie-toggle" data-field="functional" ${state.account.cookies.functional ? "checked" : ""
    } />
            <span class="switch"></span>
          </label>
          <label class="inline-toggle with-switch">
            <span>Analytics cookies</span>
            <input type="checkbox" data-action="account-cookie-toggle" data-field="analytics" ${state.account.cookies.analytics ? "checked" : ""
    } />
            <span class="switch"></span>
          </label>
          <label class="inline-toggle with-switch">
            <span>Marketing cookies</span>
            <input type="checkbox" data-action="account-cookie-toggle" data-field="marketing" ${state.account.cookies.marketing ? "checked" : ""
    } />
            <span class="switch"></span>
          </label>
        </div>
        <button class="primary-btn" type="button" data-action="account-save-cookies">Save preferences</button>
      </div>
    </section>
  `;
}

function renderMeetingsView() {
  const activeTab = state.meetings.activeTab;
  const events = state.meetings.events[activeTab] || [];
  const shouldSortDesc = activeTab === "Past" || activeTab === "Date Range";
  const sortedEvents = events
    .slice()
    .sort((left, right) => {
      const leftTs = Date.parse(left.startAtUtc || left.startIso || "");
      const rightTs = Date.parse(right.startAtUtc || right.startIso || "");
      if (!Number.isFinite(leftTs) && !Number.isFinite(rightTs)) return 0;
      if (!Number.isFinite(leftTs)) return 1;
      if (!Number.isFinite(rightTs)) return -1;
      return shouldSortDesc ? rightTs - leftTs : leftTs - rightTs;
    });
  const ids = new Set(sortedEvents.map((item) => String(item.id || "")));
  if (openMeetingDetailsId && !ids.has(openMeetingDetailsId)) {
    openMeetingDetailsId = null;
  }
  const groupedEvents = sortedEvents.reduce((acc, item) => {
    const key = getMeetingDateKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const orderedDates = Object.keys(groupedEvents).sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return shouldSortDesc ? b.localeCompare(a) : a.localeCompare(b);
  });
  const hostName = String(state.account?.profile?.name || "").trim() || "Meeting host";
  const hostInitials = getInitials(hostName, "MH");
  const googleCalendarConnected = hasConnectedGoogleCalendarIntegration();

  return `
    <section class="events-shell meetings-shell">
      <div class="events-head meetings-head">
        <div class="events-tab-row">
          ${MEETING_TABS.map(
      (tab) => `
            <button class="events-tab ${activeTab === tab ? "active" : ""}" type="button" data-action="set-meeting-tab" data-tab="${tab}">
              ${escapeHtml(tab)}
              ${tab === "Date Range" ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 9.3 12 13.9l4.6-4.6 1.4 1.4-5.3 5.3a1 1 0 0 1-1.4 0L6 10.7l1.4-1.4Z"/></svg>' : ""}
            </button>
          `
    ).join("")}
        </div>
        <div class="events-actions">
          <button class="pill-btn" type="button" data-action="meetings-export">
            <svg viewBox="0 0 24 24"><path d="M14 3h-4v8H6l6 6 6-6h-4V3Zm-8 16h12v2H6v-2Z"/></svg>
            Export
          </button>
          <button class="pill-btn" type="button" data-action="meetings-filter">
            <svg viewBox="0 0 24 24"><path d="M3 6a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm4 6a1 1 0 0 1 1-1h8a1 1 0 0 1 0 2H8a1 1 0 0 1-1-1Zm3 6a1 1 0 0 1 1-1h2a1 1 0 0 1 0 2h-2a1 1 0 0 1-1-1Z"/></svg>
            Filter
          </button>
        </div>
      </div>
      <div class="events-body meetings-body${events.length ? "" : " is-empty"}">
        ${events.length
      ? `<div class="meetings-group-list">
              ${orderedDates
          .map((dateKey) => {
            const dateItems = groupedEvents[dateKey] || [];
            return `
                    <section class="meeting-date-group">
                      <header class="meeting-date-header">${escapeHtml(formatMeetingDateHeading(dateKey))}</header>
                      ${dateItems
                .map((event) => {
                  const id = String(event.id || "");
                  const expanded = openMeetingDetailsId === id;
                  const canJoin = isJoinableMeetingUrl(event.meetingLink, event.locationType);
                  const pendingLinkCopy = getMeetingLinkPendingCopy(
                    event,
                    googleCalendarConnected
                  );
                  const showGoogleCalendarCta =
                    event.locationType === "google_meet" &&
                    !canJoin &&
                    (String(event.meetingLinkStatus || "").trim().toLowerCase() ===
                      "pending_calendar_connection" ||
                      !googleCalendarConnected);
                  const notesCopy = String(event.notes || "").trim() || "No notes were shared for this meeting.";
                  const createdLabel = formatMeetingCreatedDate(event.createdAt);
                  const inviteeInitials = getInitials(event.inviteeName, "IN");
                  return `
                        <article class="meeting-row-card ${expanded ? "expanded" : ""}">
                          <div class="meeting-row-summary">
                            <div class="meeting-row-time">
                              <span class="meeting-status-dot" aria-hidden="true"></span>
                              <span class="meeting-time-range">${escapeHtml(getMeetingTimeRangeLabel(event))}</span>
                            </div>
                            <div class="meeting-row-main">
                              <strong>${escapeHtml(event.inviteeName)}</strong>
                              <p>Event type <span>${escapeHtml(event.title)}</span></p>
                            </div>
                            <div class="meeting-row-hosts">1 host | 0 non-hosts</div>
                            <button class="meeting-detail-toggle" type="button" data-action="toggle-meeting-details" data-id="${escapeHtml(
                    id
                  )}" aria-expanded="${expanded ? "true" : "false"}">
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6l8 6-8 6z"/></svg>
                              Details
                            </button>
                          </div>
                          ${expanded
                      ? `
                                <div class="meeting-row-details">
                                  <aside class="meeting-detail-sidebar">
                                    <button class="meeting-mark-btn" type="button" data-action="meeting-mark-no-show" data-id="${escapeHtml(
                        id
                      )}">Mark as no-show</button>
                                    <button class="meeting-inline-link" type="button" data-action="meeting-edit-event-type">Edit Event Type</button>
                                    <button class="meeting-inline-link" type="button" data-action="meetings-filter">Filter by Event Type</button>
                                    <button class="meeting-inline-link" type="button" data-action="meeting-schedule-again" data-id="${escapeHtml(
                        id
                      )}">Schedule Invitee Again</button>
                                  </aside>
                                  <div class="meeting-detail-content">
                                    <section class="meeting-detail-block">
                                      <h4>INVITEE</h4>
                                      <div class="meeting-invitee-row">
                                        <span class="meeting-avatar">${escapeHtml(inviteeInitials)}</span>
                                        <div>
                                          <p class="meeting-invitee-name">${escapeHtml(event.inviteeName)}</p>
                                          <p class="meeting-invitee-email">${escapeHtml(
                        event.inviteeEmail || "No email available"
                      )}</p>
                                        </div>
                                      </div>
                                      <button class="meeting-inline-link" type="button" data-action="meeting-view-contact" data-email="${escapeHtml(
                        event.inviteeEmail || ""
                      )}">View contact</button>
                                    </section>
                                    <section class="meeting-detail-block">
                                      <h4>LOCATION</h4>
                                      <p class="meeting-detail-copy">
                                        ${escapeHtml(describeMeetingLocation(event.locationType))}
                                        ${canJoin
                          ? `<span class="meeting-link-ready">${escapeHtml(
                            event.locationType === "google_meet"
                              ? "Google Meet link generated."
                              : "Meeting link generated."
                          )}</span><a href="${escapeHtml(
                            event.meetingLink
                          )}" target="_blank" rel="noopener" class="meeting-join-link">Join now</a>`
                          : pendingLinkCopy
                            ? `<span class="meeting-link-pending">${escapeHtml(pendingLinkCopy)}</span>`
                            : ""
                        }
                                        ${showGoogleCalendarCta
                          ? `<button class="meeting-inline-link meeting-connect-calendar-btn" type="button" data-action="open-integrations">Connect Google Calendar</button>`
                          : ""
                        }
                                      </p>
                                    </section>
                                    <section class="meeting-detail-block">
                                      <h4>INVITEE TIME ZONE</h4>
                                      <p class="meeting-detail-copy">${escapeHtml(
                        event.visitorTimezone || "Timezone not provided"
                      )}</p>
                                    </section>
                                    <section class="meeting-detail-block">
                                      <h4>QUESTIONS</h4>
                                      <p class="meeting-notes">${escapeHtml(notesCopy)}</p>
                                    </section>
                                    <section class="meeting-detail-block">
                                      <h4>MEETING HOST</h4>
                                      <p class="meeting-detail-copy">Host will attend this meeting</p>
                                      <div class="meeting-host-row">
                                        <span class="meeting-avatar">${escapeHtml(hostInitials)}</span>
                                        <span class="meeting-host-name">${escapeHtml(hostName)}</span>
                                      </div>
                                    </section>
                                    <section class="meeting-detail-block">
                                      <button class="meeting-inline-link" type="button">Add meeting notes</button>
                                      ${createdLabel
                        ? `<p class="meeting-created-at">Created ${escapeHtml(createdLabel)}</p>`
                        : ""
                      }
                                      <div class="meeting-detail-footer-actions">
                                        ${event.status !== "Canceled"
                          ? `<button class="mini-btn" type="button" data-action="cancel-meeting" data-id="${escapeHtml(
                              id
                            )}">Cancel</button>`
                          : ""
                        }
                                        <button class="mini-btn" type="button" data-action="remove-meeting" data-id="${escapeHtml(
                        id
                      )}">Delete</button>
                                      </div>
                                    </section>
                                  </div>
                                </div>
                              `
                      : ""
                    }
                        </article>
                      `;
                })
                .join("")}
                    </section>
                  `;
          })
          .join("")}
            </div>`
      : `<div class="empty-illustration">
                <div class="empty-calendar">
                  <svg viewBox="0 0 96 96">
                    <rect x="10" y="16" width="76" height="70" rx="8"></rect>
                    <line x1="10" y1="34" x2="86" y2="34"></line>
                    <line x1="28" y1="42" x2="28" y2="78"></line>
                    <line x1="46" y1="42" x2="46" y2="78"></line>
                    <line x1="64" y1="42" x2="64" y2="78"></line>
                    <line x1="10" y1="56" x2="86" y2="56"></line>
                    <line x1="10" y1="70" x2="86" y2="70"></line>
                  </svg>
                  <span class="badge">0</span>
                </div>
                <h2>No ${escapeHtml(activeTab)} Events</h2>
              </div>`
    }
      </div>
    </section>
  `;
}

function renderSchedulingView() {
  const activeTab = state.scheduling.activeTab;
  const search = state.scheduling.search.trim().toLowerCase();
  const list = getSchedulingList(activeTab);
  const filterOptions = getFilterOptions(activeTab);
  const allowedFilters = filterOptions.map((item) => item.value);
  const activeFilter = allowedFilters.includes(state.scheduling.filter)
    ? state.scheduling.filter
    : "all";
  const filtered = list.filter((item) => {
    if (search && !JSON.stringify(item).toLowerCase().includes(search)) return false;
    if (activeFilter === "all") return true;
    if (activeTab === "Event types") {
      return activeFilter === "active" ? item.active : !item.active;
    }
    return item.status === activeFilter;
  });

  return `
    <section class="utility-row">
      <div class="left">
        <label class="search-box">
          <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 5.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>
          <input data-action="scheduling-search" value="${escapeHtml(
    state.scheduling.search
  )}" placeholder="${escapeHtml(getSearchPlaceholder(activeTab))}" />
        </label>
        ${activeTab === "Event types"
      ? ""
      : `<select class="filter-select" data-action="scheduling-filter">
          ${filterOptions
        .map(
          (option) =>
            `<option value="${option.value}" ${option.value === activeFilter ? "selected" : ""
            }>${escapeHtml(option.label)}</option>`
        )
        .join("")}
        </select>`
    }
      </div>
      ${activeTab === "Event types"
      ? '<button class="pill-btn" type="button" data-action="create-event-type">+ Create event type</button>'
      : ""
    }
    </section>
    ${activeTab === "Event types"
      ? renderEventTypes(filtered)
      : activeTab === "Single-use links"
        ? renderSingleUseLinks(filtered)
        : renderMeetingPolls(filtered)
    }
  `;
}

function getSchedulingList(tab) {
  if (tab === "Event types") return state.scheduling.eventTypes;
  if (tab === "Single-use links") return state.scheduling.singleUseLinks;
  return state.scheduling.meetingPolls;
}

function getSearchPlaceholder(tab) {
  if (tab === "Event types") return "Search event types";
  if (tab === "Single-use links") return "Search single-use links";
  return "Search meeting polls";
}

function getFilterOptions(tab) {
  if (tab === "Event types") {
    return [
      { value: "all", label: "All" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ];
  }

  if (tab === "Single-use links") {
    return [
      { value: "all", label: "All" },
      { value: "active", label: "Active" },
      { value: "used", label: "Used" },
    ];
  }

  return [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "closed", label: "Closed" },
  ];
}

function renderEventTypes(items) {
  const profileName = String(state.account.profile.name || "").trim() || "Meetscheduling";
  const ownerInitials = getInitials(profileName, "MS");
  const landingEvent =
    state.scheduling.eventTypes.find((item) => item.active) || state.scheduling.eventTypes[0];

  if (!items.length) {
    return `
      <section class="event-types-stack">
        <header class="event-types-head">
          <div class="event-owner">
            <span class="event-owner-avatar">${escapeHtml(ownerInitials)}</span>
            <strong>${escapeHtml(profileName)}</strong>
          </div>
          <button
            class="event-landing-btn"
            type="button"
            data-action="open-scheduling-landing"
            data-id="${landingEvent?.id || ""}"
          >
            View landing page
          </button>
        </header>
        <section class="panel small text-muted">No event types found for this filter.</section>
      </section>
    `;
  }

  return `
    <section class="event-types-stack">
      <header class="event-types-head">
        <div class="event-owner">
          <span class="event-owner-avatar">${escapeHtml(ownerInitials)}</span>
          <strong>${escapeHtml(profileName)}</strong>
        </div>
        <button
          class="event-landing-btn"
          type="button"
          data-action="open-scheduling-landing"
          data-id="${landingEvent?.id || ""}"
        >
          View landing page
        </button>
      </header>

      <section class="event-type-list">
        ${items
      .map((rawItem, index) => {
        const item = normalizeEventTypeRecord(rawItem, index);
        const meta = [
          `${item.duration} min`,
          item.locationType || "No location set",
          item.eventKind || "One-on-One",
        ];
        const showWarning = item.locationType === "No location set";
        const menuOpen = openEventTypeMenuId === item.id;

        return `
              <article class="event-type-row ${item.active ? "" : "is-inactive"}">
                <span class="event-type-accent" style="--event-color:${escapeHtml(item.color)};"></span>
                <div class="event-type-main">
                  <div class="event-type-title-row">
                    <span class="event-type-checkbox" aria-hidden="true"></span>
                    <h3>${escapeHtml(item.name)}</h3>
                  </div>
                  <p class="event-type-meta">
                    ${showWarning
            ? '<span class="event-meta-alert" title="Location not set">!</span>'
            : ""
          }
                    ${escapeHtml(meta.join(" • "))}
                  </p>
                  <p class="event-type-hours">${escapeHtml(item.availabilityLabel)}</p>
                </div>
                <div class="event-type-actions">
                  <button
                    class="mini-btn event-copy-btn"
                    type="button"
                    data-action="copy-event-link"
                    data-id="${item.id}"
                  >
                    Copy link
                  </button>
                  <div class="event-type-menu-shell">
                    <button
                      class="mini-btn event-more-btn ${menuOpen ? "is-open" : ""}"
                      type="button"
                      data-action="toggle-event-type-menu"
                      data-id="${item.id}"
                      aria-expanded="${menuOpen ? "true" : "false"}"
                      aria-haspopup="menu"
                    >
                      ⋮
                    </button>
                    ${menuOpen
            ? `
                          <div class="event-type-menu" role="menu">
                            <button class="event-menu-item" type="button" data-action="view-event-booking-page" data-id="${item.id}">View booking page</button>
                            <button class="event-menu-item" type="button" data-action="edit-event-type" data-id="${item.id}">Edit</button>
                            <div class="event-menu-divider"></div>
                            <button class="event-menu-item" type="button" data-action="add-event-to-website" data-id="${item.id}">Add to website</button>
                            <button class="event-menu-item" type="button" data-action="add-event-note" data-id="${item.id}">Add internal note</button>
                            <button class="event-menu-item dual-line" type="button" data-action="change-event-language" data-id="${item.id}">
                              <span>Change invitee language</span>
                              <small>${escapeHtml(item.inviteeLanguage)}</small>
                            </button>
                            <div class="event-menu-divider"></div>
                            <button class="event-menu-item" type="button" data-action="toggle-event-secret" data-id="${item.id}">${item.secret ? "Make public" : "Make secret"
            }</button>
                            <button class="event-menu-item" type="button" data-action="duplicate-event-type" data-id="${item.id}">Duplicate</button>
                            <button class="event-menu-item danger" type="button" data-action="delete-event-type" data-id="${item.id}">Delete</button>
                            <div class="event-menu-divider"></div>
                            <div class="event-menu-toggle-row">
                              <span>On/Off</span>
                              <label class="event-menu-switch">
                                <input
                                  type="checkbox"
                                  data-action="toggle-event-type"
                                  data-id="${item.id}"
                                  ${item.active ? "checked" : ""}
                                />
                                <span class="switch"></span>
                              </label>
                            </div>
                          </div>
                        `
            : ""
          }
                  </div>
                </div>
              </article>
            `;
      })
      .join("")}
      </section>
    </section>
  `;
}

function renderSingleUseLinks(items) {
  if (!state.scheduling.singleUseLinks.length) {
    return `
      <section class="empty-promo">
        <div class="promo-copy">
          <h2>Control how often you get booked</h2>
          <p>Single-use links can only be booked once. Create a single-use link from an event type and it will appear here.</p>
          <a class="link-row" href="javascript:void(0)">Learn more</a>
          <button class="primary-action" type="button" data-action="create-single-link">+ Create single-use link</button>
        </div>
        <div class="promo-visual">
          <div class="promo-blob"></div>
          <div class="link-card">
            <h4>Make this a single-use link</h4>
            <div class="icon-row">
              <div class="icon-box">mail</div>
              <div class="icon-box">doc</div>
              <div class="icon-box">link</div>
              <div class="icon-box">...</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="data-list">
      <button class="pill-btn" type="button" data-action="create-single-link">+ Create single-use link</button>
      ${items.length
      ? items
        .map(
          (item) => `
                <article class="data-item">
                  <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.createdAt)} | ${escapeHtml(item.status)}</p>
                  </div>
                  <div class="actions">
                    <button class="mini-btn" type="button" data-action="copy-single-link" data-id="${item.id}">Copy</button>
                    <button class="mini-btn" type="button" data-action="delete-single-link" data-id="${item.id}">Delete</button>
                  </div>
                </article>
              `
        )
        .join("")
      : '<p class="text-muted small">No single-use links match your search.</p>'
    }
    </section>
  `;
}

function renderMeetingPolls(items) {
  if (!state.scheduling.meetingPolls.length) {
    return `
      <section class="empty-promo">
        <div class="promo-copy">
          <h2>Find the best time for everyone</h2>
          <p>Gather everyone's availability to pick the best time for the group. Track votes as they come in, and book the most popular time.</p>
          <a class="link-row" href="javascript:void(0)">Learn more</a>
          <button class="primary-action" type="button" data-action="create-poll">+ Create meeting poll</button>
        </div>
        <div class="promo-visual">
          <div class="promo-blob"></div>
          <div class="poll-card">
            <h4>Votes this week</h4>
            <ul class="poll-list">
              <li><span><span class="dot" style="background:#f06e8b"></span>Monday</span><span class="vote">2</span></li>
              <li><span><span class="dot" style="background:#25a6f7"></span>Tuesday</span><span class="vote">2</span></li>
              <li><span><span class="dot" style="background:#f7a600"></span>Wednesday</span><span class="vote">3</span></li>
              <li><span><span class="dot" style="background:#6325bf"></span>Thursday</span><span class="vote">1</span></li>
              <li><span><span class="dot" style="background:#1dbf73"></span>Friday</span><span class="vote">1</span></li>
            </ul>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="data-list">
      <button class="pill-btn" type="button" data-action="create-poll">+ Create meeting poll</button>
      ${items.length
      ? items
        .map(
          (item) => `
                <article class="data-item">
                  <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.createdAt)} | ${escapeHtml(item.status)}</p>
                  </div>
                  <div class="actions">
                    <button class="mini-btn" type="button" data-action="toggle-poll-status" data-id="${item.id}">
                      ${item.status === "open" ? "Close" : "Reopen"}
                    </button>
                    <button class="mini-btn" type="button" data-action="delete-poll" data-id="${item.id}">Delete</button>
                  </div>
                </article>
              `
        )
        .join("")
      : '<p class="text-muted small">No meeting polls match your search.</p>'
    }
    </section>
  `;
}

function renderContactsView() {
  const query = state.contacts.search.trim().toLowerCase();
  const filter = CONTACT_FILTERS.includes(state.contacts.filter)
    ? state.contacts.filter
    : "all";

  const items = state.contacts.items.filter((item) => {
    if (query) {
      const haystack = `${item.name} ${item.email} ${item.company} ${item.notes} ${(
        item.tags || []
      ).join(" ")}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filter === "lead") return item.type === "Lead";
    if (filter === "customer") return item.type === "Customer";
    if (filter === "vip") return (item.tags || []).includes("VIP");
    return true;
  });

  return `
    <section class="resource-page">
      <section class="utility-row resource-toolbar">
      <div class="left">
        <label class="search-box">
          <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 5.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>
          <input data-action="contacts-search" value="${escapeHtml(
    state.contacts.search
  )}" placeholder="Search contacts" />
        </label>
        <select class="filter-select" data-action="contacts-filter">
          <option value="all" ${filter === "all" ? "selected" : ""}>All contacts</option>
          <option value="lead" ${filter === "lead" ? "selected" : ""}>Leads</option>
          <option value="customer" ${filter === "customer" ? "selected" : ""}>Customers</option>
          <option value="vip" ${filter === "vip" ? "selected" : ""}>VIP</option>
        </select>
      </div>
      <button class="pill-btn" type="button" data-action="create-contact">+ New contact</button>
      </section>
    ${items.length
      ? `<section class="data-list resource-list">
            ${items
        .map(
          (item) => `
                <article class="data-item">
                  <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <p>${escapeHtml(item.email)} • ${escapeHtml(item.company)} • ${escapeHtml(
            item.type
          )}</p>
                    <p>Last meeting: ${escapeHtml(item.lastMeeting || "Never")} ${(item.tags || []).length
              ? `• Tags: ${escapeHtml((item.tags || []).join(", "))}`
              : ""
            }</p>
                  </div>
                  <div class="actions">
                    <button class="mini-btn" type="button" data-action="toggle-contact-vip" data-id="${item.id}">${(item.tags || []).includes("VIP") ? "Remove VIP" : "Mark VIP"
            }</button>
                    <button class="mini-btn" type="button" data-action="edit-contact" data-id="${item.id}">Edit</button>
                    <button class="mini-btn" type="button" data-action="delete-contact" data-id="${item.id}">Delete</button>
                  </div>
                </article>
              `
        )
        .join("")}
          </section>`
      : '<section class="panel resource-empty"><p class="text-muted">No contacts match your search.</p></section>'
    }
    </section>
  `;
}

function renderWorkflowsView() {
  const query = state.workflows.search.trim().toLowerCase();
  const filter = WORKFLOW_FILTERS.includes(state.workflows.filter)
    ? state.workflows.filter
    : "all";
  const items = state.workflows.items.filter((item) => {
    if (query) {
      const haystack = `${item.name} ${item.trigger} ${item.channel} ${item.offset}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filter === "all") return true;
    return item.status === filter;
  });

  return `
    <section class="resource-page">
      <section class="utility-row resource-toolbar">
      <div class="left">
        <label class="search-box">
          <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 5.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>
          <input data-action="workflows-search" value="${escapeHtml(
    state.workflows.search
  )}" placeholder="Search workflows" />
        </label>
        <select class="filter-select" data-action="workflows-filter">
          <option value="all" ${filter === "all" ? "selected" : ""}>All statuses</option>
          <option value="active" ${filter === "active" ? "selected" : ""}>Active</option>
          <option value="paused" ${filter === "paused" ? "selected" : ""}>Paused</option>
          <option value="draft" ${filter === "draft" ? "selected" : ""}>Draft</option>
        </select>
      </div>
      <button class="pill-btn" type="button" data-action="create-workflow">+ New workflow</button>
      </section>
    ${items.length
      ? `<section class="data-list resource-list">
            ${items
        .map(
          (item) => `
                <article class="data-item">
                  <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <p>${escapeHtml(item.trigger)} • ${escapeHtml(item.channel)} • ${escapeHtml(
            item.offset
          )}</p>
                    <p>Last run: ${escapeHtml(item.lastRun || "Never")}</p>
                  </div>
                  <div class="actions">
                    <span class="status-pill ${item.status === "active"
              ? "success"
              : item.status === "paused"
                ? "pending"
                : ""
            }">${escapeHtml(item.status)}</span>
                    <button class="mini-btn" type="button" data-action="run-workflow" data-id="${item.id}">Run</button>
                    <button class="mini-btn" type="button" data-action="toggle-workflow-status" data-id="${item.id}">${item.status === "active" ? "Pause" : "Activate"
            }</button>
                    <button class="mini-btn" type="button" data-action="duplicate-workflow" data-id="${item.id}">Duplicate</button>
                    <button class="mini-btn" type="button" data-action="delete-workflow" data-id="${item.id}">Delete</button>
                  </div>
                </article>
              `
        )
        .join("")}
          </section>`
      : '<section class="panel resource-empty"><p class="text-muted">No workflows match your search.</p></section>'
    }
    </section>
  `;
}

function renderIntegrationIcon(item, { detail = false } = {}) {
  const key = String(item?.key || "").trim().toLowerCase();
  const logoPath = INTEGRATION_LOGO_PATHS[key] || "";
  const classes = ["integration-icon"];
  if (detail) classes.push("integration-icon-detail");

  if (logoPath) {
    classes.push("integration-icon-logo");
    return `
      <span class="${classes.join(" ")}">
        <img class="integration-logo-img" src="${escapeHtml(logoPath)}" alt="${escapeHtml(
      `${item?.name || "Integration"} logo`
    )}" loading="lazy" />
      </span>
    `;
  }

  return `
    <span class="${classes.join(" ")}" style="--icon-bg:${escapeHtml(
    item?.iconBg || "#1f6feb"
  )};">${escapeHtml(item?.iconText || "APP")}</span>
  `;
}

function renderIntegrationsView() {
  const detailKey = INTEGRATION_DETAIL_KEYS.has(state.integrations.detailKey)
    ? state.integrations.detailKey
    : "";

  if (detailKey === "google-meet") {
    const googleMeetIntegration =
      state.integrations.items.find((item) => item.key === "google-meet") || {
        key: "google-meet",
        name: "Google Meet",
        iconText: "GM",
        iconBg: "#0f9d58",
        connected: false,
      };
    const googleCalendarIntegration =
      state.integrations.items.find((item) => item.key === "google-calendar") || null;
    const calendarConnected = !!googleCalendarIntegration?.connected;
    const connectedAccount = String(
      googleCalendarIntegration?.account || DEFAULT_INTEGRATION_ACCOUNT
    ).trim();

    return `
      <section class="integrations-shell integration-detail-shell">
        <button class="link-btn integration-back-btn" type="button" data-action="back-integrations-list">
          ← Integrations & apps
        </button>

        <article class="panel integration-detail-card">
          <div class="integration-detail-head">
            ${renderIntegrationIcon(googleMeetIntegration, { detail: true })}
            <h2>${escapeHtml(googleMeetIntegration.name || "Google Meet")}</h2>
            <span class="status-pill ${calendarConnected ? "success" : "pending"} integration-status-top">
              ${calendarConnected ? "Connected" : "Available"}
            </span>
          </div>
          <p class="integration-detail-lead">
            ${calendarConnected
        ? "Congratulations! You can schedule with Google Meet because your Google Calendar is connected."
        : "Google Meet needs Google Calendar to generate meeting links automatically for bookings."
      }
          </p>
          <div class="integration-detail-connected">
            ${renderIntegrationIcon(
        {
          key: "google-calendar",
          name: "Google Calendar",
          iconText: "31",
          iconBg: "#3b82f6",
        },
        { detail: true }
      )}
            <div class="integration-detail-account">
              <span class="integration-detail-account-label">${calendarConnected ? "Connected by" : "Calendar not connected"}</span>
              <span class="integration-detail-account-email">${escapeHtml(
        calendarConnected ? connectedAccount : "Connect Google Calendar to continue"
      )}</span>
            </div>
          </div>
          <div class="integration-detail-actions">
            ${calendarConnected
        ? '<button class="pill-btn" type="button" data-action="manage-calendar-connection">Manage Calendar Connection</button>'
        : '<button class="pill-btn" type="button" data-action="connect-google-calendar-oauth">Connect Google Calendar</button>'
      }
          </div>
        </article>

        <article class="panel integration-detail-card">
          <h3>With your connected Google Calendar, you can:</h3>
          <ul class="integration-detail-list">
            <li>Generate Google Meet links automatically when an invitee books.</li>
            <li>Set Google Meet as a default location for event types.</li>
            <li>Keep meeting details synced between dashboard and calendar events.</li>
          </ul>
        </article>
      </section>
    `;
  }

  const activeTab = INTEGRATION_TABS.includes(state.integrations.activeTab)
    ? state.integrations.activeTab
    : "Discover";
  const search = state.integrations.search.trim().toLowerCase();
  const filter = INTEGRATION_FILTERS.includes(state.integrations.filter)
    ? state.integrations.filter
    : "all";
  const sort = INTEGRATION_SORT_OPTIONS.includes(state.integrations.sort)
    ? state.integrations.sort
    : "Most popular";
  const totalCount = state.integrations.items.length;
  const connectedCount = state.integrations.items.filter((item) => item.connected).length;

  const baseItems = state.integrations.items.filter(
    (item) => activeTab === "Manage" ? item.connected : true
  );

  const filtered = baseItems.filter((item) => {
    if (filter === "connected" && !item.connected) return false;
    if (filter === "available" && item.connected) return false;
    if (!search) return true;
    const haystack = `${item.name} ${item.category} ${item.description}`.toLowerCase();
    return haystack.includes(search);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "A-Z") {
      return a.name.localeCompare(b.name);
    }
    if (sort === "Category") {
      const byCategory = a.category.localeCompare(b.category);
      return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name);
    }
    if (a.connected !== b.connected) return a.connected ? -1 : 1;
    return (a.popularRank || 9999) - (b.popularRank || 9999);
  });

  const emptyMessage =
    activeTab === "Manage"
      ? "No connected integrations yet. Connect Google Calendar or Google Meet from Discover."
      : "No integrations match your search or filter.";

  return `
    <section class="integrations-shell">
      ${activeTab === "Discover" && state.integrations.showBanner
      ? `
          <article class="integration-banner">
            <button class="integration-banner-close" type="button" data-action="dismiss-integration-banner" aria-label="Dismiss banner">×</button>
            <div class="integration-banner-media">
              <span class="integration-preview-chip">Select your calendar</span>
              <ul>
                <li>Google Calendar</li>
                <li>Google Meet</li>
              </ul>
            </div>
            <div class="integration-banner-copy">
              <p class="eyebrow">Getting Started</p>
              <h2>Connect your Google tools</h2>
              <p>Use Google Calendar and Google Meet to create events and share meeting links automatically.</p>
            </div>
          </article>
        `
      : ""
    }

      <section class="utility-row integrations-controls">
        <div class="left">
          <p class="integration-stats">Connected ${connectedCount} of ${totalCount} apps</p>
          <label class="search-box">
            <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 5.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>
            <input data-action="integrations-search" value="${escapeHtml(
      state.integrations.search
    )}" placeholder="Find Google integrations" />
          </label>
        </div>
        <div class="integrations-toolbar">
          <select class="filter-select" data-action="integrations-filter" aria-label="Integration filter">
            <option value="all" ${filter === "all" ? "selected" : ""}>All apps</option>
            <option value="connected" ${filter === "connected" ? "selected" : ""}>Connected</option>
            <option value="available" ${filter === "available" ? "selected" : ""}>Not connected</option>
          </select>
          <select class="filter-select" data-action="integrations-sort" aria-label="Integration sort">
            ${INTEGRATION_SORT_OPTIONS.map(
      (option) =>
        `<option value="${escapeHtml(option)}" ${option === sort ? "selected" : ""
        }>${escapeHtml(option)}</option>`
    ).join("")}
          </select>
        </div>
      </section>

      ${sorted.length
      ? `<section class="integration-grid">
              ${sorted
        .map(
          (item) => `
                  <article class="integration-card ${item.connected ? "is-connected" : ""}">
                    <div class="integration-card-head">
                      <div class="integration-card-pill-row">
                        <span class="status-pill ${item.connected ? "success" : "pending"} integration-status-top">
                          ${item.connected ? "Connected" : "Available"}
                        </span>
                        ${item.adminOnly
              ? '<span class="integration-admin-badge">Admin</span>'
              : ""
            }
                      </div>
                    </div>
                    <div class="integration-card-brand">
                      ${renderIntegrationIcon(item)}
                    </div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${escapeHtml(item.description)}</p>
                    <div class="integration-meta-row">
                      <span class="integration-category">${escapeHtml(item.category)}</span>
                    </div>
                    <div class="integration-meta-sub">
                      ${item.connected
              ? `
                            <span>${escapeHtml(
                item.account || "Connected"
              )}</span>
                            <span>Sync: ${escapeHtml(item.lastSync)}</span>
                          `
              : "<span>Not connected</span>"
            }
                    </div>
                    <div class="integration-actions">
                      ${item.connected
              ? `
                            ${item.key === "google-meet"
                  ? `<button class="mini-btn mini-btn-secondary" type="button" data-action="open-integration-detail" data-key="google-meet">Open</button>`
                  : item.key === "google-calendar"
                    ? `<button class="mini-btn mini-btn-secondary" type="button" data-action="manage-calendar-connection">Manage</button>`
                    : `<button class="mini-btn mini-btn-secondary" type="button" data-action="configure-integration" data-id="${item.id}">Configure</button>`
                }
                            <button class="mini-btn mini-btn-danger" type="button" data-action="toggle-integration" data-id="${item.id}">Disconnect</button>
                          `
              : `
                            <button class="mini-btn mini-btn-primary" type="button" data-action="toggle-integration" data-id="${item.id}">Connect</button>
                          `
            }
                    </div>
                  </article>
                `
        )
        .join("")}
            </section>`
      : `
            <section class="panel integration-empty">
              <h3>${escapeHtml(emptyMessage)}</h3>
              ${activeTab === "Manage"
        ? '<button class="primary-btn" type="button" data-action="switch-integrations-tab" data-tab="Discover">Go to Discover</button>'
        : ""
      }
            </section>
          `
    }
    </section>
  `;
}

function renderLandingPageView() {
  return `
    <section class="landing-builder-shell" style="--landing-accent:#1a73e8;">
      <article class="landing-builder-card landing-builder-overview">
        <div class="landing-builder-head">
          <div>
            <h2>Landing page builder moved</h2>
            <p class="text-muted">
              The new Shopify-style landing page editor is now available in a dedicated workspace.
            </p>
          </div>
          <div class="landing-builder-actions">
            <a class="pill-btn" href="/dashboard/landing-page" target="_self">Open new builder</a>
          </div>
        </div>
        <div class="landing-builder-url">
          <span>New path</span>
          <code>/dashboard/landing-page</code>
          <span class="landing-pill is-live">Active</span>
        </div>
      </article>
    </section>
  `;

  const landingState = state["landing-page"];
  const page = landingState.page || {};
  const accentColor = /^#[0-9a-f]{6}$/i.test(String(page.primaryColor || ""))
    ? String(page.primaryColor)
    : "#1a73e8";
  const username =
    sanitizeSlug(page.username) || sanitizeSlug(state.account.myLink.slug) || "meetscheduling";
  const publicUrl = `${window.location.origin}/${username}`;
  const eventTypes = Array.isArray(page.eventTypes) ? page.eventTypes : [];
  const services = Array.isArray(page.services) ? page.services : [];
  const gallery = Array.isArray(page.gallery) ? page.gallery : [];
  const leads = Array.isArray(landingState.leads) ? landingState.leads : [];
  const leadsStatus = LANDING_LEAD_STATUS_FILTERS.includes(landingState.leadsStatus)
    ? landingState.leadsStatus
    : "all";
  const leadStatusLabels = {
    all: "All leads",
    new: "New",
    contacted: "Contacted",
    won: "Won",
    closed: "Closed",
  };

  const featuredOptions = eventTypes.length
    ? `
      <option value="">Auto (first published event)</option>
      ${eventTypes
      .map(
        (eventType) => `
            <option value="${escapeHtml(eventType.id)}" ${String(page.featuredEventTypeId || "") === String(eventType.id) ? "selected" : ""
          }>
              ${escapeHtml(eventType.title)} (${Math.max(1, Number(eventType.durationMinutes) || 30)} min)
            </option>
          `
      )
      .join("")}
    `
    : '<option value="">No active event types found</option>';

  const eventTypeCards = eventTypes.length
    ? eventTypes
      .map((eventType) => {
        const duration = Math.max(1, Number(eventType.durationMinutes) || 30);
        const slug = sanitizeSlug(eventType.slug);
        const location = String(eventType.locationType || "custom")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
        return `
            <article class="landing-event-card ${String(page.featuredEventTypeId || "") === String(eventType.id) ? "is-featured" : ""
          }">
              <h4>${escapeHtml(eventType.title)}</h4>
              <p>${duration} min • ${escapeHtml(location || "Custom")}</p>
              <div class="landing-event-foot">
                <span>/ ${escapeHtml(username)} / ${escapeHtml(slug || "event-slug")}</span>
                ${slug
            ? `<a class="pill-btn" href="/${escapeHtml(username)}/${escapeHtml(
              slug
            )}" target="_blank" rel="noopener">Open booking link</a>`
            : '<span class="text-muted small">Missing slug</span>'
          }
              </div>
            </article>
          `;
      })
      .join("")
    : `
      <article class="landing-empty">
        <h4>Create event types first</h4>
        <p>
          Your landing page can only show published event types. Go to Scheduling to add
          One-on-One, Group, or Round Robin events.
        </p>
      </article>
    `;

  const serviceCards = services.length
    ? services
      .map(
        (service, index) => `
            <article class="landing-collection-item">
              <div class="landing-collection-head">
                <h4>Service ${index + 1}</h4>
                <button class="mini-btn" type="button" data-action="landing-remove-service" data-index="${index}">
                  Remove
                </button>
              </div>
              <label class="account-field">
                <span>Title</span>
                <input
                  class="account-input"
                  type="text"
                  data-action="landing-service-field"
                  data-index="${index}"
                  data-field="title"
                  maxlength="100"
                  value="${escapeHtml(service.title)}"
                />
              </label>
              <label class="account-field">
                <span>Description</span>
                <textarea
                  class="account-textarea"
                  data-action="landing-service-field"
                  data-index="${index}"
                  data-field="description"
                  maxlength="300"
                >${escapeHtml(service.description)}</textarea>
              </label>
            </article>
          `
      )
      .join("")
    : `
      <article class="landing-empty">
        <p>Add service cards so visitors understand what your business provides before booking.</p>
      </article>
    `;

  const galleryCards = gallery.length
    ? gallery
      .map(
        (image, index) => `
            <article class="landing-collection-item landing-gallery-item">
              <div class="landing-collection-head">
                <h4>Photo ${index + 1}</h4>
                <button class="mini-btn" type="button" data-action="landing-remove-gallery" data-index="${index}">
                  Remove
                </button>
              </div>
              <label class="account-field">
                <span>Image URL</span>
                <input
                  class="account-input"
                  type="url"
                  data-action="landing-gallery-field"
                  data-index="${index}"
                  data-field="url"
                  maxlength="1000"
                  placeholder="https://..."
                  value="${escapeHtml(image.url)}"
                />
              </label>
              <label class="account-field">
                <span>Alt text</span>
                <input
                  class="account-input"
                  type="text"
                  data-action="landing-gallery-field"
                  data-index="${index}"
                  data-field="alt"
                  maxlength="160"
                  placeholder="Describe this image"
                  value="${escapeHtml(image.alt)}"
                />
              </label>
            </article>
          `
      )
      .join("")
    : `
      <article class="landing-empty">
        <p>Add profile or portfolio images for a stronger trust-building landing page.</p>
      </article>
    `;

  const leadCards = leads.length
    ? leads
      .map((lead) => {
        const status = LANDING_LEAD_STATUS_FILTERS.includes(String(lead.status || "").toLowerCase())
          ? String(lead.status || "").toLowerCase()
          : "new";
        const createdLabel = formatUiDateTime(lead.createdAt, "Just now");
        const queryPreview = String(lead.query || "").trim();
        const trimmedQuery =
          queryPreview.length > 280 ? `${queryPreview.slice(0, 277)}...` : queryPreview;
        return `
            <article class="landing-lead-card">
              <div class="landing-lead-top">
                <div>
                  <h4>${escapeHtml(lead.name)}</h4>
                  <p>${escapeHtml(lead.email)}</p>
                </div>
                <span class="status-pill landing-lead-status status-${escapeHtml(status)}">
                  ${escapeHtml(leadStatusLabels[status] || "New")}
                </span>
              </div>
              <div class="landing-lead-meta">
                <span><strong>Company:</strong> ${escapeHtml(lead.company || "—")}</span>
                <span><strong>Phone:</strong> ${escapeHtml(lead.phone || "—")}</span>
                <span><strong>Event:</strong> ${escapeHtml(lead.eventTypeTitle || "General inquiry")}</span>
                <span><strong>Received:</strong> ${escapeHtml(createdLabel)}</span>
              </div>
              <p class="landing-lead-query">${escapeHtml(trimmedQuery || "No query provided")}</p>
              <div class="landing-lead-foot">
                <label>
                  Status
                  <select data-action="landing-lead-status" data-id="${escapeHtml(lead.id)}">
                    ${LANDING_LEAD_STATUS_FILTERS.filter((value) => value !== "all")
            .map(
              (value) => `
                          <option value="${escapeHtml(value)}" ${status === value ? "selected" : ""}>
                            ${escapeHtml(leadStatusLabels[value])}
                          </option>
                        `
            )
            .join("")}
                  </select>
                </label>
                ${lead.sourceUrl
            ? `<a class="link-btn" href="${escapeHtml(
              lead.sourceUrl
            )}" target="_blank" rel="noopener">Source page</a>`
            : "<span></span>"
          }
              </div>
            </article>
          `;
      })
      .join("")
    : `
      <article class="landing-empty">
        <p>No leads in this filter yet. Share your landing page to start receiving custom queries.</p>
      </article>
    `;

  return `
    <section class="landing-builder-shell" style="--landing-accent:${escapeHtml(accentColor)};">
      <article class="landing-builder-card landing-builder-overview">
        <div class="landing-builder-head">
          <div>
            <h2>Business landing page builder</h2>
            <p class="text-muted">
              Create a profile page with event types, photos, and a lead contact form for custom queries.
            </p>
          </div>
          <div class="landing-builder-actions">
            <button class="pill-btn" type="button" data-action="landing-copy-link">Copy link</button>
            <button class="pill-btn" type="button" data-action="landing-preview">Preview</button>
            <button class="primary-btn" type="button" data-action="landing-save" ${landingState.saving ? "disabled" : ""
    }>
              ${landingState.saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
        <div class="landing-builder-url">
          <span>Public URL</span>
          <code>${escapeHtml(publicUrl)}</code>
          <span class="landing-pill ${page.isPublished ? "is-live" : "is-draft"}">
            ${page.isPublished ? "Live" : "Draft"}
          </span>
        </div>
        ${landingState.loading
      ? '<p class="landing-syncing">Syncing latest landing page and leads...</p>'
      : ""
    }
      </article>

      <section class="landing-layout-grid">
        <div class="landing-main-column">
          <article class="landing-builder-card">
            <div class="landing-builder-head compact">
              <div>
                <h3>Page content</h3>
                <p class="text-muted">Edit hero copy, CTA, profile photo and cover visual.</p>
              </div>
            </div>

            <div class="landing-form-grid">
              <label class="account-field">
                <span>Username</span>
                <input class="account-input" type="text" value="${escapeHtml(username)}" readonly />
              </label>
              <label class="account-field">
                <span>Display name</span>
                <input class="account-input" type="text" value="${escapeHtml(page.displayName || "")}" readonly />
              </label>
              <label class="account-field landing-field-full">
                <span>Headline</span>
                <input
                  class="account-input"
                  type="text"
                  maxlength="160"
                  data-action="landing-field"
                  data-field="headline"
                  value="${escapeHtml(page.headline || "")}"
                />
              </label>
              <label class="account-field landing-field-full">
                <span>Subheadline</span>
                <input
                  class="account-input"
                  type="text"
                  maxlength="260"
                  data-action="landing-field"
                  data-field="subheadline"
                  value="${escapeHtml(page.subheadline || "")}"
                />
              </label>
              <label class="account-field landing-field-full">
                <span>About text</span>
                <textarea
                  class="account-textarea"
                  maxlength="5000"
                  data-action="landing-field"
                  data-field="aboutText"
                >${escapeHtml(page.aboutText || "")}</textarea>
              </label>
              <label class="account-field">
                <span>Primary CTA label</span>
                <input
                  class="account-input"
                  type="text"
                  maxlength="80"
                  data-action="landing-field"
                  data-field="ctaLabel"
                  value="${escapeHtml(page.ctaLabel || "")}"
                />
              </label>
              <label class="account-field">
                <span>Primary color</span>
                <input
                  class="account-input"
                  type="text"
                  maxlength="16"
                  placeholder="#1a73e8"
                  data-action="landing-field"
                  data-field="primaryColor"
                  value="${escapeHtml(page.primaryColor || "")}"
                />
              </label>
              <label class="account-field landing-field-full">
                <span>Profile image URL</span>
                <input
                  class="account-input"
                  type="url"
                  maxlength="1000"
                  placeholder="https://..."
                  data-action="landing-field"
                  data-field="profileImageUrl"
                  value="${escapeHtml(page.profileImageUrl || "")}"
                />
              </label>
              <label class="account-field landing-field-full">
                <span>Cover image URL</span>
                <input
                  class="account-input"
                  type="url"
                  maxlength="1000"
                  placeholder="https://..."
                  data-action="landing-field"
                  data-field="coverImageUrl"
                  value="${escapeHtml(page.coverImageUrl || "")}"
                />
              </label>
            </div>
          </article>

          <article class="landing-builder-card">
            <div class="landing-builder-head compact">
              <div>
                <h3>Published event types</h3>
                <p class="text-muted">Choose a featured event and verify booking URLs on this landing page.</p>
              </div>
            </div>
            <label class="account-field">
              <span>Featured event type</span>
              <select class="account-select" data-action="landing-featured-event">
                ${featuredOptions}
              </select>
            </label>
            <div class="landing-event-grid">${eventTypeCards}</div>
          </article>

          <article class="landing-builder-card">
            <div class="landing-builder-head compact">
              <div>
                <h3>Services</h3>
                <p class="text-muted">Add service cards visitors can scan before booking.</p>
              </div>
              <button class="pill-btn" type="button" data-action="landing-add-service">+ Add service</button>
            </div>
            <div class="landing-collection">${serviceCards}</div>
          </article>

          <article class="landing-builder-card">
            <div class="landing-builder-head compact">
              <div>
                <h3>Gallery</h3>
                <p class="text-muted">Show profile photos, case studies, and trust visuals.</p>
              </div>
              <button class="pill-btn" type="button" data-action="landing-add-gallery">+ Add image</button>
            </div>
            <div class="landing-collection">${galleryCards}</div>
          </article>
        </div>

        <aside class="landing-side-column">
          <article class="landing-builder-card">
            <div class="landing-builder-head compact">
              <div>
                <h3>Publishing controls</h3>
                <p class="text-muted">Manage visibility and lead form behavior.</p>
              </div>
            </div>
            <div class="landing-toggle-stack">
              <label class="inline-toggle with-switch">
                <span>Publish landing page</span>
                <input
                  type="checkbox"
                  data-action="landing-toggle"
                  data-field="isPublished"
                  ${page.isPublished ? "checked" : ""}
                />
                <span class="switch"></span>
              </label>
              <label class="inline-toggle with-switch">
                <span>Enable lead contact form</span>
                <input
                  type="checkbox"
                  data-action="landing-toggle"
                  data-field="contactFormEnabled"
                  ${page.contactFormEnabled ? "checked" : ""}
                />
                <span class="switch"></span>
              </label>
              <p class="text-muted small">
                When enabled, visitors can send custom business queries and every submission appears in the lead inbox.
              </p>
            </div>
          </article>

          <article class="landing-builder-card">
            <div class="landing-builder-head compact">
              <div>
                <h3>Lead inbox</h3>
                <p class="text-muted">Track contact-form submissions from your landing page.</p>
              </div>
            </div>
            <div class="landing-leads-toolbar">
              <label>
                <span>Status</span>
                <select data-action="landing-leads-status">
                  ${LANDING_LEAD_STATUS_FILTERS.map(
      (status) => `
                      <option value="${escapeHtml(status)}" ${leadsStatus === status ? "selected" : ""}>
                        ${escapeHtml(leadStatusLabels[status])}
                      </option>
                    `
    ).join("")}
                </select>
              </label>
              <button class="mini-btn" type="button" data-action="landing-refresh-leads" ${landingState.loading ? "disabled" : ""
    }>
                Refresh
              </button>
            </div>
            <p class="landing-stat-line">
              Showing <strong>${leads.length}</strong> lead${leads.length === 1 ? "" : "s"} in
              <strong>${escapeHtml(leadStatusLabels[leadsStatus] || "All leads")}</strong>.
            </p>
            <div class="landing-leads-list">${leadCards}</div>
          </article>
        </aside>
      </section>
    </section>
  `;
}

function renderRoutingView() {
  const query = state.routing.search.trim().toLowerCase();
  const filter = ROUTING_FILTERS.includes(state.routing.filter)
    ? state.routing.filter
    : "all";
  const forms = state.routing.forms.filter((item) => {
    if (query) {
      const haystack = `${item.name} ${item.destination}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filter === "active") return item.active;
    if (filter === "paused") return !item.active;
    return true;
  });
  const leads = state.routing.leads.filter((item) => {
    if (!query) return true;
    const haystack = `${item.name} ${item.email} ${item.company} ${item.routeTo}`.toLowerCase();
    return haystack.includes(query);
  });

  return `
    <section class="resource-page">
    <section class="utility-row resource-toolbar">
      <div class="left">
        <label class="search-box">
          <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 5.3 14l4.4 4.4 1.4-1.4-4.4-4.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>
          <input data-action="routing-search" value="${escapeHtml(
    state.routing.search
  )}" placeholder="Search forms and leads" />
        </label>
        <select class="filter-select" data-action="routing-filter">
          <option value="all" ${filter === "all" ? "selected" : ""}>All forms</option>
          <option value="active" ${filter === "active" ? "selected" : ""}>Active forms</option>
          <option value="paused" ${filter === "paused" ? "selected" : ""}>Paused forms</option>
        </select>
      </div>
      <div class="actions">
        <button class="pill-btn" type="button" data-action="create-routing-form">+ New routing form</button>
        <button class="pill-btn" type="button" data-action="add-routing-lead">+ Add lead</button>
      </div>
    </section>

    <section class="panel routing-panel resource-panel">
      <h2>Routing forms</h2>
      ${forms.length
      ? `<div class="data-list">
              ${forms
        .map(
          (form) => `
                  <article class="data-item">
                    <div>
                      <strong>${escapeHtml(form.name)}</strong>
                      <p>Destination: ${escapeHtml(form.destination)} • Priority: ${escapeHtml(
            form.priority
          )}</p>
                      <p>Submissions today: ${escapeHtml(form.submissionsToday)} • Conversion: ${escapeHtml(
            form.conversionRate
          )}%</p>
                    </div>
                    <div class="actions">
                      <span class="status-pill ${form.active ? "success" : "pending"
            }">${form.active ? "Active" : "Paused"}</span>
                      <button class="mini-btn" type="button" data-action="toggle-routing-form" data-id="${form.id}">${form.active ? "Pause" : "Resume"
            }</button>
                      <button class="mini-btn" type="button" data-action="delete-routing-form" data-id="${form.id}">Delete</button>
                    </div>
                  </article>
                `
        )
        .join("")}
            </div>`
      : '<p class="text-muted resource-empty-copy">No routing forms found for this filter.</p>'
    }
    </section>

    <section class="panel routing-panel resource-panel">
      <h2>Unassigned and routed leads</h2>
      ${leads.length
      ? `<div class="data-list">
              ${leads
        .map(
          (lead) => `
                  <article class="data-item">
                    <div>
                      <strong>${escapeHtml(lead.name)}</strong>
                      <p>${escapeHtml(lead.email)} • ${escapeHtml(lead.company)}</p>
                      <p>Submitted: ${escapeHtml(lead.submittedAt)} • Route: ${escapeHtml(
            lead.routeTo || "Unassigned"
          )}</p>
                    </div>
                    <div class="actions">
                      <span class="status-pill ${lead.status === "Routed" ? "success" : "pending"
            }">${escapeHtml(lead.status)}</span>
                      <button class="mini-btn" type="button" data-action="route-lead" data-id="${lead.id}">Route</button>
                    </div>
                  </article>
                `
        )
        .join("")}
            </div>`
      : '<p class="text-muted resource-empty-copy">No leads found for this search.</p>'
    }
    </section>
    </section>
  `;
}

function renderAvailabilityView() {
  if (state.availability.activeTab === "Schedules") return renderSchedulesTab();
  if (state.availability.activeTab === "Calendar settings")
    return renderCalendarSettingsTab();
  return renderAdvancedSettingsTab();
}

function generateAvailabilityCalendarHTML() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[month];

  let html = `
    <div class="availability-month-header">
      <h4>${currentMonthName} ${year}</h4>
      <div class="month-nav">
        <button class="icon-btn" disabled><svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg></button>
        <button class="icon-btn" disabled><svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></button>
      </div>
    </div>
    <div class="availability-calendar-grid">
      <div class="cal-weekday">Sun</div>
      <div class="cal-weekday">Mon</div>
      <div class="cal-weekday">Tue</div>
      <div class="cal-weekday">Wed</div>
      <div class="cal-weekday">Thu</div>
      <div class="cal-weekday">Fri</div>
      <div class="cal-weekday">Sat</div>
  `;

  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;

    // Check if this date has specific hours
    const hasSpecific = state.availability.dateSpecific.some(r => r.date === dateString);

    html += `
      <div class="cal-day ${hasSpecific ? 'has-override' : ''}" data-action="add-date-specific" data-date="${dateString}" title="${hasSpecific ? 'Edit override' : 'Add override'}">
        <span class="day-num">${i}</span>
        ${hasSpecific ? '<span class="override-dot"></span>' : ''}
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

function renderSchedulesTab() {
  const draft = availabilityDateSpecificDraft;
  const formatUiTime = (time) => formatTimeOptionLabel(time);
  const formatUiDate = (iso) => {
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return `
    <section class="availability-card calendly-style availability-schedules-shell">
      <div class="availability-grid availability-grid-split">
        <section class="availability-block weekly-block">
          <div class="block-header weekly-header">
            <svg viewBox="0 0 24 24" class="header-icon">
              <path d="M7 7h11V4l5 4-5 4V9H7v4H4V7h3zm10 10H6v3l-5-4 5-4v3h11v-4h3v6h-3z"/>
            </svg>
            <div class="header-text-group">
              <h3>Weekly hours</h3>
              <p>Set when you are typically available for meetings</p>
            </div>
          </div>

          <div class="day-list">
            ${state.availability.weeklyHours
      .map((dayRow, dayIndex) => {
        const intervals = dayRow.intervals
          .map(
            (slot, slotIndex) => `
                    <div class="interval-row">
                      ${renderCompactTimePicker({
              value: slot.start,
              pickerKey: `weekly-${dayIndex}-${slotIndex}-start`,
              field: "start",
              scope: "weekly",
              dayIndex,
              slotIndex,
            })}
                      <span class="sep">-</span>
                      ${renderCompactTimePicker({
              value: slot.end,
              pickerKey: `weekly-${dayIndex}-${slotIndex}-end`,
              field: "end",
              scope: "weekly",
              dayIndex,
              slotIndex,
            })}
                      <div class="slot-actions">
                        <button class="action-btn icon-only" type="button" data-action="remove-interval" data-day-index="${dayIndex}" data-slot-index="${slotIndex}" title="Remove interval">
                          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
                        </button>
                        ${slotIndex === dayRow.intervals.length - 1
                ? `<button class="action-btn icon-only" type="button" data-action="add-interval" data-day-index="${dayIndex}" title="Add interval">
                              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            </button>`
                : ""
              }
                        ${slotIndex === 0
                ? `<button class="action-btn icon-only copy" type="button" data-action="copy-day" data-day-index="${dayIndex}" title="Copy to next day">
                              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                            </button>`
                : ""
              }
                      </div>
                    </div>
                  `
          )
          .join("");

        return `
                <article class="day-row ${dayRow.enabled ? "active" : "disabled"}">
                  <div class="day-controller">
                    <button class="day-badge-circle ${dayRow.enabled ? "enabled" : ""}" type="button" data-action="toggle-day" data-day-index="${dayIndex}" title="Toggle ${escapeHtml(
          dayRow.label
        )}">
                      ${escapeHtml(dayRow.day)}
                    </button>
                    ${dayRow.enabled
            ? ""
            : `<span class="unavailable-text">Unavailable</span>
                         <button class="action-btn icon-only add-first" type="button" data-action="add-interval" data-day-index="${dayIndex}" title="Add hours">
                           <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                         </button>`
          }
                  </div>
                  ${dayRow.enabled ? `<div class="interval-list">${intervals}</div>` : ""}
                </article>
              `;
      })
      .join("")}
          </div>

          <div class="timezone-footer">
            <label class="timezone-select-label timezone-select-inline" for="timezone-select">
              <select id="timezone-select" class="timezone-select" data-action="set-timezone">
                ${TIMEZONES.map(
        (tz) =>
          `<option value="${escapeHtml(tz)}" ${tz === state.availability.timezone ? "selected" : ""
          }>${escapeHtml(tz)}</option>`
      ).join("")}
              </select>
              <svg viewBox="0 0 24 24" class="chevron"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
            </label>
          </div>
        </section>

        <section class="availability-block specific-block">
          <div class="block-header date-header">
            <svg viewBox="0 0 24 24" class="header-icon">
              <path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
            </svg>
            <div class="header-text-group">
              <h3>Date-specific hours</h3>
              <p>Adjust hours for specific days</p>
            </div>
            <button class="ghost-btn add-hours-btn" type="button" data-action="add-date-specific">+ Hours</button>
          </div>

          ${draft.open
      ? `
                <div class="date-specific-editor">
                  <label>
                    Date
                    <input type="date" value="${escapeHtml(
        draft.date
      )}" data-action="date-specific-draft" data-field="date" />
                  </label>
                  <label>
                    Start
                    ${renderCompactTimePicker({
        value: draft.start,
        pickerKey: "date-specific-start",
        field: "start",
        scope: "date-specific",
      })}
                  </label>
                  <label>
                    End
                    ${renderCompactTimePicker({
        value: draft.end,
        pickerKey: "date-specific-end",
        field: "end",
        scope: "date-specific",
      })}
                  </label>
                  <div class="date-specific-editor-actions">
                    <button class="mini-btn" type="button" data-action="cancel-date-specific">Cancel</button>
                    <button class="pill-btn" type="button" data-action="save-date-specific">Save</button>
                  </div>
                </div>
              `
      : ""
    }

          <ul class="date-hours-list">
            ${state.availability.dateSpecific.length
      ? state.availability.dateSpecific
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(
          (row) => `
                  <li>
                    <div class="date-hours-left">
                      <span class="date-hours-chip">${escapeHtml(
            formatUiDate(row.date)
          )}</span>
                      <span class="date-hours-time">${escapeHtml(
            `${formatUiTime(row.start)} - ${formatUiTime(row.end)}`
          )}</span>
                    </div>
                    <button class="mini-btn icon-only ghost-danger" type="button" data-action="remove-date-specific" data-id="${escapeHtml(
            row.id
          )}" title="Remove date-specific hours">
                      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
                    </button>
                  </li>
                `
        )
        .join("")
      : '<li class="date-hours-empty">No date-specific hours set.</li>'
    }
          </ul>
        </section>
      </div>
    </section>
  `;
}

function renderCalendarSettingsTab() {
  const calendar = state.availability.calendar;

  return `
    <section class="availability-card">
      <div class="availability-top">
        <div>
          <h2>Calendar settings</h2>
          <p>Set which calendars we use to check for busy times</p>
        </div>
      </div>

      <div class="calendar-settings-body">
        <section>
          <h3>Calendars to check for conflicts</h3>
          <p class="text-muted">These calendars will be used to prevent double bookings</p>
          <p><button class="pill-btn" type="button" data-action="connect-calendar">+ Connect calendar account</button></p>

          <div class="calendar-list">
            ${calendar.connected.length
      ? calendar.connected
        .map(
          (item) => `
                      <article class="calendar-entry">
                        <div class="left">
                          <span class="provider-mark">${escapeHtml(
            getCalendarProviderMark(item.providerKey)
          )}</span>
                          <div class="calendar-label">
                            <strong>${escapeHtml(item.provider)}</strong>
                            <p>${escapeHtml(item.email)}<br/>Checking ${item.checkCount} calendar • Last sync ${escapeHtml(
            item.lastSync || "Never"
          )}</p>
                          </div>
                        </div>
                        <div class="calendar-entry-actions">
                          <button class="mini-btn" type="button" data-action="sync-calendar" data-provider="${escapeHtml(
            item.providerKey
          )}">Sync now</button>
                          <button class="tiny-icon-btn" type="button" data-action="remove-calendar" data-id="${item.id}" title="Disconnect">x</button>
                        </div>
                      </article>
                    `
        )
        .join("")
      : '<p class="small text-muted">No connected calendars yet.</p>'
    }
          </div>
        </section>

        <section>
          <h3>Calendar to add events to</h3>
          <p class="text-muted">Select where newly booked events are created</p>
          <select class="calendar-select" data-action="set-calendar-target">
            ${calendar.connected.length
      ? calendar.connected
        .map(
          (item) => `
                      <option value="${item.id}" ${item.id === calendar.selectedCalendarId ? "selected" : ""
            }>
                        ${escapeHtml(item.email)}
                      </option>
                    `
        )
        .join("")
      : '<option value="">No calendars connected</option>'
    }
          </select>
        </section>

        <section>
          <h3>Sync settings</h3>
          <div class="checkbox-row">
            <label>
              <input type="checkbox" data-action="set-calendar-option" data-field="includeBuffers" ${calendar.includeBuffers ? "checked" : ""
    } />
              Include buffers on this calendar
            </label>
            <label>
              <input type="checkbox" data-action="set-calendar-option" data-field="autoSync" ${calendar.autoSync ? "checked" : ""
    } />
              Automatically sync changes from this calendar to Meetscheduling
            </label>
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderAdvancedSettingsTab() {
  const advanced = state.availability.advanced;
  const holidays = HOLIDAY_DATA[advanced.country] || HOLIDAY_DATA["United States"];

  return `
    <section class="availability-card">
      <div class="availability-top">
        <div>
          <h2>Advanced settings</h2>
          <p>Control availability across all your event types</p>
        </div>
      </div>

      <div class="advanced-settings-body">
        <section>
          <h3>Meeting limits</h3>
          <p class="text-muted">Set a maximum number of total meetings. You can also set specific limits within individual events.</p>
          <p><button class="link-btn" type="button" data-action="add-meeting-limit">+ Add a meeting limit</button></p>
          <ul class="limits-list">
            ${advanced.meetingLimits.length
      ? advanced.meetingLimits
        .map(
          (item) => `
                      <li>
                        <span>${escapeHtml(item.label)}: <strong>${escapeHtml(
            item.value
          )}</strong></span>
                        <button class="mini-btn" type="button" data-action="remove-meeting-limit" data-id="${item.id}">Remove</button>
                      </li>
                    `
        )
        .join("")
      : '<li class="text-muted small">No limits configured yet.</li>'
    }
          </ul>
        </section>

        <section>
          <h3>Holidays</h3>
          <p class="text-muted">Meetscheduling will automatically mark you as unavailable for selected holidays.</p>
          <div class="holiday-panel">
            <div class="holiday-head">
              <div>
                <div class="small text-muted">Country for holidays</div>
                <label class="holiday-country">
                  <select data-action="set-country">
                    ${Object.keys(HOLIDAY_DATA)
      .map(
        (country) => `
                        <option value="${escapeHtml(country)}" ${country === advanced.country ? "selected" : ""
          }>${escapeHtml(country)}</option>
                      `
      )
      .join("")}
                  </select>
                </label>
              </div>
            </div>

            <ul class="holiday-list">
              ${holidays
      .map(
        (holiday, index) => `
                  <li>
                    <span>${escapeHtml(holiday.name)}</span>
                    <span class="date">Next: ${escapeHtml(holiday.next)}</span>
                    <label class="toggle-field">
                      <input type="checkbox" data-action="toggle-holiday" data-holiday-index="${index}" ${advanced.holidayToggles[advanced.country][holiday.name]
            ? "checked"
            : ""
          } />
                      <span class="switch"></span>
                    </label>
                  </li>
                `
      )
      .join("")}
            </ul>
          </div>
        </section>
      </div>
    </section>
  `;
}
