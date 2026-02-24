// Elements
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const errorAlert = document.getElementById("error-alert");

const hostAvatar = document.getElementById("host-avatar");
const hostName = document.getElementById("host-name");
const eventTitle = document.getElementById("event-title");
const eventDuration = document.getElementById("event-duration");
const eventLocation = document.getElementById("event-location");
const eventDesc = document.getElementById("event-desc");

const sidebarDatetime = document.getElementById("sidebar-datetime");
const sidebarDatetimeText = document.getElementById("sidebar-datetime-text");

// Steps & Panels
const stepCalendar = document.getElementById("step-calendar");
const stepDetails = document.getElementById("step-details");

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
const bookingForm = document.getElementById("booking-form");
const nameInput = document.getElementById("name-input");
const emailInput = document.getElementById("email-input");
const notesInput = document.getElementById("notes-input");
const confirmBtn = document.getElementById("confirm-booking-btn");
const formErrorAlert = document.getElementById("form-error-alert");

// State
const parts = window.location.pathname.split("/").filter(Boolean);
const username = parts[0] || "";
const slug = parts[1] || "";

let visitorTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
let currentEvent = null;
let availableDates = new Set(); // yyyy-mm-dd
let currentViewDate = new Date(); // dictates which month we're looking at
let selectedDate = null; // yyyy-mm-dd
let selectedSlot = null; // The slot object
let cachedSlots = {}; // { 'yyyy-mm-dd': [slots] }

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
    loadEvent(); // Reload event/dates to adjust to new timezone
  });
}

function showError(msg, panel = errorAlert) {
  panel.textContent = msg;
  panel.style.display = msg ? "block" : "none";
}

function showLoading(msg) {
  loadingText.textContent = msg || "Loading...";
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

function renderSidebarEventDetails(event) {
  hostAvatar.textContent = (event.hostName || "H").charAt(0).toUpperCase();
  hostName.textContent = event.hostName;
  eventTitle.textContent = event.title;
  eventDuration.textContent = `${event.durationMinutes} min`;

  if (event.locationType === 'in_person' || event.locationType === 'custom') {
    eventLocation.textContent = "Physical Location / Custom Server";
  } else if (event.locationType === 'google_meet') {
    eventLocation.textContent = "Google Meet (Details provided upon confirmation)";
  } else if (event.locationType === 'zoom') {
    eventLocation.textContent = "Zoom Video (Details provided upon confirmation)";
  }

  // Preserve newlines
  if (event.description) {
    eventDesc.innerHTML = event.description.replace(/\n/g, '<br>');
  }
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
  }
}

prevMonthBtn.addEventListener("click", () => changeMonth(-1));
nextMonthBtn.addEventListener("click", () => changeMonth(1));

