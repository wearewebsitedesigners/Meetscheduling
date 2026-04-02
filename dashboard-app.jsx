import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowUpRight,
  AtSign,
  BarChart3,
  BellRing,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ExternalLink,
  LayoutTemplate,
  Link2,
  Lock,
  LogOut,
  Mail,
  MoonStar,
  Plus,
  Search,
  Shield,
  Sparkles,
  LoaderCircle,
  User,
  UserPlus,
  Users,
  PlugZap,
  PhoneCall,
  Calendar,
  CalendarDays,
  Clock3,
  CheckCircle2,
  X,
} from "lucide-react";
import { apiFetch, cn, getInitials, getLocalPreviewUser, isLocalPreviewHost } from "./dashboard/shared.jsx";

const SchedulingPanel = lazy(() => import("./dashboard/panels/scheduling-panel.jsx"));
const MeetingsPanel = lazy(() => import("./dashboard/panels/meetings-panel.jsx"));
const AvailabilityPanel = lazy(() => import("./dashboard/panels/availability-panel.jsx"));
const ContactsPanel = lazy(() => import("./dashboard/panels/contacts-panel.jsx"));
const DomainsPanel = lazy(() => import("./dashboard/panels/domains-panel.jsx"));
const OverviewPanel = lazy(() => import("./dashboard/panels/overview-panel.jsx"));
const LandingPageBuilder = lazy(() => import("./dashboard/landing-builder/LandingPageBuilder.jsx"));
const IvrSettingsPanel = lazy(() => import("./dashboard/panels/ivr-settings-panel.jsx"));
const UpgradePanel = lazy(() => import("./dashboard/panels/upgrade-panel.jsx"));
const IntegrationsPanel = lazy(() => import("./dashboard/panels/integrations-panel.jsx"));
const AccountPanel = lazy(() => import("./dashboard/panels/account-panel.jsx"));

const COLLAPSE_KEY = "meetscheduling_react_sidebar_collapsed_v1";
const THEME_KEY = "meetscheduling_react_theme_v1";
const USER_KEY = "meetscheduling_auth_user";
const defaultSectionKey = "dashboard";

const accountMenuItems = [
  { key: "profile-settings", label: "Profile settings", icon: User },
  { key: "account-settings", label: "Account settings", icon: Shield },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "logout", label: "Logout", icon: LogOut, danger: true },
];

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const primaryNav = [
  { key: "scheduling", label: "Scheduling", icon: Calendar },
  { key: "meetings", label: "Meetings", icon: CalendarDays },
  { key: "availability", label: "Availability", icon: Clock3 },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "workflows", label: "Email automation", icon: Mail },
  { key: "integrations", label: "Integrations & apps", icon: PlugZap },
  { key: "confirmation-calls", label: "Confirmation calls", icon: PhoneCall },
];

