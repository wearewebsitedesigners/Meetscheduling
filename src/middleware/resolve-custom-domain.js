const { findDomainByNormalizedHost } = require("../services/domains.service");
const {
  isPlatformOwnedDomain,
  normalizeHostHeader,
} = require("../utils/domain-utils");

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
    return next(error);
  }
}

module.exports = resolveCustomDomain;
