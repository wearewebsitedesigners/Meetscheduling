import React from "react";

export const AUTH_TOKEN_KEY = "meetscheduling_auth_token";
export const USER_KEY = "meetscheduling_auth_user";
const PREVIEW_STATE_KEY = "meetscheduling_dashboard_preview_state_v1";
const PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_PREVIEW_GLOBAL_KEY = "__MEETSCHEDULING_LOCAL_PREVIEW__";
const RESERVED_USERNAMES = new Set([
  "",
  "api",
  "assets",
  "dashboard",
  "app",
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "booking",
  "book",
  "schedule",
  "pricing",
  "about",
  "contact",
  "privacy",
  "terms",
  "blog",
  "help",
  "status",
]);

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function GlassOrb({ className }) {
  return <div className={cn("pointer-events-none absolute rounded-full bg-white/10 blur-3xl ring-1 ring-white/20", className)} />;
}

export function GlassButton({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/65 px-4 py-2.5 text-[14px] font-medium text-slate-700 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-[0_14px_40px_rgba(15,23,42,0.12)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/65 disabled:hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:disabled:hover:bg-white/5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-8 w-14 overflow-hidden rounded-full border p-[2px] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8DB2FF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        checked
          ? "border-cyan-300/30 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] shadow-[0_0_24px_rgba(56,189,248,0.26),inset_0_1px_0_rgba(255,255,255,0.18)]"
          : "border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:border-white/10 dark:bg-white/[0.08]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute left-[2px] top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow-[0_4px_14px_rgba(15,23,42,0.34)] transition-transform duration-300 ease-out",
          checked ? "translate-x-6" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function getInitials(value) {
  const source = typeof value === "string"
    ? value
    : value?.displayName || value?.name || value?.email || value?.username || "Workspace User";

  return String(source)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "WU";
}

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(USER_KEY);
      return;
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

function clearStoredAuth() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent("meetscheduling-auth-invalid"));
  } catch {
    // ignore
  }
}

export function isLocalPreviewHost() {
  try {
    return Boolean(window[LOCAL_PREVIEW_GLOBAL_KEY]) || PREVIEW_HOSTS.has(window.location.hostname);
  } catch {
    return false;
  }
}

function previewId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function toIso(offsetDays = 0, hour = 9, minute = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

function formatLocalParts(value, timezone = "UTC") {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    }).format(date),
    time: new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(date),
  };
}

function buildPreviewBooking({ id, inviteeName, inviteeEmail, eventTitle, offsetDays, hour, minute, durationMinutes, status = "confirmed", timezone = "UTC", notes = "", meetingLink = "" }) {
  const startAtUtc = toIso(offsetDays, hour, minute);
  const endAtUtc = toIso(offsetDays, hour, minute + durationMinutes);
  return {
    id,
    inviteeName,
    inviteeEmail,
    eventTitle,
    notes,
    visitorTimezone: timezone,
    startAtUtc,
    endAtUtc,
    startLocal: formatLocalParts(startAtUtc, timezone),
    endLocal: formatLocalParts(endAtUtc, timezone),
    durationMinutes,
    locationType: "google_meet",
    meetingLink,
    meetingLinkStatus: meetingLink ? "generated" : "pending_calendar_connection",
    status,
    createdAt: toIso(offsetDays - 2, 11, 0),
  };
}

