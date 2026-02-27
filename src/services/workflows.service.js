const { query } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const { assertOptionalString, assertString } = require("../utils/validation");

const WORKFLOW_FILTERS = new Set(["all", "active", "paused", "draft"]);
const WORKFLOW_STATUS = new Set(["active", "paused", "draft"]);
const WORKFLOW_TEMPLATE_LIBRARY = Object.freeze([
  {
    id: "booking-confirmation",
    name: "Booking confirmation",
    description: "Send confirmation right after a booking is created.",
    trigger: "After booking",
    channel: "Email",
    offset: "Immediately",
    status: "active",
  },
  {
    id: "pre-event-24h-reminder",
    name: "24-hour reminder",
    description: "Remind invitees one day before the event.",
    trigger: "Before event",
    channel: "Email",
    offset: "24 hours before",
    status: "active",
  },
  {
    id: "pre-event-1h-reminder",
    name: "1-hour reminder",
    description: "Last-mile reminder one hour before start.",
    trigger: "Before event",
    channel: "Email",
    offset: "1 hour before",
    status: "active",
  },
  {
    id: "same-day-prep",
    name: "Same-day prep email",
    description: "Share prep notes and meeting expectations.",
    trigger: "Before event",
    channel: "Email",
    offset: "3 hours before",
    status: "draft",
  },
  {
    id: "no-show-follow-up",
    name: "No-show follow up",
    description: "Re-engage invitees who missed the meeting.",
    trigger: "No-show detected",
    channel: "Email",
    offset: "1 hour after",
    status: "draft",
  },
  {
    id: "reschedule-link",
    name: "Reschedule assistance",
    description: "Automatically send a reschedule option after cancellation.",
    trigger: "Booking canceled",
    channel: "Email",
    offset: "15 minutes after",
    status: "draft",
  },
  {
    id: "cancellation-winback",
    name: "Cancellation win-back",
    description: "Offer another slot after cancellation.",
    trigger: "Booking canceled",
    channel: "Email",
    offset: "24 hours after",
    status: "draft",
  },
  {
    id: "post-meeting-thank-you",
    name: "Post-meeting thank you",
    description: "Send a thank-you note after the meeting ends.",
    trigger: "After event",
    channel: "Email",
    offset: "2 hours after",
    status: "active",
  },
  {
    id: "feedback-request",
    name: "Feedback request",
    description: "Collect quick feedback after completed meetings.",
    trigger: "After event",
    channel: "Email",
    offset: "24 hours after",
    status: "draft",
  },
  {
    id: "review-request",
    name: "Review request",
    description: "Ask happy clients for a public review.",
    trigger: "After event",
    channel: "Email",
    offset: "3 days after",
    status: "draft",
  },
  {
    id: "reactivation-30d",
    name: "30-day reactivation",
    description: "Nudge inactive contacts back into booking.",
    trigger: "No booking activity",
    channel: "Email",
    offset: "30 days after",
    status: "draft",
  },
  {
    id: "reactivation-90d",
    name: "90-day reactivation",
    description: "Long-term win-back for dormant contacts.",
    trigger: "No booking activity",
    channel: "Email",
    offset: "90 days after",
    status: "draft",
  },
]);
const WORKFLOW_TEMPLATES_BY_ID = new Map(
  WORKFLOW_TEMPLATE_LIBRARY.map((template) => [template.id, template])
);

function normalizeStatus(value, field = "status") {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  if (!WORKFLOW_STATUS.has(status)) {
    throw badRequest(`${field} must be one of active, paused, draft`);
  }
  return status;
}

function mapWorkflowRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    trigger: row.trigger,
    channel: row.channel,
    offset: row.offset_label,
    status: row.status,
    lastRun: row.last_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkflowTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    trigger: template.trigger,
    channel: template.channel,
    offset: template.offset,
    status: template.status,
  };
}

function listWorkflowTemplates() {
  return WORKFLOW_TEMPLATE_LIBRARY.map(mapWorkflowTemplate);
}

async function listWorkflowsForUser(userId, { search = "", filter = "all" } = {}) {
  const safeFilter = WORKFLOW_FILTERS.has(String(filter || "").toLowerCase())
    ? String(filter || "").toLowerCase()
    : "all";
  const safeSearch = assertOptionalString(search, "search", { max: 200 });

  const params = [userId];
  const conditions = ["user_id = $1"];
  if (safeFilter !== "all") {
    params.push(safeFilter);
    conditions.push(`status = $${params.length}`);
  }
  if (safeSearch) {
    params.push(`%${safeSearch}%`);
    const idx = params.length;
    conditions.push(
      `(name ILIKE $${idx} OR trigger ILIKE $${idx} OR channel ILIKE $${idx} OR offset_label ILIKE $${idx})`
    );
  }

  const result = await query(
    `
      SELECT
        id,
        user_id,
        name,
        trigger,
        channel,
        offset_label,
        status,
        last_run_at,
        created_at,
        updated_at
      FROM workflows
      WHERE ${conditions.join(" AND ")}
      ORDER BY updated_at DESC
    `,
    params
  );
  return result.rows.map(mapWorkflowRow);
}

