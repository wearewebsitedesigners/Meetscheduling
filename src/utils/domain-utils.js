const net = require("net");
const { badRequest } = require("./http-error");
const env = require("../config/env");

function extractHostname(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) throw badRequest("domain is required");

  let next = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^\/+|\/+$/g, "")
    .trim();

  if (!next) throw badRequest("domain is required");
  if (/[/?#]/.test(next)) {
    next = next.split(/[/?#]/, 1)[0];
  }

  next = next.replace(/:\d+$/, "");
  return next.trim().toLowerCase();
}

function getPlatformHosts() {
  const base = new Set(["localhost", "127.0.0.1"]);
  const configured = Array.isArray(env.domains.platformHosts)
    ? env.domains.platformHosts
    : [];

  for (const value of configured) {
    const host = String(value || "").trim().toLowerCase();
    if (!host) continue;
    base.add(host);
    if (host.startsWith("www.")) {
      base.add(host.slice(4));
    } else {
      base.add(`www.${host}`);
    }
  }

  return Array.from(base);
}

function isIpAddress(hostname) {
  return net.isIP(String(hostname || "").trim()) !== 0;
}

function isPlatformOwnedDomain(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host) return false;

  return getPlatformHosts().some((platformHost) => {
    const next = String(platformHost || "").trim().toLowerCase();
    if (!next) return false;
    return host === next || host.endsWith(`.${next}`);
  });
}

function validateDomain(input) {
  const hostname = extractHostname(input);

  if (!hostname || hostname.length < 4 || hostname.length > 253) {
    throw badRequest("domain must be a valid hostname");
  }
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw badRequest("localhost domains are not allowed");
  }
  if (isIpAddress(hostname)) {
    throw badRequest("IP addresses are not allowed");
  }
  if (!hostname.includes(".")) {
    throw badRequest("domain must include a top-level domain");
  }
  if (isPlatformOwnedDomain(hostname)) {
    throw badRequest("This domain is reserved by the platform");
  }
  if (!/^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(hostname)) {
    throw badRequest("domain must be a valid hostname");
  }

  return hostname;
}

function normalizeDomain(input) {
  return validateDomain(input);
}

function normalizeHostHeader(input) {
  const value = String(input || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!value) return "";
  return value.replace(/:\d+$/, "");
}

function buildDnsInstructions(domain, verificationMethod, dnsTarget) {
  const host = normalizeDomain(domain);
  const labels = host.split(".");
  const rootLabel = labels.length > 2 ? labels.slice(0, -2).join(".") : "@";

  if (verificationMethod === "a_record") {
    return {
      recordType: "A",
      name: "@",
      value: dnsTarget,
    };
  }

  return {
    recordType: "CNAME",
    name: rootLabel,
    value: dnsTarget,
  };
}

module.exports = {
  buildDnsInstructions,
  extractHostname,
  getPlatformHosts,
  isPlatformOwnedDomain,
  normalizeDomain,
  normalizeHostHeader,
  validateDomain,
};
