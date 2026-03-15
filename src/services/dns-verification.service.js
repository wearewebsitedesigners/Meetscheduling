const { getDomainProvider } = require("./domains/provider");

async function verifyDnsConfiguration(domainRecord) {
  const provider = getDomainProvider();
  return provider.verifyDomain(domainRecord);
}

module.exports = {
  verifyDnsConfiguration,
};