async function selectDate(ymd, btnElem) {
  selectedDate = ymd;
  selectedSlot = null;

  // Visual update
  document.querySelectorAll(".calendar-day").forEach(el => el.classList.remove("selected"));
  if (btnElem) btnElem.classList.add("selected");

  // Format date header nicely for the slots column
  const dateObj = new Date(`${ymd}T00:00:00`); // parse strictly as local date
  const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  slotsHeader.textContent = `${dowNames[dateObj.getDay()]}, ${mNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
  slotsHeader.style.opacity = 1;

  sidebarDatetime.style.display = "none";

  await fetchSlotsForDate(ymd);
}

async function fetchSlotsForDate(ymd) {
  slotsList.innerHTML = "";

  try {
    showLoading();
    // Use cached slots if available to avoid spamming the backend
    let slots = cachedSlots[ymd];
    if (!slots) {
      const data = await fetchJson(
        `/api/public/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/slots?date=${ymd}&timezone=${encodeURIComponent(visitorTimezone)}`
      );
      slots = data.slots || [];
      cachedSlots[ymd] = slots; // simple cache
    }

    if (!slots.length) {
      slotsList.innerHTML = '<div style="color:var(--text-muted); padding:1rem 0;">No slots available</div>';
      return;
    }

    slots.forEach(slot => {
      // Wrapper for slot layout (button + confirm button)
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
      confirmSlotBtn.style.display = "none"; // Hide initially

      btn.addEventListener("click", () => {
        // Reset all sizes
        document.querySelectorAll(".slot-action-row").forEach(el => {
          el.querySelector(".slot-btn").classList.remove("active");
          el.querySelector(".confirm-slot-btn").style.display = "none";
        });

        btn.classList.add("active");
        confirmSlotBtn.style.display = "block";
        selectedSlot = slot;
      });

      confirmSlotBtn.addEventListener("click", () => {
        goToStep2();
      });

      row.appendChild(btn);
      row.appendChild(confirmSlotBtn);
      slotsList.appendChild(row);
    });

  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

async function loadEvent() {
  try {
    showError("");
    showLoading("Loading your experience...");
    const data = await fetchJson(
      `/api/public/${encodeURIComponent(username)}/${encodeURIComponent(slug)}?timezone=${encodeURIComponent(visitorTimezone)}`
    );

    currentEvent = data.event;
    renderSidebarEventDetails(currentEvent);

    availableDates = new Set(data.dates); // The API gives us YYYY-MM-DD
    cachedSlots = {}; // clear slot cache on reload

    // See if the currently selected date is still available
    if (selectedDate && !availableDates.has(selectedDate)) {
      selectedDate = null;
      slotsList.innerHTML = "";
      slotsHeader.style.opacity = 0;
    }

    renderCalendar();

    // Auto select first available if we don't have one and there are dates
    if (!selectedDate && data.dates.length > 0) {
      const firstYmd = data.dates[0];
      const parts = firstYmd.split("-");
      // Update view date so that month calendar aligns
      currentViewDate = new Date(parts[0], parseInt(parts[1], 10) - 1, 1);
      renderCalendar();
      await selectDate(firstYmd);
    } else if (selectedDate) {
      // re-render slots for selected
      await fetchSlotsForDate(selectedDate);
    }

  } catch (error) {
    showError(error.message);
  } finally {
    hideLoading();
  }
}

function goToStep2() {
  if (!selectedSlot) return;

  stepCalendar.classList.add("hidden");
  stepDetails.classList.remove("hidden");

  // Show selected datetime on the left sidebar
  sidebarDatetimeText.textContent = `${selectedSlot.startLocal.time} - ${selectedSlot.endLocal.time}, ${slotsHeader.textContent} (${visitorTimezone})`;
  sidebarDatetime.style.display = "flex";

  // Focus name to start typing immediately
  setTimeout(() => nameInput.focus(), 50);
}

function goBackToStep1() {
  stepDetails.classList.add("hidden");
  stepCalendar.classList.remove("hidden");
  sidebarDatetime.style.display = "none";
}

formBackBtn.addEventListener("click", () => {
  goBackToStep1();
});

bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    showError("", formErrorAlert);

    if (!selectedSlot) throw new Error("Please select a time slot.");
    if (!nameInput.value.trim() || !emailInput.value.trim()) {
      throw new Error("Name and Email are required.");
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Scheduling...";

    const payload = await fetchJson(
      `/api/public/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/bookings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Timezone": visitorTimezone,
        },
        body: JSON.stringify({
          visitorDate: selectedDate,
          startAtUtc: selectedSlot.startAtUtc,
          slotToken: selectedSlot.token,
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          notes: notesInput.value.trim(),
          timezone: visitorTimezone,
        }),
      }
    );

    // booking success, redirect to thank-you.html with id + query args
    sessionStorage.setItem("meetscheduling_last_booking", JSON.stringify(payload));
    let url = `/thank-you.html?bookingId=${payload.booking.id}&tz=${encodeURIComponent(visitorTimezone)}`;
    window.location.href = url;

  } catch (err) {
    showError(err.message, formErrorAlert);
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Schedule Event";
  }
});

// Init
initTimezoneSelect();
loadEvent();

