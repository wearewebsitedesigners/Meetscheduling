import React, { useState } from "react";
import { CheckCircle2, AlertCircle, User, AtSign, Mail } from "lucide-react";
import { apiFetch, cn } from "../shared.jsx";

function FieldRow({ label, hint, children }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start sm:gap-4">
      <div className="pt-2">
        <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function AccountPanel({ user, onUserUpdate }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const email = user?.email || "";

  const isDirty =
    displayName.trim() !== (user?.displayName || "").trim() ||
    username.trim() !== (user?.username || "").trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isDirty) return;

    const trimmedName = displayName.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg("Display name must be at least 2 characters.");
      return;
    }
    if (!trimmedUsername || trimmedUsername.length < 2) {
      setErrorMsg("Username must be at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedUsername)) {
      setErrorMsg("Username may only contain lowercase letters, numbers, and hyphens.");
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload = await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: { displayName: trimmedName, username: trimmedUsername },
      });

      if (!payload?.user) throw new Error("Unexpected response from server.");

      onUserUpdate?.(payload.user);
      setDisplayName(payload.user.displayName || trimmedName);
      setUsername(payload.user.username || trimmedUsername);
      setSuccessMsg("Profile updated successfully.");
    } catch (err) {
      setErrorMsg(err?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D7E1F0] bg-white px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2563EB] shadow-[0_8px_24px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:text-[#8DB2FF] dark:shadow-none">
          <User className="h-3.5 w-3.5" />
          Profile settings
        </div>
        <h1 className="font-['Sora'] text-[40px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[48px] dark:text-white">
          Your account
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-500 dark:text-slate-400">
          Update your display name and public username. Your username appears in your booking links.
        </p>
      </div>

      {/* Form card */}
      <div className="max-w-2xl rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-6">

            {/* Email — read-only */}
            <FieldRow label="Email" hint="Cannot be changed here">
              <div className="flex items-center gap-2 rounded-[14px] border border-[#E2EAF4] bg-[#F7FAFE] px-4 py-2.5 text-[14px] text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            </FieldRow>

            <hr className="border-[#EEF2FA] dark:border-white/10" />

            {/* Display name */}
            <FieldRow label="Display name" hint="Shown to invitees on booking pages">
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setSuccessMsg(""); setErrorMsg(""); }}
                minLength={2}
                maxLength={100}
                required
                className={cn(
                  "w-full rounded-[14px] border px-4 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition",
                  "border-[#D7E1F0] bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20",
                  "dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-[#8DB2FF] dark:focus:ring-[#8DB2FF]/20"
                )}
                placeholder="Your name"
              />
            </FieldRow>

            {/* Username */}
            <FieldRow label="Username" hint="Lowercase letters, numbers, hyphens only">
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.toLowerCase()); setSuccessMsg(""); setErrorMsg(""); }}
                  minLength={2}
                  maxLength={80}
                  required
                  className={cn(
                    "w-full rounded-[14px] border pl-10 pr-4 py-2.5 text-[14px] font-medium text-slate-900 outline-none transition",
                    "border-[#D7E1F0] bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20",
                    "dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-[#8DB2FF] dark:focus:ring-[#8DB2FF]/20"
                  )}
                  placeholder="your-username"
                />
              </div>
              {username && (
                <p className="mt-1.5 text-[12px] text-slate-400 dark:text-slate-500">
                  Booking link: meetscheduling.com/<span className="font-semibold text-slate-600 dark:text-slate-300">{username}</span>
                </p>
              )}
            </FieldRow>
          </div>

          {/* Feedback messages */}
          {successMsg && (
            <div className="mt-5 flex items-center gap-2 rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 text-[13px] font-semibold text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mt-5 flex items-center gap-2 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Save button */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-semibold transition",
                "bg-[#2563EB] text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:bg-[#1d4ed8]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