function createPreviewState() {
  const user = {
    id: "preview-user",
    displayName: "Workspace User",
    username: "preview-user",
    email: "preview@meetscheduling.com",
    timezone: "UTC",
    avatarUrl: "",
  };

  const eventTypes = [
    {
      id: "evt_preview_1",
      title: "One-on-one meeting",
      slug: "one-on-one-meeting",
      description: "Primary scheduling link for client calls.",
      durationMinutes: 30,
      locationType: "google_meet",
      customLocation: "",
      color: "#2563eb",
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
      noticeMinimumHours: 2,
      maxBookingsPerDay: 5,
      isActive: true,
    },
    {
      id: "evt_preview_2",
      title: "Discovery call",
      slug: "discovery-call",
      description: "Introductory consult with new leads.",
      durationMinutes: 45,
      locationType: "zoom",
      customLocation: "",
      color: "#0ea5e9",
      bufferBeforeMin: 15,
      bufferAfterMin: 15,
      noticeMinimumHours: 4,
      maxBookingsPerDay: 3,
      isActive: true,
    },
    {
      id: "evt_preview_3",
      title: "VIP strategy session",
      slug: "vip-strategy-session",
      description: "Long-form strategy and planning session.",
      durationMinutes: 60,
      locationType: "custom",
      customLocation: "https://meet.example.com/vip",
      color: "#7c3aed",
      bufferBeforeMin: 15,
      bufferAfterMin: 15,
      noticeMinimumHours: 24,
      maxBookingsPerDay: 2,
      isActive: false,
    },
  ];

  const bookings = [
    buildPreviewBooking({
      id: "booking_preview_1",
      inviteeName: "Olivia Carter",
      inviteeEmail: "olivia@northlane.co",
      eventTitle: "One-on-one meeting",
      offsetDays: 1,
      hour: 10,
      minute: 0,
      durationMinutes: 30,
      timezone: "Europe/London",
      notes: "Wants to discuss Q2 launch planning.",
      meetingLink: "https://meet.google.com/aaa-bbbb-ccc",
    }),
    buildPreviewBooking({
      id: "booking_preview_2",
      inviteeName: "Marcus Hall",
      inviteeEmail: "marcus@retainer.studio",
      eventTitle: "Discovery call",
      offsetDays: 2,
      hour: 15,
      minute: 30,
      durationMinutes: 45,
      timezone: "America/New_York",
      notes: "Requested more information about retainers.",
      meetingLink: "https://meet.google.com/ddd-eeee-fff",
    }),
    buildPreviewBooking({
      id: "booking_preview_3",
      inviteeName: "Sarah Johnson",
      inviteeEmail: "sarah@brandworks.com",
      eventTitle: "One-on-one meeting",
      offsetDays: -2,
      hour: 11,
      minute: 0,
      durationMinutes: 30,
      timezone: "UTC",
      notes: "Past onboarding session.",
      meetingLink: "https://meet.google.com/ggg-hhhh-iii",
    }),
  ];

  const contacts = [
    {
      id: "contact_preview_1",
      name: "Olivia Carter",
      email: "olivia@northlane.co",
      phone: "",
      company: "Northlane Studio",
      type: "Lead",
      tags: ["VIP", "Agency"],
      notes: "Interested in quarterly planning sessions.",
      lastMeeting: "",
      nextMeetingAt: bookings[0].startAtUtc,
      createdAt: toIso(-12, 9, 0),
    },
    {
      id: "contact_preview_2",
      name: "Marcus Hall",
      email: "marcus@retainer.studio",
      phone: "",
      company: "Retainer Studio",
      type: "Customer",
      tags: ["Retainer"],
      notes: "Already in paid pilot.",
      lastMeeting: "",
      nextMeetingAt: bookings[1].startAtUtc,
      createdAt: toIso(-9, 14, 0),
    },
    {
      id: "contact_preview_3",
      name: "Sarah Johnson",
      email: "sarah@brandworks.com",
      phone: "",
      company: "Brand Works",
      type: "Lead",
      tags: ["Past"],
      notes: "Previous intro call completed.",
      lastMeeting: bookings[2].startAtUtc,
      nextMeetingAt: "",
      createdAt: toIso(-20, 12, 0),
    },
  ];

  return {
    user,
    eventTypes,
    bookings,
    contacts,
    calendars: [
      {
        providerKey: "google-calendar",
        provider: "Google Calendar",
        connected: false,
        accountEmail: "",
        lastSync: "Not connected",
      },
    ],
    calendarSettings: {
      selectedProvider: "",
      includeBuffers: false,
      autoSync: false,
    },
    availabilityWeekly: [
      { id: "avail_1", weekday: 1, start_time: "09:00", end_time: "17:00", is_available: true },
      { id: "avail_2", weekday: 2, start_time: "09:00", end_time: "17:00", is_available: true },
      { id: "avail_3", weekday: 3, start_time: "09:00", end_time: "17:00", is_available: true },
      { id: "avail_4", weekday: 4, start_time: "09:00", end_time: "17:00", is_available: true },
      { id: "avail_5", weekday: 5, start_time: "09:00", end_time: "17:00", is_available: true },
    ],
    availabilityOverrides: [],
    targets: {
      landingPages: [
        { id: "landing_preview_1", title: "Launch campaign landing page" },
        { id: "landing_preview_2", title: "Consulting services page" },
      ],
      bookingPages: [
        { id: "evt_preview_1", title: "One-on-one meeting" },
        { id: "evt_preview_2", title: "Discovery call" },
      ],
    },
    domains: [],
  };
}

