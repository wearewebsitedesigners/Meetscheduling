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
  isJoinableMeetingLink,
};
