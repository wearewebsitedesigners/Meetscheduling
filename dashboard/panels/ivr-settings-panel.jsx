import React, { useEffect, useState } from "react";
import {
  Phone,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  RotateCcw,
  TrendingUp,
  Zap,
  Clock,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
} from "lucide-react";
import { apiFetch, cn, GlassButton, Toggle } from "../shared.jsx";

const DELAY_OPTIONS = [
  { value: 2, label: "2 minutes after booking" },
  { value: 5, label: "5 minutes after booking" },
  { value: 10, label: "10 minutes after booking" },
  { value: 15, label: "15 minutes after booking" },
  { value: 30, label: "30 minutes after booking" },
  { value: 60, label: "1 hour after booking" },
];

function StatCard({ icon: Icon, label, value, note, color = "blue" }) {
  const styles = {
    blue: {
      wrap: "bg-gradient-to-br from-[#EEF4FF] to-[#E0EEFF] border-[#C7DBFF] dark:from-[#1a2e52] dark:to-[#162444] dark:border-[#2a4a80]",
      icon: "bg-[#3B82F6]/15 text-[#2563EB] dark:bg-[#3B82F6]/20 dark:text-[#93BBFF]",
      value: "text-[#1e40af] dark:text-[#93BBFF]",
    },
    green: {
      wrap: "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-700/30",
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      value: "text-emerald-700 dark:text-emerald-400",
    },
    amber: {
      wrap: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-700/30",
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
      value: "text-amber-700 dark:text-amber-400",
    },
    purple: {
      wrap: "bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 dark:from-violet-900/20 dark:to-purple-900/20 dark:border-violet-700/30",
      icon: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
      value: "text-violet-700 dark:text-violet-400",
    },
  };
  const s = styles[color];
  return (
    <div className={cn("rounded-[22px] border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md", s.wrap)}>
      <div className={cn("mb-4 inline-flex h-9 w-9 items-center justify-center rounded-[14px]", s.icon)}>
        <Icon size={16} />
      </div>
      <div className={cn("text-[30px] font-bold leading-none tracking-tight", s.value)}>{value}</div>
      <div className="mt-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      {note && <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{note}</div>}
    </div>
  );
}

