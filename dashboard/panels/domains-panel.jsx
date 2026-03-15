import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { apiFetch, cn, copyToClipboard, GlassButton } from "../shared.jsx";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  dns_invalid: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  verifying: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
  verified: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  ssl_pending: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  failed: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

const SSL_STYLES = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  issued: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  failed: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

function formatLabel(value = "") {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function typeLabel(value) {
  return value === "landing_page" ? "Landing page" : "Booking page";
}

function StatusBadge({ value, variant = "status" }) {
  const theme = variant === "ssl" ? SSL_STYLES : STATUS_STYLES;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-[12px] font-semibold",
        theme[value] || "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
      )}
    >
      {formatLabel(value)}
    </span>
  );
}

function SelectField({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-[50px] w-full appearance-none rounded-2xl border border-white/50 bg-white/55 px-4 pr-11 text-[15px] text-slate-800 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)] focus:border-blue-300 focus:bg-white/75 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-blue-400/40"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      </div>
    </label>
  );
}

function AddDomainModal({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  submitting,
  targets,
}) {
  if (!open) return null;

  const pageOptions = value.targetType === "landing_page"
    ? targets.landingPages
    : targets.bookingPages;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#071122]/55 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[620px] overflow-hidden rounded-[30px] border border-white/40 bg-white/75 shadow-[0_24px_90px_rgba(15,23,42,0.28)] backdrop-blur-3xl dark:border-white/10 dark:bg-[#0B1324]/88">
        <div className="relative border-b border-white/40 px-6 pb-5 pt-6 dark:border-white/10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/15 dark:text-blue-300">
            <Globe2 className="h-3.5 w-3.5" />
            Custom domain
          </div>
          <h3 className="font-['Sora'] text-[30px] font-bold tracking-[-0.03em] text-slate-900 dark:text-white">
            Add custom domain
          </h3>
          <p className="mt-2 text-[14px] leading-6 text-slate-600 dark:text-slate-400">
            Point a branded domain to one of your landing pages or booking pages without changing the current app design.
          </p>
        </div>

        <div className="relative grid gap-5 px-6 py-6">
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Domain
            </span>
            <input
              type="text"
              value={value.domain}
              onChange={(event) => onChange({ domain: event.target.value })}
              placeholder="book.clientcompany.com"
              className="h-[52px] w-full rounded-2xl border border-white/50 bg-white/55 px-4 py-3 text-[15px] text-slate-800 outline-none shadow-[0_8px_24px_rgba(15,23,42,0.05)] placeholder:text-slate-400 focus:border-blue-300 focus:bg-white/75 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400/40"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <SelectField
              label="Page type"
              value={value.targetType}
              onChange={(targetType) =>
                onChange({
                  targetType,
                  targetId:
                    targetType === "landing_page"
                      ? targets.landingPages[0]?.id || ""
                      : targets.bookingPages[0]?.id || "",
                })
              }
              options={[
                { value: "landing_page", label: "Landing page" },
                { value: "booking_page", label: "Booking page" },
              ]}
            />

            <SelectField
              label="Connected page"
              value={value.targetId}
              onChange={(targetId) => onChange({ targetId })}
              options={
                pageOptions.length
                  ? pageOptions.map((item) => ({
                      value: item.id,
                      label: item.title,
                    }))
                  : [{ value: "", label: "No pages available" }]
              }
              disabled={!pageOptions.length}
            />
          </div>
        </div>

        <div className="relative flex items-center justify-end gap-3 border-t border-white/40 px-6 py-5 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-[15px] font-medium text-slate-600 transition hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-2.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {submitting ? "Connecting..." : "Connect domain"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DomainsPanel() {
  const [domains, setDomains] = useState([]);
  const [targets, setTargets] = useState({ landingPages: [], bookingPages: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [form, setForm] = useState({
    domain: "",
    targetType: "landing_page",
    targetId: "",
  });
  const [mappingDraft, setMappingDraft] = useState({
    targetType: "landing_page",
    targetId: "",
  });

  const activeDomain = useMemo(
    () => domains.find((domain) => domain.id === selectedDomainId) || null,
    [domains, selectedDomainId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const [domainsPayload, targetsPayload] = await Promise.all([
          apiFetch("/api/domains"),
          apiFetch("/api/domains/targets"),
        ]);
        if (cancelled) return;
        const nextDomains = domainsPayload?.domains || [];
        setDomains(nextDomains);
        setTargets({
          landingPages: targetsPayload?.landingPages || [],
          bookingPages: targetsPayload?.bookingPages || [],
        });
        setSelectedDomainId((current) => current || nextDomains[0]?.id || "");
      } catch (nextError) {
        if (cancelled) return;
        setError(nextError?.message || "Failed to load custom domains");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    setForm((current) => ({
      ...current,
      targetId:
        current.targetId ||
        (current.targetType === "landing_page"
          ? targets.landingPages[0]?.id || ""
          : targets.bookingPages[0]?.id || ""),
    }));
  }, [modalOpen, targets]);

  useEffect(() => {
    if (!activeDomain) return;
    setMappingDraft({
      targetType: activeDomain.targetType,
      targetId:
        activeDomain.targetType === "landing_page"
          ? activeDomain.landingPageId
          : activeDomain.eventTypeId,
    });
  }, [activeDomain]);

  async function reloadDomains() {
    const payload = await apiFetch("/api/domains");
    const nextDomains = payload?.domains || [];
    setDomains(nextDomains);
    setSelectedDomainId((current) => {
      if (current && nextDomains.some((domain) => domain.id === current)) return current;
      return nextDomains[0]?.id || "";
    });
  }

  function showFeedback(nextMessage = "", nextError = "") {
    setMessage(nextMessage);
    setError(nextError);
  }

  async function handleCreateDomain() {
    try {
      setSubmitting(true);
      showFeedback("", "");
      const payload = {
        domain: form.domain,
        targetType: form.targetType,
        landingPageId: form.targetType === "landing_page" ? form.targetId : "",
        eventTypeId: form.targetType === "booking_page" ? form.targetId : "",
      };
      const response = await apiFetch("/api/domains", {
        method: "POST",
        body: payload,
      });
      await reloadDomains();
      setSelectedDomainId(response?.domain?.id || "");
      setModalOpen(false);
      setForm({
        domain: "",
        targetType: "landing_page",
        targetId: targets.landingPages[0]?.id || "",
      });
      showFeedback("Custom domain added. Update DNS and run verification when ready.", "");
    } catch (nextError) {
      showFeedback("", nextError?.message || "Failed to add custom domain");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyDomain(domainId) {
    try {
      setVerifyingId(domainId);
      showFeedback("", "");
      const response = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/verify`, {
        method: "POST",
      });
      await reloadDomains();
      const domainStatus = response?.domain?.status ? formatLabel(response.domain.status) : "updated";
      showFeedback(`Verification complete. Domain status is now ${domainStatus}.`, "");
    } catch (nextError) {
      showFeedback("", nextError?.message || "Verification failed");
    } finally {
      setVerifyingId("");
    }
  }

  async function handleDeleteDomain(domainId) {
    if (!window.confirm("Remove this custom domain mapping?")) return;
    try {
      setDeletingId(domainId);
      showFeedback("", "");
      await apiFetch(`/api/domains/${encodeURIComponent(domainId)}`, {
        method: "DELETE",
      });
      await reloadDomains();
      showFeedback("Custom domain removed.", "");
    } catch (nextError) {
      showFeedback("", nextError?.message || "Failed to remove custom domain");
    } finally {
      setDeletingId("");
    }
  }

  async function handleSaveMapping() {
    if (!activeDomain) return;
    try {
      setSavingId(activeDomain.id);
      showFeedback("", "");
      const payload = {
        targetType: mappingDraft.targetType,
        landingPageId: mappingDraft.targetType === "landing_page" ? mappingDraft.targetId : "",
        eventTypeId: mappingDraft.targetType === "booking_page" ? mappingDraft.targetId : "",
      };
      await apiFetch(`/api/domains/${encodeURIComponent(activeDomain.id)}`, {
        method: "PATCH",
        body: payload,
      });
      await reloadDomains();
      showFeedback("Connected page updated.", "");
    } catch (nextError) {
      showFeedback("", nextError?.message || "Failed to update domain mapping");
    } finally {
      setSavingId("");
    }
  }

  async function handleCopyDnsValue(domain) {
    const copied = await copyToClipboard(domain?.dnsInstructions?.value || domain?.dnsTarget || "");
    if (copied) {
      setCopiedId(domain.id);
      window.setTimeout(() => setCopiedId(""), 1500);
    }
  }

  const activeMappingOptions =
    mappingDraft.targetType === "landing_page" ? targets.landingPages : targets.bookingPages;

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D7E1F0] bg-white px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2563EB] shadow-[0_8px_24px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:text-[#8DB2FF] dark:shadow-none">
            <Globe2 className="h-3.5 w-3.5" />
            Branded delivery
          </div>
          <h1 className="font-['Sora'] text-[40px] font-semibold tracking-[-0.05em] text-slate-900 sm:text-[48px] dark:text-white">
            Custom domains
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-500 dark:text-slate-400">
            Connect branded domains to booking pages or landing pages so clients see your URL instead of the platform URL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <GlassButton onClick={() => setModalOpen(true)} className="h-12 rounded-full px-5 text-[14px] font-semibold">
            <Plus className="h-4 w-4" />
            Add custom domain
          </GlassButton>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Connected domains", value: String(domains.length) },
          { label: "Active domains", value: String(domains.filter((domain) => domain.status === "active").length) },
          { label: "Pending verification", value: String(domains.filter((domain) => ["pending", "verifying", "dns_invalid"].includes(domain.status)).length) },
          { label: "SSL ready", value: String(domains.filter((domain) => domain.sslStatus === "issued").length) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[24px] border border-[#D7E1F0] bg-white p-5 shadow-[0_14px_40px_rgba(15,31,61,0.05)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="mt-3 font-['Sora'] text-[32px] font-semibold tracking-[-0.05em] text-slate-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </section>

      {(message || error) && (
        <div className={cn(
          "mt-6 rounded-[22px] border px-4 py-3 text-[14px] font-medium",
          error
            ? "border-rose-200/70 bg-rose-50/85 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
            : "border-emerald-200/70 bg-emerald-50/85 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
        )}>
          {error || message}
        </div>
      )}

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-0 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3EAF5] px-6 py-5 dark:border-white/10">
            <div>
              <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Domain list</p>
              <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">Connect multiple branded domains and map each one to a specific public experience.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-3 px-6 py-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-[20px] bg-slate-100 dark:bg-white/10" />
              ))}
            </div>
          ) : !domains.length ? (
            <div className="px-6 py-10">
              <div className="rounded-[24px] border border-dashed border-[#D7E1F0] bg-[#FBFCFE] px-6 py-8 text-center dark:border-white/10 dark:bg-white/[0.04]">
                <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">No custom domains connected yet</p>
                <p className="mx-auto mt-2 max-w-xl text-[14px] leading-7 text-slate-500 dark:text-slate-400">
                  Connect your own domain to make your booking or landing page fully branded.
                </p>
                <GlassButton onClick={() => setModalOpen(true)} className="mt-5 h-11 rounded-full px-5 text-[14px] font-semibold">
                  <Plus className="h-4 w-4" />
                  Add custom domain
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-[#F8FAFD] dark:bg-white/[0.04]">
                  <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4">Domain</th>
                    <th className="px-4 py-4">Connected Page</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">SSL</th>
                    <th className="px-4 py-4">Created</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain) => (
                    <tr
                      key={domain.id}
                      className={cn(
                        "border-t border-[#E3EAF5] transition dark:border-white/10",
                        selectedDomainId === domain.id ? "bg-[#F9FBFF] dark:bg-white/[0.06]" : "hover:bg-[#FBFCFE] dark:hover:bg-white/[0.04]"
                      )}
                    >
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedDomainId(domain.id)}
                          className="text-left"
                        >
                          <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{domain.domain}</p>
                          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{domain.dnsInstructions.recordType} record</p>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100">{domain.connectedPage.title}</p>
                        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{domain.connectedPage.slug || "—"}</p>
                      </td>
                      <td className="px-4 py-4 text-[14px] text-slate-600 dark:text-slate-300">{typeLabel(domain.targetType)}</td>
                      <td className="px-4 py-4"><StatusBadge value={domain.status} /></td>
                      <td className="px-4 py-4"><StatusBadge value={domain.sslStatus} variant="ssl" /></td>
                      <td className="px-4 py-4 text-[13px] text-slate-500 dark:text-slate-400">{formatDate(domain.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDomainId(domain.id)}
                            className="rounded-full border border-[#D7E1F0] px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:bg-[#F4F8FF] dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                          >
                            View DNS
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyDomain(domain.id)}
                            disabled={verifyingId === domain.id}
                            className="rounded-full border border-[#D7E1F0] px-3 py-1.5 text-[12px] font-semibold text-[#2557C7] transition hover:bg-[#EEF4FF] disabled:opacity-60 dark:border-white/10 dark:text-[#8DB2FF] dark:hover:bg-[#132544]"
                          >
                            {verifyingId === domain.id ? "Verifying..." : "Verify"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDomain(domain.id)}
                            disabled={deletingId === domain.id}
                            className="rounded-full border border-rose-200 px-3 py-1.5 text-[12px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-400/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            {deletingId === domain.id ? "Removing..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2563EB] dark:bg-[#132544] dark:text-[#8DB2FF]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">DNS instructions</p>
                <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">Add these DNS records at your provider, wait for propagation, then click verify.</p>
              </div>
            </div>

            {!activeDomain ? (
              <div className="mt-5 rounded-[22px] border border-dashed border-[#D7E1F0] bg-[#FBFCFE] px-5 py-6 text-[14px] leading-7 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                Select a domain to view its DNS configuration and verification state.
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="rounded-[22px] border border-[#E3EAF5] bg-[#FBFCFE] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{activeDomain.domain}</p>
                      <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                        Assigned to {activeDomain.connectedPage.title} ({typeLabel(activeDomain.targetType).toLowerCase()})
                      </p>
                    </div>
                    <StatusBadge value={activeDomain.status} />
                  </div>

                  <div className="grid gap-3 text-[14px] text-slate-600 dark:text-slate-300">
                    {[
                      ["Type", activeDomain.dnsInstructions.recordType],
                      ["Host / Name", activeDomain.dnsInstructions.name],
                      ["Target / Value", activeDomain.dnsInstructions.value],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4 rounded-2xl border border-[#E7EDF7] bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.05]">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
                        <span className="break-all text-right font-medium text-slate-800 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <GlassButton onClick={() => handleCopyDnsValue(activeDomain)} className="h-11 rounded-full px-4 text-[13px] font-semibold">
                      <Copy className="h-4 w-4" />
                      {copiedId === activeDomain.id ? "Copied" : "Copy target"}
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleVerifyDomain(activeDomain.id)}
                      className="h-11 rounded-full px-4 text-[13px] font-semibold"
                    >
                      <RefreshCw className={cn("h-4 w-4", verifyingId === activeDomain.id && "animate-spin")} />
                      {verifyingId === activeDomain.id ? "Verifying..." : "Verify"}
                    </GlassButton>
                    {activeDomain.connectedPage.shareUrl && (
                      <a
                        href={activeDomain.connectedPage.shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#D7E1F0] bg-[#F7FAFE] px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View current page
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#E3EAF5] bg-[#FBFCFE] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[15px] font-semibold text-slate-900 dark:text-white">Connected page</p>
                  <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Reassign this domain to a different landing page or booking page.</p>

                  <div className="mt-4 grid gap-4">
                    <SelectField
                      label="Page type"
                      value={mappingDraft.targetType}
                      onChange={(targetType) =>
                        setMappingDraft({
                          targetType,
                          targetId:
                            targetType === "landing_page"
                              ? targets.landingPages[0]?.id || ""
                              : targets.bookingPages[0]?.id || "",
                        })
                      }
                      options={[
                        { value: "landing_page", label: "Landing page" },
                        { value: "booking_page", label: "Booking page" },
                      ]}
                    />
                    <SelectField
                      label="Connected page"
                      value={mappingDraft.targetId}
                      onChange={(targetId) => setMappingDraft((current) => ({ ...current, targetId }))}
                      options={
                        activeMappingOptions.length
                          ? activeMappingOptions.map((item) => ({ value: item.id, label: item.title }))
                          : [{ value: "", label: "No pages available" }]
                      }
                      disabled={!activeMappingOptions.length}
                    />
                  </div>

                  <div className="mt-4">
                    <GlassButton onClick={handleSaveMapping} className="h-11 rounded-full px-4 text-[13px] font-semibold" disabled={savingId === activeDomain.id}>
                      {savingId === activeDomain.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {savingId === activeDomain.id ? "Saving..." : "Save mapping"}
                    </GlassButton>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#15376D] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)]">
                  <p className="font-['Sora'] text-[18px] font-semibold tracking-[-0.03em]">Setup checklist</p>
                  <ul className="mt-3 space-y-2 text-[14px] leading-6 text-slate-200">
                    <li className="flex gap-2"><ChevronDown className="mt-1 h-4 w-4 -rotate-90 shrink-0" /> Log in to your DNS provider and add the record above.</li>
                    <li className="flex gap-2"><ChevronDown className="mt-1 h-4 w-4 -rotate-90 shrink-0" /> Wait for DNS propagation. This can take a few minutes to several hours.</li>
                    <li className="flex gap-2"><ChevronDown className="mt-1 h-4 w-4 -rotate-90 shrink-0" /> Click Verify again until the domain is marked active.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF5DB] text-[#C48A00] dark:bg-[#4B3A0F] dark:text-[#FFD36A]">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-['Sora'] text-[20px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Provider notes</p>
                <p className="mt-2 text-[14px] leading-7 text-slate-500 dark:text-slate-400">
                  This build uses a provider abstraction. DNS verification works now with the local provider, and Vercel or Cloudflare integration can be swapped in later without changing the dashboard UI.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AddDomainModal
        open={modalOpen}
        value={form}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateDomain}
        submitting={submitting}
        targets={targets}
      />
    </>
  );
}
