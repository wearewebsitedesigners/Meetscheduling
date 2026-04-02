import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  HelpCircle,
  Link2,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  Vote,
  Wand2,
  X,
} from "lucide-react";
import {
  apiFetch,
  cn,
  copyToClipboard,
  GlassButton,
  GlassOrb,
  getStoredUser,
} from "../shared.jsx";

const schedulingTabs = ["Event types", "Single-use links", "Meeting polls"];
const GOOGLE_CALENDAR_STATUS_CACHE_KEY = "meetscheduling_google_calendar_status";

const googleCalendarStatusMessages = {
  google_calendar_connected: {
    notice: "Google Calendar connected successfully.",
  },
  google_oauth_denied: {
    error: "Google Calendar connection was cancelled or denied in Google.",
  },
  missing_oauth_params: {
    error: "Google Calendar connection could not be completed. Missing OAuth parameters.",
  },
  invalid_or_expired_oauth_state: {
    error: "Google Calendar connection expired. Please try connecting again.",
  },
  google_calendar_workspace_access_invalid: {
    error: "Google Calendar callback could not be matched to an active workspace. Sign in again and retry.",
  },
  google_token_exchange_failed: {
    error: "Google Calendar token exchange failed on the server. Check the server logs and Google OAuth configuration.",
  },
  google_scope_missing: {
    error: "Google returned successfully, but the required Google Calendar write scope was missing.",
  },
  google_tokens_not_persisted: {
    error: "Google returned successfully, but the server could not persist usable Google Calendar tokens for this workspace.",
  },
  google_status_verification_failed: {
    error: "Google returned successfully, but the server could not verify the saved Google Calendar status for this workspace.",
  },
  google_calendar_token_exchange_failed: {
    error: "Google Calendar token exchange failed on the server. Check the server logs and Google OAuth configuration.",
  },
  google_calendar_post_save_verification_failed: {
    error: "Google Calendar returned successfully, but the server could not verify the saved connection state.",
  },
  google_calendar_connect_failed: {
    error: "Google Calendar connection failed. Please try again.",
  },
};

const googleCalendarDebugReasonMessages = {
  missing_row: "No Google Calendar row exists for the active workspace.",
  workspace_mismatch:
    "A Google Calendar connection exists for the signed-in user scope, but not for the active workspace.",
  missing_scope: "Google tokens were saved, but the Google Calendar write scope is missing.",
  missing_tokens: "The Google integration row exists, but usable OAuth tokens were not found in it.",
  missing_refresh_token: "The integration row was saved without a refresh token.",
  missing_access_token: "The saved Google token is no longer usable.",
  token_decrypt_failed: "The saved Google token payload could not be decrypted on this server.",
  disconnected: "The Google Calendar row exists, but it is marked disconnected.",
};

function normalizeGoogleCalendarStatus(status = {}) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    return {
      connected: false,
      rowFound: false,
      rowConnected: false,
      hasWriteScope: false,
      hasRefreshToken: false,
      hasUsableAccessToken: false,
      hasUsableToken: false,
      accountEmail: "",
      reason: "missing_row",
      workspaceMismatch: false,
      scope: "workspace",
      workspaceId: "",
      userId: "",
      tokenSource: "none",
      tokenDecryptFailed: false,
      userScopeStatus: null,
    };
  }

  return {
    connected: Boolean(status.connected),
    rowFound: Boolean(status.rowFound),
    rowConnected: Boolean(status.rowConnected),
    hasWriteScope: Boolean(status.hasWriteScope),
    hasRefreshToken: Boolean(status.hasRefreshToken),
    hasUsableAccessToken: Boolean(status.hasUsableAccessToken),
    hasUsableToken: Boolean(status.hasUsableToken),
    accountEmail: String(status.accountEmail || "").trim(),
    reason: String(status.reason || "").trim() || "missing_row",
    workspaceMismatch: Boolean(status.workspaceMismatch),
    scope: String(status.scope || "workspace").trim() || "workspace",
    workspaceId: String(status.workspaceId || "").trim(),
    userId: String(status.userId || "").trim(),
    tokenSource: String(status.tokenSource || "").trim(),
    tokenDecryptFailed: Boolean(status.tokenDecryptFailed),
    userScopeStatus:
      status.userScopeStatus && typeof status.userScopeStatus === "object"
        ? {
            connected: Boolean(status.userScopeStatus.connected),
            accountEmail: String(status.userScopeStatus.accountEmail || "").trim(),
            reason: String(status.userScopeStatus.reason || "").trim(),
          }
        : null,
  };
}

function mergeGoogleCalendarStatus(calendars, status) {
  const nextStatus = normalizeGoogleCalendarStatus(status);
  return (calendars || []).map((item) => {
    if (item.providerKey !== "google-calendar") return item;
    return {
      ...item,
      connected: nextStatus.connected,
      accountEmail: nextStatus.connected ? nextStatus.accountEmail || item.accountEmail || "" : "",
      syncStatus: nextStatus.connected ? "connected" : "disconnected",
      reason: nextStatus.reason,
      rowFound: nextStatus.rowFound,
      rowConnected: nextStatus.rowConnected,
      hasWriteScope: nextStatus.hasWriteScope,
      hasRefreshToken: nextStatus.hasRefreshToken,
      hasUsableAccessToken: nextStatus.hasUsableAccessToken,
      hasUsableToken: nextStatus.hasUsableToken,
      tokenSource: nextStatus.tokenSource,
      tokenDecryptFailed: nextStatus.tokenDecryptFailed,
      workspaceMismatch: nextStatus.workspaceMismatch,
    };
  });
}

