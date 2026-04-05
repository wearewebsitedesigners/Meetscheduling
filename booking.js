// Elements
const loadingOverlay = document.getElementById("loading-overlay");
const errorAlert = document.getElementById("error-alert");

const hostAvatar = document.getElementById("host-avatar");
const hostName = document.getElementById("host-name");
const eventTitle = document.getElementById("event-title");
const eventDuration = document.getElementById("event-duration");
const eventLocation = document.getElementById("event-location");
const eventDesc = document.getElementById("event-desc");
const topHostAvatar = document.getElementById("top-host-avatar");
const topHostName = document.getElementById("top-host-name");
const viewLandingLink = document.getElementById("view-landing-link");
const topbarMenuBtn = document.getElementById("topbar-menu-btn");
const copyLinkBtn = document.getElementById("copy-link-btn");
const copyLinkLabel = document.getElementById("copy-link-label");

const sidebarDatetime = document.getElementById("sidebar-datetime");
const sidebarDatetimeText = document.getElementById("sidebar-datetime-text");
const selectedDatePill = document.getElementById("selected-date-pill");

// Steps & Panels
const stepCalendar = document.getElementById("step-calendar");
const stepDetails = document.getElementById("step-details");
const stepQuestions = document.getElementById("step-questions");
const stepPillSelect = document.getElementById("step-pill-select");
const stepPillDetails = document.getElementById("step-pill-details");
const stepPillQuestions = document.getElementById("step-pill-questions");
const stepPillConfirm = document.getElementById("step-pill-confirm");

// Calendar Elements
const calendarMonthYear = document.getElementById("calendar-month-year");
const calendarDays = document.getElementById("calendar-days");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const timezoneSelect = document.getElementById("timezone-select");

// Slots Elements
const slotsHeader = document.getElementById("slots-header");
const slotsList = document.getElementById("slots-list");

// Form Elements
const formBackBtn = document.getElementById("form-back-btn");
const detailsBackBtn = document.getElementById("details-back-btn");
const questionsForm = document.getElementById("questions-form");
const questionsList = document.getElementById("questions-list");
const questionsErrorAlert = document.getElementById("questions-error-alert");
const questionsBackBtn = document.getElementById("questions-back-btn");
const bookingForm = document.getElementById("booking-form");
const nameInput = document.getElementById("name-input");
const emailInput = document.getElementById("email-input");
const phoneInput = document.getElementById("phone-input");
const notesInput = document.getElementById("notes-input");
const confirmBtn = document.getElementById("confirm-booking-btn");
const formErrorAlert = document.getElementById("form-error-alert");
const detailsSummaryTitle = document.getElementById("details-summary-title");
const detailsSummaryTime = document.getElementById("details-summary-time");
const detailsSummaryZone = document.getElementById("details-summary-zone");
const timezoneSelectDetails = document.getElementById("timezone-select-details");

// State
const pathParts = window.location.pathname.split("/").filter(Boolean);
const routeQuery = new URLSearchParams(window.location.search);
const isBookingShellPath =
  pathParts.length <= 1 &&
  /^(booking|booking\.html)$/i.test(String(pathParts[0] || "").trim());
const username = isBookingShellPath
  ? String(routeQuery.get("username") || "").trim()
  : String(pathParts[0] || "").trim();
const slug = isBookingShellPath
  ? String(routeQuery.get("slug") || "").trim()
  : String(pathParts[1] || "").trim();
const hasPublicEventPath = Boolean(username && slug);
const isCustomDomainBooking = !isBookingShellPath && !hasPublicEventPath;
const isLocalPreview = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const useLocalPreview = isLocalPreview && isCustomDomainBooking;

// Use the timezone detected by the early-fetch script in <head> if available,
// so we don't redetect and potentially fire a mismatched second request.
let visitorTimezone = window.__bookingEarlyTz || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
let currentEvent = null;
let availableDates = new Set(); // yyyy-mm-dd
let currentViewDate = new Date(); // dictates which month we're looking at
let selectedDate = null; // yyyy-mm-dd
let selectedSlot = null; // The slot object
let cachedSlots = {}; // { 'yyyy-mm-dd': [slots] }
let copyResetTimer = null;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapPublicError(message) {
  const value = String(message || "").trim();
  if (!value) return "We couldn't load this booking page.";
  if (/event type not found|custom domain not found|booking page not configured/i.test(value)) {
    return "This booking link is unavailable. Ask the host for the latest scheduling link.";
  }
  return value;
}

function formatDateLabel(ymd, options = { month: "short", day: "numeric", weekday: "long" }) {
  const [year, month, day] = String(ymd).split("-").map(Number);
  if (!year || !month || !day) return ymd;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

function toMinutes(timeLabel) {
  const match = String(timeLabel || "").trim().match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return 0;
  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  if (match[3].toLowerCase() === "pm") hours += 12;
  return hours * 60 + minutes;
}

function formatMinutes(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours24 >= 12 ? "pm" : "am";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, "0")}${suffix}`;
}

function getPreviewEvent() {
  return {
    id: "preview-event",
    title: "1 hr strategy call",
    description: [
      "Please share your best contact number. This is to give you a quick reminder 10 minutes before the meeting, so you do not miss anything important.",
      "",
      "Here is what we will focus on:",
      "• Your vision and how to translate that into a luxury, high-performing website.",
      "• Design preferences and ideas for your brand identity and aesthetic.",
      "• Opportunities to optimize your site for conversions, customer engagement, and sales growth.",
      "• Our step-by-step plan for positioning your company as a premium brand in your market.",
      "",
      "Let's get on Google Meet at a time that works for you to go over these ideas.",
    ].join("\n"),
    slug: "30min",
    hostName: "Divyanshu",
    username: "wearewebsitedesigners",
    hostTimezone: "Asia/Kolkata",
    locationType: "google_meet",
    durationMinutes: 60,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
  };
}

function getPreviewDates() {
  return nextDates(visitorTimezone, 45);
}

function getPreviewSlots(ymd) {
  const slotTimes = ["8:00pm", "8:30pm", "9:00pm", "9:30pm", "10:00pm", "10:30pm", "11:00pm", "11:30pm"];
  const dateLabel = formatDateLabel(ymd, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  return slotTimes.map((startTime, index) => {
    const startMinutes = toMinutes(startTime);
    const endMinutes = startMinutes + Number(currentEvent?.durationMinutes || 60);
    return {
      token: `preview-slot-${ymd}-${index}`,
      startAtUtc: `${ymd}T${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")}:00.000Z`,
      startLocal: {
        date: dateLabel,
        time: startTime,
      },
      endLocal: {
        date: dateLabel,
        time: formatMinutes(endMinutes),
      },
    };
  });
}

