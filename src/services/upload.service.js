const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { badRequest } = require("../utils/http-error");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXT = Object.freeze({
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
});

function safeText(value, fallback = "", max = 4000) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text.slice(0, max);
}

function parseImageDataUrl(dataUrl) {
  const raw = safeText(dataUrl, "", 12_000_000);
  const match = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([a-zA-Z0-9+/=\s]+)$/);
  if (!match) {
    throw badRequest("Invalid image payload. Please upload PNG, JPG, WEBP, or GIF.");
  }

  const mimeType = safeText(match[1], "", 40).toLowerCase();
  const base64 = String(match[2] || "").replace(/\s+/g, "");
  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    throw badRequest("Could not decode uploaded image.");
  }

  if (!buffer || !buffer.length) {
    throw badRequest("Uploaded image is empty.");
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw badRequest("Image is too large. Maximum size is 5MB.");
  }

  const extension = MIME_EXT[mimeType];
  if (!extension) {
    throw badRequest("Unsupported image format.");
  }

  return { buffer, extension };
}

function safeSegment(value, fallback = "user") {
  const raw = safeText(value, fallback, 80);
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return cleaned || fallback;
}

async function uploadImageForUser(userId, payload = {}) {
  if (!userId) throw badRequest("User id is required");
  const { buffer, extension } = parseImageDataUrl(payload.dataUrl);

  const projectRoot = path.resolve(__dirname, "..", "..");
  const userDir = safeSegment(String(userId), "user");
  const relativeDirectory = path.join("uploads", "users", userDir);
  const absoluteDirectory = path.join(projectRoot, relativeDirectory);
  await fs.mkdir(absoluteDirectory, { recursive: true });

  const unique = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const filename = `${unique}.${extension}`;
  const absolutePath = path.join(absoluteDirectory, filename);
  await fs.writeFile(absolutePath, buffer, { mode: 0o644 });

  return {
    ok: true,
    url: `/${relativeDirectory.split(path.sep).join("/")}/${filename}`,
    bytes: buffer.length,
    contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
  };
}

module.exports = {
  uploadImageForUser,
};
