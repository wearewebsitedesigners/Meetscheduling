import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { apiFetch, cn, getInitials } from "../shared.jsx";

const filterOptions = [
  { value: "all", label: "All contacts" },
  { value: "lead", label: "Leads" },
  { value: "customer", label: "Customers" },
  { value: "vip", label: "VIP" },
];

const columnOptions = [
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "lastMeeting", label: "Last meeting" },
  { key: "nextMeeting", label: "Next meeting" },
  { key: "company", label: "Company" },
];

const defaultForm = {
  name: "",
  email: "",
  company: "",
  type: "Lead",
  tags: "",
  notes: "",
  lastMeeting: "",
};

function normalizeContact(row) {
  return {
    id: row.id,
    name: row.name || "Unknown contact",
    email: row.email || "",
    phone: row.phone || "",
    company: row.company || "",
    type: row.type || "Lead",
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || "",
    lastMeeting: row.lastMeeting || "Never",
    nextMeetingAt: row.nextMeetingAt || "",
    createdAt: row.createdAt || "",
  };
}

function formatDateLabel(value, options = {}) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(parsed);
}

function formatMeetingLabel(value) {
  if (!value || value === "Never") return "—";
  return formatDateLabel(value, {
    hour: value.includes("T") ? "numeric" : undefined,
    minute: value.includes("T") ? "2-digit" : undefined,
  });
}

const inputCls = "h-11 w-full rounded-2xl border border-[#DFE7F3] bg-white px-4 text-[14px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-[#3B82F6]/60";
const labelCls = "block text-[13px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5";

