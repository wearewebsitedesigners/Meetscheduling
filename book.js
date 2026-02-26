(function bookingPageController() {
  const renderer = window.BookingPageRenderer;
  if (!renderer) return;

  const rootEl = document.getElementById("book-render-root");
  const loadingEl = document.getElementById("book-loading");
  const loadingLabelEl = document.getElementById("book-loading-label");
  const errorEl = document.getElementById("book-global-error");
  const hostLinkEl = document.getElementById("book-host-link");

  const summaryTitleEl = document.getElementById("book-summary-title");
  const summaryHostEl = document.getElementById("book-summary-host");
  const summaryServiceEl = document.getElementById("book-summary-service");
  const summaryDateEl = document.getElementById("book-summary-date");
  const summaryTimeEl = document.getElementById("book-summary-time");
  const summaryTimezoneEl = document.getElementById("book-summary-timezone");

  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const slug = pathParts.length >= 2 ? String(pathParts[1] || "").trim() : "";

  const state = renderer.defaultState();
  const bookingData = {
    page: null,
    config: null,
    services: [],
  };

  const availabilityCache = new Map();
  let activeMonthRequestId = 0;

  function showLoading(show, label) {
    if (!loadingEl) return;
    loadingEl.hidden = !show;
    if (show && loadingLabelEl) {
      loadingLabelEl.textContent = label || "Loading...";
    }
  }

  function showGlobalError(message) {
    if (!errorEl) return;
    const text = String(message || "").trim();
    if (!text) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = text;
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options || {});
    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = {};
      }
    }
    if (!response.ok) {
      throw new Error(payload.error || payload.message || "Request failed");
    }
    return payload;
  }

  function monthStartKey(input) {
    const parsed = renderer.parseDateKey(input);
    if (!parsed) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
  }

  function buildTimezoneOptions(baseTimezone) {
    const set = new Set([
      baseTimezone,
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Los_Angeles",
      "Europe/London",
      "Asia/Kolkata",
      "Asia/Dubai",
      "Asia/Singapore",
      "Australia/Sydney",
    ]);
    return Array.from(set).filter(Boolean);
  }

  function getServiceSection() {
    return renderer.resolveSection(bookingData.config, "serviceList");
  }

  function getDetailsSection() {
    return renderer.resolveSection(bookingData.config, "detailsForm");
  }

  function visibleServices() {
    const section = getServiceSection();
    if (!section || !section.settings) return bookingData.services;
    const selectedIds = Array.isArray(section.settings.selectedServiceIds)
      ? section.settings.selectedServiceIds
      : [];
    if (!selectedIds.length) return bookingData.services;
    return bookingData.services.filter((service) => selectedIds.includes(service.id));
  }

  function getSelectedService() {
    const list = visibleServices();
    const found = list.find((service) => service.id === state.selectedServiceId);
    return found || list[0] || null;
  }

  function getMonthDays(monthKey) {
    const parsed = renderer.parseDateKey(monthKey);
    if (!parsed) return [];
    const year = parsed.getFullYear();
    const month = parsed.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, index) =>
      renderer.toDateKey(new Date(year, month, index + 1))
    );
  }

  function dateKeyToDate(dateKey) {
    const parsed = renderer.parseDateKey(dateKey);
    return parsed || new Date();
  }

  function compareDateKeys(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function formatSlotLabel(slot) {
    if (slot && slot.startLocal && slot.startLocal.time) return slot.startLocal.time;
    return "";
  }

  function getAvailabilityCacheKey(serviceId, dateKey, timezone) {
    return `${serviceId || ""}|${dateKey}|${timezone || "UTC"}`;
  }

  async function fetchAvailability(dateKey) {
    const service = getSelectedService();
    if (!service) {
      throw new Error("No active service found.");
    }

    const cacheKey = getAvailabilityCacheKey(service.id, dateKey, state.timezone);
    if (availabilityCache.has(cacheKey)) {
      return availabilityCache.get(cacheKey);
    }

    const payload = await requestJson(
      `/api/pages/${encodeURIComponent(slug)}/availability?serviceId=${encodeURIComponent(
        service.id
      )}&date=${encodeURIComponent(dateKey)}&timezone=${encodeURIComponent(state.timezone)}`
    );

    availabilityCache.set(cacheKey, payload);
    return payload;
  }

  async function prefetchMonth(monthKey) {
    const service = getSelectedService();
    if (!service) return;

    const days = getMonthDays(monthKey);
    if (!days.length) return;

    const requestId = ++activeMonthRequestId;
    const map = { ...(state.availabilityMap || {}) };

    days.forEach((dateKey) => {
      if (map[dateKey] !== true && map[dateKey] !== false) {
        map[dateKey] = false;
      }
    });

    state.availabilityMap = map;
    state.statusText = "Checking availability...";
    render();

    const queue = days.slice();
    const workerCount = 6;
    let bestNextAvailable = null;

    async function worker() {
      while (queue.length) {
        const dateKey = queue.shift();
        if (!dateKey) break;
        try {
          const payload = await fetchAvailability(dateKey);
          const slots =
            payload && payload.availability && Array.isArray(payload.availability.slots)
              ? payload.availability.slots
              : [];
          map[dateKey] = slots.length > 0;

          if (payload && payload.nextAvailable && payload.nextAvailable.date) {
            const nextDate = String(payload.nextAvailable.date);
            if (!bestNextAvailable || compareDateKeys(nextDate, bestNextAvailable.date) < 0) {
              bestNextAvailable = payload.nextAvailable;
            }
          }
        } catch {
          map[dateKey] = false;
        }
      }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (requestId !== activeMonthRequestId) return;

    state.availabilityMap = map;
    if (!state.nextAvailable && bestNextAvailable) {
      state.nextAvailable = bestNextAvailable;
    }
    state.statusText = "";
    render();
  }

  async function selectDate(dateKey) {
    state.selectedDate = dateKey;
    state.selectedDateLabel = renderer.humanDateLabel(dateKey);
    state.selectedSlotStart = "";
    state.formError = "";
    state.nextAvailable = null;
    await loadSlotsForSelectedDate();
  }

  async function loadSlotsForSelectedDate() {
    const dateKey = String(state.selectedDate || "").trim();
    if (!dateKey) {
      state.slots = [];
      render();
      return;
    }

    state.loadingSlots = true;
    state.statusText = "Loading time slots...";
    render();

    try {
      const payload = await fetchAvailability(dateKey);
      const slots =
        payload && payload.availability && Array.isArray(payload.availability.slots)
          ? payload.availability.slots
          : [];

      state.slots = slots.map((slot) => ({
        ...slot,
        startLabel: formatSlotLabel(slot),
      }));
      state.nextAvailable = payload && payload.nextAvailable ? payload.nextAvailable : null;
      state.availabilityMap = {
        ...(state.availabilityMap || {}),
        [dateKey]: slots.length > 0,
      };
      state.statusText = slots.length ? "" : "No times on this day";
    } catch (error) {
      state.slots = [];
      state.statusText = "";
      showGlobalError(error.message || "Could not load slots.");
    } finally {
      state.loadingSlots = false;
      render();
    }
  }

  function selectedSlot() {
    return (state.slots || []).find((slot) => slot.startAtUtc === state.selectedSlotStart) || null;
  }

  function updateSummary() {
    const page = bookingData.page || {};
    const service = getSelectedService();
    const slot = selectedSlot();

    if (summaryHostEl) summaryHostEl.textContent = page.businessName || "MeetScheduling";
    if (summaryServiceEl) summaryServiceEl.textContent = service ? service.title : "-";
    if (summaryDateEl) {
      summaryDateEl.textContent = state.selectedDate
        ? renderer.humanDateLabel(state.selectedDate)
        : "-";
    }
    if (summaryTimeEl) {
      summaryTimeEl.textContent = slot
        ? `${slot.startLocal?.time || ""} - ${slot.endLocal?.time || ""}`
        : "-";
    }
    if (summaryTimezoneEl) {
      summaryTimezoneEl.textContent = state.timezone || "UTC";
    }

    if (summaryTitleEl) {
      if (state.step === "details") {
        summaryTitleEl.textContent = "Confirm your details";
      } else if (state.step === "confirmed") {
        summaryTitleEl.textContent = "Booking confirmed";
      } else {
        summaryTitleEl.textContent = "Select a service";
      }
    }
  }

  function render() {
    if (!rootEl || !bookingData.config) return;

    renderer.mount(rootEl, bookingData.config, { services: bookingData.services }, {
      mode: "live",
      state,
    });

    updateSummary();
  }

  function updateFieldValue(fieldName, value) {
    if (!fieldName) return;
    if (fieldName.startsWith("question:")) {
      const questionId = fieldName.slice("question:".length);
      if (!state.form.answers || typeof state.form.answers !== "object") {
        state.form.answers = {};
      }
      state.form.answers[questionId] = value;
      return;
    }

    if (["name", "email", "phone", "notes"].includes(fieldName)) {
      state.form[fieldName] = value;
    }
  }

  function collectAnswers() {
    const detailsSection = getDetailsSection();
    const questions =
      detailsSection && detailsSection.settings && Array.isArray(detailsSection.settings.customQuestions)
        ? detailsSection.settings.customQuestions
        : [];

    return questions
      .map((question) => ({
        id: question.id,
        label: question.label || "Question",
        answer: String((state.form.answers && state.form.answers[question.id]) || "").trim(),
      }))
      .filter((item) => item.answer);
  }

  function toCalendarStamp(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  }

  function createGoogleCalendarUrl(booking, service, page) {
    const text = `${service?.title || "Meeting"} with ${page?.businessName || "host"}`;
    const details = [
      booking?.notes || "",
      booking?.meetingLink ? `Meeting link: ${booking.meetingLink}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text,
      dates: `${toCalendarStamp(booking.startAtUtc)}/${toCalendarStamp(booking.endAtUtc)}`,
      details,
      location: booking?.meetingLink || "Online meeting",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function createIcsDataUri(booking, service, page) {
    const uid = `ms-${booking.id || Date.now()}@meetscheduling.com`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MeetScheduling//Booking//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toCalendarStamp(new Date().toISOString())}`,
      `DTSTART:${toCalendarStamp(booking.startAtUtc)}`,
      `DTEND:${toCalendarStamp(booking.endAtUtc)}`,
      `SUMMARY:${(service?.title || "Meeting").replace(/,/g, "\\,")}`,
      `DESCRIPTION:${(`Meeting with ${page?.businessName || "host"}${booking.meetingLink ? `\\n${booking.meetingLink}` : ""}`).replace(/,/g, "\\,")}`,
      `LOCATION:${(booking.meetingLink || "Online meeting").replace(/,/g, "\\,")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
  }

  async function submitBooking() {
    const service = getSelectedService();
    const slot = selectedSlot();
    const detailsSection = getDetailsSection();
    const phoneRequired = Boolean(detailsSection?.settings?.phoneRequired);

    const name = String(state.form.name || "").trim();
    const email = String(state.form.email || "").trim();
    const phone = String(state.form.phone || "").trim();

    if (!service) {
      state.formError = "Please choose a service first.";
      render();
      return;
    }
    if (!state.selectedDate || !slot) {
      state.formError = "Please select a valid time slot first.";
      render();
      return;
    }
    if (!name || !email) {
      state.formError = "Name and email are required.";
      render();
      return;
    }
    if (phoneRequired && !phone) {
      state.formError = "Phone number is required for this booking.";
      render();
      return;
    }

    state.submitting = true;
    state.formError = "";
    render();

    try {
      const payload = await requestJson("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageSlug: slug,
          serviceId: service.id,
          date: state.selectedDate,
          timezone: state.timezone,
          startAtUtc: slot.startAtUtc,
          slotToken: slot.token,
          name,
          email,
          phone,
          notes: String(state.form.notes || "").trim(),
          answers: collectAnswers(),
        }),
      });

      const booking = payload.booking || {};
      const page = payload.page || bookingData.page || {};
      const servicePayload = payload.service || service;
      const summary = `${servicePayload.title || "Meeting"} on ${booking.startLocal?.date || state.selectedDate} at ${
        booking.startLocal?.time || ""
      } (${state.timezone})`;

      state.confirmation = {
        summary,
        meetingLink: booking.meetingLink || "",
        googleCalendarUrl: createGoogleCalendarUrl(booking, servicePayload, page),
        icsUrl: createIcsDataUri(booking, servicePayload, page),
      };
      state.step = "confirmed";
      state.submitting = false;
      state.formError = "";
      state.statusText = "";
      showGlobalError("");
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      state.submitting = false;
      state.formError = error.message || "Failed to create booking";
      render();
    }
  }

  async function ensureSelectedDate() {
    const monthDays = getMonthDays(state.currentMonth);
    const availableDate = monthDays.find((dateKey) => state.availabilityMap[dateKey] === true);
    if (availableDate) {
      await selectDate(availableDate);
      return;
    }

    const firstDay = monthDays[0];
    if (!firstDay) return;

    try {
      const payload = await fetchAvailability(firstDay);
      if (payload && payload.nextAvailable && payload.nextAvailable.date) {
        const nextDate = payload.nextAvailable.date;
        state.nextAvailable = payload.nextAvailable;
        state.currentMonth = monthStartKey(nextDate);
        await prefetchMonth(state.currentMonth);
        await selectDate(nextDate);
      }
    } catch {
      // Ignore and leave page ready for manual date selection.
    }
  }

  async function jumpToNextAvailable() {
    const next = state.nextAvailable;
    if (!next || !next.date) return;
    state.currentMonth = monthStartKey(next.date);
    await prefetchMonth(state.currentMonth);
    await selectDate(next.date);
  }

  async function onActionClick(actionEl) {
    const action = String(actionEl.dataset.action || "").trim();
    if (!action) return;

    showGlobalError("");

    if (action === "select-service") {
      const nextId = String(actionEl.dataset.serviceId || "").trim();
      if (!nextId || nextId === state.selectedServiceId) return;
      state.selectedServiceId = nextId;
      state.selectedDate = "";
      state.selectedDateLabel = "";
      state.selectedSlotStart = "";
      state.slots = [];
      state.nextAvailable = null;
      state.step = "schedule";
      state.availabilityMap = {};
      render();
      await prefetchMonth(state.currentMonth);
      await ensureSelectedDate();
      return;
    }

    if (action === "month-prev" || action === "month-next") {
      const current = dateKeyToDate(state.currentMonth);
      current.setMonth(current.getMonth() + (action === "month-next" ? 1 : -1));
      state.currentMonth = monthStartKey(renderer.toDateKey(new Date(current.getFullYear(), current.getMonth(), 1)));
      render();
      await prefetchMonth(state.currentMonth);
      return;
    }

    if (action === "select-date") {
      const dateKey = String(actionEl.dataset.date || "").trim();
      if (!dateKey) return;
      await selectDate(dateKey);
      return;
    }

    if (action === "select-slot") {
      const startAtUtc = String(actionEl.dataset.slotStart || "").trim();
      if (!startAtUtc) return;
      state.selectedSlotStart = startAtUtc;
      render();
      return;
    }

    if (action === "continue-to-details") {
      if (!state.selectedSlotStart) return;
      state.step = "details";
      state.formError = "";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (action === "back-to-schedule") {
      state.step = "schedule";
      state.formError = "";
      render();
      return;
    }

    if (action === "jump-next-available") {
      await jumpToNextAvailable();
    }
  }

  function handleFieldInput(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) {
      return;
    }

    const action = String(input.dataset.action || "").trim();
    if (action !== "field-change") return;
    const field = String(input.dataset.field || "").trim();
    updateFieldValue(field, input.value);
  }

  async function handleTimezoneChange(event) {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    const action = String(select.dataset.action || "").trim();
    if (action !== "timezone-change") return;

    const nextTimezone = String(select.value || "").trim();
    if (!nextTimezone || nextTimezone === state.timezone) return;

    state.timezone = nextTimezone;
    state.selectedDate = "";
    state.selectedDateLabel = "";
    state.selectedSlotStart = "";
    state.slots = [];
    state.nextAvailable = null;
    state.availabilityMap = {};
    state.step = "schedule";
    render();

    await prefetchMonth(state.currentMonth);
    await ensureSelectedDate();
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const action = String(form.dataset.action || "").trim();
    if (action !== "submit-booking") return;
    event.preventDefault();
    submitBooking();
  }

  function bindEvents() {
    if (!rootEl) return;

    rootEl.addEventListener("click", (event) => {
      const actionEl = event.target instanceof Element
        ? event.target.closest("[data-action]")
        : null;
      if (!actionEl) return;
      const action = String(actionEl.getAttribute("data-action") || "").trim();
      if (!action) return;
      onActionClick(actionEl);
    });

    rootEl.addEventListener("input", handleFieldInput);
    rootEl.addEventListener("change", (event) => {
      handleFieldInput(event);
      handleTimezoneChange(event);
    });

    rootEl.addEventListener("submit", handleSubmit);
  }

  async function loadPage() {
    if (!slug) {
      showGlobalError("Invalid booking link.");
      return;
    }

    showLoading(true, "Loading booking page...");

    try {
      const payload = await requestJson(`/api/pages/${encodeURIComponent(slug)}`);
      bookingData.page = payload.page || null;
      bookingData.config = payload.config || { theme: {}, sections: [] };
      bookingData.services = Array.isArray(payload.services) ? payload.services : [];

      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      state.timezone = detectedTimezone;
      state.timezoneOptions = buildTimezoneOptions(detectedTimezone);

      const services = visibleServices();
      if (!services.length) {
        throw new Error("No active services available on this page.");
      }

      state.selectedServiceId = services[0].id;
      state.currentMonth = monthStartKey(renderer.toDateKey(new Date()));

      if (hostLinkEl instanceof HTMLAnchorElement) {
        hostLinkEl.href = `/${encodeURIComponent(payload.page.username)}`;
      }

      showGlobalError("");
      render();
      await prefetchMonth(state.currentMonth);
      await ensureSelectedDate();
      render();
    } catch (error) {
      showGlobalError(error.message || "Could not load this booking page.");
    } finally {
      showLoading(false);
    }
  }

  bindEvents();
  loadPage();
})();
