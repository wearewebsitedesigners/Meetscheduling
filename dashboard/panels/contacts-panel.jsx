import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { apiFetch, cn, getInitials } from "../shared.jsx";

// ─── Column definitions ────────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "name",          label: "Name",            alwaysVisible: true },
  { key: "email",         label: "Email" },
  { key: "phone",         label: "Phone number" },
  { key: "company",       label: "Company" },
  { key: "source",        label: "Source" },
  { key: "createdAt",     label: "Created on" },
  { key: "timezone",      label: "Time zone" },
  { key: "jobTitle",      label: "Job title" },
  { key: "city",          label: "City" },
  { key: "state",         label: "State" },
  { key: "country",       label: "Country" },
  { key: "lastMeeting",   label: "Last meeting" },
  { key: "nextMeeting",   label: "Next meeting" },
];

const SOURCE_OPTIONS = ["Booking page", "CSV import", "Google Calendar", "Manually added"];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function normalizeContact(row) {
  return {
    id: row.id,
    name: row.name || "Unknown contact",
    email: row.email || "",
    phone: row.phone || "",
    company: row.company || "",
    type: row.type || "Lead",
    source: row.source || "Booking page",
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || "",
    timezone: row.timezone || "",
    jobTitle: row.job_title || row.jobTitle || "",
    city: row.city || "",
    state: row.state || "",
    country: row.country || "",
    lastMeeting: row.lastMeeting || "",
    nextMeetingAt: row.nextMeetingAt || "",
    createdAt: row.createdAt || "",
  };
}

function fmt(value, opts = {}) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", ...opts }).format(d);
}

function fmtMeeting(value) {
  if (!value || value === "Never") return "—";
  return fmt(value, value.includes("T") ? { hour: "numeric", minute: "2-digit" } : {});
}

function datePresetRange(preset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  switch (preset) {
    case "today":   start.setHours(0,0,0,0); end.setHours(23,59,59,999); break;
    case "7d":      start.setDate(start.getDate()-7); break;
    case "30d":     start.setDate(start.getDate()-30); break;
    case "90d":     start.setDate(start.getDate()-90); break;
    case "thisYear":start.setMonth(0,1); start.setHours(0,0,0,0); break;
    default:        return null;
  }
  return { from: start.toISOString().slice(0,10), to: end.toISOString().slice(0,10) };
}

function inDateRange(value, from, to) {
  if (!value) return false;
  const d = value.slice(0,10);
  if (from && d < from) return false;
  if (to   && d > to)   return false;
  return true;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g,"_"));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g,""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  }).filter((r) => r.name || r.email);
}

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputCls = "h-10 w-full rounded-xl border border-[#DFE7F3] bg-white px-3.5 text-[13.5px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#3B82F6]/60";
const labelCls = "block text-[12.5px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5";

// ─── Filter panel ──────────────────────────────────────────────────────────────
const FILTER_SECTIONS = [
  { id: "source",       label: "Source" },
  { id: "createdOn",    label: "Created on" },
  { id: "lastMeeting",  label: "Last meeting date" },
  { id: "nextMeeting",  label: "Next meeting date" },
  { id: "company",      label: "Company" },
  { id: "jobTitle",     label: "Job title" },
  { id: "city",         label: "City" },
  { id: "state",        label: "State" },
  { id: "country",      label: "Country" },
  { id: "phone",        label: "Phone number" },
  { id: "timezone",     label: "Time zone" },
];

const DATE_PRESETS = [
  { value: "today",    label: "Today" },
  { value: "7d",       label: "Last 7 days" },
  { value: "30d",      label: "Last 30 days" },
  { value: "90d",      label: "Last 90 days" },
  { value: "thisYear", label: "This year" },
  { value: "custom",   label: "Custom range" },
];