const secondaryNav = [
  { key: "upgrade", label: "Upgrade plan", icon: CreditCard, accent: true },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

const genericSections = {
  workflows: {
    eyebrow: "Automation studio",
    title: "Email automation",
    summary: "Keep confirmations, reminders, and nurture sequences tight without repetitive work.",
    stats: [
      { label: "Live workflows", value: "14", note: "11 active, 3 draft" },
      { label: "Emails sent", value: "3.2k", note: "Last 30 days" },
      { label: "Open rate", value: "62%", note: "Reminder sequence" },
      { label: "Reply rate", value: "18%", note: "Post-meeting follow-up" },
    ],
    listTitle: "Automation stack",
    listDescription: "Sequences currently driving confirmations, reminders, and retention.",
    rows: [
      { title: "Instant confirmation", meta: "Triggers on booking", status: "Active" },
      { title: "Reminder ladder", meta: "24h and 45m before meeting", status: "Active" },
      { title: "Missed meeting recovery", meta: "2-touch follow-up", status: "Testing" },
      { title: "Upsell after consultation", meta: "3-part nurture", status: "Draft" },
    ],
    sideTitle: "Recent changes",
    sideItems: [
      "Subject line test improved reminder open rate by 7.4%.",
      "One workflow has no fallback if the booking gets rescheduled.",
      "Follow-up copy is strongest when it includes direct next-step links.",
    ],
  },
  routing: {
    eyebrow: "Routing logic",
    title: "Routing",
    summary: "Direct high-intent leads to the right calendar, form, or follow-up path automatically.",
    stats: [
      { label: "Active forms", value: "05", note: "Across inbound sources" },
      { label: "Qualified leads", value: "41", note: "This week" },
      { label: "Routed instantly", value: "92%", note: "Under 10 seconds" },
      { label: "Escalations", value: "03", note: "Need manual review" },
    ],
    listTitle: "Routing rules",
    listDescription: "The key decision flows currently shaping your booking pipeline.",
    rows: [
      { title: "Sales qualification", meta: "Routes by company size and urgency", status: "Live" },
      { title: "Support escalation", meta: "Routes premium customers first", status: "Protected" },
      { title: "Consulting intake", meta: "Paid consult pre-qualifier", status: "Optimized" },
      { title: "Enterprise handoff", meta: "Requires ops approval", status: "Watching" },
    ],
    sideTitle: "Optimization ideas",
    sideItems: [
      "Shorten form friction for inbound leads from landing pages.",
      "Add one fallback route for missing calendar owner coverage.",
      "Tie routing outcomes into CRM segments automatically.",
    ],
  },
  integrations: {
    eyebrow: "Connections",
    title: "Integrations & apps",
    summary: "Keep calendar sync, CRM updates, and payment events connected to the rest of your stack.",
    stats: [
      { label: "Connected apps", value: "07", note: "2 need review" },
      { label: "Calendar syncs", value: "99.8%", note: "Successful this week" },
      { label: "Payment tools", value: "02", note: "Stripe and PayPal" },
      { label: "Automation hooks", value: "11", note: "Available for workflows" },
    ],
    listTitle: "Integration health",
    listDescription: "Connections that are active now or need a quick check.",
    rows: [
      { title: "Google Calendar", meta: "Primary booking calendar", status: "Connected" },
      { title: "Google Meet", meta: "Meeting links enabled", status: "Live" },
      { title: "PayPal", meta: "Subscription billing active", status: "Connected" },
      { title: "Zapier", meta: "Automation bridge", status: "Needs review" },
    ],
    sideTitle: "Suggested actions",
    sideItems: [
      "Reconnect one stale automation token before it fails a live workflow.",
      "Review payment webhooks after the latest billing plan update.",
      "Add a backup calendar source for admin availability coverage.",
    ],
  },
  "landing-page": {
    eyebrow: "Conversion pages",
    title: "Landing pages",
    summary: "Launch high-converting booking and lead capture pages without leaving your scheduling stack.",
    stats: [
      { label: "Published pages", value: "03", note: "1 draft in progress" },
      { label: "Lead conversion", value: "24%", note: "Across top pages" },
      { label: "Paid offers", value: "02", note: "Linked to booking flows" },
      { label: "Page speed", value: "A", note: "Current landing bundle" },
    ],
    listTitle: "Live page collection",
    listDescription: "Your current public-facing booking experiences and lead capture surfaces.",
    rows: [
      { title: "Main booking page", meta: "Primary discovery call funnel", status: "Live" },
      { title: "Paid consultation page", meta: "Integrated with billing", status: "Converting" },
      { title: "Agency application form", meta: "Pre-qualifies larger leads", status: "Active" },
      { title: "Workshop waitlist", meta: "Collects early demand", status: "Draft" },
    ],
    sideTitle: "Next improvements",
    sideItems: [
      "Add social proof below primary CTA on the paid consult page.",
      "Test a shorter headline on the agency application page.",
      "Connect page analytics deeper into follow-up workflows.",
    ],
  },
  analytics: {
    eyebrow: "Performance",
    title: "Analytics",
    summary: "Track booking velocity, funnel performance, and operational efficiency across the workspace.",
    stats: [
      { label: "Bookings this month", value: "184", note: "+12% MoM" },
      { label: "Lead to booked", value: "27%", note: "Across all channels" },
      { label: "Revenue influenced", value: "$12.4k", note: "Via meetings" },
      { label: "No-show rate", value: "4.1%", note: "Below last month" },
    ],
    listTitle: "Performance highlights",
    listDescription: "The movements actually affecting pipeline quality and revenue.",
    rows: [
      { title: "Landing page funnel", meta: "Bookings up 18% after design refresh", status: "Winning" },
      { title: "Warm lead routing", meta: "Best-performing intake source", status: "Scaling" },
      { title: "Reminder automation", meta: "Reduced no-shows by 9%", status: "Healthy" },
      { title: "Consulting offers", meta: "High ticket close rate improving", status: "Watching" },
    ],
    sideTitle: "Priority focus",
    sideItems: [
      "Review which event type generates the highest-quality repeat bookings.",
      "Compare form conversion by source to trim acquisition waste.",
      "Export weekly summaries once snapshots are fully wired.",
    ],
  },
  admin: {
    eyebrow: "Workspace control",
    title: "Admin center",
    summary: "Set policies, permissions, and defaults that keep the workspace consistent as the team grows.",
    stats: [
      { label: "Active members", value: "08", note: "2 pending invites" },
      { label: "Role changes", value: "04", note: "Last 30 days" },
      { label: "Security checks", value: "12", note: "All passed" },
      { label: "Workspace policies", value: "09", note: "1 needs review" },
    ],
    listTitle: "Admin tasks",
    listDescription: "Control points affecting access, billing, and quality assurance.",
    rows: [
      { title: "Member permissions", meta: "Review access for new coordinator", status: "Pending" },
      { title: "Billing roles", meta: "Owner-only changes enforced", status: "Stable" },
      { title: "Workspace branding", meta: "Public pages aligned", status: "Updated" },
      { title: "Security baseline", meta: "2FA adoption at 75%", status: "Improving" },
    ],
    sideTitle: "Operational notes",
    sideItems: [
      "One viewer should likely be promoted to member for workflow editing.",
      "Audit log export should be scheduled monthly.",
      "Revisit invite flow copy before onboarding the next team cohort.",
    ],
  },
  help: {
    eyebrow: "Support center",
    title: "Help",
    summary: "Keep answers, guides, and escalations close so operators can resolve issues without leaving the product.",
    stats: [
      { label: "Open help topics", value: "42", note: "Internal docs ready" },
      { label: "Avg resolution", value: "7m", note: "For guided issues" },
      { label: "Escalations", value: "03", note: "Need human follow-up" },
      { label: "Docs freshness", value: "86%", note: "Most content up to date" },
    ],
    listTitle: "Help queue",
    listDescription: "The assistance topics most relevant to your current dashboard setup.",
    rows: [
      { title: "Calendar connection guide", meta: "Top viewed support topic", status: "Popular" },
      { title: "PayPal billing verification", meta: "Recent onboarding blocker", status: "Active" },
      { title: "Team role permissions", meta: "Frequently requested", status: "Updated" },
      { title: "Landing page publishing", meta: "Needs richer docs", status: "Draft" },
    ],
    sideTitle: "Next improvements",
    sideItems: [
      "Add inline contextual help for integrations and billing.",
      "Surface top docs directly from empty states in product.",
      "Convert repeated support replies into one structured knowledge flow.",
    ],
  },
  upgrade: {
    eyebrow: "Growth plan",
    title: "Upgrade plan",
    summary: "See the levers that unlock more team capacity, conversion tooling, and better revenue operations.",
    stats: [
      { label: "Current plan", value: "Free", note: "Good for early setup" },
      { label: "Seats available", value: "03", note: "Before team lock" },
      { label: "Automation cap", value: "05", note: "Near current usage" },
      { label: "Landing pages", value: "02", note: "1 more before limit" },
    ],
    listTitle: "Upgrade benefits",
    listDescription: "What becomes possible immediately after moving to a higher plan.",
    rows: [
      { title: "More team seats", meta: "Bring operations and sales together", status: "Scale" },
      { title: "Advanced automations", meta: "Trigger richer email and routing flows", status: "High impact" },
      { title: "Deeper analytics", meta: "Track revenue and funnel quality", status: "Insight" },
      { title: "More landing pages", meta: "Launch segmented campaigns faster", status: "Growth" },
    ],
    sideTitle: "Why upgrade now",
    sideItems: [
      "Your current workflow count is close to the free-tier ceiling.",
      "Two more users are waiting on seat availability.",
      "Additional landing pages would let you segment offers by audience.",
    ],
  },
  account: {
    eyebrow: "Account settings",
    title: "Account",
    summary: "Manage your identity, branding, links, and workspace-level preferences in one place.",
    stats: [
      { label: "Profile completeness", value: "92%", note: "Good trust signal" },
      { label: "Brand assets", value: "04", note: "Logo, colors, favicon" },
      { label: "Public links", value: "03", note: "Booking and page URLs" },
      { label: "Security methods", value: "02", note: "Password + 2FA" },
    ],
    listTitle: "Account checklist",
    listDescription: "The settings that shape your public brand and internal workspace experience.",
    rows: [
      { title: "Profile details", meta: "Photo, title, and timezone", status: "Complete" },
      { title: "Branding", meta: "Primary blue palette active", status: "Aligned" },
      { title: "Public link", meta: "Primary URL claimed", status: "Ready" },
      { title: "Security", meta: "2FA still recommended for admins", status: "Review" },
    ],
    sideTitle: "Recommended next steps",
    sideItems: [
      "Add a shorter public username for cleaner invite links.",
      "Review branding on dark mode cards for contrast.",
      "Rotate team invite messaging after profile completion.",
    ],
  },
};

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function getDisplayName(user) {
  return user?.displayName || user?.name || user?.username || user?.email?.split("@")[0] || "Workspace User";
}

function getUserEmail(user) {
  return user?.email || "";
}

function getUserAvatarUrl(user) {
  return user?.avatarUrl || user?.avatar_url || "";
}

function writeStoredUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user || null));
  } catch {}
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function parseDashboardRoute(pathname) {
  const parts = String(pathname || "").split("/").filter(Boolean);
  if (!parts.length || parts[0] !== "dashboard") {
    return { type: "section", sectionKey: defaultSectionKey };
  }

  if (parts.length === 1) {
    return { type: "section", sectionKey: defaultSectionKey };
  }

  if (parts[1] === "landing-page-builder") {
    return {
      type: "builder",
      pageId: parts[2] || "home",
      sectionKey: "landing-page",
    };
  }

  const next = parts[1];
  if (next === "dashboard") {
    return { type: "section", sectionKey: defaultSectionKey };
  }
  const nextNorm = next && next.replace(/_/g, "-");
  return nextNorm && (genericSections[nextNorm] || primaryNav.some((item) => item.key === nextNorm) || secondaryNav.some((item) => item.key === nextNorm))
    ? { type: "section", sectionKey: nextNorm }
    : { type: "section", sectionKey: defaultSectionKey };
}

