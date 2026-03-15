import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Download,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { apiFetch, cn, GlassButton } from "../shared.jsx";

const tabs = ["Upcoming", "Past", "Date Range"];

function statusBadge(status) {
  const value = String(status || "").toLowerCase();
  if (value === "confirmed") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (value === "canceled") {
    return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
  }
  return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
}

function normalizeBooking(row) {
  return {
    id: row.id,
    inviteeName: row.inviteeName || row.invitee_name || "Unknown invitee",
    inviteeEmail: row.inviteeEmail || row.invitee_email || "",
    eventTitle: row.eventTitle || row.event_title || "Booking",
    notes: row.notes || row.inviteeNotes || "",
    visitorTimezone: row.visitorTimezone || row.inviteeTimezone || "UTC",
    startAtUtc: row.startAtUtc || row.start_at_utc || "",
    endAtUtc: row.endAtUtc || row.end_at_utc || "",
    startLocal: row.startLocal || { date: "", time: "" },
    endLocal: row.endLocal || { date: "", time: "" },
    durationMinutes: Number(row.durationMinutes || row.duration_minutes || 0),
    locationType: row.locationType || row.location_type || "google_meet",
    meetingLink: row.meetingLink || row.googleMeetLink || "",
    meetingLinkStatus: row.meetingLinkStatus || row.meeting_link_status || "",
    status: row.status || "confirmed",
    cancelReason: row.cancelReason || row.cancel_reason || "",
    createdAt: row.createdAt || row.created_at || "",
  };
}

function formatDateLabel(value, timezone) {
  if (!value) return "No date";
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

function formatCreated(value, timezone) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || "UTC",
  }).format(date);
}