function ContactFormModal({ open, mode, form, submitting, onClose, onChange, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-[#DFE7F3] bg-white shadow-[0_32px_80px_rgba(15,23,42,0.20)] dark:border-white/10 dark:bg-[#0e1929]">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#DFE7F3] px-6 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.30)]">
              <Users className="h-4.5 w-4.5 text-white" size={18} />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white">
                {mode === "create" ? "Add contact" : form.name || "Edit contact"}
              </h3>
              <p className="text-[12px] text-slate-400 dark:text-slate-500">
                {mode === "create" ? "Create a new contact" : "Update contact details"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DFE7F3] bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — two column grid */}
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
              <label className={labelCls}>Company</label>
              <input value={form.company} onChange={(e) => onChange("company", e.target.value)} className={inputCls} placeholder="Northlane Studio" />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={(e) => onChange("type", e.target.value)} className={inputCls}>
                <option value="Lead">Lead</option>
                <option value="Customer">Customer</option>
                <option value="VIP">VIP</option>
              </select>
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
            <textarea
              value={form.notes}
              onChange={(e) => onChange("notes", e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[#DFE7F3] bg-white px-4 py-3 text-[14px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/15 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500"
              placeholder="Context from the last meeting, objections, or follow-up plan."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#DFE7F3] px-6 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#DFE7F3] bg-white px-5 py-2.5 text-[14px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {mode === "create" ? "Save contact" : "Update contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPanel() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showColumns, setShowColumns] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [visibleColumns, setVisibleColumns] = useState({
    email: true,
    phone: true,
    lastMeeting: true,
    nextMeeting: true,
    company: true,
  });

  const columnsRef = useRef(null);
  const filtersRef = useRef(null);

  const loadContacts = async ({ silent = false, nextSearch = search, nextFilter = filter } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextFilter && nextFilter !== "all") params.set("filter", nextFilter);
      const payload = await apiFetch(`/api/contacts${params.toString() ? `?${params}` : ""}`);
      setContacts((payload?.contacts || []).map(normalizeContact));
    } catch (nextError) {
      setError(nextError?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadContacts({ nextSearch: search, nextFilter: filter });
      setPageIndex(0);
    }, 180);
    return () => window.clearTimeout(timeoutId);
  }, [search, filter]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (columnsRef.current && !columnsRef.current.contains(event.target)) {
        setShowColumns(false);
      }
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setShowFilterMenu(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const pagedContacts = useMemo(() => {
    const start = pageIndex * pageSize;
    return contacts.slice(start, start + pageSize);
  }, [contacts, pageIndex, pageSize]);

  const pageCount = Math.max(1, Math.ceil(contacts.length / pageSize));

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId("");
    setFormMode("create");
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (contact) => {
    setFormMode("edit");
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      email: contact.email,
      company: contact.company,
      type: contact.type,
      tags: (contact.tags || []).join(", "),
      notes: contact.notes,
      lastMeeting:
        contact.lastMeeting && contact.lastMeeting !== "Never"
          ? String(contact.lastMeeting).slice(0, 10)
          : "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        type: form.type,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: form.notes.trim() || undefined,
        lastMeeting: form.lastMeeting || undefined,
      };

      if (formMode === "create") {
        await apiFetch("/api/contacts", { method: "POST", body: payload });
        setNotice("Contact created");
      } else {
        await apiFetch(`/api/contacts/${editingId}`, { method: "PATCH", body: payload });
        setNotice("Contact updated");
      }

      setFormOpen(false);
      resetForm();
      await loadContacts({ silent: true });
    } catch (nextError) {
      setError(nextError?.message || "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contact) => {
    if (!window.confirm(`Delete ${contact.name}?`)) return;
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      setNotice("Contact deleted");
      await loadContacts({ silent: true });
    } catch (nextError) {
      setError(nextError?.message || "Failed to delete contact");
    }
  };

  const toggleColumn = (key) => {
    setVisibleColumns((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="min-h-full rounded-[34px] border border-[#DFE7F3] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.13),_transparent_24%),linear-gradient(180deg,#eef4ff_0%,#edf2f7_35%,#f7fbff_100%)] p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-6 xl:p-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.12),_transparent_24%),linear-gradient(180deg,#081120_0%,#0b1424_35%,#0d182b_100%)]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-white">
              Contacts
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(37,99,235,0.25)] transition hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {(error || notice) && (
          <div
            className={cn(
              "mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl",
              error
                ? "border-rose-200/70 bg-rose-50/85 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
                : "border-emerald-200/70 bg-emerald-50/85 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            )}
          >
            {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{error || notice}</span>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-white/30 bg-white/40 px-4 py-2.5 shadow backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
              placeholder="Search contacts"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setShowColumns((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/40 px-4 py-2.5 text-sm font-medium text-slate-700 shadow backdrop-blur-md transition hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Eye className="h-4 w-4" />
              Show Columns
              <ChevronDown className={cn("h-4 w-4 transition-transform", showColumns && "rotate-180")} />
            </button>

            {showColumns && (
              <div className="absolute left-0 top-14 z-30 w-64 rounded-2xl border border-white/40 bg-white/75 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1729]/95">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Columns</p>
                {columnOptions.map((column) => (
                  <label key={column.key} className="mb-2 flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={visibleColumns[column.key]}
                      onChange={() => toggleColumn(column.key)}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                    />
                    {column.label}
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setShowColumns(false)}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2 text-sm font-semibold text-white"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={filtersRef}>
            <button
              type="button"
              onClick={() => setShowFilterMenu((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/40 px-4 py-2.5 text-sm font-medium text-slate-700 shadow backdrop-blur-md transition hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>

            {showFilterMenu && (
              <div className="absolute left-0 top-14 z-30 w-64 rounded-2xl border border-white/40 bg-white/75 p-4 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d1729]/95">
                <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Filter contacts</p>
                <div className="space-y-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFilter(option.value);
                        setShowFilterMenu(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition",
                        filter === option.value
                          ? "bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                          : "text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10"
                      )}
                    >
                      <span>{option.label}</span>
                      {filter === option.value ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/30 bg-white/40 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          {loading ? (
            <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-slate-500 dark:text-slate-300">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading contacts
            </div>
          ) : pagedContacts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="bg-white/50 dark:bg-white/[0.06]">
                  <tr className="text-left text-sm text-slate-700 dark:text-slate-300">
                    <th className="p-4 font-semibold">Name</th>
                    {visibleColumns.email && <th className="p-4 font-semibold">Email</th>}
                    {visibleColumns.phone && <th className="p-4 font-semibold">Phone</th>}
                    {visibleColumns.lastMeeting && <th className="p-4 font-semibold">Last meeting</th>}
                    {visibleColumns.nextMeeting && <th className="p-4 font-semibold">Next meeting</th>}
                    {visibleColumns.company && <th className="p-4 font-semibold">Company</th>}
                    <th className="p-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {pagedContacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-t border-white/30 text-sm text-slate-700 transition hover:bg-white/60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.24)]">
                            {getInitials(contact.name)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{contact.name}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {contact.type}
                            </div>
                          </div>
                        </div>
                      </td>
                      {visibleColumns.email && <td className="p-4">{contact.email || "—"}</td>}
                      {visibleColumns.phone && <td className="p-4">{contact.phone || "—"}</td>}
                      {visibleColumns.lastMeeting && <td className="p-4">{formatMeetingLabel(contact.lastMeeting)}</td>}
                      {visibleColumns.nextMeeting && <td className="p-4">{contact.nextMeetingAt ? formatMeetingLabel(contact.nextMeetingAt) : "—"}</td>}
                      {visibleColumns.company && <td className="p-4">{contact.company || "—"}</td>}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(contact)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFE7F3] bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#3B82F6]/40 hover:bg-[#EEF4FF] hover:text-[#2563EB] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(contact)}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200/70 bg-rose-50/85 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
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
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No contacts found</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {search || filter !== "all"
                  ? "Try a different search or filter."
                  : "Create your first contact or collect one from a booking page."}
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(37,99,235,0.28)] transition hover:scale-[1.01]"
              >
                <Plus className="h-4 w-4" />
                Add contact
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <div>
            Items per page:
            <select
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPageIndex(0);
              }}
              className="ml-2 rounded-lg bg-white/40 px-2 py-1 backdrop-blur-md dark:bg-white/5 dark:text-white"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span>
              {contacts.length
                ? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, contacts.length)} of ${contacts.length}`
                : "0 results"}
            </span>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                className="rounded-lg bg-white/40 px-3 py-1.5 backdrop-blur-md transition hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={pageIndex >= pageCount - 1}
                onClick={() => setPageIndex((value) => Math.min(pageCount - 1, value + 1))}
                className="rounded-lg bg-white/40 px-3 py-1.5 backdrop-blur-md transition hover:bg-white/60 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <ContactFormModal
        open={formOpen}
        mode={formMode}
        form={form}
        submitting={submitting}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
