import React, { useEffect, useState } from "react";
import {
  Phone,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  RotateCcw,
  TrendingUp,
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
  const colors = {
    blue: "from-[#3B82F6]/10 to-[#22D3EE]/10 border-[#3B82F6]/20",
    green: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
    amber: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
    slate: "from-slate-500/10 to-slate-400/10 border-slate-500/20",
  };
  const iconColors = {
    blue: "text-[#3B82F6]",
    green: "text-emerald-500",
    amber: "text-amber-500",
    slate: "text-slate-500",
  };
  return (
    <div className={cn("rounded-[20px] border bg-gradient-to-br p-5", colors[color])}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className={iconColors[color]} />
        <span className="text-[12px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div className="text-[28px] font-bold leading-none text-slate-800 dark:text-white">{value}</div>
      {note && (
        <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{note}</div>
      )}
    </div>
  );
}

function CallRow({ call }) {
  const statusColors = {
    confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    reschedule_requested: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    no_answer: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400",
    calling: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    pending: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  };
  const statusLabels = {
    confirmed: "Confirmed",
    reschedule_requested: "Reschedule",
    no_answer: "No Answer",
    calling: "Calling",
    pending: "Pending",
    failed: "Failed",
  };

  const date = call.created_at
    ? new Date(call.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#DFE7F3] bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
          <Phone size={14} className="text-slate-500" />
        </div>
        <div>
          <div className="text-[14px] font-medium text-slate-800 dark:text-white">
            {call.invitee_name || "Invitee"}
          </div>
          <div className="text-[12px] text-slate-500 dark:text-slate-400">{date}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {call.reschedule_reason && (
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
            {call.reschedule_reason}
          </span>
        )}
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium",
            statusColors[call.status] || statusColors.failed
          )}
        >
          {statusLabels[call.status] || call.status}
        </span>
      </div>
    </div>
  );
}

export default function IvrSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'error'

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const data = await apiFetch("/api/dashboard/ivr-settings");
      setSettings(data.settings);
      setRecentCalls(data.recentCalls || []);
      setUsage(data.usage || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    setSaveStatus(null);
    try {
      await apiFetch("/api/dashboard/ivr-settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus("error");
      setSettings(settings); // revert
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircle size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const month = new Date().toISOString().slice(0, 7);
  const totalCalls = usage?.total_calls ?? 0;
  const totalCost = usage ? `$${Number(usage.total_cost_usd || 0).toFixed(2)}` : "$0.00";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-[#3B82F6]">
          Premium Feature
        </div>
        <h1 className="mb-2 text-[32px] font-bold tracking-tight text-slate-800 dark:text-white">
          Confirmation Calls
        </h1>
        <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          Automatically call your invitee after booking. They press 1 to confirm or 2 to request a reschedule.
        </p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={PhoneCall} label="Calls this month" value={totalCalls} note={month} color="blue" />
          <StatCard icon={TrendingUp} label="Cost this month" value={totalCost} note="~$0.014/min" color="green" />
          <StatCard icon={CheckCircle2} label="Confirmed" value={recentCalls.filter((c) => c.status === "confirmed").length} note="Via IVR" color="green" />
          <StatCard icon={RotateCcw} label="Reschedule requests" value={recentCalls.filter((c) => c.status === "reschedule_requested").length} note="This period" color="amber" />
        </div>
      </div>

      {/* Settings Card */}
      <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
        <h2 className="mb-6 text-[20px] font-bold text-slate-800 dark:text-white">Settings</h2>

        {/* Enable toggle */}
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#DFE7F3] bg-slate-50/60 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div>
            <div className="text-[15px] font-semibold text-slate-800 dark:text-white">
              Enable confirmation calls
            </div>
            <div className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              Call invitee automatically after every new booking
            </div>
          </div>
          <Toggle
            checked={Boolean(settings?.enable_confirmation_calls)}
            onChange={() =>
              saveSettings({ enable_confirmation_calls: !settings?.enable_confirmation_calls })
            }
          />
        </div>

        {/* Call delay */}
        <div className={cn("transition-opacity", settings?.enable_confirmation_calls ? "opacity-100" : "opacity-40 pointer-events-none")}>
          <label className="mb-2 block text-[14px] font-medium text-slate-700 dark:text-slate-300">
            When to call
          </label>
          <select
            value={settings?.call_delay_minutes ?? 5}
            onChange={(e) => saveSettings({ call_delay_minutes: Number(e.target.value) })}
            className="w-full rounded-2xl border border-[#DFE7F3] bg-white px-4 py-3 text-[14px] text-slate-800 shadow-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          >
            {DELAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
            IVR will call the invitee's phone number this many minutes after booking is created.
            Make sure phone number is collected in your booking form.
          </p>
        </div>

        {/* Save status */}
        {saveStatus && (
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-medium",
              saveStatus === "saved"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            )}
          >
            {saveStatus === "saved" ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            {saveStatus === "saved" ? "Settings saved." : "Failed to save. Please try again."}
          </div>
        )}

        {saving && (
          <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-400">
            <LoaderCircle size={13} className="animate-spin" />
            Saving…
          </div>
        )}
      </div>

      {/* Recent Calls */}
      <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[20px] font-bold text-slate-800 dark:text-white">Recent Calls</h2>
          <GlassButton onClick={loadData}>
            <RotateCcw size={14} />
            Refresh
          </GlassButton>
        </div>

        {recentCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Phone size={32} className="mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-[14px] text-slate-500 dark:text-slate-400">
              No calls yet. Enable confirmation calls and make a test booking.
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

      {/* Setup reminder if Twilio not configured */}
      {!settings?.twilio_configured && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="text-[14px] font-semibold text-amber-800 dark:text-amber-300">
                Twilio not configured
              </div>
              <div className="mt-1 text-[13px] text-amber-700 dark:text-amber-400">
                Add <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">TWILIO_ACCOUNT_SID</code>,{" "}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">TWILIO_AUTH_TOKEN</code>, and{" "}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">TWILIO_PHONE_NUMBER</code> to your{" "}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">.env</code> file on the server and restart the app.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