function LoadingPanel() {
  return (
    <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-40 rounded-full bg-slate-200 dark:bg-white/10" />
        <div className="h-12 w-72 rounded-2xl bg-slate-200 dark:bg-white/10" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[24px] bg-slate-200 dark:bg-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

function GenericSectionPanel({ section }) {
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D7E1F0] bg-white px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2563EB] shadow-[0_8px_24px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:text-[#8DB2FF] dark:shadow-none">
            <Sparkles className="h-3.5 w-3.5" />
            {section.eyebrow}
          </div>
          <h1 className="font-['Sora'] text-[40px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[48px] dark:text-white">{section.title}</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-500 dark:text-slate-400">{section.summary}</p>
        </div>

        <div className="rounded-[22px] border border-[#D7E1F0] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <p className="text-[12px] uppercase tracking-[0.18em] text-slate-400">Focus now</p>
          <p className="mt-1 flex items-center gap-2 text-[24px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">
            <Activity className="h-5 w-5 text-[#2563EB]" />
            Operational clarity
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {section.stats.map((stat) => (
          <div key={stat.label} className="rounded-[24px] border border-[#D7E1F0] bg-white p-5 shadow-[0_14px_40px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="mt-3 font-['Sora'] text-[32px] font-semibold tracking-[-0.05em] text-slate-900 dark:text-white">{stat.value}</p>
            <p className="mt-2 text-[13px] text-slate-400 dark:text-slate-500">{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.82fr)]">
        <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{section.listTitle}</p>
              <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">{section.listDescription}</p>
            </div>
            <button className="rounded-full border border-[#D7E1F0] bg-[#F7FAFE] px-4 py-2 text-[13px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">View all</button>
          </div>

          <div className="mt-6 space-y-3">
            {section.rows.map((row) => (
              <div key={`${row.title}-${row.meta}`} className="grid gap-3 rounded-[22px] border border-[#E2EAF4] bg-[#FBFCFE] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:grid-cols-[minmax(0,1fr)_auto] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">{row.title}</p>
                  <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{row.meta}</p>
                </div>
                <div className="flex items-center sm:justify-end">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-3 py-1 text-[12px] font-semibold text-[#2557C7] dark:bg-[#132544] dark:text-[#8DB2FF]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{section.sideTitle}</p>
            <div className="mt-5 space-y-3">
              {section.sideItems.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[20px] border border-[#E2EAF4] bg-[#FBFCFE] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2563EB] dark:bg-[#132544] dark:text-[#8DB2FF]">
                    <BellRing className="h-4 w-4" />
                  </span>
                  <p className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#15376D] p-6 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)]">
            <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em]">Operational next step</p>
            <p className="mt-3 text-[14px] leading-6 text-slate-200">This React dashboard shell is split into lighter chunks and ready for deeper API wiring section by section.</p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0F1F3D] shadow-[0_12px_28px_rgba(255,255,255,0.14)]">
              Continue buildout
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function AccountMenuButton({ item, onAction }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onAction(item.key)}
      role="menuitem"
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-left outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#76A2FF]/60",
        item.danger
          ? "text-rose-300 hover:bg-rose-500/12"
          : "text-slate-100 hover:bg-white/10 hover:text-white"
      )}
    >
      <span className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border backdrop-blur-xl transition-all duration-200",
        item.danger
          ? "border-rose-400/20 bg-rose-500/10 text-rose-300 group-hover:bg-rose-500/15"
          : "border-white/10 bg-white/[0.06] text-slate-300 group-hover:bg-white/[0.1] group-hover:text-white"
      )}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium tracking-[-0.01em]">{item.label}</span>
        {item.badge && <span className="rounded-full border border-[#76A2FF]/30 bg-[#76A2FF]/10 px-2 py-0.5 text-[10px] font-semibold text-[#A9C4FF]">{item.badge}</span>}
      </div>
    </button>
  );
}

function InviteUserModal({ open, dark, email, role, message, error, submitting, onEmailChange, onRoleChange, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[70] flex items-center justify-center px-4 backdrop-blur-sm transition-colors",
      dark ? "bg-[#071122]/68" : "bg-[rgba(148,163,184,0.28)]"
    )}>
      <div className={cn(
        "relative w-full max-w-[520px] overflow-hidden rounded-[30px] border shadow-[0_24px_90px_rgba(15,23,42,0.28)] backdrop-blur-3xl",
        dark
          ? "border-white/10 bg-[#0B1324]/92"
          : "border-[#D7E3F4] bg-[rgba(255,255,255,0.94)] shadow-[0_24px_90px_rgba(15,23,42,0.16)]"
      )}>
        <div className={cn(
          "pointer-events-none absolute inset-0",
          dark
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03)_34%,rgba(255,255,255,0.02))]"
            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.34)_34%,rgba(255,255,255,0.2))]"
        )} />
        <div className={cn(
          "relative px-6 pb-5 pt-6",
          dark ? "border-b border-white/10" : "border-b border-[#E3EBF7]"
        )}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={cn(
                "mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
                dark
                  ? "border border-blue-400/20 bg-blue-500/15 text-blue-300"
                  : "border border-[#BFD3F8] bg-[#EAF2FF] text-[#2457C8]"
              )}>
                <UserPlus className="h-3.5 w-3.5" /> Invite user
              </div>
              <h3 className={cn(
                "font-['Sora'] text-[30px] font-bold tracking-[-0.03em]",
                dark ? "text-white" : "text-slate-900"
              )}>Add someone to your workspace</h3>
              <p className={cn(
                "mt-2 text-[14px] leading-6",
                dark ? "text-slate-400" : "text-slate-600"
              )}>Send an invite to a teammate and choose the access level they should have inside MeetScheduling.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition",
                dark
                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  : "border-[#D7E3F4] bg-[#F6F9FF] text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:bg-white"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative px-6 py-6">
          <div className="space-y-5">
            <div>
              <label className={cn(
                "mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em]",
                dark ? "text-slate-400" : "text-slate-500"
              )}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="name@company.com"
                className={cn(
                  "h-[52px] w-full rounded-2xl px-4 py-3 text-[15px] outline-none transition",
                  dark
                    ? "border border-white/10 bg-white/5 text-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] placeholder:text-slate-500 focus:border-blue-400/40"
                    : "border border-[#D7E3F4] bg-[#F7FAFF] text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.05)] placeholder:text-slate-400 focus:border-[#7EA8FF] focus:bg-white"
                )}
              />
            </div>

            <div>
              <label className={cn(
                "mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em]",
                dark ? "text-slate-400" : "text-slate-500"
              )}>Role</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(event) => onRoleChange(event.target.value)}
                  className={cn(
                    "h-[52px] w-full appearance-none rounded-2xl px-4 py-3 pr-11 text-[15px] outline-none transition",
                    dark
                      ? "border border-white/10 bg-white/5 text-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] focus:border-blue-400/40"
                      : "border border-[#D7E3F4] bg-[#F7FAFF] text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.05)] focus:border-[#7EA8FF] focus:bg-white"
                  )}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                  <option value="owner">Owner</option>
                </select>
                <ChevronDown className={cn(
                  "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2",
                  dark ? "text-slate-500" : "text-slate-400"
                )} />
              </div>
            </div>

            <div className={cn(
              "rounded-[22px] p-4 text-[13px] leading-6",
              dark
                ? "border border-white/10 bg-white/5 text-slate-400"
                : "border border-[#E3EBF7] bg-[#F6F9FF] text-slate-600"
            )}>
              <p className={cn(
                "font-semibold",
                dark ? "text-white" : "text-slate-900"
              )}>Roles at a glance</p>
              <p className="mt-1">Admins can manage the workspace. Members can work inside the product. Viewers are read-only.</p>
            </div>

            {(message || error) && (
              <div className={cn(
                "rounded-[20px] border px-4 py-3 text-[14px] font-medium",
                error
                  ? "border-rose-200/70 bg-rose-50/85 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
                  : "border-emerald-200/70 bg-emerald-50/85 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              )}>{error || message}</div>
            )}
          </div>
        </div>

        <div className={cn(
          "relative flex items-center justify-end gap-3 px-6 py-5",
          dark ? "border-t border-white/10" : "border-t border-[#E3EBF7]"
        )}>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-full px-5 py-2.5 text-[15px] font-medium transition",
              dark
                ? "text-slate-300 hover:bg-white/10"
                : "text-slate-600 hover:bg-[#EDF3FF]"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[15px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70",
              dark
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_12px_30px_rgba(37,99,235,0.28)] hover:brightness-105"
                : "bg-gradient-to-r from-[#2E66EA] to-[#1EA9D7] shadow-[0_12px_24px_rgba(46,102,234,0.22)] hover:brightness-[1.03]"
            )}
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? "Sending..." : "Send invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({ item, active, collapsed, onClick }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center text-left transition-all duration-300",
        collapsed ? "mx-auto h-[54px] w-[54px] justify-center rounded-[18px]" : "h-12 gap-3 rounded-2xl px-3",
        active ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      {!collapsed && <span className="truncate text-[15px] font-medium tracking-[-0.02em]">{item.label}</span>}
    </button>
  );
}