function StatusDot({ status }) {
  const map = {
    confirmed: "bg-emerald-400",
    reschedule_requested: "bg-amber-400",
    no_answer: "bg-slate-300 dark:bg-slate-600",
    calling: "bg-blue-400 animate-pulse",
    pending: "bg-slate-300 dark:bg-slate-600",
    failed: "bg-red-400",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", map[status] || "bg-slate-300")} />;
}

function CallRow({ call }) {
  const statusLabels = {
    confirmed: "Confirmed",
    reschedule_requested: "Reschedule",
    no_answer: "No Answer",
    calling: "Calling…",
    pending: "Pending",
    failed: "Failed",
  };
  const statusColors = {
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    reschedule_requested: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    no_answer: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
    calling: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    pending: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
    failed: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  };
  const iconMap = {
    confirmed: PhoneIncoming,
    reschedule_requested: RotateCcw,
    no_answer: PhoneMissed,
    calling: PhoneCall,
    pending: Clock,
    failed: PhoneOff,
  };
  const CallIcon = iconMap[call.status] || Phone;

  const date = call.created_at
    ? new Date(call.created_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-[#DFE7F3] bg-white px-4 py-3.5 transition-all duration-150 hover:border-[#C7DBFF] hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border", statusColors[call.status] || statusColors.failed)}>
        <CallIcon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-slate-800 dark:text-white truncate">
            {call.invitee_name || "Invitee"}
          </span>
          {call.call_duration_seconds > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {Math.round(call.call_duration_seconds / 60)}m {call.call_duration_seconds % 60}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[12px] text-slate-400 dark:text-slate-500">{date}</span>
          {call.reschedule_reason && (
            <>
              <span className="text-slate-200 dark:text-white/20">·</span>
              <span className="text-[12px] text-amber-600 dark:text-amber-400 truncate">{call.reschedule_reason}</span>
            </>
          )}
        </div>
      </div>
      <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold", statusColors[call.status] || statusColors.failed)}>
        {statusLabels[call.status] || call.status}
      </span>
    </div>
  );
}

export default function IvrSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await apiFetch("/api/dashboard/ivr-settings");
      setSettings(data.settings);
      setRecentCalls(data.recentCalls || []);
      setUsage(data.usage || null);
    } catch { } finally { setLoading(false); }
  }

  async function saveSettings(patch) {
    const prev = settings;
    setSettings({ ...settings, ...patch });
    setSaving(true);
    setSaveStatus(null);
    try {
      await apiFetch("/api/dashboard/ivr-settings", { method: "PATCH", body: JSON.stringify(patch) });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus("error");
      setSettings(prev);
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoaderCircle size={28} className="animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  const totalCalls = usage?.total_calls ?? 0;
  const totalCost = usage ? `$${Number(usage.total_cost_usd || 0).toFixed(2)}` : "$0.00";
  const confirmedCount = recentCalls.filter((c) => c.status === "confirmed").length;
  const rescheduleCount = recentCalls.filter((c) => c.status === "reschedule_requested").length;
  const enabled = Boolean(settings?.enable_confirmation_calls);

  return (
    <div className="space-y-6">

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-[34px] border border-[#C7DBFF] bg-gradient-to-br from-[#EEF4FF] via-white to-[#F0F9FF] p-8 shadow-[0_24px_60px_rgba(37,99,235,0.08)] dark:border-[#2a4a80] dark:from-[#0f1f3d] dark:via-[#0B1324] dark:to-[#081828]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#3B82F6]/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-[#22D3EE]/10 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C7DBFF] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#2563EB] shadow-sm dark:border-[#2a4a80] dark:bg-[#1a2e52] dark:text-[#93BBFF]">
              <Zap size={10} fill="currentColor" />
              Premium Feature
            </div>
            <h1 className="text-[34px] font-bold tracking-tight text-slate-900 dark:text-white">
              Confirmation Calls
            </h1>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
              Automatically call your invitee after booking. They press <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-300">1</kbd> to confirm or <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[12px] font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-300">2</kbd> to reschedule.
            </p>
          </div>

          {/* Live indicator */}
          <div className={cn(
            "flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-[13px] font-semibold transition-all duration-300",
            enabled
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
          )}>
            <span className={cn("h-2 w-2 rounded-full", enabled ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-slate-300 dark:bg-slate-600")} />
            {enabled ? "Active" : "Inactive"}
          </div>
        </div>

        {/* Stats grid */}
        <div className="relative mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={PhoneCall} label="Calls this month" value={totalCalls} note={new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} color="blue" />
          <StatCard icon={TrendingUp} label="Cost this month" value={totalCost} note="~$0.014 / min" color="green" />
          <StatCard icon={CheckCircle2} label="Confirmed via IVR" value={confirmedCount} note="Accepted bookings" color="green" />
          <StatCard icon={RotateCcw} label="Reschedule requests" value={rescheduleCount} note="Flagged for review" color="amber" />
        </div>
      </div>

      {/* Settings + recent calls side by side on large screens */}
      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">

        {/* Settings card */}
        <div className="relative overflow-hidden rounded-[34px] border border-[#DFE7F3] bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#3B82F6]/5 blur-2xl dark:bg-[#3B82F6]/10" />

          <div className="relative mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
              <PhoneCall size={15} className="text-white" />
            </div>
            <h2 className="text-[18px] font-bold text-slate-800 dark:text-white">Settings</h2>
          </div>

          {/* Enable toggle */}
          <div className={cn(
            "relative mb-5 overflow-hidden rounded-[20px] border p-5 transition-all duration-300",
            enabled
              ? "border-[#3B82F6]/25 bg-gradient-to-br from-[#EEF4FF] to-[#E6F0FF] shadow-[0_4px_20px_rgba(37,99,235,0.10)] dark:border-[#3B82F6]/20 dark:from-[#1a2e52]/60 dark:to-[#162444]/60"
              : "border-[#DFE7F3] bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]"
          )}>
            {enabled && (
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#3B82F6]/10 blur-xl" />
            )}
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <div className="text-[15px] font-bold text-slate-800 dark:text-white">
                  Enable confirmation calls
                </div>
                <div className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                  Auto-call invitee after every booking
                </div>
              </div>
              <Toggle
                checked={enabled}
                onChange={() => saveSettings({ enable_confirmation_calls: !enabled })}
              />
            </div>
            {enabled && (
              <div className="relative mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#2563EB] dark:text-[#93BBFF]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                Calls will fire automatically on new bookings
              </div>
            )}
          </div>

          {/* Call delay */}
          <div className={cn("space-y-3 transition-all duration-300", enabled ? "opacity-100" : "pointer-events-none opacity-35")}>
            <label className="block text-[13px] font-bold text-slate-600 dark:text-slate-300">
              When to call
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg bg-[#EEF4FF] dark:bg-[#1a2e52]">
                <Clock size={12} className="text-[#3B82F6]" />
              </div>
              <select
                value={settings?.call_delay_minutes ?? 5}
                onChange={(e) => saveSettings({ call_delay_minutes: Number(e.target.value) })}
                className="w-full appearance-none rounded-2xl border-2 border-[#DFE7F3] bg-white py-3.5 pl-11 pr-4 text-[14px] font-medium text-slate-800 outline-none transition-all focus:border-[#3B82F6] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              >
                {DELAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <p className="text-[12px] leading-relaxed text-slate-400 dark:text-slate-500">
              Make sure phone number is collected in your booking form.
            </p>
          </div>

          {/* Save feedback */}
          {saveStatus && (
            <div className={cn(
              "mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-semibold",
              saveStatus === "saved"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            )}>
              {saveStatus === "saved" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {saveStatus === "saved" ? "Settings saved." : "Failed to save. Try again."}
            </div>
          )}
          {saving && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-400">
              <LoaderCircle size={12} className="animate-spin" /> Saving…
            </div>
          )}

          {/* Twilio warning */}
          {!settings?.twilio_configured && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/10">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
                  <AlertCircle size={13} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-amber-800 dark:text-amber-300">Twilio not configured</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
                    Add <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">TWILIO_ACCOUNT_SID</code>, <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">TWILIO_AUTH_TOKEN</code>, and <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">TWILIO_PHONE_NUMBER</code> to your <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">.env</code> file.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Calls */}
        <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-slate-800 dark:text-white">Recent Calls</h2>
              <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">Last 50 call attempts</p>
            </div>
            <GlassButton onClick={loadData}>
              <RotateCcw size={13} />
              Refresh
            </GlassButton>
          </div>

          {recentCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                <PhoneCall size={22} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-300">No calls yet</p>
              <p className="mt-1 text-[13px] text-slate-400 dark:text-slate-500">
                Enable calls above and make a test booking.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call) => (
                <CallRow key={call.id} call={call} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
