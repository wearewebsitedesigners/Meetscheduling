const statusEl = document.getElementById("status");
const eventTitleEl = document.getElementById("event-title");
const eventDescEl = document.getElementById("event-desc");
const eventMetaEl = document.getElementById("event-meta");
const dateSelect = document.getElementById("date-select");
const timezoneInput = document.getElementById("timezone-input");
const slotsEl = document.getElementById("slots");
const nameInput = document.getElementById("name-input");
const emailInput = document.getElementById("email-input");
const notesInput = document.getElementById("notes-input");
const confirmBtn = document.getElementById("confirm-btn");

const parts = window.location.pathname.split("/").filter(Boolean);
const username = parts[0] || "";
const slug = parts[1] || "";
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

let currentEvent = null;
let currentSlots = [];
let selectedSlot = null;

timezoneInput.value = timezone;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "#5d7899";
}

function renderSlots() {
  slotsEl.innerHTML = "";
  selectedSlot = null;

  if (!currentSlots.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No available slots for this date.";
    slotsEl.appendChild(p);
    return;
  }

  for (const slot of currentSlots) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot";
    btn.textContent = `${slot.startLocal.time}`;
    btn.addEventListener("click", () => {
      selectedSlot = slot;
      Array.from(slotsEl.querySelectorAll(".slot")).forEach((item) =>
        item.classList.remove("active")
      );
      btn.classList.add("active");
    });
    slotsEl.appendChild(btn);
  }
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

async function loadEvent() {
  try {
    setStatus("Loading event...");
    const data = await fetchJson(
      `/api/public/${encodeURIComponent(username)}/${encodeURIComponent(
        slug
      )}?timezone=${encodeURIComponent(timezone)}`
    );

    currentEvent = data.event;
    eventTitleEl.textContent = data.event.title;
    eventDescEl.textContent = data.event.description || "";
    eventMetaEl.textContent = `Hosted by ${data.event.hostName} | ${data.event.durationMinutes} min | ${data.event.hostTimezone}`;

    dateSelect.innerHTML = "";
    data.dates.forEach((date) => {
      const option = document.createElement("option");
      option.value = date;
      option.textContent = date;
      dateSelect.appendChild(option);
    });

    await loadSlots();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadSlots() {
  try {
    const date = dateSelect.value;
    if (!date) return;
    setStatus("Loading slots...");

    const data = await fetchJson(
      `/api/public/${encodeURIComponent(username)}/${encodeURIComponent(
        slug
      )}/slots?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`
    );
    currentSlots = data.slots || [];
    renderSlots();
    setStatus(`Found ${currentSlots.length} slots.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function confirmBooking() {
  try {
    if (!selectedSlot) {
      setStatus("Please select a time slot first.", true);
      return;
    }
    if (!nameInput.value.trim() || !emailInput.value.trim()) {
      setStatus("Please fill your name and email.", true);
      return;
    }

    confirmBtn.disabled = true;
    setStatus("Confirming booking...");

    const payload = await fetchJson(
      `/api/public/${encodeURIComponent(username)}/${encodeURIComponent(
        slug
      )}/bookings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Timezone": timezone,
        },
        body: JSON.stringify({
          visitorDate: dateSelect.value,
          startAtUtc: selectedSlot.startAtUtc,
          slotToken: selectedSlot.token,
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          notes: notesInput.value.trim(),
          timezone,
        }),
      }
    );

    const booking = payload.booking;
    setStatus(
      `Booked: ${booking.startLocal.date} ${booking.startLocal.time}. ${
        payload.emailStatus?.sent ? "Confirmation email sent." : "Email not sent."
      }`
    );
    await loadSlots();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    confirmBtn.disabled = false;
  }
}

dateSelect.addEventListener("change", loadSlots);
confirmBtn.addEventListener("click", confirmBooking);

loadEvent();