function readPreviewState() {
  try {
    const raw = localStorage.getItem(PREVIEW_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const nextState = createPreviewState();
  writePreviewState(nextState);
  return nextState;
}

function writePreviewState(state) {
  try {
    localStorage.setItem(PREVIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function isValidPreviewUsername(value) {
  const username = String(value || "").trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(username) && !RESERVED_USERNAMES.has(username) && !username.includes(".");
}

export function getLocalPreviewUser() {
  return readPreviewState().user;
}

function buildPreviewOverview(state) {
  const now = Date.now();
  const futureConfirmed = state.bookings.filter((item) => item.status === "confirmed" && new Date(item.startAtUtc).getTime() > now);
  const paidContacts = state.contacts.filter((item) => String(item.type || "").toLowerCase() === "customer");
  const leads = state.contacts.filter((item) => String(item.type || "").toLowerCase() !== "customer");
  return {
    overview: {
      metrics: {
        bookings: {
          upcoming: futureConfirmed.length,
          confirmed: state.bookings.filter((item) => item.status === "confirmed").length,
        },
        contacts: {
          total: state.contacts.length,
          leads: leads.length,
          customers: paidContacts.length,
        },
        workflows: {
          active: 4,
          draft: 2,
        },
        paidRevenue: 1840,
        invoices: {
          paid: 7,
        },
      },
      recentContacts: state.contacts.slice(0, 4),
    },
  };
}

function previewJson(data) {
  return Promise.resolve(data);
}

function handlePreviewApi(path, options = {}) {
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const method = String(options.method || "GET").toUpperCase();
  const state = readPreviewState();
  const body = options.body && typeof options.body === "object" && !(options.body instanceof FormData) ? options.body : {};
  const pathname = url.pathname;

  if (pathname === "/api/auth/me" && method === "GET") {
    return previewJson({ user: state.user });
  }

  if (pathname === "/api/auth/me" && method === "PATCH") {
    if (body.username !== undefined) {
      const nextUsername = String(body.username || "").trim().toLowerCase();
      if (RESERVED_USERNAMES.has(nextUsername)) {
        const error = new Error("Username is reserved.");
        error.status = 400;
        return Promise.reject(error);
      }
      if (!isValidPreviewUsername(nextUsername)) {
        const error = new Error("username must use lowercase letters, numbers, and hyphens");
        error.status = 400;
        return Promise.reject(error);
      }
      state.user = {
        ...state.user,
        username: nextUsername,
        displayName: body.displayName === undefined ? state.user.displayName : String(body.displayName || "").trim() || state.user.displayName,
      };
    }

    if (body.displayName !== undefined) {
      state.user = {
        ...state.user,
        displayName: String(body.displayName || "").trim() || state.user.displayName,
      };
    }

    if (body.avatarUrl !== undefined) {
      state.user = {
        ...state.user,
        avatarUrl: String(body.avatarUrl || "").trim(),
      };
    }

    writePreviewState(state);
    setStoredUser(state.user);
    return previewJson({ user: state.user });
  }

  if (pathname === "/api/dashboard/overview" && method === "GET") {
    return previewJson(buildPreviewOverview(state));
  }

  if ((pathname === "/api/dashboard/bookings/upcoming" || pathname === "/api/dashboard/bookings") && method === "GET") {
    const timezone = url.searchParams.get("timezone") || state.user.timezone || "UTC";
    const statusFilter = url.searchParams.get("status") || "all";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const now = Date.now();
    let bookings = [...state.bookings];
    if (pathname.endsWith("/upcoming")) {
      bookings = bookings.filter((item) => new Date(item.startAtUtc).getTime() >= now);
    }
    if (statusFilter !== "all") {
      bookings = bookings.filter((item) => item.status === statusFilter);
    }
    if (from) bookings = bookings.filter((item) => item.startAtUtc.slice(0, 10) >= from);
    if (to) bookings = bookings.filter((item) => item.startAtUtc.slice(0, 10) <= to);
    bookings = bookings
      .map((item) => ({
        ...item,
        startLocal: formatLocalParts(item.startAtUtc, timezone),
        endLocal: formatLocalParts(item.endAtUtc, timezone),
      }))
      .sort((a, b) => new Date(a.startAtUtc).getTime() - new Date(b.startAtUtc).getTime());
    const limit = Number(url.searchParams.get("limit") || 0);
    return previewJson({ bookings: limit > 0 ? bookings.slice(0, limit) : bookings });
  }

  const cancelMatch = pathname.match(/^\/api\/dashboard\/bookings\/([^/]+)\/cancel$/);
  if (cancelMatch && method === "POST") {
    const bookingId = decodeURIComponent(cancelMatch[1]);
    state.bookings = state.bookings.map((item) =>
      item.id === bookingId
        ? { ...item, status: "canceled", cancelReason: body.reason || "Canceled from dashboard" }
        : item
    );
    writePreviewState(state);
    return previewJson({ booking: state.bookings.find((item) => item.id === bookingId) });
  }

  if (pathname === "/api/contacts" && method === "GET") {
    const needle = (url.searchParams.get("search") || "").trim().toLowerCase();
    const filter = (url.searchParams.get("filter") || "all").toLowerCase();
    let contacts = [...state.contacts];
    if (needle) {
      contacts = contacts.filter((item) =>
        `${item.name} ${item.email} ${item.company}`.toLowerCase().includes(needle)
      );
    }
    if (filter !== "all") {
      contacts = contacts.filter((item) => String(item.type || "").toLowerCase() === filter);
    }
    return previewJson({ contacts });
  }

  if (pathname === "/api/contacts" && method === "POST") {
    const nextContact = {
      id: previewId("contact"),
      name: String(body.name || "").trim() || "New contact",
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      company: String(body.company || "").trim(),
      type: String(body.type || "Lead"),
      tags: String(body.tags || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      notes: String(body.notes || "").trim(),
      lastMeeting: body.lastMeeting || "",
      nextMeetingAt: "",
      createdAt: new Date().toISOString(),
    };
    state.contacts = [nextContact, ...state.contacts];
    writePreviewState(state);
    return previewJson({ contact: nextContact });
  }

  const contactMatch = pathname.match(/^\/api\/contacts\/([^/]+)$/);
  if (contactMatch && method === "PATCH") {
    const contactId = decodeURIComponent(contactMatch[1]);
    state.contacts = state.contacts.map((item) =>
      item.id === contactId
        ? {
            ...item,
            name: String(body.name ?? item.name),
            email: String(body.email ?? item.email),
            phone: String(body.phone ?? (item.phone || "")),
            company: String(body.company ?? (item.company || "")),
            type: String(body.type ?? (item.type || "Lead")),
            tags: String(body.tags ?? (item.tags?.join(",") || ""))
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            notes: String(body.notes ?? (item.notes || "")),
            lastMeeting: body.lastMeeting ?? item.lastMeeting,
          }
        : item
    );
    writePreviewState(state);
    return previewJson({ contact: state.contacts.find((item) => item.id === contactId) });
  }

  if (contactMatch && method === "DELETE") {
    const contactId = decodeURIComponent(contactMatch[1]);
    state.contacts = state.contacts.filter((item) => item.id !== contactId);
    writePreviewState(state);
    return previewJson({ ok: true });
  }

  if (pathname === "/api/event-types" && method === "GET") {
    return previewJson({ eventTypes: state.eventTypes });
  }

  if (pathname === "/api/event-types" && method === "POST") {
    const nextEventType = {
      id: previewId("event"),
      title: String(body.title || "").trim() || "Untitled event",
      slug: String(body.slug || "").trim() || "untitled-event",
      description: String(body.description || "").trim(),
      durationMinutes: Number(body.durationMinutes || 30),
      locationType: body.locationType || "google_meet",
      customLocation: String(body.customLocation || "").trim(),
      color: body.color || "#2563eb",
      bufferBeforeMin: Number(body.bufferBeforeMin || 0),
      bufferAfterMin: Number(body.bufferAfterMin || 0),
      noticeMinimumHours: Number(body.noticeMinimumHours || 0),
      maxBookingsPerDay: Number(body.maxBookingsPerDay || 0),
      isActive: true,
    };
    state.eventTypes = [nextEventType, ...state.eventTypes];
    state.targets.bookingPages = state.eventTypes.map((item) => ({ id: item.id, title: item.title }));
    writePreviewState(state);
    return previewJson({ eventType: nextEventType });
  }

  const activeMatch = pathname.match(/^\/api\/event-types\/([^/]+)\/active$/);
  if (activeMatch && method === "PATCH") {
    const eventId = decodeURIComponent(activeMatch[1]);
    state.eventTypes = state.eventTypes.map((item) =>
      item.id === eventId ? { ...item, isActive: Boolean(body.isActive) } : item
    );
    writePreviewState(state);
    return previewJson({ eventType: state.eventTypes.find((item) => item.id === eventId) });
  }

  const eventMatch = pathname.match(/^\/api\/event-types\/([^/]+)$/);
  if (eventMatch && method === "PATCH") {
    const eventId = decodeURIComponent(eventMatch[1]);
    state.eventTypes = state.eventTypes.map((item) =>
      item.id === eventId
        ? {
            ...item,
            title: String(body.title ?? item.title),
            slug: String(body.slug ?? item.slug),
            description: String(body.description ?? (item.description || "")),
            durationMinutes: Number(body.durationMinutes ?? item.durationMinutes),
            locationType: body.locationType ?? item.locationType,
            customLocation: String(body.customLocation ?? (item.customLocation || "")),
            color: body.color ?? item.color,
            bufferBeforeMin: Number(body.bufferBeforeMin ?? item.bufferBeforeMin),
            bufferAfterMin: Number(body.bufferAfterMin ?? item.bufferAfterMin),
            noticeMinimumHours: Number(body.noticeMinimumHours ?? item.noticeMinimumHours),
            maxBookingsPerDay: Number(body.maxBookingsPerDay ?? item.maxBookingsPerDay),
          }
        : item
    );
    state.targets.bookingPages = state.eventTypes.map((item) => ({ id: item.id, title: item.title }));
    writePreviewState(state);
    return previewJson({ eventType: state.eventTypes.find((item) => item.id === eventId) });
  }

  if (pathname === "/api/availability" && method === "GET") {
    return previewJson({
      weekly: state.availabilityWeekly,
      overrides: state.availabilityOverrides,
    });
  }

  if (pathname === "/api/availability/weekly" && method === "PUT") {
    state.availabilityWeekly = Array.isArray(body.slots)
      ? body.slots.map((slot) => ({
          id: previewId("availability"),
          weekday: Number(slot.weekday),
          start_time: String(slot.startTime),
          end_time: String(slot.endTime),
          is_available: Boolean(slot.isAvailable ?? true),
        }))
      : [];
    writePreviewState(state);
    return previewJson({ weekly: state.availabilityWeekly });
  }

  if (pathname === "/api/availability/overrides" && method === "POST") {
    const nextOverride = {
      id: previewId("override"),
      overrideDate: body.overrideDate,
      override_date: body.overrideDate,
      startTime: body.startTime || "09:00",
      start_time: body.startTime || "09:00",
      endTime: body.endTime || "17:00",
      end_time: body.endTime || "17:00",
      isAvailable: Boolean(body.isAvailable),
      is_available: Boolean(body.isAvailable),
      note: String(body.note || ""),
    };
    state.availabilityOverrides = [...state.availabilityOverrides.filter((item) => item.id !== nextOverride.id), nextOverride];
    writePreviewState(state);
    return previewJson({ override: nextOverride });
  }

  const overrideMatch = pathname.match(/^\/api\/availability\/overrides\/([^/]+)$/);
  if (overrideMatch && method === "DELETE") {
    const overrideId = decodeURIComponent(overrideMatch[1]);
    state.availabilityOverrides = state.availabilityOverrides.filter((item) => item.id !== overrideId);
    writePreviewState(state);
    return previewJson({ ok: true });
  }

  if (pathname === "/api/integrations/calendars" && method === "GET") {
    return previewJson({
      calendars: state.calendars,
      selectedProvider: state.calendarSettings.selectedProvider,
      includeBuffers: state.calendarSettings.includeBuffers,
      autoSync: state.calendarSettings.autoSync,
    });
  }

  if (pathname === "/api/integrations/google-calendar/status" && method === "GET") {
    const googleCalendar = state.calendars.find((item) => item.providerKey === "google-calendar") || null;
    return previewJson({
      status: {
        scope: "workspace",
        workspaceId: "",
        userId: "",
        connected: Boolean(googleCalendar?.connected),
        hasWriteScope: Boolean(googleCalendar?.connected),
        hasRefreshToken: Boolean(googleCalendar?.connected),
        hasUsableToken: Boolean(googleCalendar?.connected),
        integrationId: googleCalendar?.providerKey || null,
        accountEmail: googleCalendar?.accountEmail || "",
        reason: googleCalendar?.connected ? "connected" : "missing_row",
        tokenSource: googleCalendar?.connected ? "preview" : "none",
        tokenDecryptFailed: false,
        workspaceMismatch: false,
        userScopeStatus: null,
      },
    });
  }

  if (pathname === "/api/integrations/calendars/settings" && method === "PATCH") {
    state.calendarSettings = {
      selectedProvider: body.selectedProvider || "",
      includeBuffers: Boolean(body.includeBuffers),
      autoSync: Boolean(body.autoSync),
    };
    writePreviewState(state);
    return previewJson({ settings: state.calendarSettings });
  }

  if (pathname === "/api/integrations/google-calendar/auth-url" && method === "GET") {
    return previewJson({ url: "#" });
  }

  const calendarMatch = pathname.match(/^\/api\/integrations\/calendars\/([^/]+)\/(sync|disconnect)$/);
  if (calendarMatch && method === "POST") {
    const providerKey = decodeURIComponent(calendarMatch[1]);
    const action = calendarMatch[2];
    state.calendars = state.calendars.map((item) =>
      item.providerKey === providerKey
        ? {
            ...item,
            connected: action === "disconnect" ? false : item.connected,
            lastSync: action === "sync" ? new Date().toISOString() : "Disconnected",
          }
        : item
    );
    writePreviewState(state);
    return previewJson({ calendars: state.calendars });
  }

  if (pathname === "/api/domains" && method === "GET") {
    return previewJson({ domains: state.domains });
  }

  if (pathname === "/api/domains/targets" && method === "GET") {
    return previewJson(state.targets);
  }

  if (pathname === "/api/domains" && method === "POST") {
    const normalizedDomain = String(body.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const connectedPage =
      body.targetType === "landing_page"
        ? state.targets.landingPages.find((item) => item.id === body.landingPageId)
        : state.targets.bookingPages.find((item) => item.id === body.eventTypeId);
    const nextDomain = {
      id: previewId("domain"),
      domain: normalizedDomain,
      normalizedDomain,
      targetType: body.targetType,
      landingPageId: body.landingPageId || "",
      eventTypeId: body.eventTypeId || "",
      connectedPage: connectedPage || { id: "", title: "Unassigned" },
      status: "pending",
      sslStatus: "pending",
      createdAt: new Date().toISOString(),
      dnsTarget: "cname.meetscheduling.com",
      dnsInstructions: {
        recordType: "CNAME",
        name: normalizedDomain.split(".")[0] || "www",
        value: "cname.meetscheduling.com",
      },
    };
    state.domains = [nextDomain, ...state.domains];
    writePreviewState(state);
    return previewJson({ domain: nextDomain });
  }

  const domainVerifyMatch = pathname.match(/^\/api\/domains\/([^/]+)\/verify$/);
  if (domainVerifyMatch && method === "POST") {
    const domainId = decodeURIComponent(domainVerifyMatch[1]);
    state.domains = state.domains.map((item) =>
      item.id === domainId ? { ...item, status: "active", sslStatus: "issued" } : item
    );
    writePreviewState(state);
    return previewJson({ domain: state.domains.find((item) => item.id === domainId) });
  }

  const domainMatch = pathname.match(/^\/api\/domains\/([^/]+)$/);
  if (domainMatch && method === "DELETE") {
    const domainId = decodeURIComponent(domainMatch[1]);
    state.domains = state.domains.filter((item) => item.id !== domainId);
    writePreviewState(state);
    return previewJson({ ok: true });
  }

  if (domainMatch && method === "PATCH") {
    const domainId = decodeURIComponent(domainMatch[1]);
    state.domains = state.domains.map((item) => {
      if (item.id !== domainId) return item;
      const nextTargetType = body.targetType || item.targetType;
      const connectedPage =
        nextTargetType === "landing_page"
          ? state.targets.landingPages.find((entry) => entry.id === body.landingPageId)
          : state.targets.bookingPages.find((entry) => entry.id === body.eventTypeId);
      return {
        ...item,
        targetType: nextTargetType,
        landingPageId: body.landingPageId || "",
        eventTypeId: body.eventTypeId || "",
        connectedPage: connectedPage || item.connectedPage,
      };
    });
    writePreviewState(state);
    return previewJson({ domain: state.domains.find((item) => item.id === decodeURIComponent(domainMatch[1])) });
  }

  return Promise.reject(Object.assign(new Error(`No local preview handler for ${method} ${pathname}`), { status: 501 }));
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const useLocalPreview = isLocalPreviewHost();

  if (useLocalPreview) {
    return handlePreviewApi(path, options);
  }

  const token = getAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isJsonBody =
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof URLSearchParams) &&
    !(options.body instanceof Blob);

  if (isJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: isJsonBody ? JSON.stringify(options.body) : options.body,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuth();
    }
    const message =
      payload?.error ||
      payload?.message ||
      (typeof payload === "string" && payload.trim()) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function copyToClipboard(value) {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(String(value));
    return true;
  } catch {
    try {
      const input = document.createElement("textarea");
      input.value = String(value);
      input.setAttribute("readonly", "");
      input.style.position = "absolute";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      return true;
    } catch {
      return false;
    }
  }
}
