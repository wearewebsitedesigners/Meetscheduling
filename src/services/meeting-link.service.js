function randomCode() {
  return Math.random().toString(36).slice(2, 10);
}

function generateMeetingLink(eventType) {
  const locationType = eventType.location_type || eventType.locationType;
  if (locationType === "in_person") return null;
  if (locationType === "custom") {
    const customLocation = eventType.custom_location || eventType.customLocation;
    return customLocation || null;
  }
  if (locationType === "zoom") {
    return `https://zoom.us/j/${randomCode()}${randomCode()}`;
  }
  if (locationType === "google_meet") {
    return `https://meet.google.com/${randomCode().slice(0, 3)}-${randomCode().slice(
      0,
      4
    )}-${randomCode().slice(0, 3)}`;
  }
  return null;
}

module.exports = {
  generateMeetingLink,
};

