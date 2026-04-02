import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, X, CheckCircle2, ChevronDown, ExternalLink, Zap,
  Globe, Mail, BarChart3, Video, Calendar, Filter, RefreshCw,
  Bell, Clock, ToggleLeft, ToggleRight, Save, Send, AlertCircle,
} from "lucide-react";
import { cn } from "../shared.jsx";

// ── Helpers ──────────────────────────────────────────────────────────────────

const LS_KEY = "meetscheduling_integrations_v1";

function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

// ── Integration definitions ───────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    id: "calendar-reminders",
    name: "Calendar Reminders",
    category: "calendar",
    description: "Send calendar invites with built-in reminders to attendees and yourself. Works with Apple Calendar, Google Calendar, Outlook, and any ICS-compatible app.",
    logo: CalendarRemindersLogo,
    badge: null,
    isNative: true, // handled by custom modal, not generic OAuth
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "calendar",
    description: "Add events to your calendar and prevent double-booking automatically.",
    logo: GoogleCalendarLogo,
    badge: null,
  },
  {
    id: "apple-calendar",
    name: "Apple Calendar",
    category: "calendar",
    description: "Sync meetings via CalDAV protocol with Apple Calendar and iCloud.",
    logo: AppleCalendarLogo,
    badge: null,
  },
  {
    id: "google-meet",
    name: "Google Meet",
    category: "video",
    description: "Auto-generate Google Meet links for every scheduled event.",
    logo: GoogleMeetLogo,
    badge: null,
  },
  {
    id: "zoom",
    name: "Zoom",
    category: "video",
    description: "Automatically create Zoom meetings and include link in confirmations.",
    logo: ZoomLogo,
    badge: null,
  },
  {
    id: "gmail",
    name: "Gmail for Workflows",
    category: "email",
    description: "Send automated emails from your Gmail account via your workflows.",
    logo: GmailLogo,
    badge: null,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    category: "analytics",
    description: "Track engagement and conversion on your booking pages.",
    logo: GoogleAnalyticsLogo,
    badge: "Admin",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "payments",
    description: "Collect payments before or after meetings. One-time or recurring.",
    logo: StripeLogo,
    badge: null,
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "payments",
    description: "Accept PayPal payments directly on your booking page.",
    logo: PaypalLogo,
    badge: null,
  },
  {
    id: "slack",
    name: "Slack",
    category: "notifications",
    description: "Get instant Slack notifications when someone books a meeting.",
    logo: SlackLogo,
    badge: null,
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "automation",
    description: "Connect to 5,000+ apps and automate your booking workflows.",
    logo: ZapierLogo,
    badge: null,
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "crm",
    description: "Sync contacts and meeting data directly into HubSpot.",
    logo: HubspotLogo,
    badge: null,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    description: "Automatically log meetings and contacts in Salesforce CRM.",
    logo: SalesforceLogo,
    badge: "Admin",
  },
];

const CATEGORIES = [
  { value: "all", label: "All integrations" },
  { value: "calendar", label: "Calendar" },
  { value: "video", label: "Video conferencing" },
  { value: "email", label: "Email" },
  { value: "payments", label: "Payments" },
  { value: "notifications", label: "Notifications" },
  { value: "automation", label: "Automation" },
  { value: "crm", label: "CRM" },
  { value: "analytics", label: "Analytics" },
];

// ── SVG Logos ─────────────────────────────────────────────────────────────────

function GoogleCalendarLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <rect x="6" y="10" width="36" height="32" rx="3" fill="#fff" stroke="#DADCE0" strokeWidth="2"/>
      <rect x="6" y="10" width="36" height="10" rx="3" fill="#1A73E8"/>
      <rect x="6" y="17" width="36" height="3" fill="#1A73E8"/>
      <text x="24" y="36" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1A73E8">31</text>
      <rect x="15" y="6" width="4" height="8" rx="2" fill="#1A73E8"/>
      <rect x="29" y="6" width="4" height="8" rx="2" fill="#1A73E8"/>
    </svg>
  );
}

function AppleCalendarLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <rect x="6" y="10" width="36" height="32" rx="3" fill="#fff" stroke="#E5E7EB" strokeWidth="2"/>
      <rect x="6" y="10" width="36" height="10" rx="3" fill="#FF3B30"/>
      <rect x="6" y="17" width="36" height="3" fill="#FF3B30"/>
      <text x="24" y="36" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1C1C1E">31</text>
      <text x="24" y="25" textAnchor="middle" fontSize="7" fontWeight="600" fill="#fff">MAR</text>
    </svg>
  );
}

function GoogleMeetLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <path d="M28 18H12a3 3 0 00-3 3v6a3 3 0 003 3h16a3 3 0 003-3v-6a3 3 0 00-3-3z" fill="#00897B"/>
      <path d="M31 21.5l8-4v13l-8-4v-5z" fill="#00897B"/>
    </svg>
  );
}

function ZoomLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#2D8CFF"/>
      <path d="M10 17h18a3 3 0 013 3v8a3 3 0 01-3 3H10a3 3 0 01-3-3v-8a3 3 0 013-3z" fill="#fff"/>
      <path d="M31 20.5l9-4.5v16l-9-4.5v-7z" fill="#fff"/>
    </svg>
  );
}

function GmailLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <path d="M8 14h32v20a2 2 0 01-2 2H10a2 2 0 01-2-2V14z" fill="#fff" stroke="#E5E7EB" strokeWidth="1.5"/>
      <path d="M8 14l16 12L40 14" stroke="#EA4335" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M8 14v2l16 11 16-11V14" fill="#EA4335"/>
    </svg>
  );
}

function GoogleAnalyticsLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <rect x="10" y="26" width="8" height="14" rx="3" fill="#F9AB00"/>
      <rect x="20" y="18" width="8" height="22" rx="3" fill="#E37400"/>
      <rect x="30" y="10" width="8" height="30" rx="3" fill="#1A73E8"/>
    </svg>
  );
}

function StripeLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#6772E5"/>
      <path d="M24 17c-3.5 0-5.5 1.6-5.5 4 0 4 6 3.5 6 5.5 0 .8-.8 1.2-2 1.2-1.5 0-3-.5-4.5-1.5v4c1.5.7 3 1 4.5 1 3.5 0 6-1.6 6-4.3 0-4-6-3.7-6-5.5 0-.7.6-1.1 1.8-1.1 1.3 0 2.7.4 4 1v-4c-1.3-.5-2.7-.3-4.3-.3z" fill="#fff"/>
    </svg>
  );
}

function PaypalLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <text x="24" y="30" textAnchor="middle" fontSize="22" fontWeight="800" fill="#003087">P</text>
      <text x="28" y="30" textAnchor="middle" fontSize="22" fontWeight="800" fill="#009CDE">P</text>
    </svg>
  );
}

function SlackLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <path d="M19 12a3 3 0 110 6H16a3 3 0 010-6h3z" fill="#E01E5A"/>
      <path d="M36 19a3 3 0 11-6 0v-3a3 3 0 016 0v3z" fill="#ECB22E"/>
      <path d="M29 36a3 3 0 110-6h3a3 3 0 010 6h-3z" fill="#2EB67D"/>
      <path d="M12 29a3 3 0 116 0v3a3 3 0 01-6 0v-3z" fill="#36C5F0"/>
      <path d="M19 29h10v-10H19v10z" fill="#ECB22E" opacity=".3"/>
    </svg>
  );
}

function ZapierLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#FF4A00"/>
      <path d="M24 10l4 10h10l-8 6 3 10-9-7-9 7 3-10-8-6h10z" fill="#fff"/>
    </svg>
  );
}

function HubspotLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <circle cx="30" cy="16" r="5" fill="#FF7A59"/>
      <path d="M30 21v6M20 32a8 8 0 1116 0" stroke="#33475B" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <circle cx="16" cy="28" r="5" fill="#33475B"/>
    </svg>
  );
}

function SalesforceLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#fff"/>
      <path d="M20 18c2-3 6-4 9-2 2-3 7-3 9 0s0 6-2 7H18c-3-1-4-4-2-6 1-1 2-1 4 1z" fill="#00A1E0"/>
      <text x="24" y="38" textAnchor="middle" fontSize="7" fontWeight="700" fill="#00A1E0">SALESFORCE</text>
    </svg>
  );
}

function CalendarRemindersLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <rect width="48" height="48" rx="8" fill="#EEF4FF"/>
      <rect x="8" y="12" width="32" height="28" rx="4" fill="#fff" stroke="#C7DBFF" strokeWidth="1.5"/>
      <rect x="8" y="12" width="32" height="9" rx="4" fill="#3B82F6"/>
      <rect x="8" y="18" width="32" height="3" fill="#3B82F6"/>
      <rect x="16" y="8" width="3" height="7" rx="1.5" fill="#2563EB"/>
      <rect x="29" y="8" width="3" height="7" rx="1.5" fill="#2563EB"/>
      <circle cx="24" cy="30" r="6" fill="#EEF4FF" stroke="#3B82F6" strokeWidth="1.5"/>
      <path d="M24 27v3.5l2 2" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Calendar Reminders Modal ───────────────────────────────────────────────────

const TIMING_OPTIONS = [
  { value: 1440, label: "24 hours before" },
  { value: 60,   label: "1 hour before" },
  { value: 30,   label: "30 minutes before" },
  { value: 15,   label: "15 minutes before" },
];

