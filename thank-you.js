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

function renderMeetingLinkStatus(booking) {
  const titleEl = document.getElementById("meeting-link-title");
  const valueEl = document.getElementById("meeting-link-value");
  if (!titleEl || !valueEl) return;

  const locationType = String(booking?.locationType || "").trim().toLowerCase();
  const status = String(booking?.meetingLinkStatus || "").trim().toLowerCase();
  const meetingLink = String(booking?.meetingLink || "").trim();
  const canJoin = isJoinableMeetingUrl(meetingLink, locationType);

  if (canJoin) {
    titleEl.textContent =
      locationType === "google_meet" ? "Google Meet link generated" : "Meeting link generated";
    valueEl.textContent = "";
    const anchor = document.createElement("a");
    anchor.href = meetingLink;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    anchor.textContent = "Join meeting";
    valueEl.appendChild(anchor);
    return;
  }

  if (locationType === "google_meet") {
    titleEl.textContent = "Google Meet link pending";
    if (status === "pending_calendar_connection") {
      valueEl.textContent =
        "The host needs to connect Google Calendar. You will receive the join link by email.";
      return;
    }
    if (status === "generation_failed") {
      valueEl.textContent =
        "We could not generate the Google Meet link yet. Please check reminder emails for updates.";
      return;
    }
    valueEl.textContent = "Google Meet link is being generated and will be shared by email.";
    return;
  }

  if (locationType === "zoom") {
    titleEl.textContent = "Zoom link pending";
    valueEl.textContent = "The host will share the Zoom details shortly.";
    return;
  }

  titleEl.textContent = "Web conferencing details";
  valueEl.textContent = "Meeting details are in your email.";
}

document.addEventListener("DOMContentLoaded", () => {
  const titleEl = document.getElementById("event-title");
  const datetimeEl = document.getElementById("event-datetime");
  const timezoneEl = document.getElementById("event-timezone");

  try {
    const dataStr = sessionStorage.getItem("meetscheduling_last_booking");
    if (!dataStr) {
      titleEl.textContent = "Booking Confirmed";
      datetimeEl.textContent = "Check your email for details.";
      timezoneEl.textContent = "";
      return;
    }

    const data = JSON.parse(dataStr);
    const booking = data.booking;
    const event = data.event;

    titleEl.textContent = event.title || "Meeting scheduled";
    datetimeEl.textContent = `${booking.startLocal.time} - ${booking.endLocal.time}, ${booking.startLocal.date}`;
    timezoneEl.textContent = booking.visitorTimezone || "UTC";
    renderMeetingLinkStatus(booking);
  } catch (err) {
    console.error(err);
    titleEl.textContent = "Booking Confirmed";
    datetimeEl.textContent = "Check your email for details.";
  }
});
