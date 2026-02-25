const crypto = require("crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = 1;

function deriveKey() {
  const source =
    String(env.integrationTokenSecret || "").trim() ||
    String(env.jwtSecret || "").trim();
  return crypto.createHash("sha256").update(source).digest();
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function encryptTokenPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const key = deriveKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: VERSION,
    alg: "A256GCM",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptTokenPayload(encryptedValue) {
  if (!encryptedValue || typeof encryptedValue !== "object" || Array.isArray(encryptedValue)) {
    return null;
  }

  if (Number(encryptedValue.v) !== VERSION) return null;
  if (String(encryptedValue.alg || "") !== "A256GCM") return null;

  try {
    const key = deriveKey();
    const iv = Buffer.from(String(encryptedValue.iv || ""), "base64");
    const tag = Buffer.from(String(encryptedValue.tag || ""), "base64");
    const data = Buffer.from(String(encryptedValue.data || ""), "base64");
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || !data.length) return null;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const parsed = safeJsonParse(decrypted);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

module.exports = {
  encryptTokenPayload,
  decryptTokenPayload,
};
