const bcrypt = require("bcrypt");
const env = require("../config/env");
const { badRequest } = require("../utils/http-error");
const { assertString } = require("../utils/validation");

function joinPasswordRequirements(requirements = []) {
  if (requirements.length <= 1) return requirements[0] || "";
  if (requirements.length === 2) return `${requirements[0]} and ${requirements[1]}`;
  return `${requirements.slice(0, -1).join(", ")}, and ${requirements[requirements.length - 1]}`;
}

function assertStrongPassword(value, field = "password") {
  const password = assertString(value, field, {
    min: env.auth.passwordMinLength,
    max: 200,
    trim: false,
    normalize: false,
  });

  const missing = [];
  if (!/[a-z]/.test(password)) missing.push("one lowercase letter");
  if (!/[A-Z]/.test(password)) missing.push("one uppercase letter");
  if (!/\d/.test(password)) missing.push("one number");
  if (!/[^A-Za-z0-9]/.test(password)) missing.push("one symbol");

  if (missing.length) {
    throw badRequest(`${field} must include at least ${joinPasswordRequirements(missing)}.`);
  }

  return password;
}

async function hashPassword(value, field = "password", { validate = true } = {}) {
  const password = validate
    ? assertStrongPassword(value, field)
    : assertString(value, field, { min: 1, max: 200, trim: false, normalize: false });
  return bcrypt.hash(password, env.auth.passwordHashRounds);
}

async function verifyPassword(password, passwordHash) {
  const candidate = assertString(password, "password", {
    min: 1,
    max: 200,
    trim: false,
    normalize: false,
  });
  if (!passwordHash) return false;
  return bcrypt.compare(candidate, String(passwordHash));
}

function extractBcryptRounds(passwordHash) {
  const match = String(passwordHash || "").match(/^\$2[aby]\$(\d{2})\$/);
  return match ? Number(match[1]) : 0;
}

function needsPasswordRehash(passwordHash) {
  const rounds = extractBcryptRounds(passwordHash);
  return rounds > 0 && rounds < env.auth.passwordHashRounds;
}

async function hashBackupCode(code) {
  const cleanCode = assertString(code, "backupCode", { min: 6, max: 32 });
  return bcrypt.hash(cleanCode, env.auth.passwordHashRounds);
}

module.exports = {
  assertStrongPassword,
  hashPassword,
  verifyPassword,
  needsPasswordRehash,
  hashBackupCode,
};
