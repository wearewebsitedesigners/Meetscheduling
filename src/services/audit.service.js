const { query } = require("../db/pool");

function cleanText(value, fallback = "", max = 500) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  return text.slice(0, max);
}

async function recordAuditEvent(event = {}, client = null) {
  const workspaceId = cleanText(event.workspaceId, "", 80);
  const action = cleanText(event.action, "", 160);
  const resourceType = cleanText(event.resourceType, "unknown", 120);

  if (!workspaceId || !action) return null;

  try {
    await query(
      `
        INSERT INTO audit_events (
          workspace_id,
          actor_user_id,
          action,
          resource_type,
          resource_id,
          metadata_json,
          ip_address,
          user_agent,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,NOW())
      `,
      [
        workspaceId,
        event.actorUserId || null,
        action,
        resourceType,
        cleanText(event.resourceId, "", 160) || null,
        JSON.stringify(event.metadata && typeof event.metadata === "object" ? event.metadata : {}),
        cleanText(event.ipAddress, "", 120) || null,
        cleanText(event.userAgent, "", 1000) || null,
      ],
      client
    );
  } catch (error) {
    // During staged rollout, keep audit logging non-blocking.
    if (error && (error.code === "42P01" || error.code === "42703")) {
      return null;
    }
    throw error;
  }

  return true;
}

module.exports = {
  recordAuditEvent,
};
