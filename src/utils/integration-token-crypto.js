const crypto = require("crypto");
const env = require("../config/env");

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = 1;

function buildKey(secret) {
  return crypto.createHash("sha256").update(secret).digest();
}

function getRequiredIntegrationTokenSecret() {
  const secret = String(env.integrationTokenSecret || "").trim();
  if (!secret) {
    throw new Error("INTEGRATION_TOKEN_SECRET is required for Google token encryption/decryption");
  }
  return secret;
}

function getPrimaryKeyCandidate() {
  return {
    source: "INTEGRATION_TOKEN_SECRET",
    key: buildKey(getRequiredIntegrationTokenSecret()),
  };
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

  const primary = getPrimaryKeyCandidate();
  const key = primary.key;
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

function decryptTokenPayloadDetailed(encryptedValue) {
  let candidates;
  try {
    candidates = [getPrimaryKeyCandidate()];
  } catch (error) {
    return {
      payload: null,
      keySource: "",
      attemptedKeySources: [],
      failureReason: error.message || "missing_integration_token_secret",
    };
  }
  const attemptedKeySources = candidates.map((candidate) => candidate.source);
  if (!encryptedValue || typeof encryptedValue !== "object" || Array.isArray(encryptedValue)) {
    return {
      payload: null,
      keySource: "",
      attemptedKeySources,
      failureReason: "invalid_payload",
    };
  }

  if (Number(encryptedValue.v) !== VERSION) {
    return {
      payload: null,
      keySource: "",
      attemptedKeySources,
      failureReason: "unsupported_version",
    };
  }

  if (String(encryptedValue.alg || "") !== "A256GCM") {
    return {
      payload: null,
      keySource: "",
      attemptedKeySources,
      failureReason: "unsupported_algorithm",
    };
  }

  const iv = Buffer.from(String(encryptedValue.iv || ""), "base64");
  const tag = Buffer.from(String(encryptedValue.tag || ""), "base64");
  const data = Buffer.from(String(encryptedValue.data || ""), "base64");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || !data.length) {
    return {
      payload: null,
      keySource: "",
      attemptedKeySources,
      failureReason: "invalid_envelope",
    };
  }

  for (const candidate of candidates) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, candidate.key, iv, {
        authTagLength: TAG_BYTES,
      });
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
      const parsed = safeJsonParse(decrypted);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          payload: parsed,
          keySource: candidate.source,
          attemptedKeySources,
          failureReason: "",
        };
      }
    } catch {
      // Try the next configured key source before giving up.
    }
  }

  return {
    payload: null,
    keySource: "",
    attemptedKeySources,
    failureReason: "decrypt_failed",
  };
}

function decryptTokenPayload(encryptedValue) {
  return decryptTokenPayloadDetailed(encryptedValue).payload;
}

module.exports = {
  encryptTokenPayload,
  decryptTokenPayload,
  decryptTokenPayloadDetailed,
};