function nextDates(timezone, count = 45) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = new Date();
  const dates = [];

  for (let offset = 0; offset < count; offset += 1) {
    const value = new Date(today);
    value.setDate(today.getDate() + offset);
    dates.push(formatter.format(value));
  }

  return dates;
}

// Timezone options (simplified for UX, could be expanded)
const timezonesList = [
  "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles", "America/Denver",
  "America/Chicago", "America/New_York", "America/Halifax", "America/St_Johns",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Moscow",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo",
  "Australia/Sydney", "Pacific/Auckland", "UTC"
];

function initTimezoneSelect() {
  // Ensure the detected timezone is in the list
  if (!timezonesList.includes(visitorTimezone)) {
    timezonesList.push(visitorTimezone);
  }
  // Sort alphabetically
  timezonesList.sort();

  timezonesList.forEach(tz => {
    const opt = document.createElement("option");
    opt.value = tz;
    opt.textContent = tz.replace(/_/g, " ");
    if (tz === visitorTimezone) opt.selected = true;
    timezoneSelect.appendChild(opt);
  });

  timezoneSelect.addEventListener("change", (e) => {
    visitorTimezone = e.target.value;
    if (timezoneSelectDetails) timezoneSelectDetails.value = visitorTimezone;
    loadEvent(); // Reload event/dates to adjust to new timezone
  });
}

function showError(msg, panel = errorAlert) {
  panel.textContent = msg;
  panel.style.display = msg ? "block" : "none";
}

function showLoading() {
  loadingOverlay.classList.add("active");
}