function MeetingDetails({ booking, timezone, canceling, onCancel }) {
  const isFuture = new Date(booking.startAtUtc).getTime() > Date.now();
  const canCancel = booking.status === "confirmed" && isFuture;

  return (
    <div className="grid gap-5 border-t border-white/30 bg-gradient-to-br from-white/70 to-blue-50/40 px-6 py-7 lg:grid-cols-[260px_minmax(0,1fr)] dark:border-white/10 dark:from-white/[0.05] dark:to-[#10213f]">
      <div>
        {canCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={canceling}
            className="mb-8 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-6 text-[15px] font-medium text-white shadow-[0_12px_30px_rgba(15,23,42,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 dark:from-[#111827] dark:to-[#1f2937]"
          >
            {canceling ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel booking
          </button>
        ) : null}

        <div className="space-y-3 text-[15px]">
          {booking.meetingLink ? (
            <a
              href={booking.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center gap-3 rounded-2xl border border-white/30 bg-white/60 px-4 py-3 font-medium text-slate-700 backdrop-blur-xl transition hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4 text-blue-600" /> Join meeting
            </a>
          ) : null}

          <div className="flex w-full items-center gap-3 rounded-2xl border border-white/30 bg-white/60 px-4 py-3 font-medium text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <RotateCcw className="h-4 w-4 text-blue-600" />
            {booking.meetingLinkStatus === "pending_calendar_connection"
              ? "Google Calendar not connected"
              : booking.meetingLinkStatus === "pending_generation"
                ? "Meet link generation pending"
                : booking.meetingLinkStatus === "generation_failed"
                  ? "Meet link generation failed"
                  : booking.locationType === "google_meet"
                    ? "Google Meet ready"
                    : booking.locationType.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/30 bg-white/65 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Invitee</div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">{booking.inviteeName}</div>
              <div className="mt-1 text-slate-500 dark:text-slate-400">{booking.inviteeEmail}</div>
            </div>
          </div>
          <div className="rounded-[24px] border border-white/30 bg-white/65 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Meeting summary</div>
            <div className="font-semibold text-slate-900 dark:text-white">{booking.eventTitle}</div>
            <div className="mt-1 text-slate-500 dark:text-slate-400">{booking.durationMinutes} min • {booking.startLocal.time} - {booking.endLocal.time}</div>
            <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">Host timezone: {timezone}</div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/30 bg-white/65 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Invitee timezone</div>
            <div className="text-slate-700 dark:text-slate-300">{booking.visitorTimezone || "UTC"}</div>
          </div>
          <div className="rounded-[24px] border border-white/30 bg-white/65 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Status</div>
            <div
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize",
                statusBadge(booking.status)
              )}
            >
              {booking.status}
            </div>
            {booking.cancelReason ? (
              <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">Reason: {booking.cancelReason}</div>
            ) : null}
          </div>
        </div>

        {booking.notes ? (
          <div className="rounded-[24px] border border-white/30 bg-white/65 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Notes</div>
            <p className="text-slate-700 dark:text-slate-300">{booking.notes}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 rounded-[24px] border border-white/30 bg-white/65 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-white/[0.05]">
          <div>
            <div className="inline-flex items-center gap-2 font-semibold text-blue-700 dark:text-[#8DB2FF]">
              <CalendarDays className="h-4 w-4" /> Dashboard booking record
            </div>
            <div className="mt-2 text-slate-400 dark:text-slate-500">Created {formatCreated(booking.createdAt, timezone)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking, timezone, expanded, onToggle, onCancel, canceling }) {
  return (
    <div className="border-t border-white/30 dark:border-white/10">
      <div className="grid grid-cols-1 gap-5 px-6 py-6 xl:grid-cols-[220px_minmax(260px,1fr)_180px_140px] xl:items-center">
        <div className="text-[15px] font-medium text-slate-700 dark:text-slate-200">{booking.startLocal.time} - {booking.endLocal.time}</div>

        <div>
          <div className="text-[16px] font-semibold text-slate-900 dark:text-white">{booking.inviteeName}</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{booking.inviteeEmail}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/30 bg-white/60 px-3 py-1 text-[12px] font-medium text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{booking.eventTitle}</span>
            <span className="inline-flex items-center rounded-full border border-white/30 bg-white/60 px-3 py-1 text-[12px] font-medium text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{booking.visitorTimezone}</span>
          </div>
        </div>

        <div className="text-[14px] text-slate-600 dark:text-slate-300">{booking.durationMinutes} min</div>

        <div className="flex items-center justify-between gap-3 xl:justify-end">
          <span className={cn("inline-flex rounded-full px-3 py-1 text-[12px] font-semibold capitalize", statusBadge(booking.status))}>
            {booking.status}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 text-[14px] font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            Details
            <ChevronDown className={cn("h-5 w-5 transition-transform duration-300", expanded && "rotate-180")} />
          </button>
        </div>
      </div>

      {expanded ? (
        <MeetingDetails booking={booking} timezone={timezone} canceling={canceling} onCancel={onCancel} />
      ) : null}
    </div>
  );
}

export default function MeetingsPanel() {
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timezone, setTimezone] = useState("UTC");
  const [displayName, setDisplayName] = useState("Workspace User");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedMeetingId, setExpandedMeetingId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingId, setCancelingId] = useState("");

  const loadBookings = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const mePayload = await apiFetch("/api/auth/me");
      const nextTimezone = mePayload?.user?.timezone || timezone || "UTC";
      const nextDisplayName = mePayload?.user?.displayName || mePayload?.user?.username || mePayload?.user?.email || "Workspace User";
      setTimezone(nextTimezone);
      setDisplayName(nextDisplayName);

      let nextBookings = [];
      if (activeTab === "Upcoming") {
        const payload = await apiFetch(`/api/dashboard/bookings/upcoming?timezone=${encodeURIComponent(nextTimezone)}&limit=100`);
        nextBookings = (payload?.bookings || []).map(normalizeBooking);
      } else {
        const params = new URLSearchParams();
        params.set("timezone", nextTimezone);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (activeTab === "Date Range") {
          if (dateRange.from) params.set("from", dateRange.from);
          if (dateRange.to) params.set("to", dateRange.to);
        }
        const payload = await apiFetch(`/api/dashboard/bookings?${params.toString()}`);
        nextBookings = (payload?.bookings || []).map(normalizeBooking);
        const now = Date.now();
        if (activeTab === "Past") {
          nextBookings = nextBookings.filter((booking) => new Date(booking.startAtUtc).getTime() < now);
          nextBookings.sort((a, b) => new Date(b.startAtUtc).getTime() - new Date(a.startAtUtc).getTime());
        } else {
          nextBookings.sort((a, b) => new Date(a.startAtUtc).getTime() - new Date(b.startAtUtc).getTime());
        }
      }

      setBookings(nextBookings);
      setExpandedMeetingId((current) => (current && nextBookings.some((item) => item.id === current) ? current : nextBookings[0]?.id || ""));
    } catch (loadError) {
      setError(loadError.message || "Failed to load meetings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [activeTab, statusFilter, dateRange.from, dateRange.to]);

  useEffect(() => {
    const intervalId = window.setInterval(() => loadBookings({ silent: true }), 60000);
    const handleFocus = () => loadBookings({ silent: true });
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeTab, statusFilter, dateRange.from, dateRange.to]);

  const visibleBookings = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return bookings;
    return bookings.filter((booking) =>
      `${booking.inviteeName} ${booking.inviteeEmail} ${booking.eventTitle}`
        .toLowerCase()
        .includes(needle)
    );
  }, [bookings, search]);

  const groupedBookings = useMemo(() => {
    const groups = new Map();
    visibleBookings.forEach((booking) => {
      const label = booking.startLocal?.date || formatDateLabel(booking.startAtUtc, timezone);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(booking);
    });
    return Array.from(groups.entries()).map(([date, rows]) => ({ date, bookings: rows }));
  }, [visibleBookings, timezone]);

  const exportCsv = () => {
    const rows = [
      ["Invitee", "Email", "Event type", "Date", "Time", "Status", "Meet link"],
      ...visibleBookings.map((booking) => [
        booking.inviteeName,
        booking.inviteeEmail,
        booking.eventTitle,
        booking.startLocal?.date || "",
        booking.startLocal?.time || "",
        booking.status,
        booking.meetingLink || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meetings-${activeTab.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCancelBooking = async (bookingId) => {
    setCancelingId(bookingId);
    setError("");
    setNotice("");
    try {
      const payload = await apiFetch(`/api/dashboard/bookings/${bookingId}/cancel`, {
        method: "POST",
        body: { reason: "Canceled from dashboard" },
      });
      const nextBooking = normalizeBooking(payload?.booking || {});
      setBookings((current) => current.map((item) => (item.id === nextBooking.id ? nextBooking : item)));
      setNotice("Booking canceled.");
    } catch (cancelError) {
      setError(cancelError.message || "Failed to cancel booking.");
    } finally {
      setCancelingId("");
    }
  };

  const summary = useMemo(() => {
    const confirmed = visibleBookings.filter((item) => item.status === "confirmed").length;
    const canceled = visibleBookings.filter((item) => item.status === "canceled").length;
    return {
      total: visibleBookings.length,
      confirmed,
      canceled,
    };
  }, [visibleBookings]);

  if (loading) {
    return (
      <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-12 w-72 rounded-2xl bg-slate-200 dark:bg-white/10" />
          <div className="h-64 rounded-[28px] bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-[#DFE7F3] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.13),_transparent_24%),linear-gradient(180deg,#eef4ff_0%,#edf2f7_35%,#f7fbff_100%)] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-6 xl:p-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.12),_transparent_24%),linear-gradient(180deg,#081120_0%,#0b1424_35%,#0d182b_100%)]">
      <div className="pointer-events-none absolute -left-20 top-14 h-72 w-72 rounded-full bg-blue-400/12 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/50 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2563EB] shadow-[0_8px_24px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:text-[#8DB2FF] dark:shadow-none">
              <CircleHelp className="h-3.5 w-3.5" /> Meeting operations
            </div>
            <h1 className="font-['Sora'] text-[40px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[48px] dark:text-white">Meetings</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-500 dark:text-slate-400">Track upcoming bookings, review past calls, and handle reschedules or cancellations without leaving the dashboard.</p>
          </div>

          <div className="rounded-[22px] border border-[#D7E1F0] bg-white px-5 py-4 shadow-[0_14px_40px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <p className="text-[12px] uppercase tracking-[0.18em] text-slate-400">Host view</p>
            <p className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">{displayName}</p>
          </div>
        </div>

        {(notice || error) && (
          <div className={cn(
            "mb-6 flex items-start gap-3 rounded-[24px] border px-4 py-4 text-sm shadow-[0_12px_30px_rgba(15,23,42,0.06)]",
            error
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          )}>
            {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{error || notice}</span>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Visible bookings", value: String(summary.total), note: `${activeTab} list` },
            { label: "Confirmed", value: String(summary.confirmed), note: "Currently active" },
            { label: "Canceled", value: String(summary.canceled), note: "Historical status" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[24px] border border-[#D7E1F0] bg-white p-5 shadow-[0_14px_40px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="mt-3 font-['Sora'] text-[32px] font-semibold tracking-[-0.05em] text-slate-900 dark:text-white">{stat.value}</p>
              <p className="mt-2 text-[13px] text-slate-400 dark:text-slate-500">{stat.note}</p>
            </div>
          ))}
        </section>

        <div className="mt-6 overflow-visible rounded-[32px] border border-white/30 bg-white/45 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-4 border-b border-white/30 px-6 py-5 lg:flex-row lg:items-center lg:justify-between dark:border-white/10">
            <div className="flex flex-wrap items-center gap-3 lg:gap-5">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative rounded-full px-4 py-2.5 text-[14px] font-medium transition-all",
                    activeTab === tab
                      ? "bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:bg-[#132544] dark:text-white"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <GlassButton onClick={exportCsv} className="h-11 rounded-full px-5">
                <Download className="h-4 w-4" /> Export
              </GlassButton>
              <GlassButton onClick={() => loadBookings({ silent: true })} className="h-11 rounded-full px-5">
                {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
              </GlassButton>
            </div>
          </div>

          <div className="grid gap-4 border-b border-white/30 bg-white/30 px-6 py-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px] dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/55 px-4 py-3 text-[14px] text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invitees or event types"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-white/30 bg-white/55 px-4 pr-10 text-sm font-medium text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                <option value="all">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="canceled">Canceled</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <input
              type="date"
              value={dateRange.from}
              onChange={(event) => setDateRange((current) => ({ ...current, from: event.target.value }))}
              className={cn(
                "h-12 rounded-2xl border border-white/30 bg-white/55 px-4 text-sm font-medium text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
                activeTab !== "Date Range" && "opacity-50"
              )}
              disabled={activeTab !== "Date Range"}
            />

            <input
              type="date"
              value={dateRange.to}
              onChange={(event) => setDateRange((current) => ({ ...current, to: event.target.value }))}
              className={cn(
                "h-12 rounded-2xl border border-white/30 bg-white/55 px-4 text-sm font-medium text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
                activeTab !== "Date Range" && "opacity-50"
              )}
              disabled={activeTab !== "Date Range"}
            />
          </div>

          <div>
            {groupedBookings.length ? groupedBookings.map((group) => (
              <div key={group.date}>
                <div className="border-t border-white/30 bg-gradient-to-r from-slate-100/80 via-white/70 to-slate-100/80 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.05] dark:to-white/[0.04]">
                  <div className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">{group.date}</div>
                </div>
                {group.bookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    timezone={timezone}
                    expanded={expandedMeetingId === booking.id}
                    onToggle={() => setExpandedMeetingId((current) => (current === booking.id ? "" : booking.id))}
                    onCancel={() => handleCancelBooking(booking.id)}
                    canceling={cancelingId === booking.id}
                  />
                ))}
              </div>
            )) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2563EB] dark:bg-[#132544] dark:text-[#8DB2FF]">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">No meetings found</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">Adjust the search, date range, or status filters to find the bookings you need.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
