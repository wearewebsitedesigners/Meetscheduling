const { query } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const { assertOptionalString, assertString } = require("../utils/validation");

const WORKFLOW_FILTERS = new Set(["all", "active", "paused", "draft"]);
const WORKFLOW_STATUS = new Set(["active", "paused", "draft"]);

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
  const name = assertString(payload.name, "name", { min: 2, max: 120 });
  const trigger = assertString(payload.trigger || "After booking", "trigger", {
    min: 2,
    max: 180,
  });
  const channel = assertString(payload.channel || "Email", "channel", {
    min: 2,
    max: 120,
  });
  const offset = assertString(payload.offset || "24 hours before", "offset", {
    min: 2,
    max: 120,
  });
  const status =
    payload.status === undefined ? "draft" : normalizeStatus(payload.status);

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
  listWorkflowsForUser,
  createWorkflowForUser,
  updateWorkflowForUser,
  runWorkflowForUser,
  duplicateWorkflowForUser,
  deleteWorkflowForUser,
};