function FilterSection({ id, label, expanded, onToggle, children }) {
  return (
    <div className="border-b border-slate-100 dark:border-white/[0.07] last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50/60 dark:text-slate-200 dark:hover:bg-white/[0.04] transition-colors"
      >
        <span>{label}</span>
        <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function DateRangeFilter({ preset, customFrom, customTo, onPresetChange, onCustomChange }) {
  return (
    <div className="space-y-1.5">
      {DATE_PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onPresetChange(p.value)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-left transition",
            preset === p.value
              ? "bg-blue-600/10 text-blue-700 font-semibold dark:bg-blue-500/15 dark:text-blue-300"
              : "text-slate-600 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:bg-white/[0.06]"
          )}
        >
          {preset === p.value && <div className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
          {preset !== p.value && <div className="h-1.5 w-1.5" />}
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="mt-2 space-y-2 rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-slate-50/50 dark:bg-white/[0.03]">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">From</p>
            <input type="date" value={customFrom} onChange={(e) => onCustomChange("from", e.target.value)} className={inputCls} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">To</p>
            <input type="date" value={customTo} onChange={(e) => onCustomChange("to", e.target.value)} className={inputCls} />
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FILTERS = {
  source: [],
  createdOnPreset: "", createdOnFrom: "", createdOnTo: "",
  lastMeetingPreset: "", lastMeetingFrom: "", lastMeetingTo: "",
  nextMeetingPreset: "", nextMeetingFrom: "", nextMeetingTo: "",
  company: "", jobTitle: "", city: "", state: "", country: "",
  phone: "", timezone: "",
};

function hasActiveFilters(f) {
  return (
    f.source.length > 0 ||
    f.createdOnPreset || f.lastMeetingPreset || f.nextMeetingPreset ||
    f.company || f.jobTitle || f.city || f.state || f.country ||
    f.phone || f.timezone
  );
}

function FilterPanel({ filters, onChange, onReset, onClose }) {
  const [expanded, setExpanded] = useState({ source: true });
  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const active = hasActiveFilters(filters);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-white/[0.07]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-[13.5px] font-bold text-slate-900 dark:text-white">Filters</span>
          {active && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              {[
                filters.source.length > 0,
                !!filters.createdOnPreset, !!filters.lastMeetingPreset, !!filters.nextMeetingPreset,
                !!filters.company, !!filters.jobTitle, !!filters.city, !!filters.state,
                !!filters.country, !!filters.phone, !!filters.timezone,
              ].filter(Boolean).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {active && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 transition"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Source */}
        <FilterSection id="source" label="Source" expanded={!!expanded.source} onToggle={() => toggle("source")}>
          <div className="space-y-1.5">
            {SOURCE_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2.5 cursor-pointer rounded-lg px-1 py-1.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition">
                <input
                  type="checkbox"
                  checked={filters.source.includes(s)}
                  onChange={() => {
                    const next = filters.source.includes(s)
                      ? filters.source.filter((x) => x !== s)
                      : [...filters.source, s];
                    onChange("source", next);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                />
                <span className="text-[13px] text-slate-700 dark:text-slate-300">{s}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Created on */}
        <FilterSection id="createdOn" label="Created on" expanded={!!expanded.createdOn} onToggle={() => toggle("createdOn")}>
          <DateRangeFilter
            preset={filters.createdOnPreset}
            customFrom={filters.createdOnFrom}
            customTo={filters.createdOnTo}
            onPresetChange={(v) => onChange("createdOnPreset", v)}
            onCustomChange={(field, v) => onChange(field === "from" ? "createdOnFrom" : "createdOnTo", v)}
          />
        </FilterSection>

        {/* Last meeting */}
        <FilterSection id="lastMeeting" label="Last meeting date" expanded={!!expanded.lastMeeting} onToggle={() => toggle("lastMeeting")}>
          <DateRangeFilter
            preset={filters.lastMeetingPreset}
            customFrom={filters.lastMeetingFrom}
            customTo={filters.lastMeetingTo}
            onPresetChange={(v) => onChange("lastMeetingPreset", v)}
            onCustomChange={(field, v) => onChange(field === "from" ? "lastMeetingFrom" : "lastMeetingTo", v)}
          />
        </FilterSection>

        {/* Next meeting */}
        <FilterSection id="nextMeeting" label="Next meeting date" expanded={!!expanded.nextMeeting} onToggle={() => toggle("nextMeeting")}>
          <DateRangeFilter
            preset={filters.nextMeetingPreset}
            customFrom={filters.nextMeetingFrom}
            customTo={filters.nextMeetingTo}
            onPresetChange={(v) => onChange("nextMeetingPreset", v)}
            onCustomChange={(field, v) => onChange(field === "from" ? "nextMeetingFrom" : "nextMeetingTo", v)}
          />
        </FilterSection>

        {/* Text filters */}
        {[
          { id: "company",  label: "Company",      field: "company" },
          { id: "jobTitle", label: "Job title",     field: "jobTitle" },
          { id: "timezone", label: "Time zone",     field: "timezone" },
          { id: "city",     label: "City",          field: "city" },
          { id: "state",    label: "State",         field: "state" },
          { id: "country",  label: "Country",       field: "country" },
          { id: "phone",    label: "Phone number",  field: "phone" },
        ].map(({ id, label, field }) => (
          <FilterSection key={id} id={id} label={label} expanded={!!expanded[id]} onToggle={() => toggle(id)}>
            <input
              className={inputCls}
              placeholder={`Filter by ${label.toLowerCase()}`}
              value={filters[field]}
              onChange={(e) => onChange(field, e.target.value)}
            />
          </FilterSection>
        ))}
      </div>
    </div>
  );
}

// ─── Columns dropdown ──────────────────────────────────────────────────────────
function ColumnsDropdown({ visible, onChange, onClose }) {
  const toggleable = ALL_COLUMNS.filter((c) => !c.alwaysVisible);
  const allOn = toggleable.every((c) => visible[c.key]);
  return (
    <div className="w-60 rounded-2xl border border-white/40 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1729]/98 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.07]">
        <span className="text-[13px] font-bold text-slate-900 dark:text-white">Show columns</span>
        <button
          type="button"
          onClick={() => {
            const next = {};
            toggleable.forEach((c) => { next[c.key] = !allOn; });
            onChange(next);
          }}
          className="text-[11.5px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {allOn ? "Hide all" : "Show all"}
        </button>
      </div>
      <div className="p-2 max-h-72 overflow-y-auto">
        {toggleable.map((col) => (
          <label key={col.key} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition">
            <span className={cn("flex h-4.5 w-4.5 items-center justify-center rounded-[5px] border-2 transition",
              visible[col.key]
                ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500"
                : "border-slate-300 dark:border-white/20"
            )}>
              {visible[col.key] && (
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4l2.5 2.5L9 1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <input type="checkbox" checked={!!visible[col.key]} onChange={() => onChange({ [col.key]: !visible[col.key] })} className="sr-only" />
            <span className="text-[13px] text-slate-700 dark:text-slate-200">{col.label}</span>
          </label>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.07]">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2 text-[13px] font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── CSV Import modal ─────────────────────────────────────────────────────────
function CsvImportModal({ open, onClose, onImport }) {
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  if (!open) return null;

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target.result);
      setParsed(rows);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!parsed?.length) return;
    setImporting(true);
    try {
      let created = 0, skipped = 0;
      for (const row of parsed) {
        try {
          await apiFetch("/api/contacts", {
            method: "POST",
            body: {
              name: row.name || row.full_name || "Unknown",
              email: row.email || "",
              company: row.company || row.organization || "",
              phone: row.phone || row.phone_number || "",
              type: "Lead",
              source: "CSV import",
            },
          });
          created++;
        } catch {
          skipped++;
        }
      }
      setResult({ created, skipped });
      onImport();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[480px] overflow-hidden rounded-[28px] border border-[#DFE7F3] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.20)] dark:border-white/10 dark:bg-[#0e1929]">
        <div className="flex items-center justify-between border-b border-[#DFE7F3] px-6 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_4px_12px_rgba(16,185,129,0.30)]">
              <Upload className="h-4.5 w-4.5 text-white" size={18} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">Import contacts</h3>
              <p className="text-[12px] text-slate-400">CSV file with name, email columns</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DFE7F3] bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {result ? (
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/85 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-semibold">Import complete</p>
              </div>
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                {result.created} contact{result.created !== 1 ? "s" : ""} created
                {result.skipped > 0 ? `, ${result.skipped} skipped (already exist or invalid)` : ""}
              </p>
            </div>
          ) : (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition",
                  dragging
                    ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
                    : "border-slate-200 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/60"
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Drop CSV file here or click to browse</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Supported columns: name, email, company, phone</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              {parsed && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                    {parsed.length} contact{parsed.length !== 1 ? "s" : ""} ready to import
                  </p>
                  {parsed.slice(0, 3).map((r, i) => (
                    <p key={i} className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      {r.name || r.full_name} &middot; {r.email}
                    </p>
                  ))}
                  {parsed.length > 3 && <p className="mt-1 text-[12px] text-slate-400">+ {parsed.length - 3} more</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#DFE7F3] px-6 py-4 dark:border-white/10">
          <button type="button" onClick={onClose} className="rounded-2xl border border-[#DFE7F3] bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={!parsed?.length || importing}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(16,185,129,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import {parsed?.length ? `${parsed.length} contacts` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contact form modal ────────────────────────────────────────────────────────
const defaultForm = { name: "", email: "", company: "", type: "Lead", tags: "", notes: "", lastMeeting: "", phone: "", jobTitle: "", city: "", state: "", country: "", timezone: "" };

function ContactFormModal({ open, mode, form, submitting, onClose, onChange, onSubmit }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-[28px] border border-[#DFE7F3] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.20)] dark:border-white/10 dark:bg-[#0e1929]">
        <div className="flex items-center justify-between gap-3 border-b border-[#DFE7F3] px-6 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.30)]">
              <Users className="h-4.5 w-4.5 text-white" size={18} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">
                {mode === "create" ? "Add contact" : form.name || "Edit contact"}
              </h3>
              <p className="text-[12px] text-slate-400">{mode === "create" ? "Create a new contact" : "Update contact details"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DFE7F3] bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name <span className="text-rose-500">*</span></label>
              <input value={form.name} onChange={(e) => onChange("name", e.target.value)} className={inputCls} placeholder="Olivia Carter" />
            </div>
            <div>
              <label className={labelCls}>Email <span className="text-rose-500">*</span></label>
              <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} className={inputCls} placeholder="name@company.com" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} className={inputCls} placeholder="+1 555 000 0000" />
            </div>
            <div>
              <label className={labelCls}>Company</label>
              <input value={form.company} onChange={(e) => onChange("company", e.target.value)} className={inputCls} placeholder="Northlane Studio" />
            </div>
            <div>
              <label className={labelCls}>Job title</label>
              <input value={form.jobTitle} onChange={(e) => onChange("jobTitle", e.target.value)} className={inputCls} placeholder="CEO" />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={(e) => onChange("type", e.target.value)} className={inputCls}>
                <option>Lead</option><option>Customer</option><option>VIP</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input value={form.city} onChange={(e) => onChange("city", e.target.value)} className={inputCls} placeholder="New York" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input value={form.state} onChange={(e) => onChange("state", e.target.value)} className={inputCls} placeholder="NY" />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input value={form.country} onChange={(e) => onChange("country", e.target.value)} className={inputCls} placeholder="United States" />
            </div>
            <div>
              <label className={labelCls}>Time zone</label>
              <input value={form.timezone} onChange={(e) => onChange("timezone", e.target.value)} className={inputCls} placeholder="America/New_York" />
            </div>
            <div>
              <label className={labelCls}>Tags</label>
              <input value={form.tags} onChange={(e) => onChange("tags", e.target.value)} className={inputCls} placeholder="VIP, Agency, Retainer" />
            </div>
            <div>
              <label className={labelCls}>Last meeting date</label>
              <input type="date" value={form.lastMeeting} onChange={(e) => onChange("lastMeeting", e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => onChange("notes", e.target.value)} rows={3} className="w-full rounded-xl border border-[#DFE7F3] bg-white px-3.5 py-2.5 text-[13.5px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500" placeholder="Context from the last meeting..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#DFE7F3] px-6 py-4 dark:border-white/10">
          <button type="button" onClick={onClose} className="rounded-2xl border border-[#DFE7F3] bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">Cancel</button>
          <button type="button" onClick={onSubmit} disabled={submitting} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {mode === "create" ? "Save contact" : "Update contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 dark:text-white/20 ml-1 inline" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3.5 w-3.5 text-blue-500 ml-1 inline" />
    : <ArrowDown className="h-3.5 w-3.5 text-blue-500 ml-1 inline" />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContactsPanel() {
  const [contacts, setContacts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [notice, setNotice]             = useState("");
  const [search, setSearch]             = useState("");
  const [filters, setFilters]           = useState(EMPTY_FILTERS);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumns, setShowColumns]   = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [pageSize, setPageSize]         = useState(25);
  const [pageIndex, setPageIndex]       = useState(0);
  const [sortKey, setSortKey]           = useState("name");
  const [sortDir, setSortDir]           = useState("asc");
  const [formOpen, setFormOpen]         = useState(false);
  const [formMode, setFormMode]         = useState("create");
  const [editingId, setEditingId]       = useState("");
  const [form, setForm]                 = useState(defaultForm);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const init = {};
    ALL_COLUMNS.filter((c) => !c.alwaysVisible).forEach((c) => { init[c.key] = true; });
    return init;
  });

  const columnsRef    = useRef(null);
  const filterPanelRef = useRef(null);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadContacts = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const payload = await apiFetch(`/api/contacts${params.toString() ? `?${params}` : ""}`);
      setContacts((payload?.contacts || []).map(normalizeContact));
    } catch (err) {
      setError(err?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const id = window.setTimeout(() => { loadContacts(); setPageIndex(0); }, 180);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => { loadContacts(); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target)) setShowColumns(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Client-side filtering + sorting ──────────────────────────────────────
  const filtered = useMemo(() => {
    let list = contacts;

    // Source
    if (filters.source.length) {
      list = list.filter((c) => filters.source.includes(c.source));
    }

    // Date filters
    function applyDateFilter(arr, field, preset, customFrom, customTo) {
      if (!preset) return arr;
      if (preset === "custom") {
        return arr.filter((c) => inDateRange(c[field], customFrom, customTo));
      }
      const range = datePresetRange(preset);
      if (!range) return arr;
      return arr.filter((c) => inDateRange(c[field], range.from, range.to));
    }

    list = applyDateFilter(list, "createdAt",     filters.createdOnPreset,    filters.createdOnFrom,    filters.createdOnTo);
    list = applyDateFilter(list, "lastMeeting",   filters.lastMeetingPreset,  filters.lastMeetingFrom,  filters.lastMeetingTo);
    list = applyDateFilter(list, "nextMeetingAt", filters.nextMeetingPreset,  filters.nextMeetingFrom,  filters.nextMeetingTo);

    // Text filters
    const textFilters = [
      ["company", "company"], ["jobTitle", "jobTitle"], ["city", "city"],
      ["state", "state"], ["country", "country"], ["phone", "phone"], ["timezone", "timezone"],
    ];
    for (const [fKey, cKey] of textFilters) {
      if (filters[fKey]) {
        const q = filters[fKey].toLowerCase();
        list = list.filter((c) => (c[cKey] || "").toLowerCase().includes(q));
      }
    }

    // Sort
    list = [...list].sort((a, b) => {
      const av = (a[sortKey] || "").toString().toLowerCase();
      const bv = (b[sortKey] || "").toString().toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return list;
  }, [contacts, filters, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => {
    const start = pageIndex * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageIndex, pageSize]);

  // ── Sorting ───────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Filter updates ────────────────────────────────────────────────────────
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageIndex(0);
  };
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setPageIndex(0); };

  // ── Column visibility ─────────────────────────────────────────────────────
  const updateColumns = (patch) => setVisibleColumns((prev) => ({ ...prev, ...patch }));

  // ── Form helpers ──────────────────────────────────────────────────────────
  const resetForm = () => { setForm(defaultForm); setEditingId(""); setFormMode("create"); };
  const openCreate = () => { resetForm(); setFormOpen(true); };
  const openEdit = (c) => {
    setFormMode("edit"); setEditingId(c.id);
    setForm({
      name: c.name, email: c.email, company: c.company,
      type: c.type, phone: c.phone, jobTitle: c.jobTitle,
      city: c.city, state: c.state, country: c.country, timezone: c.timezone,
      tags: (c.tags || []).join(", "), notes: c.notes,
      lastMeeting: c.lastMeeting && c.lastMeeting !== "Never" ? String(c.lastMeeting).slice(0,10) : "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required"); return; }
    setSubmitting(true); setError(""); setNotice("");
    try {
      const body = {
        name: form.name.trim(), email: form.email.trim(),
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
        type: form.type,
        job_title: form.jobTitle.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        country: form.country.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        notes: form.notes.trim() || undefined,
        lastMeeting: form.lastMeeting || undefined,
      };
      if (formMode === "create") {
        await apiFetch("/api/contacts", { method: "POST", body });
        setNotice("Contact created");
      } else {
        await apiFetch(`/api/contacts/${editingId}`, { method: "PATCH", body });
        setNotice("Contact updated");
      }
      setFormOpen(false); resetForm();
      await loadContacts({ silent: true });
    } catch (err) {
      setError(err?.message || "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    setError(""); setNotice("");
    try {
      await apiFetch(`/api/contacts/${c.id}`, { method: "DELETE" });
      setNotice("Contact deleted");
      await loadContacts({ silent: true });
    } catch (err) {
      setError(err?.message || "Failed to delete contact");
    }
  };

  const activeFilterCount = [
    filters.source.length > 0, !!filters.createdOnPreset, !!filters.lastMeetingPreset,
    !!filters.nextMeetingPreset, !!filters.company, !!filters.jobTitle,
    !!filters.city, !!filters.state, !!filters.country, !!filters.phone, !!filters.timezone,
  ].filter(Boolean).length;

  // ── Visible column list (ordered) ─────────────────────────────────────────
  const displayCols = ALL_COLUMNS.filter((c) => c.alwaysVisible || visibleColumns[c.key]);

  return (
    <div className="min-h-full rounded-[34px] border border-[#DFE7F3] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.13),_transparent_24%),linear-gradient(180deg,#eef4ff_0%,#edf2f7_35%,#f7fbff_100%)] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-6 xl:p-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.12),_transparent_24%),linear-gradient(180deg,#081120_0%,#0b1424_35%,#0d182b_100%)]">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Contacts</h1>
            <p className="mt-0.5 text-[13.5px] text-slate-500 dark:text-slate-400">
              {loading ? "Loading…" : `${filtered.length.toLocaleString()} contact${filtered.length !== 1 ? "s" : ""}${activeFilterCount ? " (filtered)" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCsvModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DFE7F3] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              Add contact
            </button>
          </div>
        </div>

        {/* ── Notice / Error ──────────────────────────────────────────────── */}
        {(error || notice) && (
          <div className={cn("mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl",
            error
              ? "border-rose-200/70 bg-rose-50/85 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
              : "border-emerald-200/70 bg-emerald-50/85 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          )}>
            {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{error || notice}</span>
            <button type="button" onClick={() => { setError(""); setNotice(""); }} className="ml-auto">
              <X className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
            </button>
          </div>
        )}

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/40 bg-white/50 px-3.5 py-2.5 shadow backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              className="w-full bg-transparent text-[13.5px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            type="button"
            onClick={() => setShowFilterPanel((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13.5px] font-semibold shadow backdrop-blur-md transition",
              showFilterPanel || activeFilterCount > 0
                ? "border-blue-500/50 bg-blue-600/10 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-300"
                : "border-white/40 bg-white/50 text-slate-700 hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Columns */}
          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setShowColumns((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/50 px-4 py-2.5 text-[13.5px] font-semibold text-slate-700 shadow backdrop-blur-md transition hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Eye className="h-4 w-4" />
              Columns
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showColumns && "rotate-180")} />
            </button>
            {showColumns && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-30">
                <ColumnsDropdown
                  visible={visibleColumns}
                  onChange={updateColumns}
                  onClose={() => setShowColumns(false)}
                />
              </div>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/60 bg-rose-50/70 px-3 py-2 text-[12.5px] font-semibold text-rose-600 hover:bg-rose-100/80 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition"
            >
              <X className="h-3.5 w-3.5" />
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* ── Main layout: filter panel + table ──────────────────────────── */}
        <div className="flex gap-4">

          {/* Filter sidebar */}
          {showFilterPanel && (
            <div
              ref={filterPanelRef}
              className="w-[260px] shrink-0 overflow-hidden rounded-2xl border border-white/40 bg-white/80 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1729]/95"
              style={{ maxHeight: "calc(100vh - 220px)", position: "sticky", top: 20 }}
            >
              <FilterPanel
                filters={filters}
                onChange={updateFilter}
                onReset={resetFilters}
                onClose={() => setShowFilterPanel(false)}
              />
            </div>
          )}

          {/* Table */}
          <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/40 bg-white/40 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            {loading ? (
              <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-slate-500 dark:text-slate-300">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading contacts…
              </div>
            ) : paged.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-[13.5px]">
                  <thead className="bg-white/60 dark:bg-white/[0.06]">
                    <tr className="text-left text-slate-600 dark:text-slate-300">
                      {displayCols.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="cursor-pointer select-none whitespace-nowrap px-4 py-3.5 font-semibold hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          {col.label}
                          <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                        </th>
                      ))}
                      <th className="px-4 py-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((c) => (
                      <tr key={c.id} className="border-t border-white/30 text-slate-700 transition hover:bg-white/60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.06]">
                        {displayCols.map((col) => (
                          <td key={col.key} className="px-4 py-3.5">
                            {col.key === "name" ? (
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-600 to-indigo-600 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(37,99,235,0.22)]">
                                  {getInitials(c.name)}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white leading-tight">{c.name}</div>
                                  <div className="text-[11.5px] text-slate-400 dark:text-slate-500 mt-0.5">{c.type}</div>
                                </div>
                              </div>
                            ) : col.key === "email" ? (
                              <span className="text-blue-600 dark:text-blue-400">{c.email || "—"}</span>
                            ) : col.key === "source" ? (
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium",
                                c.source === "CSV import"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                  : c.source === "Manually added"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                              )}>
                                {c.source || "—"}
                              </span>
                            ) : col.key === "createdAt" ? (
                              fmt(c.createdAt)
                            ) : col.key === "lastMeeting" ? (
                              fmtMeeting(c.lastMeeting)
                            ) : col.key === "nextMeeting" ? (
                              c.nextMeetingAt ? fmtMeeting(c.nextMeetingAt) : "—"
                            ) : (
                              c[col.key] || "—"
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFE7F3] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-blue-400/50 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200/60 bg-rose-50/70 px-3 py-1.5 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">No contacts found</h3>
                <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                  {search || activeFilterCount > 0
                    ? "Try a different search term or clear some filters."
                    : "Create your first contact or import one from a CSV file."}
                </p>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={resetFilters} className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                    Clear filters
                  </button>
                )}
                {!search && !activeFilterCount && (
                  <button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.28)] hover:brightness-105">
                    <Plus className="h-4 w-4" />
                    Add contact
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 text-[13px] text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={String(pageSize)}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }}
                className="rounded-lg border border-white/30 bg-white/50 px-2.5 py-1 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {[10,25,50,100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, filtered.length)} of {filtered.length.toLocaleString()}
              </span>
              <div className="flex gap-1.5">
                <button type="button" disabled={pageIndex === 0} onClick={() => setPageIndex(0)} className="rounded-lg border border-white/30 bg-white/50 px-2.5 py-1.5 backdrop-blur-md transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">«</button>
                <button type="button" disabled={pageIndex === 0} onClick={() => setPageIndex((v) => v - 1)} className="rounded-lg border border-white/30 bg-white/50 px-3 py-1.5 backdrop-blur-md transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">Prev</button>
                <span className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-600/10 px-3 py-1.5 font-semibold text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                  {pageIndex + 1} / {pageCount}
                </span>
                <button type="button" disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex((v) => v + 1)} className="rounded-lg border border-white/30 bg-white/50 px-3 py-1.5 backdrop-blur-md transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">Next</button>
                <button type="button" disabled={pageIndex >= pageCount - 1} onClick={() => setPageIndex(pageCount - 1)} className="rounded-lg border border-white/30 bg-white/50 px-2.5 py-1.5 backdrop-blur-md transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">»</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ContactFormModal
        open={formOpen}
        mode={formMode}
        form={form}
        submitting={submitting}
        onClose={() => { setFormOpen(false); resetForm(); }}
        onChange={(f, v) => setForm((p) => ({ ...p, [f]: v }))}
        onSubmit={handleSubmit}
      />

      <CsvImportModal
        open={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onImport={() => loadContacts({ silent: true })}
      />
    </div>
  );
}
