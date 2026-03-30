const { findDomainByNormalizedHost } = require("../services/domains.service");
const {
  isPlatformOwnedDomain,
  normalizeHostHeader,
} = require("../utils/domain-utils");
const { logSecurityEvent } = require("../utils/security-log");

async function resolveCustomDomain(req, res, next) {
  try {
    const rawHost = req.headers["x-forwarded-host"] || req.headers.host || "";
    const host = normalizeHostHeader(rawHost);
    if (!host || isPlatformOwnedDomain(host)) {
      return next();
    }

    const resolvedDomain = await findDomainByNormalizedHost(host);
    if (!resolvedDomain) {
      return next();
    }

    req.customDomain = resolvedDomain;
    return next();
  } catch (error) {
    logSecurityEvent("custom_domain.resolve_error", {
      message: error?.message || String(error),
      host: req.headers["x-forwarded-host"] || req.headers.host || "",
    }, { level: "error" });
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}

module.exports = resolveCustomDomain;
