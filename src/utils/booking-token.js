const crypto = require("crypto");
const env = require("../config/env");
const { forbidden } = require("./http-error");

function makeSlotToken(eventTypeId, startAtUtc) {
  const payload = `${eventTypeId}|${startAtUtc}`;
  return crypto
    .createHmac("sha256", env.publicBookingSigningSecret)
    .update(payload)
    .digest("hex");
}

function verifySlotToken(eventTypeId, startAtUtc, token) {
  if (!token || typeof token !== "string") {
    throw forbidden("Invalid booking token");
  }
  const expected = makeSlotToken(eventTypeId, startAtUtc);
  const incoming = Buffer.from(token, "utf8");
  const desired = Buffer.from(expected, "utf8");
  const sameLength = incoming.length === desired.length;
  if (!sameLength || !crypto.timingSafeEqual(incoming, desired)) {
    throw forbidden("Invalid booking token");
  }
}

module.exports = {
  makeSlotToken,
  verifySlotToken,
};

