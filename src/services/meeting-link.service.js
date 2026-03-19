const crypto = require("crypto");
const { getAuthenticatedGoogleClient } = require("./integrations.service");

function normalizeCustomLocation(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) return value;
  if (/^(meet\.google\.com|(?:[\w-]+\.)?zoom\.us)\//i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function isJoinableMeetingLink(rawLink, locationType = "") {
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

function randomRequestId(prefix = "meet") {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractGoogleMeetLinkFromEvent(eventData = {}) {
  const hangoutLink = String(eventData?.hangoutLink || "").trim();
  if (isJoinableMeetingLink(hangoutLink, "google_meet")) return hangoutLink;

  const entryPoints = eventData?.conferenceData?.entryPoints;
  if (Array.isArray(entryPoints)) {
    const videoEntry = entryPoints.find((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const uri = String(entry.uri || "").trim();
      return isJoinableMeetingLink(uri, "google_meet");
    });
    if (videoEntry) return String(videoEntry.uri).trim();
  }

  return null;
}

async function generateGoogleMeetLink(userId, bookingDetails = {}) {
  const scopeId = String(userId || "").trim();
  if (!scopeId) {
    throw new Error("Google Meet generation requires a connected workspace or user id.");
  }

  const startAtUtc = String(bookingDetails.startAtUtc || "").trim();
  const endAtUtc = String(bookingDetails.endAtUtc || "").trim();
  if (!startAtUtc || !endAtUtc) {
    throw new Error("Google Meet generation requires startAtUtc and endAtUtc.");
  }

  const calendarClient = await getAuthenticatedGoogleClient(scopeId);
  const bookingId = String(bookingDetails.bookingId || bookingDetails.id || "").trim();
  const eventTitle = String(bookingDetails.eventTitle || bookingDetails.title || "Meeting").trim() || "Meeting";
  const inviteeName =
    String(bookingDetails.inviteeName || bookingDetails.name || "Invitee").trim() || "Invitee";
  const inviteeEmail = String(bookingDetails.inviteeEmail || bookingDetails.email || "").trim();
  const hostTimezone =
    String(bookingDetails.hostTimezone || bookingDetails.timezone || "UTC").trim() || "UTC";
  const notes = String(bookingDetails.notes || "").trim();
  const attendees = inviteeEmail ? [{ email: inviteeEmail }] : [];

  const response = await calendarClient.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: inviteeEmail ? "all" : "none",
    requestBody: {
      summary: `${eventTitle} with ${inviteeName}`,
      description: notes || (bookingId ? `Booked via Meetscheduling (booking ${bookingId})` : "Booked via Meetscheduling"),
      start: {
        dateTime: new Date(startAtUtc).toISOString(),
        timeZone: hostTimezone,
      },
      end: {
        dateTime: new Date(endAtUtc).toISOString(),
        timeZone: hostTimezone,
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: randomRequestId("meet"),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const calendarEventId = String(response?.data?.id || "").trim() || null;
  let meetingLink = extractGoogleMeetLinkFromEvent(response?.data || {});

  if (!meetingLink && calendarEventId) {
    for (const waitMs of [300, 700, 1200, 2000]) {
      await sleep(waitMs);
      try {
        const lookup = await calendarClient.events.get({
          calendarId: "primary",
          eventId: calendarEventId,
          conferenceDataVersion: 1,
        });
        meetingLink = extractGoogleMeetLinkFromEvent(lookup?.data || {});
        if (meetingLink) break;
      } catch {
        // Keep booking successful; upstream decides how to handle missing links.
      }
    }
  }

  if (!meetingLink && calendarEventId) {
    try {
      await calendarClient.events.patch({
        calendarId: "primary",
        eventId: calendarEventId,
        conferenceDataVersion: 1,
        requestBody: {
          conferenceData: {
            createRequest: {
              requestId: randomRequestId("meet-retry"),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        },
      });
    } catch {
      // Keep booking successful; upstream decides how to handle missing links.
    }

    for (const waitMs of [600, 1200, 2000, 3000]) {
      await sleep(waitMs);
      try {
        const lookup = await calendarClient.events.get({
          calendarId: "primary",
          eventId: calendarEventId,
          conferenceDataVersion: 1,
        });
        meetingLink = extractGoogleMeetLinkFromEvent(lookup?.data || {});
        if (meetingLink) break;
      } catch {
        // Keep booking successful; upstream decides how to handle missing links.
      }
    }
  }

  return {
    calendarEventId,
    meetingLink,
  };
}

function generateMeetingLink(eventType) {
  const locationType = eventType.location_type || eventType.locationType;

  if (locationType === "in_person") return null;
  if (locationType === "custom") {
    const customLocation = eventType.custom_location || eventType.customLocation;
    return normalizeCustomLocation(customLocation);
  }

  // Never fabricate provider links. They create broken join experiences.
  if (locationType === "google_meet" || locationType === "zoom") {
    return null;
  }

  return null;
}

module.exports = {
  generateMeetingLink,
  generateGoogleMeetLink,
  isJoinableMeetingLink,
};