async function createWorkflowForUser(userId, payload = {}) {
  const templateId = assertOptionalString(payload.templateId, "templateId", {
    max: 80,
  });
  const template = templateId ? WORKFLOW_TEMPLATES_BY_ID.get(templateId) : null;
  if (templateId && !template) {
    throw badRequest("Unknown workflow template");
  }

  const name = assertString(payload.name || template?.name || "Booking reminder", "name", {
    min: 2,
    max: 120,
  });
  const trigger = assertString(payload.trigger || template?.trigger || "After booking", "trigger", {
    min: 2,
    max: 180,
  });
  const channel = assertString(payload.channel || template?.channel || "Email", "channel", {
    min: 2,
    max: 120,
  });
  const offset = assertString(payload.offset || template?.offset || "24 hours before", "offset", {
    min: 2,
    max: 120,
  });
  const status =
    payload.status === undefined
      ? normalizeStatus(template?.status || "draft")
      : normalizeStatus(payload.status);

  const result = await query(
    `
      INSERT INTO workflows (
        user_id,
        name,
        trigger,
        channel,
        offset_label,
        status,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING
        id,
        user_id,
        name,
        trigger,
        channel,
        offset_label,
        status,
        last_run_at,
        created_at,
        updated_at
    `,
    [userId, name, trigger, channel, offset, status]
  );
  return mapWorkflowRow(result.rows[0]);
}

async function updateWorkflowForUser(userId, workflowId, payload = {}) {
  const existingResult = await query(
    `
      SELECT
        id,
        user_id,
        name,
        trigger,
        channel,
        offset_label,
        status,
        last_run_at
      FROM workflows
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [workflowId, userId]
  );
  const existing = existingResult.rows[0];
  if (!existing) throw notFound("Workflow not found");

  const next = {
    name:
      payload.name === undefined
        ? existing.name
        : assertString(payload.name, "name", { min: 2, max: 120 }),
    trigger:
      payload.trigger === undefined
        ? existing.trigger
        : assertString(payload.trigger, "trigger", { min: 2, max: 180 }),
    channel:
      payload.channel === undefined
        ? existing.channel
        : assertString(payload.channel, "channel", { min: 2, max: 120 }),
    offset:
      payload.offset === undefined
        ? existing.offset_label
        : assertString(payload.offset, "offset", { min: 2, max: 120 }),
    status:
      payload.status === undefined
        ? existing.status
        : normalizeStatus(payload.status),
    lastRun:
      payload.lastRun === undefined
        ? existing.last_run_at
        : payload.lastRun
        ? new Date(payload.lastRun)
        : null,
  };

  const result = await query(
    `
      UPDATE workflows
      SET
        name = $1,
        trigger = $2,
        channel = $3,
        offset_label = $4,
        status = $5,
        last_run_at = $6,
        updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING
        id,
        user_id,
        name,
        trigger,
        channel,
        offset_label,
        status,
        last_run_at,
        created_at,
        updated_at
    `,
    [
      next.name,
      next.trigger,
      next.channel,
      next.offset,
      next.status,
      next.lastRun,
      workflowId,
      userId,
    ]
  );
  return mapWorkflowRow(result.rows[0]);
}

async function runWorkflowForUser(userId, workflowId) {
  const result = await query(
    `
      UPDATE workflows
      SET
        last_run_at = NOW(),
        status = CASE WHEN status = 'draft' THEN 'active' ELSE status END,
        updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING
        id,
        user_id,
        name,
        trigger,
        channel,
        offset_label,
        status,
        last_run_at,
        created_at,
        updated_at
    `,
    [workflowId, userId]
  );
  if (!result.rows[0]) throw notFound("Workflow not found");
  return mapWorkflowRow(result.rows[0]);
}

async function duplicateWorkflowForUser(userId, workflowId) {
  const existingResult = await query(
    `
      SELECT
        name,
        trigger,
        channel,
        offset_label
      FROM workflows
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [workflowId, userId]
  );
  const existing = existingResult.rows[0];
  if (!existing) throw notFound("Workflow not found");

  const copyName =
    existing.name.length > 100 ? `${existing.name.slice(0, 100)} (Copy)` : `${existing.name} (Copy)`;
  return createWorkflowForUser(userId, {
    name: copyName,
    trigger: existing.trigger,
    channel: existing.channel,
    offset: existing.offset_label,
    status: "draft",
  });
}

async function deleteWorkflowForUser(userId, workflowId) {
  const result = await query(
    `
      DELETE FROM workflows
      WHERE id = $1 AND user_id = $2
    `,
    [workflowId, userId]
  );
  if (!result.rowCount) throw notFound("Workflow not found");
  return { deleted: true };
}

module.exports = {
  listWorkflowTemplates,
  listWorkflowsForUser,
  createWorkflowForUser,
  updateWorkflowForUser,
  runWorkflowForUser,
  duplicateWorkflowForUser,
  deleteWorkflowForUser,
};
