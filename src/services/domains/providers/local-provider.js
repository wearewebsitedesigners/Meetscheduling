const dns = require("node:dns").promises;
const env = require("../../../config/env");

function normalizeRecords(records = []) {
  return records
    .map((value) => String(value || "").trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
}

async function resolveCnameRecords(domain) {
  try {
    const records = await dns.resolveCname(domain);
    return normalizeRecords(records);
  } catch (error) {
    if (["ENODATA", "ENOTFOUND", "ENODOMAIN", "SERVFAIL"].includes(String(error?.code || ""))) {
      return [];
    }
    throw error;
  }
}

async function resolveARecords(domain) {
  try {
    const records = await dns.resolve4(domain);
    return normalizeRecords(records);
  } catch (error) {
    if (["ENODATA", "ENOTFOUND", "ENODOMAIN", "SERVFAIL"].includes(String(error?.code || ""))) {
      return [];
    }
    throw error;
  }
}

async function addDomain(domainRecord) {
  return {
    provider: "local",
    dnsName: domainRecord.dns_name,
    dnsTarget: domainRecord.dns_target,
  };
}

async function verifyDomain(domainRecord) {
  const verificationMethod = String(domainRecord.verification_method || "cname")
    .trim()
    .toLowerCase();
  const expectedTarget = String(domainRecord.dns_target || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  const host = String(domainRecord.normalized_domain || domainRecord.domain || "")
    .trim()
    .toLowerCase();

  if (verificationMethod === "a_record") {
    const records = await resolveARecords(host);
    const expected = new Set(
      (env.domains.aRecordTargets || []).map((value) => String(value || "").trim().toLowerCase())
    );
    if (!expected.size && expectedTarget) expected.add(expectedTarget);

    const valid = records.some((record) => expected.has(record));
    return {
      valid,
      verificationMethod: "a_record",
      status: valid ? (env.domains.assumeSslReady ? "active" : "ssl_pending") : "dns_invalid",
      sslStatus: valid ? (env.domains.assumeSslReady ? "issued" : "pending") : "pending",
      records,
    };
  }

  const records = await resolveCnameRecords(host);
  const valid = records.some((record) => record === expectedTarget || record.endsWith(`.${expectedTarget}`));

  return {
    valid,
    verificationMethod: "cname",
    status: valid ? (env.domains.assumeSslReady ? "active" : "ssl_pending") : "dns_invalid",
    sslStatus: valid ? (env.domains.assumeSslReady ? "issued" : "pending") : "pending",
    records,
  };
}

async function getSslStatus(domainRecord) {
  return env.domains.assumeSslReady
    ? { sslStatus: "issued", status: "active" }
    : { sslStatus: "pending", status: "ssl_pending" };
}

async function removeDomain() {
  return { removed: true };
}

module.exports = {
  addDomain,
  verifyDomain,
  getSslStatus,
  removeDomain,
};
