function isJoinableMeetingUrl(rawLink, locationType = "") {
  const value = String(rawLink || "").trim();
  if (!value) return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (!(url.protocol === "https:" || url.protocol === "http:")) return false;

  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (locationType === "google_meet" || host === "meet.google.com") {
    if (host !== "meet.google.com") return false;
    if (/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(path)) return true;
    if (/^\/lookup\//i.test(path)) return true;
    return false;
  }

  if (locationType === "zoom" || host === "zoom.us" || host.endsWith(".zoom.us")) {
    if (!(host === "zoom.us" || host.endsWith(".zoom.us"))) return false;
    return /^\/(j|my|wc|s)\//i.test(path);
  }

  return true;
}

function getInitials(value, fallback = "MS") {
  const initials = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || fallback;
}

function safeHref(value, fallback = "/") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    return url.toString();
  } catch {
    return fallback;
  }
}

function renderMeetingLinkStatus(booking) {
  const titleEl = document.getElementById("meeting-link-title");
  const valueEl = document.getElementById("meeting-link-value");
  const buttonEl = document.getElementById("meeting-link-button");
  if (!titleEl || !valueEl || !buttonEl) return;

  const locationType = String(booking?.locationType || "").trim().toLowerCase();
  const status = String(booking?.meetingLinkStatus || "").trim().toLowerCase();
  const meetingLink = String(booking?.meetingLink || "").trim();
  const canJoin = isJoinableMeetingUrl(meetingLink, locationType);

  buttonEl.style.display = "none";
  buttonEl.removeAttribute("href");

  if (canJoin) {
    titleEl.textContent =
      locationType === "google_meet" ? "Google Meet link generated" : "Meeting link generated";
    valueEl.textContent = "Use the button above to join when it is time for your meeting.";
    buttonEl.href = meetingLink;
    buttonEl.style.display = "inline-flex";
    const labelEl = document.getElementById("meeting-link-button-label");
    if (labelEl) labelEl.textContent =
      locationType === "google_meet" ? "Open Google Meet" : "Open meeting link";
    return;
  }

  if (locationType === "google_meet") {
    titleEl.textContent = "Google Meet link pending";
    if (status === "pending_calendar_connection") {
      valueEl.textContent =
        "The host still needs to connect Google Calendar. The join link will be sent by email once it is available.";
      return;
    }
    if (status === "generation_failed") {
      valueEl.textContent =
        "We could not generate the Google Meet link yet. Please watch for follow-up email updates from the host.";
      return;
    }
    valueEl.textContent = "Google Meet details are being prepared and will be shared by email.";
    return;
  }

  if (locationType === "zoom") {
    titleEl.textContent = "Zoom link pending";
    valueEl.textContent = "The host will share the Zoom details shortly.";
    return;
  }

  titleEl.textContent = "Web conferencing details";
  valueEl.textContent = "Meeting details have been sent to your email.";
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(String(data.error || "Request failed"));
  }
  return data;
}

function getStoredConfirmation() {
  try {
    const raw = sessionStorage.getItem("meetscheduling_last_booking");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildConfirmationFetchUrl({ bookingId, username, slug, timezone, source }) {
  const safeBookingId = String(bookingId || "").trim();
  if (!safeBookingId) return "";

  const query = `timezone=${encodeURIComponent(String(timezone || "UTC").trim() || "UTC")}`;
  if (String(source || "").trim().toLowerCase() === "domain") {
    return `/api/public/domain/booking/bookings/${encodeURIComponent(safeBookingId)}?${query}`;
  }

  const safeUsername = String(username || "").trim();
  const safeSlug = String(slug || "").trim();
  if (!safeUsername || !safeSlug) return "";

  return `/api/public/${encodeURIComponent(safeUsername)}/${encodeURIComponent(safeSlug)}/bookings/${encodeURIComponent(safeBookingId)}?${query}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const titleEl = document.getElementById("event-title");
  const datetimeEl = document.getElementById("event-datetime");
  const timezoneEl = document.getElementById("event-timezone");
  const hostAvatarEl = document.getElementById("host-avatar");
  const hostNameEl = document.getElementById("host-name");
  const returnBookingLink = document.getElementById("return-booking-link");
  const viewHomeLink = document.getElementById("view-home-link");

  const applyFallback = () => {
    if (titleEl) titleEl.textContent = "Booking confirmed";
    if (datetimeEl) datetimeEl.textContent = "Check your email for the booking details.";
    if (timezoneEl) timezoneEl.textContent = "";
    if (hostAvatarEl) hostAvatarEl.textContent = "MS";
    if (hostNameEl) hostNameEl.textContent = "MeetScheduling";
    if (returnBookingLink) returnBookingLink.href = "/";
    if (viewHomeLink) viewHomeLink.href = "/";
  };

  const applyPayload = (data) => {
    const booking = data?.booking || {};
    const event = data?.event || {};
    const hostName = String(event.hostName || event.username || "MeetScheduling").trim();

    if (titleEl) titleEl.textContent = event.title || "Meeting scheduled";
    if (datetimeEl) {
      const startTime = booking?.startLocal?.time || "";
      const endTime = booking?.endLocal?.time || "";
      const dateLabel = booking?.startLocal?.date || "Check your email for details.";
      datetimeEl.textContent =
        startTime && endTime ? `${startTime} - ${endTime}, ${dateLabel}` : dateLabel;
    }
    if (timezoneEl) timezoneEl.textContent = booking.visitorTimezone || "UTC";
    if (hostAvatarEl) hostAvatarEl.textContent = getInitials(hostName);
    if (hostNameEl) hostNameEl.textContent = hostName;
    if (returnBookingLink) {
      returnBookingLink.href = safeHref(data.publicBookingUrl, "/");
    }
    if (viewHomeLink) {
      const fallbackLanding = event?.username ? `/${encodeURIComponent(event.username)}` : "/";
      viewHomeLink.href = safeHref(data.landingUrl, fallbackLanding);
    }

    document.title = `${event.title || "Booking confirmed"} | MeetScheduling`;
    renderMeetingLinkStatus(booking);
  };

  const query = new URLSearchParams(window.location.search);
  const bookingId = String(query.get("bookingId") || "").trim();
  const timezone = String(query.get("tz") || "UTC").trim() || "UTC";
  const source = String(query.get("source") || "").trim().toLowerCase();
  const username = String(query.get("username") || "").trim();
  const slug = String(query.get("slug") || "").trim();

  const stored = getStoredConfirmation();
  const storedBookingId = String(stored?.booking?.id || "").trim();
  const storedMatches = bookingId && storedBookingId && bookingId === storedBookingId;

  if (stored && (!bookingId || storedMatches)) {
    applyPayload(stored);
  }

  const fetchUrl = buildConfirmationFetchUrl({
    bookingId,
    username: username || stored?.event?.username,
    slug: slug || stored?.event?.slug,
    timezone,
    source,
  });

  if (!fetchUrl) {
    if (!stored) applyFallback();
    return;
  }

  try {
    const data = await fetchJson(fetchUrl);
    sessionStorage.setItem("meetscheduling_last_booking", JSON.stringify(data));
    applyPayload(data);
  } catch (error) {
    console.error(error);
    if (!stored) {
      applyFallback();
    }
  }
});