function buildGoogleCalendarDebugMessage(status) {
  const nextStatus = normalizeGoogleCalendarStatus(status);
  return googleCalendarDebugReasonMessages[nextStatus.reason] || "";
}

function buildGoogleCalendarDebugFacts(status) {
  const nextStatus = normalizeGoogleCalendarStatus(status);
  return [
    `${nextStatus.scope}-scoped status`,
    `row found: ${nextStatus.rowFound ? "yes" : "no"}`,
    `row connected: ${nextStatus.rowConnected ? "yes" : "no"}`,
    `write scope: ${nextStatus.hasWriteScope ? "yes" : "no"}`,
    `refresh token: ${nextStatus.hasRefreshToken ? "yes" : "no"}`,
    `usable access token: ${nextStatus.hasUsableAccessToken ? "yes" : "no"}`,
    `usable token: ${nextStatus.hasUsableToken ? "yes" : "no"}`,
    `decrypt failed: ${nextStatus.tokenDecryptFailed ? "yes" : "no"}`,
  ].join(" · ");
}

function shouldShowGoogleCalendarDiagnostics(status) {
  const nextStatus = normalizeGoogleCalendarStatus(status);
  if (nextStatus.reason === "missing_row" && !nextStatus.workspaceMismatch) {
    return false;
  }
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("googleDebug") === "1";
}

function getGoogleCalendarStatusCacheKey() {
  try {
    const user = getStoredUser();
    const workspaceId = String(user?.workspaceId || user?.id || "").trim();
    return workspaceId
      ? `${GOOGLE_CALENDAR_STATUS_CACHE_KEY}:${workspaceId}`
      : GOOGLE_CALENDAR_STATUS_CACHE_KEY;
  } catch {
    return GOOGLE_CALENDAR_STATUS_CACHE_KEY;
  }
}

function readCachedGoogleCalendarStatus() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getGoogleCalendarStatusCacheKey());
    if (!raw) return null;
    return normalizeGoogleCalendarStatus(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCachedGoogleCalendarStatus(status) {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeGoogleCalendarStatus(status);
    window.localStorage.setItem(
      getGoogleCalendarStatusCacheKey(),
      JSON.stringify(normalized)
    );
  } catch {
    // ignore cache failures
  }
}
const locationOptions = [
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom" },
  { value: "custom", label: "Custom link" },
  { value: "in_person", label: "In person" },
];
const eventTypePresets = [
  {
    title: "One-on-one",
    description: "A single booking host meets one invitee.",
    durationMinutes: 30,
    locationType: "google_meet",
    icon: Sparkles,
  },
  {
    title: "Group session",
    description: "Host one session for multiple invitees.",
    durationMinutes: 60,
    locationType: "zoom",
    icon: Users,
  },
  {
    title: "One-off meeting",
    description: "Offer a custom booking outside your regular flow.",
    durationMinutes: 45,
    locationType: "custom",
    icon: Wand2,
  },
  {
    title: "Meeting poll",
    description: "Collect preferences first and confirm the best slot later.",
    durationMinutes: 30,
    locationType: "google_meet",
    icon: Vote,
  },
];

const defaultForm = {
  kind: "one_on_one",
  title: "",
  slug: "",
  description: "",
  durationMinutes: 30,
  locationType: "google_meet",
  customLocation: "",
  color: "#2563eb",
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  noticeMinimumHours: 0,
  maxBookingsPerDay: 0,
  isActive: true,
  brandLogoUrl: "",
  brandTagline: "",
  sidebarMessage: "",
};

const createEventOptions = [
  {
    key: "one_on_one",
    title: "One-on-one meeting",
    subtitle: "1 host · 1 invitee",
    description: "Best for discovery calls, consults, and private sessions.",
    icon: Sparkles,
    preset: {
      kind: "one_on_one",
      title: "One-on-one",
      description: "A single booking host meets one invitee.",
      durationMinutes: 30,
      locationType: "google_meet",
    },
  },
  {
    key: "group",
    title: "Group meeting",
    subtitle: "1 host · multiple invitees",
    description: "Use this for webinars, office hours, and shared sessions.",
    icon: Users,
    preset: {
      kind: "group",
      title: "Group session",
      description: "Host one session for multiple invitees.",
      durationMinutes: 60,
      locationType: "zoom",
    },
  },
  {
    key: "round_robin",
    title: "Round robin meeting",
    subtitle: "Team-based routing",
    description: "Create the event shell now and connect team routing when backend support is ready.",
    icon: Wand2,
    preset: {
      kind: "round_robin",
      title: "Round robin meeting",
      description: "Create the event shell now and add routing rules as soon as round robin is enabled.",
      durationMinutes: 30,
      locationType: "google_meet",
    },
  },
];

