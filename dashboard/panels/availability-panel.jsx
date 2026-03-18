import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  Copy,
  ExternalLink,
  GripVertical,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings2,
  Trash2,
  Wand2,
} from "lucide-react";
import { apiFetch, cn, getAuthToken, GlassButton, Toggle } from "../shared.jsx";

const weekdayMeta = [
  { weekday: 0, key: "Sun", label: "Sunday" },
  { weekday: 1, key: "Mon", label: "Monday" },
  { weekday: 2, key: "Tue", label: "Tuesday" },
  { weekday: 3, key: "Wed", label: "Wednesday" },
  { weekday: 4, key: "Thu", label: "Thursday" },
  { weekday: 5, key: "Fri", label: "Friday" },
  { weekday: 6, key: "Sat", label: "Saturday" },
];

const tabs = ["Weekly", "Overrides", "Limits", "Calendar sync"];

const TIME_VALUES = Array.from({ length: 96 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PREVIEW_EVENT_TYPES = [
  {
    id: "preview-one-on-one",
    title: "One-on-one meeting",
    slug: "one-on-one",
    durationMinutes: 30,
    locationType: "google_meet",
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    noticeMinimumHours: 2,
    maxBookingsPerDay: 5,
    isActive: true,
    color: "#2563eb",
  },
  {
    id: "preview-discovery",
    title: "Discovery call",
    slug: "discovery-call",
    durationMinutes: 45,
    locationType: "zoom",
    bufferBeforeMin: 15,
    bufferAfterMin: 15,
    noticeMinimumHours: 4,
    maxBookingsPerDay: 3,
    isActive: true,
    color: "#0ea5e9",
  },
];

const PREVIEW_CALENDARS = [
  {
    providerKey: "google-calendar",
    provider: "Google Calendar",
    connected: false,
    accountEmail: "",
    lastSync: "Not connected",
  },
];

function normalizeTime(value, fallback = "09:00") {
  if (!value) return fallback;
  return String(value).slice(0, 5);
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimeLabel(value, mode = "12h") {
  if (mode === "24h") return value;
  const [hoursRaw, minutesRaw] = String(value).split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHour = hours % 12 || 12;
  return `${String(normalizedHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function buildDefaultWeekdays() {
  return weekdayMeta.map((item) => ({
    ...item,
    enabled: item.weekday >= 1 && item.weekday <= 5,
    slots: [{ id: `${item.key}-slot-1`, startTime: "09:00", endTime: "17:00" }],
  }));
}

function buildWeeklyDays(rows = []) {
  if (!Array.isArray(rows) || !rows.length) return buildDefaultWeekdays();

  return weekdayMeta.map((item) => {
    const slots = rows
      .filter((row) => Number(row.weekday) === item.weekday && row.is_available !== false)
      .map((row, index) => ({
        id: row.id || `${item.key}-${index + 1}`,
        startTime: normalizeTime(row.start_time, "09:00"),
        endTime: normalizeTime(row.end_time, "17:00"),
      }));

    return {
      ...item,
      enabled: slots.length > 0,
      slots: slots.length ? slots : [{ id: `${item.key}-slot-1`, startTime: "09:00", endTime: "17:00" }],
    };
  });
}

function serializeWeeklyDays(days) {
  return days.flatMap((day) => {
    if (!day.enabled) return [];
    return day.slots
      .filter((slot) => slot.startTime && slot.endTime && slot.startTime < slot.endTime)
      .map((slot) => ({
        weekday: day.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: true,
      }));
  });
}

function normalizeEventType(row) {
  return {
    id: row.id,
    title: row.title || "Untitled event",
    slug: row.slug || "",
    durationMinutes: Number(row.duration_minutes ?? row.durationMinutes ?? 30),
    locationType: row.location_type || row.locationType || "google_meet",
    bufferBeforeMin: Number(row.buffer_before_min ?? row.bufferBeforeMin ?? 0),
    bufferAfterMin: Number(row.buffer_after_min ?? row.bufferAfterMin ?? 0),
    noticeMinimumHours: Number(row.notice_minimum_hours ?? row.noticeMinimumHours ?? 0),
    maxBookingsPerDay: Number(row.max_bookings_per_day ?? row.maxBookingsPerDay ?? 0),
    isActive: Boolean(row.is_active ?? row.isActive),
    color: row.color || "#2563eb",
  };
}

function normalizeOverride(row) {
  return {
    id: row.id,
    overrideDate: row.override_date || row.overrideDate || "",
    startTime: normalizeTime(row.start_time, "09:00"),
    endTime: normalizeTime(row.end_time, "17:00"),
    isAvailable: Boolean(row.is_available ?? row.isAvailable),
    note: row.note || "",
  };
}

function formatDateLabel(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateHuman(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

function buildMonthGrid(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = [];

  for (let index = 0; index < startDay; index += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push({ key: date, label: day, date, inMonth: true });
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function groupOverridesByDate(rows = []) {
  const map = new Map();

  rows.forEach((row) => {
    const date = row.overrideDate;
    const current = map.get(date) || {
      date,
      enabled: false,
      note: row.note || "",
      slots: [],
      sourceIds: [],
    };

    current.note = current.note || row.note || "";
    current.sourceIds.push(row.id);

    if (row.isAvailable) {
      current.enabled = true;
      current.slots.push({
        id: row.id || makeId("override"),
        startTime: normalizeTime(row.startTime, "09:00"),
        endTime: normalizeTime(row.endTime, "17:00"),
      });
    }

    map.set(date, current);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function locationLabel(locationType) {
  const value = String(locationType || "").toLowerCase();
  if (value === "google_meet") return "Google Meet";
  if (value === "zoom") return "Zoom";
  if (value === "in_person") return "In person";
  if (value === "custom") return "Custom link";
  return "Custom";
}

function GlassSelect({
  value,
  onChange,
  options,
  className = "",
  ariaLabel,
  displayMode = "12h",
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: formatTimeLabel(option, displayMode) }
      : {
          value: option.value,
          label: option.label || formatTimeLabel(option.value, displayMode),
        }
  );

  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        className={cn(
          "h-10 w-full appearance-none rounded-[18px] border border-slate-200 bg-white/90 px-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-[#8DB2FF] dark:border-white/10 dark:bg-white/[0.05] dark:text-white",
          className
        )}
      >
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export default function AvailabilityPanel() {
  const [activeTab, setActiveTab] = useState("Weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewSession, setPreviewSession] = useState(false);
  const [timeMode, setTimeMode] = useState("12h");
  const [weeklyDays, setWeeklyDays] = useState(buildDefaultWeekdays());
  const [timezone, setTimezone] = useState("UTC");
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [ruleDraft, setRuleDraft] = useState({
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    noticeMinimumHours: 0,
    maxBookingsPerDay: 0,
    isActive: true,
  });
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [calendarSettings, setCalendarSettings] = useState({
    selectedProvider: "",
    includeBuffers: false,
    autoSync: false,
  });
  const [savingCalendarSettings, setSavingCalendarSettings] = useState(false);
  const [busyCalendarProvider, setBusyCalendarProvider] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [overrideDraft, setOverrideDraft] = useState({
    overrideDate: "",
    isAvailable: true,
    startTime: "09:00",
    endTime: "17:00",
    slots: [{ id: "override-slot-1", startTime: "09:00", endTime: "17:00" }],
    note: "",
  });
  const [dragState, setDragState] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverrideId, setDeletingOverrideId] = useState("");

  const selectedEvent = useMemo(
    () => eventTypes.find((item) => item.id === selectedEventId) || eventTypes[0] || null,
    [eventTypes, selectedEventId]
  );

  const googleCalendar = useMemo(
    () => calendars.find((item) => item.providerKey === "google-calendar") || null,
    [calendars]
  );

  const summary = useMemo(() => {
    const activeDays = weeklyDays.filter((day) => day.enabled).length;
    const activeEventTypes = eventTypes.filter((item) => item.isActive).length;
    const connectedCalendars = calendars.filter((item) => item.connected).length;
    const overrideCount = overrides.length;
    return { activeDays, activeEventTypes, connectedCalendars, overrideCount };
  }, [weeklyDays, eventTypes, calendars, overrides]);

  const groupedOverrides = useMemo(() => groupOverridesByDate(overrides), [overrides]);

  const selectedOverride = useMemo(() => {
    return (
      groupedOverrides.find((item) => item.date === selectedDate) || {
        date: selectedDate,
        enabled: true,
        note: "",
        slots: [{ id: makeId("override"), startTime: "09:00", endTime: "17:00" }],
        sourceIds: [],
      }
    );
  }, [groupedOverrides, selectedDate]);

  const monthGrid = useMemo(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    return buildMonthGrid(year || 2026, Math.max((month || 3) - 1, 0));
  }, [selectedDate]);

  const applyPreviewState = () => {
    setPreviewSession(true);
    setTimezone("UTC");
    setWeeklyDays(buildDefaultWeekdays());
    setOverrides([]);
    setCalendars(PREVIEW_CALENDARS);
    setCalendarSettings({
      selectedProvider: "",
      includeBuffers: false,
      autoSync: false,
    });
    setEventTypes(PREVIEW_EVENT_TYPES.map(normalizeEventType));
    setSelectedEventId(PREVIEW_EVENT_TYPES[0].id);
    setError("");
    setNotice("");
  };

  const loadPanel = async () => {
    setLoading(true);
    setError("");
    const token = getAuthToken();
    if (!token) {
      applyPreviewState();
      setLoading(false);
      return;
    }

    try {
      const [mePayload, availabilityPayload, eventPayload, calendarPayload] = await Promise.all([
        apiFetch("/api/auth/me"),
        apiFetch("/api/availability"),
        apiFetch("/api/event-types?includeInactive=true"),
        apiFetch("/api/integrations/calendars"),
      ]);

      const nextEventTypes = (eventPayload?.eventTypes || []).map(normalizeEventType);
      const nextOverrides = (availabilityPayload?.overrides || []).map(normalizeOverride);
      const nextCalendars = calendarPayload?.calendars || [];

      setTimezone(mePayload?.user?.timezone || "UTC");
      setWeeklyDays(buildWeeklyDays(availabilityPayload?.weekly || []));
      setOverrides(nextOverrides);
      setEventTypes(nextEventTypes);
      setSelectedEventId((current) => current || nextEventTypes[0]?.id || "");
      setCalendars(nextCalendars);
      setCalendarSettings({
        selectedProvider: calendarPayload?.selectedProvider || nextCalendars.find((item) => item.connected)?.providerKey || "",
        includeBuffers: Boolean(calendarPayload?.includeBuffers),
        autoSync: Boolean(calendarPayload?.autoSync),
      });
      setPreviewSession(false);
    } catch (loadError) {
      if (loadError?.status === 401) {
        applyPreviewState();
      } else {
        setError(loadError.message || "Failed to load availability.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPanel();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const params = new URLSearchParams(window.location.search);
    if (!params.get("success") && !params.get("error") && !params.get("trace")) {
      return undefined;
    }

    params.delete("success");
    params.delete("error");
    params.delete("trace");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash || ""}`;
    window.history.replaceState({}, "", nextUrl);
    return undefined;
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    setRuleDraft({
      bufferBeforeMin: selectedEvent.bufferBeforeMin,
      bufferAfterMin: selectedEvent.bufferAfterMin,
      noticeMinimumHours: selectedEvent.noticeMinimumHours,
      maxBookingsPerDay: selectedEvent.maxBookingsPerDay,
      isActive: selectedEvent.isActive,
    });
  }, [selectedEvent]);

  useEffect(() => {
    setOverrideDraft({
      overrideDate: selectedOverride.date,
      isAvailable: selectedOverride.enabled,
      startTime: selectedOverride.slots[0]?.startTime || "09:00",
      endTime: selectedOverride.slots[0]?.endTime || "17:00",
      slots:
        selectedOverride.slots.length > 0
          ? selectedOverride.slots.map((slot) => ({ ...slot }))
          : [{ id: makeId("override"), startTime: "09:00", endTime: "17:00" }],
      note: selectedOverride.note || "",
    });
  }, [selectedOverride]);

  const updateDayState = (weekday, updater) => {
    setWeeklyDays((current) =>
      current.map((day) => (day.weekday === weekday ? updater(day) : day))
    );
  };

  const handleToggleDay = (weekday) => {
    updateDayState(weekday, (day) => ({ ...day, enabled: !day.enabled }));
  };

  const handleAddSlot = (weekday) => {
    updateDayState(weekday, (day) => ({
      ...day,
      enabled: true,
      slots: [
        ...day.slots,
        { id: `${day.key}-${Date.now()}`, startTime: "09:00", endTime: "17:00" },
      ],
    }));
  };

  const handleDuplicateSlot = (weekday, slotId) => {
    updateDayState(weekday, (day) => {
      const slot = day.slots.find((item) => item.id === slotId);
      if (!slot) return day;
      const slotIndex = day.slots.findIndex((item) => item.id === slotId);
      const nextSlots = [...day.slots];
      nextSlots.splice(slotIndex + 1, 0, {
        ...slot,
        id: `${day.key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      });
      return { ...day, enabled: true, slots: nextSlots };
    });
  };

  const handleRemoveSlot = (weekday, slotId) => {
    updateDayState(weekday, (day) => {
      const nextSlots = day.slots.filter((slot) => slot.id !== slotId);
      return {
        ...day,
        slots: nextSlots.length ? nextSlots : [{ id: `${day.key}-slot-1`, startTime: "09:00", endTime: "17:00" }],
      };
    });
  };

  const handleSlotChange = (weekday, slotId, field, value) => {
    updateDayState(weekday, (day) => ({
      ...day,
      slots: day.slots.map((slot) =>
        slot.id === slotId ? { ...slot, [field]: value } : slot
      ),
    }));
  };

  const handleMoveSlot = (weekday, sourceId, targetId) => {
    updateDayState(weekday, (day) => {
      const sourceIndex = day.slots.findIndex((slot) => slot.id === sourceId);
      const targetIndex = day.slots.findIndex((slot) => slot.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return day;
      const nextSlots = [...day.slots];
      const [sourceItem] = nextSlots.splice(sourceIndex, 1);
      nextSlots.splice(targetIndex, 0, sourceItem);
      return { ...day, slots: nextSlots };
    });
  };

  const handleCopyMonday = () => {
    const monday = weeklyDays.find((day) => day.key === "Mon");
    if (!monday) return;
    setWeeklyDays((current) =>
      current.map((day) =>
        ["Tue", "Wed", "Thu", "Fri"].includes(day.key)
          ? {
              ...day,
              enabled: monday.enabled,
              slots: monday.enabled
                ? monday.slots.map((slot) => ({
                    ...slot,
                    id: `${day.key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  }))
                : [{ id: `${day.key}-slot-1`, startTime: "09:00", endTime: "17:00" }],
            }
          : day
      )
    );
  };

  const handleApplyPreset = (preset) => {
    if (preset === "reset") {
      setWeeklyDays(buildDefaultWeekdays());
      return;
    }

    const endTime = preset === "morning" ? "13:00" : "17:00";
    setWeeklyDays((current) =>
      current.map((day) => {
        const enabled = day.weekday >= 1 && day.weekday <= 5;
        return {
          ...day,
          enabled,
          slots: enabled
            ? [{ id: `${day.key}-preset`, startTime: "09:00", endTime }]
            : [{ id: `${day.key}-slot-1`, startTime: "09:00", endTime: "17:00" }],
        };
      })
    );
  };

  const handleSaveWeekly = async () => {
    setSavingWeekly(true);
    setError("");
    setNotice("");
    try {
      const slots = serializeWeeklyDays(weeklyDays);
      if (!slots.length) {
        throw new Error("Add at least one available time window before saving.");
      }
      if (previewSession) {
        setNotice("Preview mode: weekly availability updated locally.");
        return;
      }
      await apiFetch("/api/availability/weekly", {
        method: "PUT",
        body: { slots },
      });
      setNotice("Weekly availability updated.");
      await loadPanel();
    } catch (saveError) {
      setError(saveError.message || "Failed to save weekly availability.");
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleSaveRules = async () => {
    if (!selectedEvent) return;
    setSavingRules(true);
    setError("");
    setNotice("");
    try {
      if (previewSession) {
        const nextEvent = normalizeEventType({
          ...selectedEvent,
          bufferBeforeMin: Number(ruleDraft.bufferBeforeMin || 0),
          bufferAfterMin: Number(ruleDraft.bufferAfterMin || 0),
          noticeMinimumHours: Number(ruleDraft.noticeMinimumHours || 0),
          maxBookingsPerDay: Number(ruleDraft.maxBookingsPerDay || 0),
          isActive: ruleDraft.isActive,
        });
        setEventTypes((current) => current.map((item) => (item.id === nextEvent.id ? nextEvent : item)));
        setNotice(`Preview mode: updated rules for ${nextEvent.title}.`);
        return;
      }
      const payload = await apiFetch(`/api/event-types/${selectedEvent.id}`, {
        method: "PATCH",
        body: {
          bufferBeforeMin: Number(ruleDraft.bufferBeforeMin || 0),
          bufferAfterMin: Number(ruleDraft.bufferAfterMin || 0),
          noticeMinimumHours: Number(ruleDraft.noticeMinimumHours || 0),
          maxBookingsPerDay: Number(ruleDraft.maxBookingsPerDay || 0),
        },
      });
      let nextEvent = normalizeEventType(payload?.eventType || selectedEvent);
      if (nextEvent.isActive !== ruleDraft.isActive) {
        const activePayload = await apiFetch(`/api/event-types/${selectedEvent.id}/active`, {
          method: "PATCH",
          body: { isActive: ruleDraft.isActive },
        });
        nextEvent = normalizeEventType(activePayload?.eventType || nextEvent);
      }
      setEventTypes((current) => current.map((item) => (item.id === nextEvent.id ? nextEvent : item)));
      setNotice(`Updated rules for ${nextEvent.title}.`);
    } catch (saveError) {
      setError(saveError.message || "Failed to save event rules.");
    } finally {
      setSavingRules(false);
    }
  };

  const handleSaveCalendarSettings = async () => {
    setSavingCalendarSettings(true);
    setError("");
    setNotice("");
    try {
      if (previewSession) {
        setNotice("Preview mode: calendar settings updated locally.");
        return;
      }
      const payload = await apiFetch("/api/integrations/calendars/settings", {
        method: "PATCH",
        body: {
          selectedProvider: calendarSettings.selectedProvider || null,
          includeBuffers: calendarSettings.includeBuffers,
          autoSync: calendarSettings.autoSync,
        },
      });
      setCalendarSettings({
        selectedProvider: payload?.settings?.selectedProvider || "",
        includeBuffers: Boolean(payload?.settings?.includeBuffers),
        autoSync: Boolean(payload?.settings?.autoSync),
      });
      setNotice("Calendar settings saved.");
      await loadPanel();
    } catch (saveError) {
      setError(saveError.message || "Failed to save calendar settings.");
    } finally {
      setSavingCalendarSettings(false);
    }
  };

  const handleConnectGoogle = async () => {
    setError("");
    try {
      if (previewSession) {
        setNotice("Preview mode: Google Calendar connection is disabled locally.");
        return;
      }
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
      const payload = await apiFetch(
        `/api/integrations/google-calendar/auth-url?returnPath=${encodeURIComponent(returnPath)}`
      );
      const url = payload?.url || "";
      if (!url) throw new Error("Could not start Google Calendar connection.");
      window.location.href = url;
    } catch (connectError) {
      setError(connectError.message || "Failed to start Google Calendar connection.");
    }
  };

  const handleCalendarAction = async (provider, action) => {
    setBusyCalendarProvider(provider);
    setError("");
    setNotice("");
    try {
      if (previewSession) {
        setNotice(
          action === "sync"
            ? "Preview mode: calendar sync simulated."
            : "Preview mode: calendar disconnect simulated."
        );
        return;
      }
      if (action === "sync") {
        await apiFetch(`/api/integrations/calendars/${provider}/sync`, { method: "POST" });
        setNotice("Calendar synced.");
      } else if (action === "disconnect") {
        await apiFetch(`/api/integrations/calendars/${provider}/disconnect`, { method: "POST" });
        setNotice("Calendar disconnected.");
      }
      await loadPanel();
    } catch (calendarError) {
      setError(calendarError.message || "Calendar action failed.");
    } finally {
      setBusyCalendarProvider("");
    }
  };

  const handleSaveOverride = async () => {
    setSavingOverride(true);
    setError("");
    setNotice("");
    try {
      if (previewSession) {
        const nextRows = [];
        if (overrideDraft.isAvailable) {
          const validSlots = overrideDraft.slots.filter(
            (slot) => slot.startTime && slot.endTime && slot.startTime < slot.endTime
          );
          if (!validSlots.length) {
            throw new Error("Add at least one valid override slot before saving.");
          }
          validSlots.forEach((slot) => {
            nextRows.push({
              id: makeId("preview-override"),
              overrideDate: selectedDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isAvailable: true,
              note: overrideDraft.note,
            });
          });
        } else {
          nextRows.push({
            id: makeId("preview-override"),
            overrideDate: selectedDate,
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: false,
            note: overrideDraft.note,
          });
        }
        setOverrides((current) =>
          [...current.filter((item) => item.overrideDate !== selectedDate), ...nextRows].sort((a, b) =>
            a.overrideDate.localeCompare(b.overrideDate)
          )
        );
        setNotice("Preview mode: override saved locally.");
        return;
      }
      const existingForDate = overrides.filter((item) => item.overrideDate === selectedDate);
      if (existingForDate.length) {
        await Promise.all(
          existingForDate.map((item) =>
            apiFetch(`/api/availability/overrides/${item.id}`, { method: "DELETE" })
          )
        );
      }

      const nextRows = [];
      if (overrideDraft.isAvailable) {
        const validSlots = overrideDraft.slots.filter(
          (slot) => slot.startTime && slot.endTime && slot.startTime < slot.endTime
        );
        if (!validSlots.length) {
          throw new Error("Add at least one valid override slot before saving.");
        }

        for (const slot of validSlots) {
          const response = await apiFetch("/api/availability/overrides", {
            method: "POST",
            body: {
              overrideDate: selectedDate,
              isAvailable: true,
              startTime: slot.startTime,
              endTime: slot.endTime,
              note: overrideDraft.note,
            },
          });
          nextRows.push(normalizeOverride(response?.override));
        }
      } else {
        const response = await apiFetch("/api/availability/overrides", {
          method: "POST",
          body: {
            overrideDate: selectedDate,
            isAvailable: false,
            note: overrideDraft.note,
          },
        });
        nextRows.push(normalizeOverride(response?.override));
      }

      setOverrides((current) =>
        [...current.filter((item) => item.overrideDate !== selectedDate), ...nextRows].sort((a, b) =>
          a.overrideDate.localeCompare(b.overrideDate)
        )
      );
      setNotice("Override saved.");
    } catch (overrideError) {
      setError(overrideError.message || "Failed to save override.");
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (overrideId) => {
    setDeletingOverrideId(overrideId);
    setError("");
    setNotice("");
    try {
      if (previewSession) {
        setOverrides((current) => current.filter((item) => item.id !== overrideId));
        setNotice("Preview mode: override removed locally.");
        return;
      }
      await apiFetch(`/api/availability/overrides/${overrideId}`, { method: "DELETE" });
      setOverrides((current) => current.filter((item) => item.id !== overrideId));
      setNotice("Override removed.");
    } catch (overrideError) {
      setError(overrideError.message || "Failed to delete override.");
    } finally {
      setDeletingOverrideId("");
    }
  };

  const handleClearSelectedOverride = async () => {
    const existingForDate = overrides.filter((item) => item.overrideDate === selectedDate);
    if (!existingForDate.length) {
      setOverrideDraft({
        overrideDate: selectedDate,
        isAvailable: true,
        startTime: "09:00",
        endTime: "17:00",
        slots: [{ id: makeId("override"), startTime: "09:00", endTime: "17:00" }],
        note: "",
      });
      return;
    }

    setDeletingOverrideId(selectedDate);
    setError("");
    setNotice("");
    try {
      if (previewSession) {
        setOverrides((current) => current.filter((item) => item.overrideDate !== selectedDate));
        setNotice("Preview mode: override cleared locally.");
        return;
      }
      await Promise.all(
        existingForDate.map((item) =>
          apiFetch(`/api/availability/overrides/${item.id}`, { method: "DELETE" })
        )
      );
      setOverrides((current) => current.filter((item) => item.overrideDate !== selectedDate));
      setNotice("Override cleared.");
    } catch (overrideError) {
      setError(overrideError.message || "Failed to clear override.");
    } finally {
      setDeletingOverrideId("");
    }
  };

  if (loading) {
    return (
      <div className="rounded-[34px] border border-[#DFE7F3] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-44 rounded-full bg-slate-200 dark:bg-white/10" />
          <div className="h-14 rounded-[24px] bg-slate-200 dark:bg-white/10" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 rounded-[24px] bg-slate-200 dark:bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-[#DFE7F3] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_26%),linear-gradient(180deg,#eef4ff_0%,#edf2f7_35%,#f7fbff_100%)] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] sm:p-6 xl:p-8 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.10),_transparent_24%),linear-gradient(180deg,#081120_0%,#0b1424_35%,#0d182b_100%)]">
      <div className="pointer-events-none absolute -left-20 top-14 h-72 w-72 rounded-full bg-blue-400/12 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative z-10">
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

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <GlassButton onClick={handleCopyMonday} className="h-10 rounded-full px-4 text-[13px]">
              <Copy className="h-4 w-4" /> Copy Monday
            </GlassButton>
            <GlassButton onClick={() => handleApplyPreset("work")} className="h-10 rounded-full px-4 text-[13px]">
              <Check className="h-4 w-4" /> 9-5 week
            </GlassButton>
            <GlassButton onClick={() => handleApplyPreset("morning")} className="h-10 rounded-full px-4 text-[13px]">
              <Clock3 className="h-4 w-4" /> Morning only
            </GlassButton>
            <GlassButton onClick={() => handleApplyPreset("reset")} className="h-10 rounded-full px-4 text-[13px]">
              <RotateCcw className="h-4 w-4" /> Reset
            </GlassButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-white/40 bg-white/55 p-1 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
              {["12h", "24h"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimeMode(mode)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    timeMode === mode
                      ? "bg-white text-slate-900 dark:bg-[#132544] dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="relative min-w-[180px]">
              <select
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="h-10 w-full appearance-none rounded-2xl border border-white/40 bg-white/55 px-4 pr-10 text-sm font-medium text-slate-800 outline-none shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"].map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
              <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <GlassButton onClick={loadPanel} className="h-10 rounded-full px-4 text-[13px]">
              <RefreshCw className="h-4 w-4" /> Refresh
            </GlassButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 rounded-[22px] border border-white/40 bg-white/55 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-[18px] px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:bg-[#132544] dark:text-white"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Weekly" && (
          <section className="mt-5 space-y-5">
            <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#0A1427] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)] dark:border-white/10">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    <Wand2 className="h-3.5 w-3.5" /> Compact weekly editor
                  </div>
                  <p className="font-['Sora'] text-[20px] font-semibold tracking-[-0.03em] text-white">Weekly availability</p>
                  <p className="mt-1 text-[13px] text-white/55">Compact slots, working dropdowns, and less scroll across the whole page.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  {summary.activeDays} active days
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/10">
                <div className="hidden grid-cols-[120px_84px_minmax(0,1fr)_110px] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 md:grid">
                  <div>Day</div>
                  <div>Open</div>
                  <div>Slots</div>
                  <div className="text-right">Actions</div>
                </div>

                <div className="divide-y divide-white/10">
                  {weeklyDays.map((day) => (
                    <div key={day.weekday} className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[120px_84px_minmax(0,1fr)_110px] md:items-start">
                      <div>
                        <div className="text-base font-semibold text-white">{day.label}</div>
                        <div className="mt-1 text-xs text-white/45">
                          {day.enabled ? `${day.slots.length} slot${day.slots.length > 1 ? "s" : ""}` : "Unavailable"}
                        </div>
                      </div>

                      <div className="pt-0.5">
                        <Toggle checked={day.enabled} onChange={() => handleToggleDay(day.weekday)} />
                      </div>

                      <div className="space-y-2">
                        {day.enabled && day.slots.length > 0 ? (
                          day.slots.map((slot) => (
                            <div
                              key={slot.id}
                              draggable
                              onDragStart={() => setDragState({ weekday: day.weekday, slotId: slot.id })}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => {
                                if (dragState && dragState.weekday === day.weekday) {
                                  handleMoveSlot(day.weekday, dragState.slotId, slot.id);
                                }
                                setDragState(null);
                              }}
                              className={cn(
                                "grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 sm:grid-cols-[34px_minmax(0,1fr)_20px_minmax(0,1fr)_40px_40px_40px]",
                                dragState?.slotId === slot.id ? "border-cyan-300/30 bg-cyan-400/5" : ""
                              )}
                            >
                              <div className="flex h-10 cursor-grab items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/40 active:cursor-grabbing">
                                <GripVertical className="h-4 w-4" />
                              </div>

                              <GlassSelect
                                value={slot.startTime}
                                onChange={(event) => handleSlotChange(day.weekday, slot.id, "startTime", event.target.value)}
                                options={TIME_VALUES}
                                displayMode={timeMode}
                                ariaLabel={`${day.label} start time`}
                                className="h-10 rounded-2xl border-white/10 bg-white/[0.06] text-white hover:border-white/20 focus:border-cyan-400/40 dark:border-white/10 dark:bg-white/[0.05]"
                              />

                              <div className="flex items-center justify-center text-white/35">—</div>

                              <GlassSelect
                                value={slot.endTime}
                                onChange={(event) => handleSlotChange(day.weekday, slot.id, "endTime", event.target.value)}
                                options={TIME_VALUES}
                                displayMode={timeMode}
                                ariaLabel={`${day.label} end time`}
                                className="h-10 rounded-2xl border-white/10 bg-white/[0.06] text-white hover:border-white/20 focus:border-cyan-400/40 dark:border-white/10 dark:bg-white/[0.05]"
                              />

                              <button
                                type="button"
                                onClick={() => handleDuplicateSlot(day.weekday, slot.id)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-white/20 hover:bg-white/[0.08]"
                                title="Duplicate slot"
                              >
                                <Copy className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(day.weekday, slot.id)}
                                disabled={day.slots.length === 1}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Delete slot"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAddSlot(day.weekday)}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200 transition hover:bg-cyan-400/15"
                                title="Add slot"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="flex h-10 items-center rounded-2xl border border-dashed border-white/10 px-4 text-sm text-white/35">
                            Not available on this day
                          </div>
                        )}
                      </div>

                      <div className="flex items-start justify-start md:justify-end">
                        <button
                          type="button"
                          onClick={() => handleAddSlot(day.weekday)}
                          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/80 transition hover:border-cyan-300/20 hover:bg-white/[0.08]"
                        >
                          <Plus className="h-4 w-4" /> Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <GlassButton onClick={handleSaveWeekly} className="mt-4 h-11 rounded-2xl px-5 text-[13px]" disabled={savingWeekly}>
                {savingWeekly ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Save weekly hours
              </GlassButton>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#15376D] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)] dark:border-white/10">
                <p className="font-['Sora'] text-[20px] font-semibold tracking-[-0.03em]">Timezone & delivery</p>
                <p className="mt-3 text-[13px] leading-6 text-slate-200">Bookings stay in UTC under the hood while invitees still see slots in their local timezone.</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <Clock3 className="h-4 w-4" /> Host timezone: {timezone}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#0A1427] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)] dark:border-white/10">
                <p className="font-['Sora'] text-[18px] font-semibold tracking-[-0.03em]">Preview summary</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-white/45">Active working days</div>
                    <div className="mt-1 font-semibold text-white">{summary.activeDays} / 7 days</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-white/45">Display format</div>
                    <div className="mt-1 font-semibold text-white">{timeMode === "12h" ? "12-hour clock" : "24-hour clock"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-white/45">Connected calendars</div>
                    <div className="mt-1 font-semibold text-white">{summary.connectedCalendars}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "Overrides" && (
          <section className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#0A1427] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-['Sora'] text-[20px] font-semibold tracking-[-0.03em]">Date overrides</p>
                  <p className="mt-1 text-[13px] text-white/55">Pick specific dates for blackout days or custom windows.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/55">
                  <CalendarDays className="h-4 w-4" /> Calendar
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-[0.18em] text-white/35">
                {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                  <div key={`${label}-${index}`}>{label}</div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {monthGrid.map((day, index) => {
                  if (!day) return <div key={`empty-${index}`} className="h-10 rounded-xl" />;
                  const hasOverride = groupedOverrides.some((item) => item.date === day.date);
                  const isSelected = day.date === selectedDate;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className={cn(
                        "relative h-10 rounded-xl border text-sm font-medium transition",
                        isSelected
                          ? "border-cyan-300/40 bg-cyan-400/12 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                          : "border-white/8 bg-white/[0.04] text-white/80 hover:border-white/20",
                        hasOverride && !isSelected ? "border-blue-300/20 bg-blue-400/10" : ""
                      )}
                    >
                      {day.label}
                      {hasOverride ? <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/65">
                Dates with dots already have overrides saved. Pick one to edit it on the right.
              </div>
            </div>

            <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#0A1427] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-['Sora'] text-[20px] font-semibold tracking-[-0.03em]">{formatDateHuman(selectedDate)}</p>
                  <p className="mt-1 text-[13px] text-white/55">Override only for this date.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={overrideDraft.isAvailable}
                    onChange={() =>
                      setOverrideDraft((current) => ({
                        ...current,
                        isAvailable: !current.isAvailable,
                        slots: !current.isAvailable
                          ? current.slots.length
                            ? current.slots
                            : [{ id: makeId("override"), startTime: "09:00", endTime: "17:00" }]
                          : [],
                      }))
                    }
                  />
                  <span className="text-sm font-medium text-white/80">
                    {overrideDraft.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <GlassButton
                  onClick={() =>
                    setOverrideDraft((current) => ({
                      ...current,
                      isAvailable: true,
                      slots: [...current.slots, { id: makeId("override"), startTime: "10:00", endTime: "14:00" }],
                    }))
                  }
                  className="h-10 rounded-full px-4 text-[13px]"
                >
                  <Plus className="h-4 w-4" /> Add slot
                </GlassButton>
                <GlassButton
                  onClick={handleClearSelectedOverride}
                  className="h-10 rounded-full px-4 text-[13px]"
                  disabled={deletingOverrideId === selectedDate}
                >
                  {deletingOverrideId === selectedDate ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Clear override
                </GlassButton>
              </div>

              <div className="space-y-3">
                {overrideDraft.isAvailable && overrideDraft.slots.length > 0 ? (
                  overrideDraft.slots.map((slot) => (
                    <div key={slot.id} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_40px]">
                      <GlassSelect
                        value={slot.startTime}
                        onChange={(event) =>
                          setOverrideDraft((current) => ({
                            ...current,
                            startTime: event.target.value,
                            slots: current.slots.map((item) =>
                              item.id === slot.id ? { ...item, startTime: event.target.value } : item
                            ),
                          }))
                        }
                        options={TIME_VALUES}
                        displayMode={timeMode}
                        ariaLabel="Override start time"
                        className="h-10 rounded-2xl border-white/10 bg-white/[0.06] text-white hover:border-white/20 focus:border-cyan-400/40 dark:border-white/10 dark:bg-white/[0.05]"
                      />
                      <div className="flex items-center justify-center text-white/35">—</div>
                      <GlassSelect
                        value={slot.endTime}
                        onChange={(event) =>
                          setOverrideDraft((current) => ({
                            ...current,
                            endTime: event.target.value,
                            slots: current.slots.map((item) =>
                              item.id === slot.id ? { ...item, endTime: event.target.value } : item
                            ),
                          }))
                        }
                        options={TIME_VALUES}
                        displayMode={timeMode}
                        ariaLabel="Override end time"
                        className="h-10 rounded-2xl border-white/10 bg-white/[0.06] text-white hover:border-white/20 focus:border-cyan-400/40 dark:border-white/10 dark:bg-white/[0.05]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setOverrideDraft((current) => ({
                            ...current,
                            slots: current.slots.filter((item) => item.id !== slot.id),
                          }))
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:border-rose-400/20 hover:bg-rose-500/10 hover:text-rose-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">
                    This date is unavailable or has no custom slots yet.
                  </div>
                )}
              </div>

              <label className="mt-4 grid gap-2 text-sm text-white/70">
                <span className="font-medium">Note</span>
                <textarea
                  value={overrideDraft.note}
                  onChange={(event) => setOverrideDraft((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Holiday, offsite, travel day..."
                  className="min-h-[96px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition hover:border-white/20 focus:border-cyan-400/40"
                />
              </label>

              <GlassButton onClick={handleSaveOverride} className="mt-4 h-11 rounded-2xl px-5 text-[13px]" disabled={savingOverride}>
                {savingOverride ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Save override
              </GlassButton>
            </div>
          </section>
        )}

        {activeTab === "Limits" && (
          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_320px]">
            <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#0A1427] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    <CalendarDays className="h-3.5 w-3.5" /> Booking limits
                  </div>
                  <p className="font-['Sora'] text-[20px] font-semibold tracking-[-0.03em] text-white">Compact rules panel</p>
                  <p className="mt-1 text-[13px] text-white/55">Tune buffers, notice, limits, and event behavior without leaving the page.</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-cyan-200">
                  {selectedEvent ? locationLabel(selectedEvent.locationType) : "No event type"}
                </div>
              </div>

              {eventTypes.length ? (
                <>
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-white/45">Event type</label>
                    <div className="relative">
                      <select
                        value={selectedEventId}
                        onChange={(event) => setSelectedEventId(event.target.value)}
                        className="h-11 w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.06] px-4 pr-10 text-sm font-medium text-white outline-none hover:border-white/20 focus:border-cyan-400/40"
                      >
                        {eventTypes.map((item) => (
                          <option key={item.id} value={item.id}>{item.title}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      { key: "bufferBeforeMin", label: "Buffer before", suffix: "min" },
                      { key: "bufferAfterMin", label: "Buffer after", suffix: "min" },
                      { key: "noticeMinimumHours", label: "Minimum notice", suffix: "hrs" },
                      { key: "maxBookingsPerDay", label: "Max bookings / day", suffix: "" },
                    ].map((field) => (
                      <label key={field.key} className="block">
                        <span className="mb-2 block text-sm font-medium text-white/65">{field.label}</span>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={ruleDraft[field.key]}
                            onChange={(event) => setRuleDraft((current) => ({ ...current, [field.key]: Number(event.target.value || 0) }))}
                            className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 pr-14 text-white outline-none transition hover:border-white/20 focus:border-cyan-400/40"
                          />
                          {field.suffix ? <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40">{field.suffix}</span> : null}
                        </div>
                      </label>
                    ))}
                  </div>

                  <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={ruleDraft.isActive}
                      onChange={(event) => setRuleDraft((current) => ({ ...current, isActive: event.target.checked }))}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-cyan-400"
                    />
                    <span className="text-sm text-white/80">Keep this event type active</span>
                  </label>

                  <GlassButton onClick={handleSaveRules} className="mt-4 h-11 rounded-2xl px-5 text-[13px]" disabled={savingRules}>
                    {savingRules ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Save event rules
                  </GlassButton>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">
                  Create an event type first to configure booking limits.
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#0A1427] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)]">
                <p className="font-['Sora'] text-[18px] font-semibold tracking-[-0.03em]">Rules preview</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-white/45">Event type</div>
                    <div className="mt-1 font-semibold text-white">{selectedEvent?.title || "No event type selected"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-white/45">Minimum notice</div>
                    <div className="mt-1 font-semibold text-white">{ruleDraft.noticeMinimumHours} hours</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-white/45">Buffers</div>
                    <div className="mt-1 font-semibold text-white">{ruleDraft.bufferBeforeMin}m before · {ruleDraft.bufferAfterMin}m after</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-white/45">Daily capacity</div>
                    <div className="mt-1 font-semibold text-white">{ruleDraft.maxBookingsPerDay > 0 ? `${ruleDraft.maxBookingsPerDay} bookings max` : "Unlimited"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#D7E1F0] bg-gradient-to-br from-[#0F1F3D] to-[#15376D] p-5 text-white shadow-[0_24px_60px_rgba(15,31,61,0.18)] dark:border-white/10">
                <p className="font-['Sora'] text-[18px] font-semibold tracking-[-0.03em]">Timezone & delivery</p>
                <p className="mt-3 text-[13px] leading-6 text-slate-200">Limits apply to event slot generation before the public page renders availability in each invitee’s local timezone.</p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  <Clock3 className="h-4 w-4" /> Host timezone: {timezone}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "Calendar sync" && (
          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-['Sora'] text-[22px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Connected calendars</p>
                    <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">These integrations block conflicts and create the meetings your invitees book.</p>
                  </div>
                  {!googleCalendar?.connected ? (
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(37,99,235,0.28)] transition hover:brightness-105"
                    >
                      <Link2 className="h-4 w-4" /> Connect Google Calendar
                    </button>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {calendars.map((calendar) => (
                    <div key={calendar.providerKey} className="flex flex-col gap-4 rounded-[24px] border border-[#E2EAF4] bg-[#FBFCFE] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[16px] font-semibold text-slate-900 dark:text-white">{calendar.provider}</p>
                          <span className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            calendar.connected
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                          )}>
                            {calendar.connected ? "Connected" : "Disconnected"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{calendar.accountEmail || "No account connected"}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Last sync: {calendar.lastSync}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {calendar.connected ? (
                          <>
                            <GlassButton onClick={() => handleCalendarAction(calendar.providerKey, "sync")} className="h-11 rounded-full px-4" disabled={busyCalendarProvider === calendar.providerKey}>
                              {busyCalendarProvider === calendar.providerKey ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync
                            </GlassButton>
                            <button
                              type="button"
                              onClick={() => handleCalendarAction(calendar.providerKey, "disconnect")}
                              className="inline-flex h-11 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
                              disabled={busyCalendarProvider === calendar.providerKey}
                            >
                              <Trash2 className="h-4 w-4" /> Disconnect
                            </button>
                          </>
                        ) : calendar.providerKey === "google-calendar" ? (
                          <GlassButton onClick={handleConnectGoogle} className="h-11 rounded-full px-4">
                            <ExternalLink className="h-4 w-4" /> Start OAuth
                          </GlassButton>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">Manual connection not enabled</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-[#D7E1F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,31,61,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2563EB] dark:bg-[#132544] dark:text-[#8DB2FF]">
                    <Settings2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-['Sora'] text-[20px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Sync behavior</p>
                    <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">Choose the default calendar destination and how buffers are applied.</p>
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Calendar destination</label>
                    <div className="relative">
                      <select
                        value={calendarSettings.selectedProvider}
                        onChange={(event) => setCalendarSettings((current) => ({ ...current, selectedProvider: event.target.value }))}
                        className="h-12 w-full appearance-none rounded-2xl border border-[#D7E1F0] bg-white px-4 pr-10 text-sm font-medium text-slate-800 outline-none dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                      >
                        <option value="">No default selected</option>
                        {calendars.filter((item) => item.connected).map((item) => (
                          <option key={item.providerKey} value={item.providerKey}>{item.provider}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[#E2EAF4] bg-[#FBFCFE] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Include buffers on calendar</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reserve padding blocks before and after meetings in your connected calendar.</p>
                      </div>
                      <Toggle
                        checked={calendarSettings.includeBuffers}
                        onChange={() => setCalendarSettings((current) => ({ ...current, includeBuffers: !current.includeBuffers }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[#E2EAF4] bg-[#FBFCFE] p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Auto sync meeting changes</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Push reschedules and cancellations to the connected calendar automatically.</p>
                      </div>
                      <Toggle
                        checked={calendarSettings.autoSync}
                        onChange={() => setCalendarSettings((current) => ({ ...current, autoSync: !current.autoSync }))}
                      />
                    </div>
                  </div>

                  <GlassButton onClick={handleSaveCalendarSettings} className="h-11 w-full rounded-2xl" disabled={savingCalendarSettings}>
                    {savingCalendarSettings ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Save calendar settings
                  </GlassButton>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