function hideLoading() {
  loadingOverlay.classList.remove("active");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

// Format YYYY-MM-DD reliably from local date coords
function formatYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function syncStepPills(activeStep) {
  const steps = [
    ["select",    stepPillSelect],
    ["details",   stepPillDetails],
    ["questions", stepPillQuestions],
    ["confirmed", stepPillConfirm],
  ];
  const order = { select: 0, details: 1, questions: 2, confirmed: 3 };

  steps.forEach(([key, element]) => {
    if (!(element instanceof HTMLElement)) return;
    element.classList.remove("is-active", "is-done");
    if (key === activeStep) {
      element.classList.add("is-active");
    } else if (order[key] < order[activeStep]) {
      element.classList.add("is-done");
    }
  });
}

function renderSidebarEventDetails(event) {
  const safeHostName = String(event?.hostName || "Host").trim();
  const safeTitle = String(event?.title || "Meeting").trim();
  const hostInitials = safeHostName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MS";

  hostAvatar.textContent = hostInitials;
  hostName.textContent = safeHostName;
  eventTitle.textContent = safeTitle;
  eventDuration.textContent = `${event.durationMinutes} min`;

  if (topHostAvatar) topHostAvatar.textContent = hostInitials;
  if (topHostName) topHostName.textContent = safeHostName;
  document.title = `${safeTitle} | MeetScheduling`;

  if (event.locationType === 'in_person' || event.locationType === 'custom') {
    eventLocation.textContent = "Physical Location / Custom Server";
  } else if (event.locationType === 'google_meet') {
    eventLocation.textContent = "Google Meet (Details provided upon confirmation)";
  } else if (event.locationType === 'zoom') {
    eventLocation.textContent = "Zoom Video (Details provided upon confirmation)";
  }

  // Preserve newlines
  if (event.description) {
    eventDesc.innerHTML = escapeHtml(event.description).replace(/\n/g, "<br>");
  } else {
    eventDesc.textContent = "";
  }

  // Brand logo
  const brandLogoWrap = document.getElementById("brand-logo-wrap");
  const brandLogoImg  = document.getElementById("brand-logo-img");
  if (brandLogoWrap && brandLogoImg) {
    const logoUrl = String(event.brandLogoUrl || event.brand_logo_url || "").trim();
    if (logoUrl) {
      brandLogoImg.src = logoUrl;
      brandLogoWrap.classList.add("has-logo");
    } else {
      brandLogoWrap.classList.remove("has-logo");
    }
  }

  // Brand tagline
  const brandTaglineEl = document.getElementById("brand-tagline");
  if (brandTaglineEl) {
    const tagline = String(event.brandTagline || event.brand_tagline || "").trim();
    if (tagline) {
      brandTaglineEl.textContent = tagline;
      brandTaglineEl.classList.add("has-tagline");
    } else {
      brandTaglineEl.textContent = "";
      brandTaglineEl.classList.remove("has-tagline");
    }
  }

  // Sidebar message
  const sidebarMsgBox = document.getElementById("sidebar-message-box");
  if (sidebarMsgBox) {
    const msg = String(event.sidebarMessage || event.sidebar_message || "").trim();
    if (msg) {
      sidebarMsgBox.textContent = msg;
      sidebarMsgBox.classList.add("has-message");
    } else {
      sidebarMsgBox.textContent = "";
      sidebarMsgBox.classList.remove("has-message");
    }
  }
}

function setLandingLink() {
  if (!(viewLandingLink instanceof HTMLAnchorElement)) return;
  const href = isCustomDomainBooking
    ? `${window.location.origin}/`
    : `/${encodeURIComponent(username)}`;
  viewLandingLink.href = href;
}

function buildPublicEventUrl() {
  if (isCustomDomainBooking) {
    return "/api/public/domain/booking";
  }
  if (!hasPublicEventPath) {
    return "";
  }
  return `/api/public/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}

function buildPublicSlotsUrl(dateYmd) {
  const query = `date=${encodeURIComponent(dateYmd)}&timezone=${encodeURIComponent(visitorTimezone)}`;
  if (isCustomDomainBooking) {
    return `/api/public/domain/booking/slots?${query}`;
  }
  return `${buildPublicEventUrl()}/slots?${query}`;
}

function buildPublicBookingsUrl() {
  if (isCustomDomainBooking) {
    return "/api/public/domain/booking/bookings";
  }
  return `${buildPublicEventUrl()}/bookings`;
}

function buildThankYouUrl(bookingId) {
  const params = new URLSearchParams({
    bookingId: String(bookingId || "").trim(),
    tz: visitorTimezone,
  });

  if (isCustomDomainBooking) {
    params.set("source", "domain");
  } else if (hasPublicEventPath) {
    params.set("username", username);
    params.set("slug", slug);
  }

  return `/thank-you.html?${params.toString()}`;
}

async function copyCurrentLink() {
  const text = window.location.href;
  if (!text) return false;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }

  const temp = document.createElement("textarea");
  temp.value = text;
  temp.setAttribute("readonly", "");
  temp.style.position = "fixed";
  temp.style.top = "-1000px";
  document.body.append(temp);
  temp.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  temp.remove();
  return copied;
}

if (topbarMenuBtn instanceof HTMLButtonElement) {
  topbarMenuBtn.addEventListener("click", () => {
    if (stepDetails && !stepDetails.classList.contains("hidden")) {
      goBackToStep1();
    } else {
      window.location.href = "/";
    }
  });
}

if (copyLinkBtn instanceof HTMLButtonElement) {
  copyLinkBtn.addEventListener("click", async () => {
    const copied = await copyCurrentLink();
    copyLinkBtn.classList.toggle("is-copied", copied);

    if (copyLinkLabel) {
      copyLinkLabel.textContent = copied ? "Copied" : "Copy failed";
    }

    if (copyResetTimer) {
      window.clearTimeout(copyResetTimer);
    }

    copyResetTimer = window.setTimeout(() => {
      copyLinkBtn.classList.remove("is-copied");
      if (copyLinkLabel) copyLinkLabel.textContent = "Copy link";
    }, copied ? 1800 : 2400);
  });
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function renderCalendar() {
  calendarDays.innerHTML = "";

  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth(); // 0-11

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = getDaysInMonth(year, month);

  // blank spaces before 1st
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement("div");
    calendarDays.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const btn = document.createElement("button");
    const ymd = formatYMD(year, month, day);

    btn.className = "calendar-day";
    btn.textContent = day;

    // Check if available
    if (availableDates.has(ymd)) {
      btn.addEventListener("click", () => selectDate(ymd, btn));
      // re-select visually if it was the selectedDate
      if (selectedDate === ymd) {
        btn.classList.add("selected");
      }
    } else {
      btn.disabled = true;
    }

    calendarDays.appendChild(btn);
  }

  // Control Prev/Next limits
  const now = new Date();
  if (year === now.getFullYear() && month === now.getMonth()) {
    prevMonthBtn.disabled = true;
  } else {
    prevMonthBtn.disabled = false;
  }
}

function changeMonth(delta) {
  currentViewDate.setMonth(currentViewDate.getMonth() + delta);
  renderCalendar();

  // Clear slots when changing months to encourage new selection
  if (selectedDate && !selectedDate.startsWith(formatYMD(currentViewDate.getFullYear(), currentViewDate.getMonth(), 1).substring(0, 7))) {
    selectedDate = null;
    slotsHeader.style.opacity = 0;
    slotsList.innerHTML = "";
    sidebarDatetime.style.display = "none";
    if (selectedDatePill) selectedDatePill.textContent = "Choose a day";
  }
}

prevMonthBtn.addEventListener("click", () => changeMonth(-1));
nextMonthBtn.addEventListener("click", () => changeMonth(1));

async function selectDate(ymd, btnElem) {
  selectedDate = ymd;
  selectedSlot = null;
  if (stepPillDetails) stepPillDetails.classList.remove("is-clickable");

  // Visual update
  document.querySelectorAll(".calendar-day").forEach(el => el.classList.remove("selected"));
  if (btnElem) btnElem.classList.add("selected");
  else {
    // auto-select: highlight the matching day button
    document.querySelectorAll(".calendar-day").forEach(el => {
      if (el.dataset.ymd === ymd) el.classList.add("selected");
    });
  }

  // Format date header
  const dateObj = new Date(`${ymd}T00:00:00`);
  const dowNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const mNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  slotsHeader.textContent = `${dowNames[dateObj.getDay()]}, ${mNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
  slotsHeader.style.opacity = 1;
  if (selectedDatePill) {
    selectedDatePill.textContent = `${mNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
  }

  sidebarDatetime.style.display = "none";

  // Auto-scroll to slots panel on mobile
  const slotsCard = document.querySelector(".slots-card");
  if (slotsCard && window.innerWidth < 1024) {
    setTimeout(() => slotsCard.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  await fetchSlotsForDate(ymd);
}

function renderSlots(slots) {
  slotsList.innerHTML = "";
  if (!slots.length) {
    slotsList.innerHTML = '<div style="color:var(--text-muted); padding:1rem 0; font-size:0.88rem;">No slots available</div>';
    return;
  }
  slots.forEach(slot => {
    const row = document.createElement("div");
    row.className = "slot-action-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-btn";
    btn.textContent = slot.startLocal.time;

    const confirmSlotBtn = document.createElement("button");
    confirmSlotBtn.type = "button";
    confirmSlotBtn.className = "confirm-slot-btn";
    confirmSlotBtn.textContent = "Next";
    confirmSlotBtn.style.display = "none";

    btn.addEventListener("click", () => {
      document.querySelectorAll(".slot-action-row").forEach(el => {
        el.querySelector(".slot-btn").classList.remove("active");
        el.querySelector(".confirm-slot-btn").style.display = "none";
      });
      btn.classList.add("active");
      confirmSlotBtn.style.display = "block";
      selectedSlot = slot;
      if (stepPillDetails) stepPillDetails.classList.add("is-clickable");
    });

    confirmSlotBtn.addEventListener("click", () => goToStep2());

    row.appendChild(btn);
    row.appendChild(confirmSlotBtn);
    slotsList.appendChild(row);
  });
}

function showSlotSkeletons(count = 6) {
  slotsList.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const skel = document.createElement("div");
    skel.className = "slot-skeleton";
    slotsList.appendChild(skel);
  }
}

async function fetchSlotsForDate(ymd) {
  try {
    // If cached, render instantly
    if (cachedSlots[ymd]) {
      renderSlots(cachedSlots[ymd]);
      return;
    }

    // Show skeletons immediately while fetching
    showSlotSkeletons();

    let slots;
    if (useLocalPreview) {
      slots = getPreviewSlots(ymd);
    } else {
      const data = await fetchJson(buildPublicSlotsUrl(ymd));
      slots = data.slots || [];
    }
    cachedSlots[ymd] = slots;
    renderSlots(slots);

  } catch (err) {
    slotsList.innerHTML = "";
    showError(err.message);
  }
}

function getEventCacheKey() {
  return `ms_event_cache__${buildPublicEventUrl()}__${visitorTimezone}`;
}

function readEventCache() {
  try {
    const raw = localStorage.getItem(getEventCacheKey());
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > 5 * 60 * 1000) return null; // 5 min TTL
    return entry.data;
  } catch {
    return null;
  }
}

function writeEventCache(data) {
  try {
    localStorage.setItem(getEventCacheKey(), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // localStorage unavailable or full — ignore
  }
}

async function loadEvent() {
  try {
    showError("");
    if (!useLocalPreview && !isCustomDomainBooking && !hasPublicEventPath) {
      throw new Error(
        "This booking page needs a valid public booking link. Open the host's booking URL, or use /booking.html?username=HOST&slug=EVENT-SLUG for preview."
      );
    }

    const cached = useLocalPreview ? null : readEventCache();
    let data;
    if (cached) {
      // Render from cache instantly — no spinner
      data = cached;
    } else {
      showLoading();
      if (useLocalPreview) {
        data = { event: getPreviewEvent(), visitorTimezone, dates: getPreviewDates() };
      } else if (window.__bookingEventFetch) {
        // Consume the fetch that was started early in <head> — it's already in-flight.
        const earlyFetch = window.__bookingEventFetch;
        window.__bookingEventFetch = null;
        const response = await earlyFetch;
        const text = await response.text();
        const parsed = text ? JSON.parse(text) : {};
        if (!response.ok) throw new Error(parsed.error || "Request failed");
        data = parsed;
      } else {
        data = await fetchJson(`${buildPublicEventUrl()}?timezone=${encodeURIComponent(visitorTimezone)}`);
      }
      writeEventCache(data);
    }

    currentEvent = data.event;

    // Preview-mode overrides — set by the booking editor iframe
    const _pq = new URLSearchParams(window.location.search);
    if (_pq.get("_preview") === "1") {
      const _logo = _pq.get("_logo");
      const _tagline = _pq.get("_tagline");
      const _color = _pq.get("_color");
      const _bg = _pq.get("_bg");
      if (_logo !== null) currentEvent.brandLogoUrl = _logo;
      if (_tagline !== null) currentEvent.brandTagline = _tagline;
      if (_color !== null) currentEvent.color = _color;
      if (_bg !== null) currentEvent.brandBgColor = _bg;
    }

    // Apply brand accent color to CSS custom property
    const brandColor = String(currentEvent.color || "").trim();
    if (/^#[0-9A-Fa-f]{3,8}$/.test(brandColor)) {
      document.documentElement.style.setProperty("--brand", brandColor);
    }

    // Apply custom background
    const brandBg = String(currentEvent.brandBgColor || "").trim();
    if (brandBg) {
      document.body.style.background = brandBg;
    }

    renderSidebarEventDetails(currentEvent);

    availableDates = new Set(data.dates); // The API gives us YYYY-MM-DD
    cachedSlots = {}; // clear slot cache on reload

    // See if the currently selected date is still available
    if (selectedDate && !availableDates.has(selectedDate)) {
      selectedDate = null;
      slotsList.innerHTML = "";
      slotsHeader.style.opacity = 0;
      if (selectedDatePill) selectedDatePill.textContent = "Choose a day";
    }

    renderCalendar();

    // Do NOT auto-select — user must explicitly click a date.
    if (selectedDate) {
      await fetchSlotsForDate(selectedDate);
    } else {
      slotsList.innerHTML = '<div style="color:var(--tx-3);padding:14px 4px;font-size:0.84rem;text-align:center;line-height:1.7;">Select a date on the calendar<br>to see available times</div>';
      if (slotsHeader) { slotsHeader.textContent = 'Available times'; slotsHeader.style.opacity = '1'; }
    }

  } catch (error) {
    const safeMessage = mapPublicError(error.message);
    renderSidebarEventDetails({
      title: "Booking unavailable",
      hostName: "MeetScheduling",
      durationMinutes: 0,
      locationType: "custom",
      description: safeMessage,
    });
    showError(safeMessage);
  } finally {
    hideLoading();
  }
}

function goToStep2() {
  if (!selectedSlot) return;

  stepCalendar.classList.add("hidden");
  stepDetails.classList.remove("hidden");
  if (stepQuestions) stepQuestions.classList.add("hidden");
  syncStepPills("details");

  // Show selected datetime on the left sidebar
  sidebarDatetimeText.textContent = `${selectedSlot.startLocal.time} - ${selectedSlot.endLocal.time}, ${slotsHeader.textContent} (${visitorTimezone})`;
  sidebarDatetime.style.display = "flex";
  if (detailsSummaryTitle) detailsSummaryTitle.textContent = currentEvent?.title || "Meeting";
  if (detailsSummaryTime) {
    detailsSummaryTime.textContent = `${selectedSlot.startLocal.time} - ${selectedSlot.endLocal.time}, ${formatDateLabel(selectedDate)}`;
  }
  if (detailsSummaryZone) {
    detailsSummaryZone.textContent = visitorTimezone;
  }
  if (timezoneSelectDetails) timezoneSelectDetails.value = visitorTimezone;

  // Focus name to start typing immediately
  setTimeout(() => nameInput.focus(), 50);
}

function goBackToStep1() {
  stepDetails.classList.add("hidden");
  if (stepQuestions) stepQuestions.classList.add("hidden");
  stepCalendar.classList.remove("hidden");
  sidebarDatetime.style.display = "none";
  syncStepPills("select");
}

function buildQuestionsPanel() {
  if (!questionsList) return;
  const questions = currentEvent?.customQuestions || [];
  questionsList.innerHTML = "";
  const questionsSubmitBtn = document.getElementById("questions-submit-btn");

  if (!questions.length) {
    // No questions — show a simple "all set" message and relabel the submit btn
    questionsList.innerHTML = '<p style="font-size:10px;color:var(--tx-3);text-align:center;padding:18px 0;">No additional questions — you\'re all set!</p>';
    if (questionsSubmitBtn) questionsSubmitBtn.textContent = "Confirm booking";
    return;
  }

  if (questionsSubmitBtn) questionsSubmitBtn.textContent = "Confirm booking";

  questions.forEach((q, idx) => {
    const item = document.createElement("div");
    item.className = "question-item";
    const labelEl = document.createElement("label");
    labelEl.htmlFor = `q-answer-${idx}`;
    labelEl.innerHTML = escapeHtml(q.label || `Question ${idx + 1}`) +
      (q.required ? '<span class="q-required">*</span>' : '');
    const textarea = document.createElement("textarea");
    textarea.id = `q-answer-${idx}`;
    textarea.rows = 3;
    textarea.dataset.questionId = q.id || String(idx);
    textarea.dataset.required = q.required ? "1" : "0";
    textarea.placeholder = "Your answer…";
    item.appendChild(labelEl);
    item.appendChild(textarea);
    questionsList.appendChild(item);
  });
}

function goToStep3() {
  // Validate details form fields before moving to questions
  const nameVal = nameInput.value.trim();
  const emailVal = emailInput.value.trim();
  const localNumber = phoneInput?.value?.trim() || "";

  if (!nameVal) { showError("Please enter your full name.", formErrorAlert); nameInput.focus(); return; }
  if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal)) { showError("Please enter a valid email address.", formErrorAlert); emailInput.focus(); return; }
  if (!localNumber || !/^\d{7,10}$/.test(localNumber)) { showError("Please enter a valid phone number (7–10 digits).", formErrorAlert); phoneInput?.focus(); return; }

  showError("", formErrorAlert);
  buildQuestionsPanel();
  stepDetails.classList.add("hidden");
  if (stepQuestions) stepQuestions.classList.remove("hidden");
  syncStepPills("questions");

  // Focus first question
  setTimeout(() => {
    const first = questionsList?.querySelector("textarea");
    if (first) first.focus();
  }, 50);
}

function goBackToStep2() {
  if (stepQuestions) stepQuestions.classList.add("hidden");
  stepDetails.classList.remove("hidden");
  syncStepPills("details");
}

if (formBackBtn instanceof HTMLButtonElement) {
  formBackBtn.addEventListener("click", () => { goBackToStep1(); });
}
if (detailsBackBtn instanceof HTMLButtonElement) {
  detailsBackBtn.addEventListener("click", () => { goBackToStep1(); });
}
if (questionsBackBtn instanceof HTMLButtonElement) {
  questionsBackBtn.addEventListener("click", () => { goBackToStep2(); });
}

// Step pill navigation
if (stepPillSelect) {
  stepPillSelect.addEventListener("click", () => {
    if (stepPillSelect.classList.contains("is-done")) goBackToStep1();
  });
}
if (stepPillDetails) {
  stepPillDetails.addEventListener("click", () => {
    if (stepPillDetails.classList.contains("is-done")) goBackToStep2();
    else if (selectedSlot && !stepPillDetails.classList.contains("is-active")) goToStep2();
  });
}
if (stepPillQuestions) {
  stepPillQuestions.addEventListener("click", () => {
    if (stepPillQuestions.classList.contains("is-done") || stepPillDetails.classList.contains("is-done")) {
      goToStep3();
    }
  });
}

// ---------------------------------------------------------------------------
// Country dial code picker
// ---------------------------------------------------------------------------
const COUNTRIES = [
  { flag: "🇦🇫", name: "Afghanistan",            dial: "+93",  tz: ["Asia/Kabul"] },
  { flag: "🇦🇱", name: "Albania",                dial: "+355", tz: ["Europe/Tirane"] },
  { flag: "🇩🇿", name: "Algeria",                dial: "+213", tz: ["Africa/Algiers"] },
  { flag: "🇦🇷", name: "Argentina",              dial: "+54",  tz: ["America/Argentina/Buenos_Aires","America/Buenos_Aires"] },
  { flag: "🇦🇲", name: "Armenia",                dial: "+374", tz: ["Asia/Yerevan"] },
  { flag: "🇦🇺", name: "Australia",              dial: "+61",  tz: ["Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Perth","Australia/Adelaide","Australia/Darwin"] },
  { flag: "🇦🇹", name: "Austria",                dial: "+43",  tz: ["Europe/Vienna"] },
  { flag: "🇦🇿", name: "Azerbaijan",             dial: "+994", tz: ["Asia/Baku"] },
  { flag: "🇧🇭", name: "Bahrain",                dial: "+973", tz: ["Asia/Bahrain"] },
  { flag: "🇧🇩", name: "Bangladesh",             dial: "+880", tz: ["Asia/Dhaka"] },
  { flag: "🇧🇾", name: "Belarus",                dial: "+375", tz: ["Europe/Minsk"] },
  { flag: "🇧🇪", name: "Belgium",                dial: "+32",  tz: ["Europe/Brussels"] },
  { flag: "🇧🇴", name: "Bolivia",                dial: "+591", tz: ["America/La_Paz"] },
  { flag: "🇧🇦", name: "Bosnia & Herzegovina",   dial: "+387", tz: ["Europe/Sarajevo"] },
  { flag: "🇧🇷", name: "Brazil",                 dial: "+55",  tz: ["America/Sao_Paulo","America/Manaus","America/Belem","America/Fortaleza","America/Recife"] },
  { flag: "🇧🇬", name: "Bulgaria",               dial: "+359", tz: ["Europe/Sofia"] },
  { flag: "🇨🇦", name: "Canada",                 dial: "+1",   tz: ["America/Toronto","America/Vancouver","America/Winnipeg","America/Halifax","America/Regina","America/Edmonton"] },
  { flag: "🇨🇱", name: "Chile",                  dial: "+56",  tz: ["America/Santiago"] },
  { flag: "🇨🇳", name: "China",                  dial: "+86",  tz: ["Asia/Shanghai","Asia/Chongqing"] },
  { flag: "🇨🇴", name: "Colombia",               dial: "+57",  tz: ["America/Bogota"] },
  { flag: "🇭🇷", name: "Croatia",                dial: "+385", tz: ["Europe/Zagreb"] },
  { flag: "🇨🇾", name: "Cyprus",                 dial: "+357", tz: ["Asia/Nicosia"] },
  { flag: "🇨🇿", name: "Czech Republic",         dial: "+420", tz: ["Europe/Prague"] },
  { flag: "🇩🇰", name: "Denmark",                dial: "+45",  tz: ["Europe/Copenhagen"] },
  { flag: "🇪🇨", name: "Ecuador",                dial: "+593", tz: ["America/Guayaquil"] },
  { flag: "🇪🇬", name: "Egypt",                  dial: "+20",  tz: ["Africa/Cairo"] },
  { flag: "🇪🇹", name: "Ethiopia",               dial: "+251", tz: ["Africa/Addis_Ababa"] },
  { flag: "🇫🇮", name: "Finland",                dial: "+358", tz: ["Europe/Helsinki"] },
  { flag: "🇫🇷", name: "France",                 dial: "+33",  tz: ["Europe/Paris"] },
  { flag: "🇬🇪", name: "Georgia",                dial: "+995", tz: ["Asia/Tbilisi"] },
  { flag: "🇩🇪", name: "Germany",                dial: "+49",  tz: ["Europe/Berlin"] },
  { flag: "🇬🇭", name: "Ghana",                  dial: "+233", tz: ["Africa/Accra"] },
  { flag: "🇬🇷", name: "Greece",                 dial: "+30",  tz: ["Europe/Athens"] },
  { flag: "🇭🇰", name: "Hong Kong",              dial: "+852", tz: ["Asia/Hong_Kong"] },
  { flag: "🇭🇺", name: "Hungary",                dial: "+36",  tz: ["Europe/Budapest"] },
  { flag: "🇮🇸", name: "Iceland",                dial: "+354", tz: ["Atlantic/Reykjavik"] },
  { flag: "🇮🇳", name: "India",                  dial: "+91",  tz: ["Asia/Kolkata","Asia/Calcutta"] },
  { flag: "🇮🇩", name: "Indonesia",              dial: "+62",  tz: ["Asia/Jakarta","Asia/Makassar","Asia/Jayapura"] },
  { flag: "🇮🇷", name: "Iran",                   dial: "+98",  tz: ["Asia/Tehran"] },
  { flag: "🇮🇶", name: "Iraq",                   dial: "+964", tz: ["Asia/Baghdad"] },
  { flag: "🇮🇪", name: "Ireland",                dial: "+353", tz: ["Europe/Dublin"] },
  { flag: "🇮🇱", name: "Israel",                 dial: "+972", tz: ["Asia/Jerusalem"] },
  { flag: "🇮🇹", name: "Italy",                  dial: "+39",  tz: ["Europe/Rome"] },
  { flag: "🇯🇲", name: "Jamaica",                dial: "+1876",tz: ["America/Jamaica"] },
  { flag: "🇯🇵", name: "Japan",                  dial: "+81",  tz: ["Asia/Tokyo"] },
  { flag: "🇯🇴", name: "Jordan",                 dial: "+962", tz: ["Asia/Amman"] },
  { flag: "🇰🇿", name: "Kazakhstan",             dial: "+7",   tz: ["Asia/Almaty"] },
  { flag: "🇰🇪", name: "Kenya",                  dial: "+254", tz: ["Africa/Nairobi"] },
  { flag: "🇰🇼", name: "Kuwait",                 dial: "+965", tz: ["Asia/Kuwait"] },
  { flag: "🇱🇧", name: "Lebanon",                dial: "+961", tz: ["Asia/Beirut"] },
  { flag: "🇲🇾", name: "Malaysia",               dial: "+60",  tz: ["Asia/Kuala_Lumpur"] },
  { flag: "🇲🇻", name: "Maldives",               dial: "+960", tz: ["Indian/Maldives"] },
  { flag: "🇲🇽", name: "Mexico",                 dial: "+52",  tz: ["America/Mexico_City","America/Monterrey","America/Tijuana"] },
  { flag: "🇲🇦", name: "Morocco",                dial: "+212", tz: ["Africa/Casablanca"] },
  { flag: "🇲🇲", name: "Myanmar",                dial: "+95",  tz: ["Asia/Rangoon","Asia/Yangon"] },
  { flag: "🇳🇵", name: "Nepal",                  dial: "+977", tz: ["Asia/Kathmandu","Asia/Katmandu"] },
  { flag: "🇳🇱", name: "Netherlands",            dial: "+31",  tz: ["Europe/Amsterdam"] },
  { flag: "🇳🇿", name: "New Zealand",            dial: "+64",  tz: ["Pacific/Auckland"] },
  { flag: "🇳🇬", name: "Nigeria",                dial: "+234", tz: ["Africa/Lagos"] },
  { flag: "🇳🇴", name: "Norway",                 dial: "+47",  tz: ["Europe/Oslo"] },
  { flag: "🇴🇲", name: "Oman",                   dial: "+968", tz: ["Asia/Muscat"] },
  { flag: "🇵🇰", name: "Pakistan",               dial: "+92",  tz: ["Asia/Karachi"] },
  { flag: "🇵🇦", name: "Panama",                 dial: "+507", tz: ["America/Panama"] },
  { flag: "🇵🇾", name: "Paraguay",               dial: "+595", tz: ["America/Asuncion"] },
  { flag: "🇵🇪", name: "Peru",                   dial: "+51",  tz: ["America/Lima"] },
  { flag: "🇵🇭", name: "Philippines",            dial: "+63",  tz: ["Asia/Manila"] },
  { flag: "🇵🇱", name: "Poland",                 dial: "+48",  tz: ["Europe/Warsaw"] },
  { flag: "🇵🇹", name: "Portugal",               dial: "+351", tz: ["Europe/Lisbon"] },
  { flag: "🇶🇦", name: "Qatar",                  dial: "+974", tz: ["Asia/Qatar"] },
  { flag: "🇷🇴", name: "Romania",                dial: "+40",  tz: ["Europe/Bucharest"] },
  { flag: "🇷🇺", name: "Russia",                 dial: "+7",   tz: ["Europe/Moscow","Asia/Yekaterinburg","Asia/Novosibirsk","Asia/Vladivostok"] },
  { flag: "🇸🇦", name: "Saudi Arabia",           dial: "+966", tz: ["Asia/Riyadh"] },
  { flag: "🇷🇸", name: "Serbia",                 dial: "+381", tz: ["Europe/Belgrade"] },
  { flag: "🇸🇬", name: "Singapore",              dial: "+65",  tz: ["Asia/Singapore"] },
  { flag: "🇸🇰", name: "Slovakia",               dial: "+421", tz: ["Europe/Bratislava"] },
  { flag: "🇸🇮", name: "Slovenia",               dial: "+386", tz: ["Europe/Ljubljana"] },
  { flag: "🇿🇦", name: "South Africa",           dial: "+27",  tz: ["Africa/Johannesburg"] },
  { flag: "🇰🇷", name: "South Korea",            dial: "+82",  tz: ["Asia/Seoul"] },
  { flag: "🇪🇸", name: "Spain",                  dial: "+34",  tz: ["Europe/Madrid"] },
  { flag: "🇱🇰", name: "Sri Lanka",              dial: "+94",  tz: ["Asia/Colombo"] },
  { flag: "🇸🇩", name: "Sudan",                  dial: "+249", tz: ["Africa/Khartoum"] },
  { flag: "🇸🇪", name: "Sweden",                 dial: "+46",  tz: ["Europe/Stockholm"] },
  { flag: "🇨🇭", name: "Switzerland",            dial: "+41",  tz: ["Europe/Zurich"] },
  { flag: "🇸🇾", name: "Syria",                  dial: "+963", tz: ["Asia/Damascus"] },
  { flag: "🇹🇼", name: "Taiwan",                 dial: "+886", tz: ["Asia/Taipei"] },
  { flag: "🇹🇿", name: "Tanzania",               dial: "+255", tz: ["Africa/Dar_es_Salaam"] },
  { flag: "🇹🇭", name: "Thailand",               dial: "+66",  tz: ["Asia/Bangkok"] },
  { flag: "🇹🇳", name: "Tunisia",                dial: "+216", tz: ["Africa/Tunis"] },
  { flag: "🇹🇷", name: "Turkey",                 dial: "+90",  tz: ["Europe/Istanbul"] },
  { flag: "🇺🇬", name: "Uganda",                 dial: "+256", tz: ["Africa/Kampala"] },
  { flag: "🇺🇦", name: "Ukraine",                dial: "+380", tz: ["Europe/Kiev","Europe/Kyiv"] },
  { flag: "🇦🇪", name: "UAE",                    dial: "+971", tz: ["Asia/Dubai"] },
  { flag: "🇬🇧", name: "United Kingdom",         dial: "+44",  tz: ["Europe/London"] },
  { flag: "🇺🇸", name: "United States",          dial: "+1",   tz: ["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Phoenix","America/Anchorage","Pacific/Honolulu"] },
  { flag: "🇺🇾", name: "Uruguay",                dial: "+598", tz: ["America/Montevideo"] },
  { flag: "🇺🇿", name: "Uzbekistan",             dial: "+998", tz: ["Asia/Tashkent"] },
  { flag: "🇻🇪", name: "Venezuela",              dial: "+58",  tz: ["America/Caracas"] },
  { flag: "🇻🇳", name: "Vietnam",                dial: "+84",  tz: ["Asia/Ho_Chi_Minh","Asia/Saigon"] },
  { flag: "🇾🇪", name: "Yemen",                  dial: "+967", tz: ["Asia/Aden"] },
  { flag: "🇿🇲", name: "Zambia",                 dial: "+260", tz: ["Africa/Lusaka"] },
  { flag: "🇿🇼", name: "Zimbabwe",               dial: "+263", tz: ["Africa/Harare"] },
];

const phoneCountrySelect = document.getElementById("phone-country-select");

function detectCountryFromTimezone(tz) {
  const normalized = String(tz || "").trim();
  for (const c of COUNTRIES) {
    if (c.tz.includes(normalized)) return c;
  }
  return null;
}

(function initPhoneCountrySelect() {
  if (!phoneCountrySelect) return;
  const TOP_50 = new Set(["United States","India","United Kingdom","Canada","Australia","Germany","France","Brazil","Mexico","Japan","China","South Korea","Singapore","UAE","Saudi Arabia","Italy","Spain","Netherlands","Sweden","Switzerland","Norway","Denmark","Finland","Poland","Russia","Turkey","South Africa","Nigeria","Kenya","Egypt","Israel","Pakistan","Bangladesh","Indonesia","Malaysia","Philippines","Thailand","Vietnam","Argentina","Chile","Colombia","New Zealand","Ireland","Portugal","Belgium","Austria","Greece","Romania","Czech Republic","Hong Kong"]);
  const sorted = [...COUNTRIES].filter(c => TOP_50.has(c.name)).sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.dial;
    opt.textContent = `${c.flag} ${c.dial}`;
    opt.title = c.name;
    phoneCountrySelect.appendChild(opt);
  });

  // Auto-select based on visitor timezone
  const detected = detectCountryFromTimezone(visitorTimezone);
  if (detected) phoneCountrySelect.value = detected.dial;
  if (!phoneCountrySelect.value) phoneCountrySelect.value = "+1"; // fallback USA
})();

// Real-time inline validation feedback
function setFieldError(input, message) {
  const container = input.closest(".form-group") || input.parentElement;
  let hint = container.querySelector(".field-inline-error");
  if (!hint) {
    hint = document.createElement("p");
    hint.className = "field-inline-error";
    hint.style.cssText = "color:#cf4664;font-size:0.8rem;margin-top:4px;margin-bottom:0;";
    container.appendChild(hint);
  }
  hint.textContent = message;
  input.style.borderColor = message ? "#cf4664" : "";
}

emailInput.addEventListener("blur", () => {
  const v = emailInput.value.trim();
  if (!v) { setFieldError(emailInput, ""); return; }
  setFieldError(emailInput,
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Enter a valid email — e.g. name@gmail.com"
  );
});

emailInput.addEventListener("input", () => {
  if (emailInput.style.borderColor) setFieldError(emailInput, "");
});

if (phoneInput) {
  phoneInput.addEventListener("blur", () => {
    const v = phoneInput.value.trim();
    if (!v) { setFieldError(phoneInput, "Phone number is required"); return; }
    setFieldError(phoneInput,
      /^\d{7,10}$/.test(v) ? "" : "Enter 7–10 digits — e.g. 9876543210"
    );
  });
  phoneInput.addEventListener("input", () => {
    const digits = phoneInput.value.replace(/\D/g, "").slice(0, 10);
    if (phoneInput.value !== digits) phoneInput.value = digits;
    if (phoneInput.style.borderColor) setFieldError(phoneInput, "");
  });
}

bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  // Always go to Questions step (step 3) — it shows questions if any, or a confirm button if none
  goToStep3();
});

async function collectAndSubmitAnswers(e) {
  e.preventDefault();
  const answers = [];
  let hasError = false;
  if (questionsList) {
    questionsList.querySelectorAll(".question-item textarea").forEach((ta) => {
      const val = ta.value.trim();
      if (ta.dataset.required === "1" && !val) {
        ta.style.borderColor = "var(--error)";
        hasError = true;
      } else {
        ta.style.borderColor = "";
        answers.push({ questionId: ta.dataset.questionId, answer: val });
      }
    });
  }
  if (hasError) {
    showError("Please answer all required questions.", questionsErrorAlert);
    return;
  }
  showError("", questionsErrorAlert);
  await submitBooking(answers);
}

if (questionsForm instanceof HTMLFormElement) {
  questionsForm.addEventListener("submit", collectAndSubmitAnswers);
}

async function submitBooking(answers = []) {
  const confirmBtn = document.getElementById("confirm-booking-btn");
  const questionsSubmitBtn = document.getElementById("questions-submit-btn");
  const activeSubmitBtn = (stepQuestions && !stepQuestions.classList.contains("hidden"))
    ? questionsSubmitBtn : confirmBtn;

  try {
    showError("", formErrorAlert);

    if (!selectedSlot) throw new Error("Please select a time slot.");

    const nameVal  = nameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const localNumber = phoneInput?.value?.trim() || "";
    const dialCode = phoneCountrySelect?.value || "";
    const phoneVal = localNumber ? `${dialCode} ${localNumber}` : "";

    if (!nameVal) throw new Error("Please enter your full name.");

    if (!emailVal) throw new Error("Please enter your email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal)) {
      throw new Error("Please enter a valid email address (e.g. name@gmail.com).");
    }

    if (!localNumber) throw new Error("Please enter your phone number.");
    if (!/^\d{7,10}$/.test(localNumber)) throw new Error("Enter 7–10 digits — e.g. 9876543210");

    if (activeSubmitBtn) { activeSubmitBtn.disabled = true; activeSubmitBtn.textContent = "Confirming…"; }

    const requestBody = {
      visitorDate: selectedDate,
      startAtUtc: selectedSlot.startAtUtc,
      slotToken: selectedSlot.token,
      name: nameVal,
      email: emailVal,
      phone: phoneVal,
      notes: notesInput.value.trim(),
      timezone: visitorTimezone,
      answers,
    };

    const payload = useLocalPreview
      ? {
          event: currentEvent,
          landingUrl: "/",
          publicBookingUrl: window.location.href.split("?")[0],
          booking: {
            id: `preview-booking-${Date.now()}`,
            inviteeName: requestBody.name,
            inviteeEmail: requestBody.email,
            inviteePhone: requestBody.phone,
            notes: requestBody.notes,
            locationType: currentEvent.locationType,
            meetingLinkStatus: "generated",
            meetingLink: "https://meet.google.com/lookup/preview-demo-room",
            visitorTimezone,
            startLocal: {
              date: formatDateLabel(selectedDate, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
              time: selectedSlot.startLocal.time,
            },
            endLocal: {
              date: formatDateLabel(selectedDate, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }),
              time: selectedSlot.endLocal.time,
            },
          },
        }
      : await fetchJson(
          buildPublicBookingsUrl(),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Timezone": visitorTimezone,
            },
            body: JSON.stringify(requestBody),
          }
        );

    // booking success, redirect to thank-you.html with id + query args
    payload.publicBookingUrl = payload.publicBookingUrl || window.location.href.split("?")[0];
    payload.landingUrl = payload.landingUrl || (viewLandingLink instanceof HTMLAnchorElement ? viewLandingLink.href : "/");
    sessionStorage.setItem("meetscheduling_last_booking", JSON.stringify(payload));
    const url = buildThankYouUrl(payload.booking.id);
    syncStepPills("confirmed");
    window.location.href = url;

  } catch (err) {
    const errTarget = (stepQuestions && !stepQuestions.classList.contains("hidden"))
      ? questionsErrorAlert : formErrorAlert;
    showError(err.message, errTarget);
    if (activeSubmitBtn) {
      activeSubmitBtn.disabled = false;
      activeSubmitBtn.textContent = "Confirm booking";
    }
  }
}

// Init - render sidebar immediately from URL so page feels instant
(function preRenderSidebar() {
  const nameFromUrl = username
    ? decodeURIComponent(username).replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "Loading...";
  const initials = nameFromUrl.split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "MS";
  if (hostAvatar) hostAvatar.textContent = initials;
  if (hostName) hostName.textContent = nameFromUrl;
  if (topHostAvatar) topHostAvatar.textContent = initials;
  if (topHostName) topHostName.textContent = nameFromUrl;
})();

// Show the calendar shell immediately (all days disabled) before API responds
(function preRenderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  calendarMonthYear.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  calendarDays.innerHTML = "";

  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement("div"));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const btn = document.createElement("button");
    btn.className = "calendar-day";
    btn.textContent = d;
    btn.disabled = true; // enabled after API responds with available dates
    calendarDays.appendChild(btn);
  }
  prevMonthBtn.disabled = true;
})();

initTimezoneSelect();
setLandingLink();
syncStepPills("select");
if (timezoneSelectDetails) timezoneSelectDetails.value = visitorTimezone;
loadEvent();
