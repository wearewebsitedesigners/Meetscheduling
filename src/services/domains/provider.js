const env = require("../../config/env");
const localProvider = require("./providers/local-provider");
const vercelProvider = require("./providers/vercel-provider");
const cloudflareProvider = require("./providers/cloudflare-provider");

function getDomainProvider() {
  switch (String(env.domains.provider || "local").trim().toLowerCase()) {
    case "vercel":
      return vercelProvider;
    case "cloudflare":
      return cloudflareProvider;
    case "local":
    default:
      return localProvider;
  }
}

module.exports = {
  getDomainProvider,
};
