import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Mail,
  PlugZap,
  RefreshCw,
  Users,
  Wallet,
  Workflow,
  X,
} from "lucide-react";
import { apiFetch, cn, GlassButton } from "../shared.jsx";

function currency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatDateTime(value, timezone, options = {}) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || "UTC",
    ...options,
  }).format(date);
}

function formatDateLabel(value, timezone) {
  if (!value) return "No upcoming date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone || "UTC",
  }).format(date);
}

function normalizeUpcomingBooking(row) {
  return {
    id: row.id,
    inviteeName: row.inviteeName || row.invitee_name || "Unknown invitee",
    inviteeEmail: row.inviteeEmail || row.invitee_email || "",
    eventTitle: row.eventTitle || row.event_type_title || row.eventTypeTitle || "Booking",
    notes: row.notes || row.inviteeNotes || "",
    visitorTimezone: row.visitorTimezone || row.inviteeTimezone || "UTC",
    startAtUtc: row.startAtUtc || row.start_at_utc || row.startAt || "",
    endAtUtc: row.endAtUtc || row.end_at_utc || row.endAt || "",
    startLocal: row.startLocal || { date: "", time: "" },
    endLocal: row.endLocal || { date: "", time: "" },
    durationMinutes: Number(row.durationMinutes || row.duration_minutes || 0),
    status: row.status || "confirmed",
    meetingLink: row.meetingLink || row.googleMeetLink || "",
    meetingLinkStatus: row.meetingLinkStatus || row.meeting_link_status || "",
    createdAt: row.createdAt || row.created_at || "",
  };
}