const SETTINGS_TABS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "my-link", label: "My Link", icon: Link2 },
  { key: "security", label: "Security", icon: Lock },
  { key: "billing", label: "Billing", icon: CreditCard },
];

function SettingsOverlay({ open, tab, user, avatarUrl, dark, initials, onClose, onTabChange, onUserUpdate, onChangePhoto, avatarUploading, avatarMessage, avatarError }) {
  const [displayName, setDisplayName] = React.useState(user?.displayName || "");
  const [username, setUsername] = React.useState(user?.username || "");
  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setDisplayName(user?.displayName || "");
      setUsername(user?.username || "");
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [open, user?.displayName, user?.username]);

  React.useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  const isDirty =
    displayName.trim() !== (user?.displayName || "").trim() ||
    username.trim() !== (user?.username || "").trim();

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!isDirty) return;
    const trimmedName = displayName.trim();
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedName || trimmedName.length < 2) { setErrorMsg("Display name must be at least 2 characters."); return; }
    if (!trimmedUsername || trimmedUsername.length < 2) { setErrorMsg("Username must be at least 2 characters."); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedUsername)) { setErrorMsg("Username may only contain lowercase letters, numbers, and hyphens."); return; }
    setSaving(true); setSuccessMsg(""); setErrorMsg("");
    try {
      const payload = await apiFetch("/api/auth/me", { method: "PATCH", body: { displayName: trimmedName, username: trimmedUsername } });
      if (!payload?.user) throw new Error("Unexpected response.");
      onUserUpdate?.(payload.user);
      setDisplayName(payload.user.displayName || trimmedName);
      setUsername(payload.user.username || trimmedUsername);
      setSuccessMsg("Profile updated successfully.");
    } catch (err) {
      setErrorMsg(err?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const email = user?.email || "";
  const bookingUrl = username ? `https://www.meetscheduling.com/${username}` : "";

  const renderTabContent = () => {
    if (tab === "profile") {
      return (
        <div className="max-w-xl">
          <div className="mb-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Account details</p>
            <h2 className="mt-1 font-['Sora'] text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Profile</h2>
          </div>

          {/* Avatar section */}
          <div className="mb-8 flex items-center gap-5 rounded-[20px] border border-[#E2EAF4] bg-[#F8FAFE] p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#7c3aed)] p-[2px] shadow-[0_8px_20px_rgba(37,99,235,0.18)]">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_20%,#5a3a28,#24160f_65%)] text-2xl font-black tracking-tight text-[#f4c38a]">
                {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : initials}
              </div>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">Profile photo</p>
              <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">PNG, JPG, WEBP or GIF, up to 5MB</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onChangePhoto}
                  disabled={avatarUploading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D7E1F0] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-[#F0F5FF] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  {avatarUploading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                  {avatarUploading ? "Uploading..." : "Update"}
                </button>
              </div>
              {(avatarMessage || avatarError) ? (
                <p className={cn("mt-1.5 text-[11px]", avatarError ? "text-rose-500" : "text-emerald-600")}>{avatarError || avatarMessage}</p>
              ) : null}
            </div>
          </div>

          <form onSubmit={handleSaveProfile} noValidate className="space-y-5">
            {/* Email read-only */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">Email</label>
              <div className="flex items-center gap-2 rounded-[14px] border border-[#E2EAF4] bg-[#F7FAFE] px-4 py-3 text-[14px] text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setSuccessMsg(""); setErrorMsg(""); }}
                maxLength={100}
                placeholder="Your name"
                className="w-full rounded-[14px] border border-[#D7E1F0] bg-white px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-[#8DB2FF]"
              />
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700 dark:text-slate-300">Username</label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSuccessMsg(""); setErrorMsg(""); }}
                  maxLength={80}
                  placeholder="your-username"
                  className="w-full rounded-[14px] border border-[#D7E1F0] bg-white pl-10 pr-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-[#8DB2FF]"
                />
              </div>
              {username ? (
                <p className="mt-1.5 text-[12px] text-slate-400 dark:text-slate-500">
                  Booking page: <span className="font-semibold text-slate-600 dark:text-slate-300">meetscheduling.com/{username}</span>
                </p>
              ) : null}
            </div>

            {successMsg ? (
              <div className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />{successMsg}
              </div>
            ) : null}
            {errorMsg ? (
              <div className="flex items-center gap-2 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <Shield className="h-4 w-4 shrink-0" />{errorMsg}
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (tab === "my-link") {
      return (
        <div className="max-w-xl">
          <div className="mb-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Public URL</p>
            <h2 className="mt-1 font-['Sora'] text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">My Link</h2>
            <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">Your personal scheduling link that invitees use to book time with you.</p>
          </div>

          <div className="rounded-[20px] border border-[#D7E1F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3 rounded-[14px] border border-[#E2EAF4] bg-[#F7FAFE] px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
              <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="flex-1 truncate text-[14px] font-medium text-slate-700 dark:text-slate-200">
                {bookingUrl || "Set a username to see your link"}
              </span>
              {bookingUrl ? (
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-[#D7E1F0] bg-white px-2.5 py-1 text-[12px] font-semibold text-blue-600 transition hover:bg-[#F0F5FF] dark:border-white/10 dark:bg-white/5 dark:text-blue-400">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            <p className="mt-4 text-[13px] text-slate-500 dark:text-slate-400">
              To change your link, update your <button type="button" onClick={() => onTabChange("profile")} className="font-semibold text-blue-600 underline underline-offset-2 dark:text-blue-400">username in Profile</button>.
            </p>
          </div>
        </div>
      );
    }

    if (tab === "security") {
      return (
        <div className="max-w-xl">
          <div className="mb-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Account settings</p>
            <h2 className="mt-1 font-['Sora'] text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Security</h2>
            <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">Manage your password and two-factor authentication.</p>
          </div>
          <div className="space-y-4">
            {[
              { label: "Password", value: "••••••••••", action: "Change password" },
              { label: "Two-factor authentication", value: "Not enabled", action: "Enable 2FA" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-[20px] border border-[#D7E1F0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div>
                  <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{row.label}</p>
                  <p className="mt-0.5 text-[13px] text-slate-400 dark:text-slate-500">{row.value}</p>
                </div>
                <button className="rounded-full border border-[#D7E1F0] bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-[#F0F5FF] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  {row.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tab === "billing") {
      return (
        <div className="max-w-xl">
          <div className="mb-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Subscription</p>
            <h2 className="mt-1 font-['Sora'] text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Billing</h2>
            <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">Manage your plan and payment details.</p>
          </div>
          <div className="rounded-[24px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#15376D] p-6 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-blue-200">Current plan</p>
            <p className="mt-1 font-['Sora'] text-2xl font-semibold">Free</p>
            <p className="mt-2 text-[14px] leading-6 text-slate-300">Upgrade to unlock more event types, team seats, and advanced automations.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-[#0F1F3D] shadow-[0_12px_28px_rgba(255,255,255,0.14)] transition hover:brightness-105"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade plan
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return typeof document !== "undefined" ? createPortal(
    <div className={cn(
      "fixed inset-0 z-[300] transition-all duration-300",
      open ? "opacity-100" : "pointer-events-none opacity-0"
    )}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={cn(
        "absolute inset-y-0 right-0 flex w-full max-w-5xl overflow-hidden rounded-l-[32px] bg-[#F5F7FB] shadow-[−40px_0_120px_rgba(15,23,42,0.20)] transition-transform duration-300 dark:bg-[#0b1324]",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Left sidebar */}
        <div className="flex w-56 shrink-0 flex-col border-r border-[#DFE7F2] bg-white dark:border-white/10 dark:bg-[#0d1829]">
          <div className="flex items-center gap-3 border-b border-[#DFE7F2] px-5 py-5 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 text-[13px] font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Account settings</p>
            <nav className="space-y-1">
              {SETTINGS_TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onTabChange(item.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition",
                      active
                        ? "bg-[#EEF4FF] text-[#2563EB] dark:bg-[#132544] dark:text-[#8DB2FF]"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {active ? <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" /> : null}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User mini card at bottom */}
          <div className="border-t border-[#DFE7F2] p-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#7c3aed)] p-[2px]">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_20%,#5a3a28,#24160f_65%)] text-[11px] font-black text-[#f4c38a]">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">{user?.displayName || user?.username || "User"}</p>
                <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{user?.email || ""}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-8 py-10 md:px-12">
          {renderTabContent()}
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}

function App() {
  const previewMode = isLocalPreviewHost();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) return stored === "dark";
    } catch {}
    return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [pathname, setPathname] = useState(window.location.pathname);
  const [user, setUser] = useState(() => (previewMode ? getLocalPreviewUser() : readStoredUser()));
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("profile");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteError, setInviteError] = useState("");
  const profileTriggerRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const profileFileInputRef = useRef(null);
  const avatarPreviewObjectUrlRef = useRef("");
  const [profileMenuPosition, setProfileMenuPosition] = useState({ top: 88, right: 16, width: 296 });

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    const handleStorage = () => setUser(previewMode ? getLocalPreviewUser() : readStoredUser());
    const handleAuthInvalid = () => {
      if (previewMode) {
        setUser(getLocalPreviewUser());
        return;
      }
      setUser(null);
      window.location.replace("/login.html");
    };

    if (previewMode) {
      try {
        writeStoredUser(getLocalPreviewUser());
      } catch {}
      setUser(getLocalPreviewUser());
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("meetscheduling-auth-invalid", handleAuthInvalid);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("meetscheduling-auth-invalid", handleAuthInvalid);
    };
  }, [previewMode]);

  useEffect(() => {
    if (previewMode) return undefined;

    let cancelled = false;

    async function hydrateUserFromSession() {
      try {
        const payload = await apiFetch("/api/auth/me");
        if (cancelled || !payload?.user) return;
        syncUserState(payload.user);
      } catch (error) {
        if (error?.status !== 401 || cancelled) return;
        try {
          localStorage.removeItem(USER_KEY);
        } catch {}
        setUser(null);
      }
    }

    hydrateUserFromSession();

    return () => {
      cancelled = true;
    };
  }, [previewMode]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {}
  }, [dark]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedTrigger = profileTriggerRef.current?.contains(event.target);
      const clickedDropdown = profileDropdownRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedDropdown) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };
    const handleReposition = () => syncProfileMenuPosition();
    syncProfileMenuPosition();
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!inviteOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") setInviteOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [inviteOpen]);

  const route = parseDashboardRoute(pathname);
  const currentKey = route.sectionKey;
  const currentSection = genericSections[currentKey];
  const initials = useMemo(() => getInitials(user), [user]);
  const displayName = useMemo(() => getDisplayName(user), [user]);
  const userEmail = useMemo(() => getUserEmail(user), [user]);
  const avatarUrl = useMemo(() => avatarPreviewUrl || getUserAvatarUrl(user), [avatarPreviewUrl, user]);

  const syncProfileMenuPosition = () => {
    if (!profileTriggerRef.current || typeof window === "undefined") return;

    const rect = profileTriggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 0;
    const maxWidth = Math.min(296, Math.max(260, viewportWidth - 24));

    setProfileMenuPosition({
      top: Math.round(rect.bottom + 12),
      right: Math.max(12, Math.round(viewportWidth - rect.right)),
      width: maxWidth,
    });
  };

  useEffect(() => () => {
    if (avatarPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewObjectUrlRef.current);
    }
  }, []);

  const navigate = (key) => {
    const nextPath = key === defaultSectionKey ? "/dashboard" : `/dashboard/${key}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      setPathname(nextPath);
    }
    setProfileMenuOpen(false);
  };

  const navigateBuilder = (pageId = "home") => {
    const nextPath = `/dashboard/landing-page-builder/${pageId}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      setPathname(nextPath);
    }
    setProfileMenuOpen(false);
  };

  const showInviteFeedback = (message = "", error = "") => {
    setInviteMessage(message);
    setInviteError(error);
  };

  const showAvatarFeedback = (message = "", error = "") => {
    setAvatarMessage(message);
    setAvatarError(error);
  };

  const syncUserState = (nextUser) => {
    setUser(nextUser);
    writeStoredUser(nextUser);
  };

  const handleInviteSubmit = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      showInviteFeedback("", "Enter an email address before sending the invite.");
      return;
    }
    setInviteSubmitting(true);
    showInviteFeedback("", "");
    try {
      if (previewMode) {
        showInviteFeedback(`Preview mode: ${email} added as ${inviteRole}. No email is sent in preview.`, "");
        setInviteEmail("");
        setInviteRole("member");
        return;
      }
      const payload = await apiFetch("/api/workspace/members/invite", {
        method: "POST",
        body: { email, role: inviteRole },
      });
      if (payload?.emailStatus?.sent) {
        showInviteFeedback(`Invite email sent to ${email} as ${inviteRole}.`, "");
      } else {
        const reason = payload?.emailStatus?.reason
          ? ` ${payload.emailStatus.reason}.`
          : "";
        showInviteFeedback("", `Member added, but the invite email was not sent.${reason}`);
      }
      setInviteEmail("");
      setInviteRole("member");
    } catch (error) {
      showInviteFeedback("", error?.message || "Failed to send invite");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleMenuAction = (action) => {
    if (action === "profile-settings") {
      setSettingsTab("profile");
      setSettingsOpen(true);
      setProfileMenuOpen(false);
      return;
    }
    if (action === "account-settings") {
      setSettingsTab("security");
      setSettingsOpen(true);
      setProfileMenuOpen(false);
      return;
    }
    if (action === "billing") {
      setSettingsTab("billing");
      setSettingsOpen(true);
      setProfileMenuOpen(false);
      return;
    }
    if (action === "logout") {
      apiFetch("/api/auth/logout", { method: "POST" })
        .catch(() => null)
        .finally(() => {
          try {
            localStorage.removeItem(USER_KEY);
          } catch {}
          window.location.href = "/login.html";
        });
    }
  };

  const handleChangePhotoClick = () => {
    showAvatarFeedback("", "");
    profileFileInputRef.current?.click();
  };

  const handleProfilePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      showAvatarFeedback("", "Use PNG, JPG, WEBP, or GIF.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showAvatarFeedback("", "Image must be 5MB or smaller.");
      return;
    }

    const previousAvatar = getUserAvatarUrl(user);
    if (avatarPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewObjectUrlRef.current);
    }

    const previewObjectUrl = URL.createObjectURL(file);
    avatarPreviewObjectUrlRef.current = previewObjectUrl;
    setAvatarPreviewUrl(previewObjectUrl);
    setAvatarUploading(true);
    showAvatarFeedback("Uploading photo...", "");

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploadPayload = await apiFetch("/api/uploads/images", {
        method: "POST",
        body: { dataUrl },
      });
      if (!uploadPayload?.url) throw new Error("Photo upload failed.");

      let nextUser = {
        ...(user || {}),
        avatarUrl: uploadPayload.url,
      };

      const profilePayload = await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: { avatarUrl: uploadPayload.url },
      });
      if (!profilePayload?.user) throw new Error("Profile update failed.");
      nextUser = profilePayload.user;

      syncUserState(nextUser);
      if (avatarPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewObjectUrlRef.current);
        avatarPreviewObjectUrlRef.current = "";
      }
      setAvatarPreviewUrl("");
      showAvatarFeedback("Photo updated.", "");
    } catch (error) {
      if (avatarPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewObjectUrlRef.current);
        avatarPreviewObjectUrlRef.current = "";
      }
      setAvatarPreviewUrl("");
      if (user) {
        syncUserState({
          ...user,
          avatarUrl: previousAvatar,
        });
      }
      showAvatarFeedback("", error?.message || "Photo upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const renderPanel = () => {
    if (currentKey === "dashboard") return <OverviewPanel />;
    if (currentKey === "scheduling") return <SchedulingPanel initials={initials} displayName={displayName} avatarUrl={avatarUrl} />;
    if (currentKey === "meetings") return <MeetingsPanel />;
    if (currentKey === "availability") return <AvailabilityPanel />;
    if (currentKey === "contacts") return <ContactsPanel />;
    if (currentKey === "confirmation-calls") return <IvrSettingsPanel />;
    if (currentKey === "upgrade") return <UpgradePanel />;
    if (currentKey === "integrations") return <IntegrationsPanel />;
    if (currentKey === "account") return <AccountPanel user={user} onUserUpdate={syncUserState} />;
    return <GenericSectionPanel section={currentSection || genericSections.workflows} />;
  };

  return (
    <div className="min-h-screen bg-[#EFF3F9] p-3 text-slate-900 antialiased dark:bg-[#071122] dark:text-slate-50">
      <div className="flex h-[calc(100vh-24px)] overflow-hidden rounded-[34px] border border-[#D7E1F0] bg-white shadow-[0_40px_120px_rgba(15,31,61,0.12)] dark:border-white/10 dark:bg-[#0B1324]">
        <aside className={cn(
          "relative h-full shrink-0 overflow-visible rounded-tr-[32px] rounded-br-[32px] bg-gradient-to-b from-[#0f1f3d] to-[#0a1530] text-white shadow-[18px_0_60px_rgba(8,21,48,0.34)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/10" />
          <div className="pointer-events-none absolute left-5 top-0 h-20 w-[72%] rounded-b-[26px] bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -right-16 top-12 h-28 w-28 rounded-full bg-[#4C7CFF]/20 blur-3xl" />
          <div className="pointer-events-none absolute left-0 top-16 h-72 w-full bg-[radial-gradient(circle_at_0%_30%,rgba(76,124,255,0.18),transparent_48%)]" />

          <button type="button" onClick={() => setCollapsed((value) => !value)} className="absolute -right-[13px] top-[60px] z-30 flex h-[30px] w-[30px] items-center justify-center rounded-full border border-slate-200/85 bg-white text-[#0f1f3d] shadow-[0_8px_20px_rgba(15,31,61,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#9DB8FF] hover:bg-[#F7FAFF] hover:text-[#2563EB] hover:shadow-[0_12px_24px_rgba(37,99,235,0.16)]" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronLeft className={cn("h-[10px] w-[10px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", collapsed && "rotate-180")} />
          </button>

          <div className={collapsed ? "flex h-full flex-col px-0 py-5" : "flex h-full flex-col px-4 py-5"}>
            <div className={collapsed ? "flex justify-center" : "flex items-center gap-3 px-1"}>
              <div className="relative flex h-11 w-11 items-center justify-center">
                <div className="absolute left-0 h-8 w-8 rounded-full border-[5px] border-[#2563EB]" />
                <div className="absolute right-0 h-8 w-8 rounded-full border-[5px] border-white/95" />
              </div>
              <div className={cn("overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]", collapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100")}>
                <span className="font-['Sora'] text-[15px] font-semibold tracking-[-0.03em] text-white">Meet</span>
                <span className="font-['Sora'] text-[15px] font-semibold tracking-[-0.03em] text-[#76A2FF]">Scheduling</span>
              </div>
            </div>

            <div className="mt-9 space-y-3">
              <button type="button" className={cn("flex items-center justify-center overflow-hidden rounded-[22px] border border-[#4C7CFF]/40 bg-gradient-to-r from-[#2563EB] to-[#4F8BFF] text-white shadow-[0_20px_40px_rgba(37,99,235,0.32)] transition-all duration-300 hover:brightness-105", collapsed ? "mx-auto h-[58px] w-[58px] rounded-full" : "h-14 w-full gap-2 px-4")}>
                <Plus className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="text-[15px] font-semibold tracking-[-0.02em]">Create</span>}
              </button>

              <button type="button" onClick={() => navigateBuilder("home")} className={cn("flex items-center justify-center rounded-[20px] border border-[#79A6FF]/40 bg-white/[0.03] text-[#E6EEFF] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:bg-white/[0.06]", collapsed ? "mx-auto h-[58px] w-[58px]" : "h-14 w-full gap-2 px-4")}>
                <LayoutTemplate className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="text-[15px] font-semibold tracking-[-0.02em]">Landing Page</span>}
              </button>
            </div>

            <div className="mt-7 flex-1">
              {!collapsed && <p className="mb-3 px-2 text-[11px] uppercase tracking-[0.26em] text-slate-400">Main</p>}
              <nav className="space-y-2">
                {primaryNav.map((item) => (
                  <SidebarButton key={item.key} item={item} active={currentKey === item.key} collapsed={collapsed} onClick={() => navigate(item.key)} />
                ))}
              </nav>
              <div className="mt-8">
                {!collapsed && <p className="mb-3 px-2 text-[11px] uppercase tracking-[0.26em] text-slate-400">Insights</p>}
                <nav className="space-y-2">
                  {secondaryNav.map((item) => {
                    const active = currentKey === item.key;
                    const Icon = item.icon;
                    return (
                      <button key={item.key} type="button" onClick={() => navigate(item.key)} className={cn(
                        "group flex w-full items-center text-left transition-all duration-300",
                        collapsed
                          ? item.accent
                            ? "mx-auto h-[58px] w-[58px] justify-center rounded-[18px] border border-[#7FA8FF]/30 bg-white/[0.06] text-white"
                            : "mx-auto h-[54px] w-[54px] justify-center rounded-[18px] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                          : item.accent
                            ? "h-12 gap-3 rounded-2xl border border-[#7FA8FF]/30 bg-white/[0.06] px-3 text-white"
                            : active
                              ? "h-12 gap-3 rounded-2xl bg-white/10 px-3 text-white"
                              : "h-12 gap-3 rounded-2xl px-3 text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      )}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-current shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"><Icon className="h-[18px] w-[18px]" /></span>
                        {!collapsed && <span className="truncate text-[15px] font-medium tracking-[-0.02em]">{item.label}</span>}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex flex-1 flex-col overflow-hidden bg-[#F5F7FB] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[#08101d]">
          {route.type === "builder" ? (
            <main className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-[1680px]">
                <Suspense fallback={<LoadingPanel />}>
                  <LandingPageBuilder pageId={route.pageId} />
                </Suspense>
              </div>
            </main>
          ) : (
            <>
              <header className="border-b border-[#DFE7F2] bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-[#0B1324]/80">
                <div className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6">
                  <div className="min-w-[240px] flex-1">
                    <div className="flex h-14 items-center gap-3 rounded-[20px] border border-[#D7E1F0] bg-white px-4 shadow-[0_10px_30px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                      <Search className="h-5 w-5 text-slate-400" />
                      <input type="text" placeholder="Search meetings, contacts, workflows" className="w-full border-0 bg-transparent text-[15px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500" />
                      <div className="hidden h-8 items-center rounded-xl border border-[#D7E1F0] bg-[#F8FAFD] px-3 text-xs font-semibold text-slate-500 shadow-sm sm:flex dark:border-white/10 dark:bg-white/5 dark:text-slate-300">⌘K</div>
                    </div>
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <button type="button" onClick={() => { setInviteOpen(true); showInviteFeedback("", ""); }} className="inline-flex h-12 items-center gap-2 rounded-[18px] border border-white/60 bg-white/35 px-4 text-[14px] font-semibold text-slate-700 shadow-[0_12px_40px_rgba(37,99,235,0.10)] backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
                      <UserPlus className="h-4 w-4 text-[#2563EB]" />
                      <span className="hidden sm:inline">Invite user</span>
                    </button>

                    <button type="button" onClick={() => setDark((value) => !value)} className="inline-flex h-12 items-center gap-2 rounded-[18px] border border-[#D7E1F0] bg-white px-4 text-[14px] font-semibold text-slate-700 shadow-[0_10px_28px_rgba(15,31,61,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,31,61,0.08)] dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:shadow-none">
                      <MoonStar className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                      <span className="hidden sm:inline">{dark ? "Light mode" : "Dark mode"}</span>
                    </button>

                    <div className="relative z-[90]" ref={profileTriggerRef}>
                      <input
                        ref={profileFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleProfilePhotoChange}
                      />

                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={profileMenuOpen}
                        aria-controls="dashboard-account-menu"
                        onClick={() => {
                          showAvatarFeedback("", "");
                          setProfileMenuOpen((value) => !value);
                        }}
                        className="group flex items-center gap-2 rounded-full border border-white/60 bg-white/35 p-1 pr-2.5 shadow-[0_12px_34px_rgba(37,99,235,0.12)] backdrop-blur-2xl transition-all hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#3b82f6,#7c3aed)] p-[2px] shadow-[0_10px_24px_rgba(59,130,246,0.22)]">
                          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_20%,#5a3a28,#24160f_65%)] text-[15px] font-black tracking-tight text-[#f4c38a]">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                        </div>
                        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-700 transition-transform duration-200 dark:text-slate-200", profileMenuOpen && "rotate-180")} />
                      </button>
                    </div>
                  </div>
                </div>
              </header>

              <main className="flex-1 overflow-y-auto px-5 py-7 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                  <Suspense fallback={<LoadingPanel />}>
                    {renderPanel()}
                  </Suspense>
                </div>
              </main>
            </>
          )}
        </div>
      </div>

      {typeof document !== "undefined" && createPortal(
        <div
          id="dashboard-account-menu"
          ref={profileDropdownRef}
          role="menu"
          aria-hidden={!profileMenuOpen}
          style={{
            top: `${profileMenuPosition.top}px`,
            right: `${profileMenuPosition.right}px`,
            width: `${profileMenuPosition.width}px`,
          }}
          className={cn(
            "fixed z-[240] origin-top-right overflow-hidden rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,19,40,0.96),rgba(11,24,49,0.92))] text-white shadow-[0_24px_70px_rgba(4,10,24,0.42)] backdrop-blur-2xl transition-all duration-200",
            profileMenuOpen
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_36%,rgba(255,255,255,0.01))]" />
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative border-b border-white/8 px-3.5 py-3.5">
            <div className="flex items-start gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(135deg,#3b82f6,#7c3aed)] p-[2px] shadow-[0_8px_20px_rgba(37,99,235,0.18)]">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_20%,#5a3a28,#24160f_65%)] text-[15px] font-black tracking-tight text-[#f4c38a]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#0B1530] bg-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold tracking-[-0.02em] text-white">{displayName}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">{userEmail || "No email on file"}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleChangePhotoClick}
                    disabled={avatarUploading}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-slate-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {avatarUploading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    {avatarUploading ? "Uploading..." : "Change photo"}
                  </button>
                </div>
                {(avatarMessage || avatarError) ? (
                  <p
                    className={cn(
                      "mt-2 text-[11px]",
                      avatarError ? "text-rose-300" : "text-emerald-300"
                    )}
                  >
                    {avatarError || avatarMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative p-2">
            <div className="space-y-1">
              {accountMenuItems.map((item) => (
                <AccountMenuButton key={item.key} item={item} onAction={handleMenuAction} />
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
      <SettingsOverlay
        open={settingsOpen}
        tab={settingsTab}
        user={user}
        avatarUrl={avatarUrl}
        dark={dark}
        initials={initials}
        onClose={() => setSettingsOpen(false)}
        onTabChange={setSettingsTab}
        onUserUpdate={syncUserState}
        onChangePhoto={handleChangePhotoClick}
        avatarUploading={avatarUploading}
        avatarMessage={avatarMessage}
        avatarError={avatarError}
      />
      <InviteUserModal open={inviteOpen} dark={dark} email={inviteEmail} role={inviteRole} message={inviteMessage} error={inviteError} submitting={inviteSubmitting} onEmailChange={setInviteEmail} onRoleChange={setInviteRole} onClose={() => { setInviteOpen(false); showInviteFeedback("", ""); }} onSubmit={handleInviteSubmit} />
    </div>
  );
}

const rootNode = document.getElementById("dashboard-root");
if (rootNode) {
  createRoot(rootNode).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