function normalizeEventType(row) {
  return {
    id: row.id,
    title: row.title || "Untitled event",
    slug: row.slug || "",
    description: row.description || "",
    durationMinutes: Number(row.duration_minutes ?? row.durationMinutes ?? 30),
    locationType: row.location_type || row.locationType || "google_meet",
    customLocation: row.custom_location || row.customLocation || "",
    bufferBeforeMin: Number(row.buffer_before_min ?? row.bufferBeforeMin ?? 0),
    bufferAfterMin: Number(row.buffer_after_min ?? row.bufferAfterMin ?? 0),
    noticeMinimumHours: Number(row.notice_minimum_hours ?? row.noticeMinimumHours ?? 0),
    maxBookingsPerDay: Number(row.max_bookings_per_day ?? row.maxBookingsPerDay ?? 0),
    color: row.color || "#2563eb",
    isActive: Boolean(row.is_active ?? row.isActive),
    brandLogoUrl: row.brand_logo_url || row.brandLogoUrl || "",
    brandTagline: row.brand_tagline || row.brandTagline || "",
    sidebarMessage: row.sidebar_message || row.sidebarMessage || "",
    customQuestions: Array.isArray(row.custom_questions ?? row.customQuestions)
      ? (row.custom_questions ?? row.customQuestions)
      : [],
    createdAt: row.created_at || row.createdAt || "",
  };
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function locationLabel(locationType) {
  return locationOptions.find((item) => item.value === locationType)?.label || "Custom";
}

function buildBookingLink(username, slug) {
  if (!username || !slug || typeof window === "undefined") return "";
  return `${window.location.origin}/${username}/${slug}`;
}

function EventTypeFormModal({
  mode,
  open,
  form,
  validationErrors,
  onClose,
  onChange,
  onSubmit,
  submitting,
  googleConnected,
}) {
  if (!open) return null;

  const googleMeetUnavailable = form.locationType === "google_meet" && !googleConnected;

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-white/50 bg-white/85 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1729]/95 sm:max-h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-5 dark:border-white/10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              {mode === "create" ? "New event type" : "Edit event type"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {mode === "create" ? "Create booking flow" : form.title || "Update booking flow"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Event type</span>
            <select
              value={form.kind}
              onChange={(event) => onChange("kind", event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="one_on_one">One-on-one</option>
              <option value="group">Group</option>
              <option value="round_robin">Round robin</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Title</span>
            <input
              value={form.title}
              onChange={(event) => onChange("title", event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="30-minute strategy call"
            />
            {validationErrors.title ? (
              <span className="text-xs font-medium text-rose-600 dark:text-rose-300">{validationErrors.title}</span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Public slug</span>
            <input
              value={form.slug}
              onChange={(event) => onChange("slug", slugify(event.target.value))}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="30min-strategy-call"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 lg:col-span-2">
            <span className="font-medium">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => onChange("description", event.target.value)}
              className="min-h-[110px] rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder="Describe what this booking is for and how invitees should prepare."
            />
          </label>

          {/* ── Sidebar branding ── */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-slate-50/60 px-5 py-4 dark:border-white/10 dark:bg-white/5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Sidebar Branding</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 lg:col-span-2">
                <span className="font-medium">Company logo URL</span>
                {form.brandLogoUrl && (
                  <img src={form.brandLogoUrl} alt="Logo preview" className="mb-1 h-10 max-w-[140px] rounded-lg object-contain border border-slate-200 bg-white p-1 dark:border-white/10" />
                )}
                <input
                  value={form.brandLogoUrl}
                  onChange={(event) => onChange("brandLogoUrl", event.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="https://yourdomain.com/logo.png"
                />
                <span className="text-xs text-slate-400">Shown at the top of the booking sidebar. Use a transparent PNG for best results.</span>
              </label>

              <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Short tagline</span>
                <input
                  value={form.brandTagline}
                  onChange={(event) => onChange("brandTagline", event.target.value)}
                  maxLength={200}
                  className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="e.g. Experts in digital strategy"
                />
                <span className="text-xs text-slate-400">Italic line shown below the event title.</span>
              </label>

              <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Sidebar message</span>
                <textarea
                  value={form.sidebarMessage}
                  onChange={(event) => onChange("sidebarMessage", event.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white resize-none"
                  placeholder="e.g. Please have your project brief ready before the call."
                />
                <span className="text-xs text-slate-400">Highlighted note shown at the bottom of the sidebar.</span>
              </label>
            </div>
          </div>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Duration (minutes)</span>
            <input
              type="number"
              min="5"
              max="240"
              value={form.durationMinutes}
              onChange={(event) => onChange("durationMinutes", Number(event.target.value || 0))}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            {validationErrors.durationMinutes ? (
              <span className="text-xs font-medium text-rose-600 dark:text-rose-300">{validationErrors.durationMinutes}</span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Color</span>
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 dark:border-white/10 dark:bg-white/5">
              <input
                type="color"
                value={form.color}
                onChange={(event) => onChange("color", event.target.value)}
                className="h-8 w-10 rounded border-0 bg-transparent p-0"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{form.color}</span>
            </div>
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Location</span>
            <select
              value={form.locationType}
              onChange={(event) => onChange("locationType", event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {locationOptions.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                  disabled={item.value === "google_meet" && !googleConnected}
                >
                  {item.label}
                  {item.value === "google_meet" && !googleConnected ? " (connect Google first)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300 lg:col-span-2">
            <span className="font-medium">Custom location / link</span>
            <input
              value={form.customLocation}
              onChange={(event) => onChange("customLocation", event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white"
              disabled={form.locationType !== "custom"}
              placeholder="https://meet.google.com/... or in-person address"
            />
            {validationErrors.customLocation ? (
              <span className="text-xs font-medium text-rose-600 dark:text-rose-300">{validationErrors.customLocation}</span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Buffer before (min)</span>
            <input
              type="number"
              min="0"
              max="240"
              value={form.bufferBeforeMin}
              onChange={(event) => onChange("bufferBeforeMin", Number(event.target.value || 0))}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Buffer after (min)</span>
            <input
              type="number"
              min="0"
              max="240"
              value={form.bufferAfterMin}
              onChange={(event) => onChange("bufferAfterMin", Number(event.target.value || 0))}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Minimum notice (hours)</span>
            <input
              type="number"
              min="0"
              max="720"
              value={form.noticeMinimumHours}
              onChange={(event) => onChange("noticeMinimumHours", Number(event.target.value || 0))}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Max bookings / day</span>
            <input
              type="number"
              min="0"
              max="500"
              value={form.maxBookingsPerDay}
              onChange={(event) => onChange("maxBookingsPerDay", Number(event.target.value || 0))}
              className="h-12 rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-900 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </label>

          {googleMeetUnavailable && (
            <div className="lg:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
              Google Calendar is not connected yet, so Google Meet cannot be used for this event type.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200/70 px-6 py-5 dark:border-white/10">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onChange("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            Active after save
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || googleMeetUnavailable}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create event type" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description, action, actionLabel }) {
  return (
    <div className="rounded-[30px] border border-dashed border-slate-300/80 bg-white/55 px-6 py-12 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-[#122647] dark:text-[#8DB2FF]">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action && actionLabel ? (
        <button
          type="button"
          onClick={action}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.28)] transition hover:brightness-105"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function SchedulingPanel({ initials = "WU", displayName = "Workspace User", avatarUrl = "", usernameProp = "" }) {
  const cachedGoogleStatus = readCachedGoogleCalendarStatus();
  const [activeTab, setActiveTab] = useState("Event types");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [eventTypes, setEventTypes] = useState([]);
  const [username, setUsername] = useState(usernameProp || "");

  // Sync username when parent updates it (e.g. after settings overlay save)
  useEffect(() => {
    if (usernameProp && usernameProp !== username) {
      setUsername(usernameProp);
    }
  }, [usernameProp]);
  const [calendars, setCalendars] = useState([]);
  const [googleConnected, setGoogleConnected] = useState(Boolean(cachedGoogleStatus?.connected));
  const [gcalNoticeDismissed, setGcalNoticeDismissed] = useState(() => {
    try { return localStorage.getItem("ms_gcal_notice_dismissed") === "1"; } catch { return false; }
  });
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState(
    cachedGoogleStatus || normalizeGoogleCalendarStatus()
  );
  const [googleStatusResolved, setGoogleStatusResolved] = useState(Boolean(cachedGoogleStatus));
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyEventId, setBusyEventId] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [validationErrors, setValidationErrors] = useState({});
  const [editingSlugId, setEditingSlugId] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [savingSlugId, setSavingSlugId] = useState("");
  const [questionsOpenId, setQuestionsOpenId] = useState("");
  const [questionsDraft, setQuestionsDraft] = useState([]);
  const [savingQuestionsId, setSavingQuestionsId] = useState("");
  const createMenuRef = useRef(null);

  const loadPanel = async ({ preserveMessages = false } = {}) => {
    setLoading(true);
    if (!preserveMessages) {
      setError("");
      setNotice("");
    }
    try {
      const [mePayload, eventPayload, calendarPayload, googleStatusPayload] = await Promise.all([
        apiFetch("/api/auth/me"),
        apiFetch("/api/event-types?includeInactive=true"),
        apiFetch("/api/integrations/calendars"),
        apiFetch("/api/integrations/google-calendar/status"),
      ]);
      const nextEventTypes = (eventPayload?.eventTypes || []).map(normalizeEventType);
      const verifiedGoogleStatus = normalizeGoogleCalendarStatus(
        googleStatusPayload?.status || {}
      );
      const nextCalendars = mergeGoogleCalendarStatus(
        calendarPayload?.calendars || [],
        verifiedGoogleStatus
      );
      setEventTypes(nextEventTypes);
      setSelectedEventId((current) => current || nextEventTypes[0]?.id || "");
      setUsername(mePayload?.user?.username || "");
      setGoogleCalendarStatus(verifiedGoogleStatus);
      setCalendars(nextCalendars);
      setGoogleConnected(Boolean(verifiedGoogleStatus.connected));
      writeCachedGoogleCalendarStatus(verifiedGoogleStatus);
      setGoogleStatusResolved(true);
    } catch (loadError) {
      setError(loadError.message || "Failed to load scheduling data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPanel();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const params = new URLSearchParams(window.location.search);
    const successKey = params.get("success");
    const errorKey = params.get("error");
    const traceId = params.get("trace");
    const statusConfig = googleCalendarStatusMessages[successKey || errorKey];

    if (!statusConfig) return undefined;

    if (statusConfig.notice) {
      setNotice(traceId ? `${statusConfig.notice} Reference: ${traceId}.` : statusConfig.notice);
      setError("");
    }

    if (statusConfig.error) {
      setError(traceId ? `${statusConfig.error} Reference: ${traceId}.` : statusConfig.error);
      setNotice("");
    }

    params.delete("success");
    params.delete("error");
    params.delete("trace");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash || ""}`;
    window.history.replaceState({}, "", nextUrl);
    loadPanel({ preserveMessages: true });

    return undefined;
  }, []);

  useEffect(() => {
    if (!createMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setCreateMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setCreateMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [createMenuOpen]);

  const filteredEventTypes = useMemo(() => {
    if (!query.trim()) return eventTypes;
    const normalizedQuery = query.toLowerCase();
    return eventTypes.filter((item) =>
      `${item.title} ${item.slug} ${locationLabel(item.locationType)}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [eventTypes, query]);

  const summary = useMemo(() => {
    const activeCount = eventTypes.filter((item) => item.isActive).length;
    const googleMeetCount = eventTypes.filter((item) => item.locationType === "google_meet").length;
    return {
      total: eventTypes.length,
      active: activeCount,
      inactive: eventTypes.length - activeCount,
      googleMeetCount,
    };
  }, [eventTypes]);

  const googleDebugMessage = useMemo(
    () => buildGoogleCalendarDebugMessage(googleCalendarStatus),
    [googleCalendarStatus]
  );

  const googleDebugFacts = useMemo(
    () => buildGoogleCalendarDebugFacts(googleCalendarStatus),
    [googleCalendarStatus]
  );

  const showGoogleDiagnostics = useMemo(
    () => shouldShowGoogleCalendarDiagnostics(googleCalendarStatus),
    [googleCalendarStatus]
  );
  const showGoogleStatusPending = loading && !googleStatusResolved;

  const selectedEvent = eventTypes.find((item) => item.id === selectedEventId) || filteredEventTypes[0] || null;

  const openCreateModal = (preset = null) => {
    const presetValues = preset
      ? {
          kind: preset.kind || "one_on_one",
          title: preset.title,
          slug: slugify(preset.title),
          description: preset.description,
          durationMinutes: preset.durationMinutes,
          locationType: preset.locationType,
        }
      : {};
    setModalMode("create");
    setForm({ ...defaultForm, ...presetValues, isActive: true });
    setValidationErrors({});
    setCreateMenuOpen(false);
    setModalOpen(true);
  };

  const openEditModal = (eventType) => {
    setModalMode("edit");
    setSelectedEventId(eventType.id);
    setForm({
      kind: "one_on_one",
      title: eventType.title,
      slug: eventType.slug,
      description: eventType.description,
      durationMinutes: eventType.durationMinutes,
      locationType: eventType.locationType,
      customLocation: eventType.customLocation,
      color: eventType.color,
      bufferBeforeMin: eventType.bufferBeforeMin,
      bufferAfterMin: eventType.bufferAfterMin,
      noticeMinimumHours: eventType.noticeMinimumHours,
      maxBookingsPerDay: eventType.maxBookingsPerDay,
      isActive: eventType.isActive,
      brandLogoUrl: eventType.brandLogoUrl || "",
      brandTagline: eventType.brandTagline || "",
      sidebarMessage: eventType.sidebarMessage || "",
    });
    setValidationErrors({});
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && modalMode === "create") {
        next.slug = slugify(value);
      }
      if (field === "locationType" && value !== "custom") {
        next.customLocation = "";
      }
      return next;
    });
    setValidationErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!String(form.title || "").trim()) {
      nextErrors.title = "Event title is required.";
    }
    if (!Number(form.durationMinutes) || Number(form.durationMinutes) < 5) {
      nextErrors.durationMinutes = "Choose a duration of at least 5 minutes.";
    }
    if (form.locationType === "custom" && !String(form.customLocation || "").trim()) {
      nextErrors.customLocation = "Add a meeting link or location for custom events.";
    }
    return nextErrors;
  };

  const handleSubmit = async () => {
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const trimmedTitle = String(form.title || "").trim();
      const trimmedSlug = slugify(form.slug || trimmedTitle);
      const payload = {
        title: trimmedTitle,
        slug: trimmedSlug,
        description: String(form.description || "").trim(),
        durationMinutes: Number(form.durationMinutes || 0),
        locationType: form.locationType,
        customLocation: form.locationType === "custom" ? String(form.customLocation || "").trim() : "",
        color: form.color,
        bufferBeforeMin: Number(form.bufferBeforeMin || 0),
        bufferAfterMin: Number(form.bufferAfterMin || 0),
        noticeMinimumHours: Number(form.noticeMinimumHours || 0),
        maxBookingsPerDay: Number(form.maxBookingsPerDay || 0),
        brandLogoUrl: String(form.brandLogoUrl || "").trim(),
        brandTagline: String(form.brandTagline || "").trim(),
        sidebarMessage: String(form.sidebarMessage || "").trim(),
      };

      let savedEventType;
      if (modalMode === "create") {
        const createPayload = await apiFetch("/api/event-types", {
          method: "POST",
          body: payload,
        });
        savedEventType = normalizeEventType(createPayload?.eventType || {});
        if (!form.isActive) {
          const activePayload = await apiFetch(`/api/event-types/${savedEventType.id}/active`, {
            method: "PATCH",
            body: { isActive: false },
          });
          savedEventType = normalizeEventType(activePayload?.eventType || savedEventType);
        }
        setNotice("Event type created.");
      } else {
        const updatePayload = await apiFetch(`/api/event-types/${selectedEventId}`, {
          method: "PATCH",
          body: payload,
        });
        savedEventType = normalizeEventType(updatePayload?.eventType || {});
        if (savedEventType.isActive !== form.isActive) {
          const activePayload = await apiFetch(`/api/event-types/${savedEventType.id}/active`, {
            method: "PATCH",
            body: { isActive: form.isActive },
          });
          savedEventType = normalizeEventType(activePayload?.eventType || savedEventType);
        }
        setNotice("Event type updated.");
      }

      setEventTypes((current) => {
        const rest = current.filter((item) => item.id !== savedEventType.id);
        return [savedEventType, ...rest];
      });
      setSelectedEventId(savedEventType.id);
      setValidationErrors({});
      setModalOpen(false);
    } catch (submitError) {
      setError(submitError.message || "Unable to save event type.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSlug = async (eventType) => {
    const newSlug = slugDraft.trim().toLowerCase();
    if (!newSlug || newSlug === eventType.slug) { setEditingSlugId(""); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSlug)) {
      setError("Slug may only contain lowercase letters, numbers, and hyphens.");
      return;
    }
    setSavingSlugId(eventType.id);
    setError("");
    try {
      const payload = await apiFetch(`/api/event-types/${eventType.id}`, {
        method: "PATCH",
        body: { slug: newSlug },
      });
      const updated = normalizeEventType(payload?.eventType || {});
      setEventTypes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice("Booking link updated.");
      setEditingSlugId("");
    } catch (slugError) {
      setError(slugError.message || "Could not update the booking link.");
    } finally {
      setSavingSlugId("");
    }
  };

  const handleSaveQuestions = async (eventType) => {
    setSavingQuestionsId(eventType.id);
    setError("");
    try {
      const payload = await apiFetch(`/api/event-types/${eventType.id}`, {
        method: "PATCH",
        body: { customQuestions: questionsDraft },
      });
      const updated = normalizeEventType(payload?.eventType || {});
      setEventTypes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice("Questions saved.");
      setQuestionsOpenId("");
    } catch (qErr) {
      setError(qErr.message || "Could not save questions.");
    } finally {
      setSavingQuestionsId("");
    }
  };

  const handleCopyLink = async (eventType) => {
    const copied = await copyToClipboard(buildBookingLink(username, eventType.slug));
    setNotice(copied ? `Copied booking link for ${eventType.title}.` : "Unable to copy the booking link.");
  };

  const handleToggleActive = async (eventType) => {
    setBusyEventId(eventType.id);
    setError("");
    try {
      const payload = await apiFetch(`/api/event-types/${eventType.id}/active`, {
        method: "PATCH",
        body: { isActive: !eventType.isActive },
      });
      const nextEventType = normalizeEventType(payload?.eventType || {});
      setEventTypes((current) => current.map((item) => (item.id === nextEventType.id ? nextEventType : item)));
      setNotice(`${nextEventType.title} ${nextEventType.isActive ? "activated" : "paused"}.`);
    } catch (toggleError) {
      setError(toggleError.message || "Unable to update the event type state.");
    } finally {
      setBusyEventId("");
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const returnPath = `${window.location.pathname}${window.location.search}`;
      const payload = await apiFetch(
        `/api/integrations/google-calendar/auth-url?returnPath=${encodeURIComponent(returnPath)}`
      );
      if (payload?.url) {
        window.location.href = payload.url;
      }
    } catch (connectError) {
      setError(connectError.message || "Unable to start Google Calendar connection.");
    }
  };

  const handleCreateOptionSelect = (option) => {
    if (option.key === "round_robin") {
      setNotice("Round robin routing rules are not live yet. Create the event shell now and attach routing later.");
    } else {
      setNotice("");
    }
    openCreateModal(option.preset);
  };

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-[#DFE7F3] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.13),_transparent_24%),linear-gradient(180deg,#eef4ff_0%,#edf2f7_35%,#f7fbff_100%)] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-6 xl:p-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.12),_transparent_24%),linear-gradient(180deg,#081120_0%,#0b1424_35%,#0d182b_100%)]">
      <GlassOrb className="left-[-80px] top-[120px] h-72 w-72" />
      <GlassOrb className="right-[8%] top-[10%] h-80 w-80 bg-blue-400/10" />
      <GlassOrb className="bottom-[-40px] left-[20%] h-64 w-64 bg-cyan-300/10" />

      <div className="relative z-10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/50 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Live booking links
            </div>
            <h1 className="font-['Sora'] text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl dark:text-white">
              Event types
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base dark:text-slate-400">
              Publish booking links, configure meeting behavior, and control how invitees land inside your scheduling flow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Total links", value: String(summary.total) },
              { label: "Active", value: String(summary.active) },
              {
                label: "Google Meet",
                value: showGoogleStatusPending
                  ? "..."
                  : googleConnected
                    ? `${summary.googleMeetCount}`
                    : "Connect",
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-white/50 bg-white/55 px-5 py-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex h-8 items-start text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{stat.label}</div>
                <div className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{notice}</span>
            <button
              onClick={() => setNotice("")}
              className="ml-1 rounded-full p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-400/20"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {showGoogleStatusPending ? (
          <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/80 px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-white/[0.04]">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Checking Google Calendar connection...
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Sync status is loading for this workspace.
              </p>
            </div>
            <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading
            </div>
          </div>
        ) : googleConnected && !gcalNoticeDismissed ? (
          <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-emerald-200 bg-emerald-50/85 px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between dark:border-emerald-400/20 dark:bg-emerald-500/10">
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Google Calendar is connected.</p>
              <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-100/80">
                Google Meet event types can now generate real meeting links and keep calendar availability in sync.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm dark:border-emerald-400/20 dark:bg-white/5 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </div>
              <button
                type="button"
                onClick={() => {
                  setGcalNoticeDismissed(true);
                  try { localStorage.setItem("ms_gcal_notice_dismissed", "1"); } catch {}
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white/70 text-emerald-600 transition hover:bg-white dark:border-emerald-400/20 dark:bg-white/5 dark:text-emerald-300 dark:hover:bg-white/10"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : !googleConnected ? (
          <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-amber-200 bg-amber-50/85 px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] backdrop-blur-2xl md:flex-row md:items-center md:justify-between dark:border-amber-400/20 dark:bg-amber-500/10">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Google Calendar is not connected.</p>
              <p className="mt-1 text-sm text-amber-700/90 dark:text-amber-100/80">
                New workspaces start disconnected. Connect it when you want to sync your Google Calendar, block busy time, and generate real Google Meet links.
              </p>
              <p className="mt-2 text-xs font-medium text-amber-700/80 dark:text-amber-100/70">
                Your users can click Connect Google Calendar and sign in with their own Google account from here.
              </p>
              {showGoogleDiagnostics && googleDebugMessage ? (
                <div className="mt-3 rounded-2xl border border-amber-200/70 bg-white/65 px-3 py-3 text-xs text-amber-900/90 shadow-inner dark:border-amber-300/10 dark:bg-white/[0.05] dark:text-amber-100/85">
                  <p>{googleDebugMessage}</p>
                  <p className="mt-1">{googleDebugFacts}</p>
                  {googleCalendarStatus.workspaceMismatch && googleCalendarStatus.userScopeStatus?.accountEmail ? (
                    <p className="mt-1">
                      User-scoped Google account: {googleCalendarStatus.userScopeStatus.accountEmail}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleConnectGoogle}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.28)] transition hover:brightness-105"
            >
              <ArrowUpRight className="h-4 w-4" />
              Connect Google Calendar
            </button>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/40 bg-white/40 p-1.5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            {schedulingTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm font-medium transition-all",
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-sm dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-[280px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search event types, links, or locations..."
                className="h-12 w-full rounded-2xl border border-white/40 bg-white/60 pl-11 pr-4 text-sm text-slate-700 shadow-none outline-none backdrop-blur-xl placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div ref={createMenuRef} className="relative">
              <GlassButton
                className="h-12 rounded-2xl px-5"
                onClick={() => setCreateMenuOpen((current) => !current)}
                aria-haspopup="menu"
                aria-expanded={createMenuOpen}
              >
                <Plus className="h-4 w-4" />
                Create
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", createMenuOpen && "rotate-180")} />
              </GlassButton>

              {createMenuOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+12px)] z-30 w-[360px] rounded-[26px] border border-white/60 bg-white/90 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1729]/96"
                  role="menu"
                >
                  <div className="border-b border-slate-200/80 px-4 py-3 dark:border-white/10">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Create a new event type</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Choose the kind of booking flow you want to publish from this page.
                    </div>
                  </div>

                  <div className="p-2">
                    {createEventOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          role="menuitem"
                          onClick={() => handleCreateOptionSelect(option)}
                          className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-blue-50/80 dark:hover:bg-white/10"
                        >
                          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-[#13284b] dark:text-[#8DB2FF]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">{option.title}</span>
                            <span className="mt-0.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{option.subtitle}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{option.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-200/80 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-white/10 dark:text-slate-400">
                    Admin templates and advanced meeting flows stay hidden until their backend behavior is ready.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[30px] border border-white/50 bg-white/55 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-300">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading booking links...
              </div>
            </div>
          ) : activeTab !== "Event types" ? (
            <EmptyState
              title={activeTab === "Single-use links" ? "Single-use links are queued next" : "Meeting polls are queued next"}
              description={
                activeTab === "Single-use links"
                  ? "The backend booking system is already in place. This dashboard section now avoids fake content and will be wired to one-off booking links next."
                  : "Poll-style booking is not exposed in the current backend yet, so this tab stays honest instead of showing mock flows."
              }
              action={() => openCreateModal(eventTypePresets[0])}
              actionLabel="Create a standard event type"
            />
          ) : filteredEventTypes.length === 0 ? (
            <EmptyState
              title="No event types yet"
              description="Create your first event type to generate a public booking link that respects your availability, Google Meet connection, and booking rules."
              action={() => openCreateModal(eventTypePresets[0])}
              actionLabel="Create your first event type"
            />
          ) : (
            <div className="grid gap-6">
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#0F1F3D] to-[#2563EB] text-sm font-semibold text-white shadow-sm">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </span>
                    <div>
                      <div className="font-semibold dark:text-white">{displayName}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {summary.active} active event types · {summary.total} total booking links
                      </div>
                    </div>
                  </div>

                  <div className="hidden items-center gap-3 md:flex">
                    <button
                      type="button"
                      onClick={() => openCreateModal(eventTypePresets[0])}
                      className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/55 px-4 py-2.5 text-sm font-medium text-blue-700 backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-[#8DB2FF] dark:hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4" />
                      New booking flow
                    </button>
                    <button className="grid h-11 w-11 place-items-center rounded-2xl border border-white/50 bg-white/55 text-slate-700 backdrop-blur-xl hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {filteredEventTypes.map((eventType) => {
                  const bookingLink = buildBookingLink(username, eventType.slug);
                  const isBusy = busyEventId === eventType.id;
                  const isEditingSlug = editingSlugId === eventType.id;
                  const isSavingSlug = savingSlugId === eventType.id;
                  const baseUrl = bookingLink ? bookingLink.replace(`/${eventType.slug}`, "") : `https://www.meetscheduling.com/${username || "username"}`;

                  const isQuestionsOpen = questionsOpenId === eventType.id;
                  const isSavingQuestions = savingQuestionsId === eventType.id;
                  const neonColor = eventType.color || "#2563eb";

                  return (
                    <div
                      key={eventType.id}
                      className="group relative overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-[0_8px_40px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition duration-300 hover:shadow-[0_16px_56px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#0c1628]/90"
                      style={{ boxShadow: `0 8px 40px rgba(15,23,42,0.10), inset 0 0 0 1px rgba(255,255,255,0.4)` }}
                    >
                      {/* Neon glow left bar */}
                      <div
                        className="absolute inset-y-0 left-0 w-1.5 rounded-l-[28px]"
                        style={{
                          background: `linear-gradient(180deg, ${neonColor}ff 0%, ${neonColor}aa 50%, ${neonColor}33 100%)`,
                          boxShadow: `4px 0 20px ${neonColor}66, 2px 0 8px ${neonColor}44`,
                        }}
                      />
                      {/* Subtle color tint overlay */}
                      <div
                        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-[0.03]"
                        style={{ background: `radial-gradient(ellipse at left center, ${neonColor} 0%, transparent 60%)` }}
                      />

                      <div className="relative pl-6 pr-5 py-5 md:pl-7 md:pr-6">
                        {/* Top row: title + status + actions */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-['Sora'] text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                                {eventType.title}
                              </h3>
                              <span className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                eventType.isActive
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                              )}>
                                {eventType.isActive ? "Active" : "Paused"}
                              </span>
                              {eventType.customQuestions?.length > 0 ? (
                                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                  {eventType.customQuestions.length} Q{eventType.customQuestions.length > 1 ? "s" : ""}
                                </span>
                              ) : null}
                              {eventType.locationType === "google_meet" && !googleConnected ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                  Needs Google
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {eventType.durationMinutes} min · {locationLabel(eventType.locationType)}
                              {eventType.noticeMinimumHours > 0 ? ` · ${eventType.noticeMinimumHours}h notice` : ""}
                            </p>
                            {eventType.description ? (
                              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{eventType.description}</p>
                            ) : null}
                          </div>

                          {/* Action buttons */}
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(eventType)}
                              className="rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(eventType)}
                              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-[#2A4E8A] dark:bg-[#13284b] dark:text-[#9CC0FF] dark:hover:bg-[#18355f]"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => bookingLink && window.open(bookingLink, "_blank", "noopener,noreferrer")}
                              disabled={!bookingLink}
                              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(eventType)}
                              disabled={isBusy}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                                eventType.isActive
                                  ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/15"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                              )}
                            >
                              {isBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                              {eventType.isActive ? "Pause" : "Activate"}
                            </button>
                          </div>
                        </div>

                        {/* Editable booking link row */}
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                          <Link2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className="shrink-0 text-sm text-slate-400 dark:text-slate-500">{baseUrl}/</span>
                          {isEditingSlug ? (
                            <>
                              <input
                                autoFocus
                                type="text"
                                value={slugDraft}
                                onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveSlug(eventType);
                                  if (e.key === "Escape") setEditingSlugId("");
                                }}
                                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveSlug(eventType)}
                                disabled={isSavingSlug}
                                className="shrink-0 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                              >
                                {isSavingSlug ? "Saving…" : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSlugId("")}
                                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                                {eventType.slug}
                              </span>
                              <button
                                type="button"
                                onClick={() => { setEditingSlugId(eventType.id); setSlugDraft(eventType.slug); setError(""); }}
                                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                              >
                                Edit link
                              </button>
                            </>
                          )}
                        </div>

                        {/* Questions toggle button */}
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (isQuestionsOpen) {
                                setQuestionsOpenId("");
                              } else {
                                setQuestionsOpenId(eventType.id);
                                setQuestionsDraft(
                                  (eventType.customQuestions || []).map((q) => ({ ...q }))
                                );
                              }
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-violet-200/70 bg-violet-50/70 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-100/80 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/15"
                          >
                            <span className="flex items-center gap-2">
                              <HelpCircle className="h-3.5 w-3.5" />
                              Questionnaire
                              {eventType.customQuestions?.length > 0 ? (
                                <span className="rounded-full bg-violet-200 px-1.5 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-500/30 dark:text-violet-200">
                                  {eventType.customQuestions.length}/5
                                </span>
                              ) : (
                                <span className="text-xs font-normal text-violet-500 dark:text-violet-400">Add up to 5 questions</span>
                              )}
                            </span>
                            {isQuestionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>

                          {/* Questions panel */}
                          {isQuestionsOpen ? (
                            <div className="mt-2 rounded-xl border border-violet-200/60 bg-violet-50/50 p-4 dark:border-violet-500/20 dark:bg-violet-500/[0.06]">
                              <div className="space-y-2">
                                {questionsDraft.map((q, idx) => (
                                  <div key={q.id || idx} className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-200 text-xs font-bold text-violet-700 dark:bg-violet-500/30 dark:text-violet-200">
                                      {idx + 1}
                                    </span>
                                    <input
                                      type="text"
                                      value={q.label}
                                      placeholder={`Question ${idx + 1}`}
                                      maxLength={200}
                                      onChange={(e) => {
                                        const next = questionsDraft.map((item, i) =>
                                          i === idx ? { ...item, label: e.target.value } : item
                                        );
                                        setQuestionsDraft(next);
                                      }}
                                      className="min-w-0 flex-1 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-violet-400"
                                    />
                                    <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                      <input
                                        type="checkbox"
                                        checked={q.required}
                                        onChange={(e) => {
                                          const next = questionsDraft.map((item, i) =>
                                            i === idx ? { ...item, required: e.target.checked } : item
                                          );
                                          setQuestionsDraft(next);
                                        }}
                                        className="accent-violet-600"
                                      />
                                      Required
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => setQuestionsDraft(questionsDraft.filter((_, i) => i !== idx))}
                                      className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {questionsDraft.length < 5 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuestionsDraft([
                                      ...questionsDraft,
                                      { id: `q${Date.now()}`, label: "", required: false },
                                    ])
                                  }
                                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-600 transition hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-200"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add question ({5 - questionsDraft.length} left)
                                </button>
                              ) : null}

                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveQuestions(eventType)}
                                  disabled={isSavingQuestions}
                                  className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                                >
                                  {isSavingQuestions ? "Saving…" : "Save questions"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setQuestionsOpenId("")}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

            </div>
          )}
        </div>
      </div>

      <EventTypeFormModal
        mode={modalMode}
        open={modalOpen}
        form={form}
        validationErrors={validationErrors}
        onClose={() => setModalOpen(false)}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        submitting={submitting}
        googleConnected={googleConnected}
      />
    </div>
  );
}