function BookingDetailDrawer({ booking, timezone, onClose }) {
  if (!booking) return null;

  const locationState =
    booking.meetingLinkStatus === "pending_calendar_connection"
      ? "Google Calendar not connected"
      : booking.meetingLinkStatus === "pending_generation"
        ? "Meet link pending"
        : booking.meetingLinkStatus === "generation_failed"
          ? "Meet link generation failed"
          : booking.meetingLink
            ? "Google Meet ready"
            : "No meeting link";

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-[#071122]/55 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[520px] flex-col overflow-hidden border-l border-white/40 bg-white/82 shadow-[-24px_0_90px_rgba(15,23,42,0.24)] backdrop-blur-3xl dark:border-white/10 dark:bg-[#0B1324]/92">
        <div className="flex items-start justify-between gap-4 border-b border-white/40 px-6 pb-5 pt-6 dark:border-white/10">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-300">
              <CalendarDays className="h-3.5 w-3.5" /> Booking details
            </div>
            <h3 className="font-['Sora'] text-[28px] font-bold tracking-[-0.03em] text-slate-900 dark:text-white">
              {booking.inviteeName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {booking.eventTitle} on {formatDateLabel(booking.startAtUtc, timezone)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/50 bg-white/40 text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition hover:bg-white/65 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/40 bg-white/55 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Invitee
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-white">{booking.inviteeName}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{booking.inviteeEmail}</div>
            </div>
            <div className="rounded-[22px] border border-white/40 bg-white/55 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Status
              </div>
              <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold capitalize text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {booking.status}
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/40 bg-white/55 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Meeting summary
            </div>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between gap-3"><span>Event type</span><span className="font-semibold text-slate-900 dark:text-white">{booking.eventTitle}</span></div>
              <div className="flex items-center justify-between gap-3"><span>Host timezone</span><span className="font-semibold text-slate-900 dark:text-white">{timezone}</span></div>
              <div className="flex items-center justify-between gap-3"><span>Invitee timezone</span><span className="font-semibold text-slate-900 dark:text-white">{booking.visitorTimezone}</span></div>
              <div className="flex items-center justify-between gap-3"><span>Starts</span><span className="font-semibold text-slate-900 dark:text-white">{booking.startLocal.time || formatDateTime(booking.startAtUtc, timezone)}</span></div>
              <div className="flex items-center justify-between gap-3"><span>Ends</span><span className="font-semibold text-slate-900 dark:text-white">{booking.endLocal.time || formatDateTime(booking.endAtUtc, timezone)}</span></div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/40 bg-white/55 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Meeting link
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{locationState}</div>
            {booking.meetingLink ? (
              <a
                href={booking.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:brightness-105"
              >
                Join Google Meet
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-white/40 bg-white/55 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Notes
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {booking.notes || "No notes were submitted with this booking."}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/40 bg-white/55 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Created
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {formatDateTime(booking.createdAt, timezone, { year: "numeric" }) || "Not available"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPanel() {
  const [overview, setOverview] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [timezone, setTimezone] = useState("UTC");
  const [displayName, setDisplayName] = useState("Workspace User");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");

  const loadOverview = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const mePayload = await apiFetch("/api/auth/me");
      const nextTimezone = mePayload?.user?.timezone || "UTC";
      const nextDisplayName =
        mePayload?.user?.displayName ||
        mePayload?.user?.username ||
        mePayload?.user?.email ||
        "Workspace User";
      setTimezone(nextTimezone);
      setDisplayName(nextDisplayName);

      const [overviewPayload, upcomingPayload] = await Promise.all([
        apiFetch("/api/dashboard/overview?limit=6"),
        apiFetch(`/api/dashboard/bookings/upcoming?timezone=${encodeURIComponent(nextTimezone)}&limit=8`),
      ]);

      setOverview(overviewPayload?.overview || null);
      setBookings((upcomingPayload?.bookings || []).map(normalizeUpcomingBooking));
    } catch (nextError) {
      setError(nextError?.message || "Failed to load dashboard overview");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => loadOverview({ silent: true }), 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadOverview({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const metrics = overview?.metrics || {};
  const recentContacts = overview?.recentContacts || [];
  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) || null,
    [bookings, selectedBookingId]
  );

  const cards = [
    {
      label: "Upcoming meetings",
      value: metrics.bookings?.upcoming || 0,
      note: `${metrics.bookings?.confirmed || 0} confirmed bookings total`,
      icon: CalendarDays,
      accent: "from-blue-600 to-cyan-500",
    },
    {
      label: "Contacts in CRM",
      value: metrics.contacts?.total || 0,
      note: `${metrics.contacts?.leads || 0} leads • ${metrics.contacts?.customers || 0} customers`,
      icon: Users,
      accent: "from-violet-600 to-fuchsia-500",
    },
    {
      label: "Active workflows",
      value: metrics.workflows?.active || 0,
      note: `${metrics.workflows?.draft || 0} draft sequences`,
      icon: Workflow,
      accent: "from-emerald-600 to-lime-500",
    },
    {
      label: "Revenue from paid invoices",
      value: currency(metrics.paidRevenue || 0),
      note: `${metrics.invoices?.paid || 0} invoices paid`,
      icon: Wallet,
      accent: "from-amber-500 to-orange-500",
    },
  ];

  if (loading) {
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
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
            <div className="h-[320px] rounded-[28px] bg-slate-200 dark:bg-white/10" />
            <div className="h-[320px] rounded-[28px] bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D7E1F0] bg-white px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2563EB] shadow-[0_8px_24px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:text-[#8DB2FF] dark:shadow-none">
            <CalendarDays className="h-3.5 w-3.5" />
            Live booking dashboard
          </div>
          <h1 className="font-['Sora'] text-[40px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[48px] dark:text-white">
            Welcome back, {displayName}
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-500 dark:text-slate-400">
            This is the live operational view for your scheduling business: upcoming meetings, contact flow, workflow health, and paid revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[22px] border border-[#D7E1F0] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <p className="text-[12px] uppercase tracking-[0.18em] text-slate-400">Host timezone</p>
            <p className="mt-1 flex items-center gap-2 text-[22px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">
              <Clock3 className="h-5 w-5 text-[#2563EB]" />
              {timezone}
            </p>
          </div>
          <GlassButton className="h-12 rounded-[18px] px-4" onClick={() => loadOverview({ silent: true })}>
            {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </GlassButton>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[24px] border border-rose-200/70 bg-rose-50/85 px-4 py-3 text-[14px] font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-[24px] border border-[#D7E1F0] bg-white p-5 shadow-[0_14px_40px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]", card.accent)}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[13px] font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-2 font-['Sora'] text-[30px] font-semibold tracking-[-0.05em] text-slate-900 dark:text-white">{card.value}</p>
              <p className="mt-2 text-[13px] text-slate-400 dark:text-slate-500">{card.note}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.82fr)]">
        <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Upcoming Meetings</p>
              <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">Nearest upcoming first. This list refreshes automatically.</p>
            </div>
            <a href="/dashboard/meetings" className="inline-flex items-center gap-2 rounded-full border border-[#D7E1F0] bg-[#F7FAFE] px-4 py-2 text-[13px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              View all
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-6 space-y-3">
            {bookings.length ? (
              bookings.map((booking) => (
                <div key={booking.id} className="rounded-[22px] border border-[#E2EAF4] bg-[#FBFCFE] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">{booking.inviteeName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
                        <span>{booking.inviteeEmail}</span>
                        <span>•</span>
                        <span>{booking.eventTitle}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-medium">
                        <span className="inline-flex items-center rounded-full border border-[#D7E1F0] bg-white px-3 py-1 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          {booking.startLocal.date || formatDateLabel(booking.startAtUtc, timezone)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-[#D7E1F0] bg-white px-3 py-1 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          {booking.startLocal.time || formatDateTime(booking.startAtUtc, timezone)}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-[#D7E1F0] bg-white px-3 py-1 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          {booking.visitorTimezone}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {booking.meetingLink ? (
                        <a
                          href={booking.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:brightness-105"
                        >
                          Join
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          Meet pending
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedBookingId(booking.id)}
                        className="inline-flex items-center rounded-full border border-[#D7E1F0] bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#D7E1F0] bg-[#FBFCFE] px-5 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                No upcoming bookings yet. Once someone books through your public link, it will show up here automatically.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Recent Contacts</p>
            <div className="mt-5 space-y-3">
              {recentContacts.length ? (
                recentContacts.map((contact) => (
                  <div key={contact.id} className="flex items-start gap-3 rounded-[20px] border border-[#E2EAF4] bg-[#FBFCFE] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2563EB] dark:bg-[#132544] dark:text-[#8DB2FF]">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">{contact.name}</div>
                      <div className="mt-1 truncate text-[13px] text-slate-500 dark:text-slate-400">{contact.email}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="inline-flex rounded-full bg-[#EEF4FF] px-2.5 py-1 font-semibold text-[#2557C7] dark:bg-[#132544] dark:text-[#8DB2FF]">{contact.type}</span>
                        {contact.company ? <span className="text-slate-400 dark:text-slate-500">{contact.company}</span> : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#D7E1F0] bg-[#FBFCFE] px-5 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                  No contacts yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#15376D] p-6 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)]">
            <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em]">Booking system health</p>
            <div className="mt-5 space-y-3 text-[14px] leading-6 text-slate-200">
              <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/10 px-4 py-3">
                <span className="inline-flex items-center gap-2"><PlugZap className="h-4 w-4 text-cyan-200" /> Integrations connected</span>
                <span className="font-semibold text-white">{metrics.integrations?.connected || 0}/{metrics.integrations?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/10 px-4 py-3">
                <span className="inline-flex items-center gap-2"><Workflow className="h-4 w-4 text-cyan-200" /> Active automations</span>
                <span className="font-semibold text-white">{metrics.workflows?.active || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/10 px-4 py-3">
                <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-cyan-200" /> Paid invoices</span>
                <span className="font-semibold text-white">{metrics.invoices?.paid || 0}</span>
              </div>
            </div>
            <div className="mt-5 rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 text-[13px] leading-6 text-slate-200">
              New public bookings are saved to the database, available slots respect weekly availability and buffers, and this dashboard refreshes on a timer to pick them up automatically.
            </div>
          </div>
        </div>
      </section>

      <BookingDetailDrawer booking={selectedBooking} timezone={timezone} onClose={() => setSelectedBookingId("")} />
    </>
  );
}