function CalendarRemindersModal({ onClose, onSaved }) {
  const [settings, setSettings] = useState({
    enabled: false,
    reminderTimings: [1440, 60, 15],
    eventTitleTemplate: "{{eventTitle}} with {{inviteeName}}",
    emailRemindersEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  // Load settings on mount
  useEffect(() => {
    fetch("/api/integrations/calendar-reminders/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function toggleTiming(value) {
    setSettings((prev) => {
      const has = prev.reminderTimings.includes(value);
      const next = has
        ? prev.reminderTimings.filter((t) => t !== value)
        : [...prev.reminderTimings, value].sort((a, b) => b - a);
      return { ...prev, reminderTimings: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/calendar-reminders/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data.settings);
      showToast("success", "Calendar Reminders settings saved.");
      if (onSaved) onSaved(data.settings);
    } catch (err) {
      showToast("error", err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/integrations/calendar-reminders/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      showToast("success", data.message || "Test invite sent. Check your inbox.");
    } catch (err) {
      showToast("error", err.message || "Test failed. Check SMTP configuration.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[#DFE7F3] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.20)] dark:border-white/10 dark:bg-[#0e1929]">

        {/* Toast */}
        {toast && (
          <div className={cn(
            "absolute left-4 right-4 top-4 z-10 flex items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-semibold shadow-lg",
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"
              : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20"
          )}>
            {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DFE7F3] px-6 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-[12px] border border-[#DFE7F3] dark:border-white/10">
              <CalendarRemindersLogo />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">Calendar Reminders</h3>
              <p className="text-[12px] text-slate-400">ICS invites · Apple, Google, Outlook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DFE7F3] bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-[14px]">Loading settings…</div>
          ) : (
            <>
              {/* Info banner */}
              <div className="rounded-2xl border border-[#C7DBFF] bg-[#EEF4FF] p-4 text-[13px] text-[#2563EB] dark:border-[#2a4a80] dark:bg-[#1a2e52]/60 dark:text-[#93BBFF]">
                <p className="font-semibold mb-1">How it works</p>
                <p className="leading-relaxed text-[#3b5cc4] dark:text-[#93BBFF]/80">
                  When a meeting is booked, both you and the attendee receive an email with an <strong>.ics calendar invite</strong> attached. The invite includes built-in alarm reminders so it works automatically with Apple Calendar, Google Calendar, Outlook, and any ICS-compatible app.
                </p>
              </div>

              {/* Enable toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-[#DFE7F3] bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div>
                  <div className="text-[14px] font-semibold text-slate-800 dark:text-white">Enable Calendar Reminders</div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Attach ICS invites with VALARM reminders to booking confirmation emails</div>
                </div>
                <button
                  onClick={() => setSettings((p) => ({ ...p, enabled: !p.enabled }))}
                  className="ml-4 shrink-0"
                  aria-label="Toggle calendar reminders"
                >
                  {settings.enabled
                    ? <ToggleRight size={32} className="text-[#3B82F6]" />
                    : <ToggleLeft size={32} className="text-slate-300 dark:text-slate-600" />
                  }
                </button>
              </div>

              {/* Reminder timings */}
              <div>
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  <Clock size={14} /> Reminder timings
                </div>
                <p className="mb-3 text-[12px] text-slate-500 dark:text-slate-400">
                  These timings become VALARM blocks inside the .ics file — your calendar app will alert you automatically.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {TIMING_OPTIONS.map((opt) => {
                    const active = settings.reminderTimings.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleTiming(opt.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-[13px] font-medium transition",
                          active
                            ? "border-[#3B82F6] bg-[#EEF4FF] text-[#2563EB] dark:border-[#2a4a80] dark:bg-[#1a2e52]/60 dark:text-[#93BBFF]"
                            : "border-[#DFE7F3] bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                          active ? "border-[#3B82F6] bg-[#3B82F6]" : "border-slate-300 dark:border-slate-600"
                        )}>
                          {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event title template */}
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Event title template
                </label>
                <p className="mb-2 text-[12px] text-slate-500 dark:text-slate-400">
                  Use <code className="rounded bg-slate-100 px-1 dark:bg-white/10">{"{{eventTitle}}"}</code> and{" "}
                  <code className="rounded bg-slate-100 px-1 dark:bg-white/10">{"{{inviteeName}}"}</code> as placeholders.
                </p>
                <input
                  value={settings.eventTitleTemplate}
                  onChange={(e) => setSettings((p) => ({ ...p, eventTitleTemplate: e.target.value }))}
                  placeholder="{{eventTitle}} with {{inviteeName}}"
                  maxLength={200}
                  className="w-full rounded-2xl border border-[#DFE7F3] bg-white px-4 py-3 text-[14px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {/* Email reminders toggle */}
              <div className="flex items-center justify-between rounded-2xl border border-[#DFE7F3] bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                <div>
                  <div className="text-[14px] font-semibold text-slate-800 dark:text-white">Also send reminder emails</div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">Send separate reminder emails 24 h and 1 h before (in addition to the ICS VALARM blocks)</div>
                </div>
                <button
                  onClick={() => setSettings((p) => ({ ...p, emailRemindersEnabled: !p.emailRemindersEnabled }))}
                  className="ml-4 shrink-0"
                  aria-label="Toggle email reminders"
                >
                  {settings.emailRemindersEnabled
                    ? <ToggleRight size={32} className="text-[#3B82F6]" />
                    : <ToggleLeft size={32} className="text-slate-300 dark:text-slate-600" />
                  }
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-[#DFE7F3] px-6 py-4 dark:border-white/10">
          <button
            onClick={handleTest}
            disabled={testing || loading}
            className="flex items-center gap-2 rounded-2xl border border-[#DFE7F3] bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            <Send size={13} />
            {testing ? "Sending…" : "Send test invite"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] transition hover:brightness-105 disabled:opacity-50"
          >
            <Save size={13} />
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Connect Modal ─────────────────────────────────────────────────────────────

function ConnectModal({ integration, onConfirm, onCancel }) {
  if (!integration) return null;
  const Logo = integration.logo;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[28px] border border-[#DFE7F3] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.20)] dark:border-white/10 dark:bg-[#0e1929]">
        <div className="flex items-center justify-between border-b border-[#DFE7F3] px-6 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-[12px] border border-[#DFE7F3] dark:border-white/10">
              <Logo />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">Connect {integration.name}</h3>
              <p className="text-[12px] text-slate-400">OAuth simulation</p>
            </div>
          </div>
          <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#DFE7F3] bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10">
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
            You'll be redirected to <strong>{integration.name}</strong> to authorize access. This grants MeetScheduling permission to manage your calendar and create events on your behalf.
          </p>
          <div className="mt-4 rounded-2xl border border-[#DFE7F3] bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            {["Read and create events", "Access basic profile info", "No access to personal data"].map((p) => (
              <div key={p} className="flex items-center gap-2 py-1 text-[13px] text-slate-600 dark:text-slate-300">
                <CheckCircle2 size={13} className="text-emerald-500" /> {p}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 border-t border-[#DFE7F3] px-6 py-4 dark:border-white/10">
          <button onClick={onCancel} className="flex-1 rounded-2xl border border-[#DFE7F3] bg-white py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] hover:brightness-105">
            Authorize
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Integration Card ──────────────────────────────────────────────────────────

function IntegrationCard({ integration, connected, onConnect, onDisconnect, onConfigure }) {
  const Logo = integration.logo;
  return (
    <div className={cn(
      "group relative flex flex-col overflow-hidden rounded-[24px] border bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]",
      connected
        ? "border-emerald-200 shadow-[0_4px_20px_rgba(16,185,129,0.08)] dark:border-emerald-500/20"
        : "border-[#DFE7F3] shadow-[0_4px_16px_rgba(15,23,42,0.05)] dark:border-white/10"
    , "dark:bg-white/[0.04]")}>

      {connected && (
        <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-br from-emerald-500/[0.03] to-transparent" />
      )}

      {/* Top row */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="h-11 w-11 overflow-hidden rounded-[14px] border border-[#DFE7F3] shadow-sm dark:border-white/10">
          <Logo />
        </div>
        <div className="flex items-center gap-1.5">
          {integration.badge && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-400">
              {integration.badge}
            </span>
          )}
          {connected && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1">
        <h3 className="text-[15px] font-bold text-slate-800 dark:text-white">{integration.name}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{integration.description}</p>
      </div>

      {/* Action */}
      <div className="mt-4">
        {integration.isNative ? (
          // Native integrations open a settings modal instead of OAuth
          <button
            onClick={() => onConfigure(integration)}
            className="w-full rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.22)] transition hover:brightness-105"
          >
            {connected ? "Configure" : "Set up"}
          </button>
        ) : connected ? (
          <button
            onClick={() => onDisconnect(integration.id)}
            className="w-full rounded-2xl border border-[#DFE7F3] bg-white py-2.5 text-[13px] font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => onConnect(integration)}
            className="w-full rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.22)] transition hover:brightness-105"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function IntegrationsPanel() {
  const [connected, setConnected] = useState(() => loadState());
  const [tab, setTab] = useState("discover");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const [connectingIntegration, setConnectingIntegration] = useState(null);
  const [configuringIntegration, setConfiguringIntegration] = useState(null);
  const [banner, setBanner] = useState(true);
  const filterRef = useRef(null);

  // Load calendar reminders enabled state from API on mount
  useEffect(() => {
    fetch("/api/integrations/calendar-reminders/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.enabled) {
          setConnected((prev) => ({ ...prev, "calendar-reminders": true }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { saveState(connected); }, [connected]);

  useEffect(() => {
    function handler(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const connectedCount = Object.values(connected).filter(Boolean).length;

  const filtered = useMemo(() => {
    let list = tab === "manage" ? INTEGRATIONS.filter((i) => connected[i.id]) : INTEGRATIONS;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    if (category !== "all") list = list.filter((i) => i.category === category);
    return list;
  }, [tab, search, category, connected]);

  function handleConnect(integration) {
    setConnectingIntegration(integration);
  }

  function handleConfigure(integration) {
    setConfiguringIntegration(integration);
  }

  function handleConfirm() {
    setConnected((prev) => ({ ...prev, [connectingIntegration.id]: true }));
    setConnectingIntegration(null);
  }

  function handleDisconnect(id) {
    setConnected((prev) => ({ ...prev, [id]: false }));
  }

  function handleCalendarRemindersSaved(settings) {
    // Reflect enabled state in connected map
    setConnected((prev) => ({ ...prev, "calendar-reminders": Boolean(settings.enabled) }));
    setConfiguringIntegration(null);
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-[34px] border border-[#DFE7F3] bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#3B82F6]/5 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#C7DBFF] bg-[#EEF4FF] px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:border-[#2a4a80] dark:bg-[#1a2e52] dark:text-[#93BBFF]">
              <Zap size={10} fill="currentColor" /> Integrations & Apps
            </div>
            <h1 className="text-[32px] font-bold tracking-tight text-slate-900 dark:text-white">Connect your stack</h1>
            <p className="mt-1.5 max-w-lg text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
              Sync calendars, video tools, CRMs and payment providers with your scheduling workflow.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-[20px] border border-[#DFE7F3] bg-slate-50 px-5 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_4px_12px_rgba(16,185,129,0.28)]">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <div>
              <div className="text-[20px] font-bold leading-none text-slate-900 dark:text-white">{connectedCount}</div>
              <div className="text-[12px] text-slate-400">Connected</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mt-6 flex gap-1 rounded-2xl border border-[#DFE7F3] bg-slate-50 p-1 w-fit dark:border-white/10 dark:bg-white/[0.03]">
          {[
            { key: "discover", label: `Discover (${INTEGRATIONS.length})` },
            { key: "manage", label: `Manage (${connectedCount})`, badge: connectedCount > 0 },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200",
                tab === t.key
                  ? "bg-white text-slate-800 shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {t.label}
              {t.badge && tab !== "manage" && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                  {connectedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Google Workspace banner */}
      {tab === "discover" && banner && (
        <div className="relative overflow-hidden rounded-[28px] border border-[#C7DBFF] bg-gradient-to-r from-[#EEF4FF] to-[#E6F0FF] p-6 dark:border-[#2a4a80] dark:from-[#1a2e52]/60 dark:to-[#162444]/60">
          <button
            onClick={() => setBanner(false)}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-xl bg-white/80 text-slate-500 hover:bg-white dark:bg-white/10 dark:text-slate-300"
          >
            <X size={13} />
          </button>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex -space-x-2">
              {[GoogleCalendarLogo, GoogleMeetLogo, GmailLogo].map((Logo, i) => (
                <div key={i} className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm dark:border-[#1a2e52]">
                  <Logo />
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#93BBFF]">Google Workspace</div>
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">Never miss a beat with Google integrations</h3>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">Connect Google Calendar, Meet, and Gmail in one click.</p>
            </div>
            <button
              onClick={() => setCategory("calendar")}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_18px_rgba(37,99,235,0.28)] hover:brightness-105"
            >
              See integrations <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-2xl border border-[#DFE7F3] bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <Search size={15} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="w-full bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#DFE7F3] bg-white px-4 py-3 text-[14px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Filter size={14} />
            {CATEGORIES.find((c) => c.value === category)?.label || "All integrations"}
            <ChevronDown size={14} className={cn("transition-transform", showFilter && "rotate-180")} />
          </button>
          {showFilter && (
            <div className="absolute right-0 top-14 z-30 w-56 overflow-hidden rounded-2xl border border-[#DFE7F3] bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0e1929]">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setCategory(c.value); setShowFilter(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-[13px] text-left transition",
                    category === c.value
                      ? "bg-[#EEF4FF] font-semibold text-[#2563EB] dark:bg-[#1a2e52] dark:text-[#93BBFF]"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
                  )}
                >
                  {c.label}
                  {category === c.value && <CheckCircle2 size={13} className="text-[#3B82F6]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#DFE7F3] bg-white py-16 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
            <RefreshCw size={20} className="text-slate-400" />
          </div>
          <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">No integrations found</p>
          <p className="mt-1 text-[13px] text-slate-400 dark:text-slate-500">Try a different search or filter</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              connected={Boolean(connected[integration.id])}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      )}

      <ConnectModal
        integration={connectingIntegration}
        onConfirm={handleConfirm}
        onCancel={() => setConnectingIntegration(null)}
      />

      {configuringIntegration?.id === "calendar-reminders" && (
        <CalendarRemindersModal
          onClose={() => setConfiguringIntegration(null)}
          onSaved={handleCalendarRemindersSaved}
        />
      )}
    </div>
  );
}
