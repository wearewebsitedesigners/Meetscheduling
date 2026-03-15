const { query, withTransaction } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const { assertInteger, assertOptionalString, assertString } = require("../utils/validation");

const THREAD_STATUSES = new Set(["open", "pending", "closed", "archived"]);
const CAMPAIGN_STATUSES = new Set(["draft", "scheduled", "sent", "paused"]);

function normalizeThreadStatus(value = "") {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  if (!status) return "all";
  if (!THREAD_STATUSES.has(status)) throw badRequest("status is invalid");
  return status;
}

function normalizeCampaignStatus(value = "") {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  if (!status) return "all";
  if (!CAMPAIGN_STATUSES.has(status)) throw badRequest("status is invalid");
  return status;
}

function mapThreadRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    subject: row.subject,
    contactEmail: row.contact_email,
    contactName: row.contact_name || "",
    status: row.status,
    lastMessageAt: row.last_message_at,
    lastMessage: row.last_message || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    threadId: row.thread_id,
    workspaceId: row.workspace_id,
    direction: row.direction,
    senderUserId: row.sender_user_id,
    senderEmail: row.sender_email,
    senderName: row.sender_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapCampaignRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    subject: row.subject,
    previewText: row.preview_text || "",
    status: row.status,
    audienceFilter: row.audience_filter || {},
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureThread(workspaceId, threadId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        subject,
        contact_email,
        contact_name,
        status,
        last_message_at,
        created_at,
        updated_at
      FROM inbox_threads
      WHERE workspace_id = $1
        AND id = $2
      LIMIT 1
    `,
    [workspaceId, threadId],
    client
  );

  const row = result.rows[0];
  if (!row) throw notFound("Thread not found");
  return row;
}

async function listInboxThreads(
  workspaceId,
  { status = "all", search = "", limit = 100 } = {}
) {
  const safeStatus = normalizeThreadStatus(status);
  const safeSearch = assertOptionalString(search, "search", { max: 220 });
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 300 });

  const params = [workspaceId];
  const conditions = ["t.workspace_id = $1"];

  if (safeStatus !== "all") {
    params.push(safeStatus);
    conditions.push(`t.status = $${params.length}`);
  }

  if (safeSearch) {
    params.push(`%${safeSearch}%`);
    const idx = params.length;
    conditions.push(
      `(t.subject ILIKE $${idx} OR t.contact_email ILIKE $${idx} OR t.contact_name ILIKE $${idx} OR lm.body ILIKE $${idx})`
    );
  }

  params.push(safeLimit);

  const result = await query(
    `
      SELECT
        t.id,
        t.workspace_id,
        t.subject,
        t.contact_email,
        t.contact_name,
        t.status,
        t.last_message_at,
        t.created_at,
        t.updated_at,
        lm.body AS last_message
      FROM inbox_threads t
      LEFT JOIN LATERAL (
        SELECT body
        FROM inbox_messages
        WHERE thread_id = t.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON TRUE
      WHERE ${conditions.join(" AND ")}
      ORDER BY COALESCE(t.last_message_at, t.updated_at) DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map(mapThreadRow);
}

async function listInboxThreadMessages(workspaceId, threadId, { limit = 500 } = {}) {
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 1000 });
  await ensureThread(workspaceId, threadId);

  const result = await query(
    `
      SELECT
        id,
        thread_id,
        workspace_id,
        sender_user_id,
        direction,
        sender_email,
        sender_name,
        body,
        created_at
      FROM inbox_messages
      WHERE workspace_id = $1
        AND thread_id = $2
      ORDER BY created_at ASC
      LIMIT $3
    `,
    [workspaceId, threadId, safeLimit]
  );

  return result.rows.map(mapMessageRow);
}

async function replyInboxThread(workspaceId, userId, threadId, payload = {}) {
  const body = assertString(payload.body, "body", { min: 1, max: 20000 });

  return withTransaction(async (client) => {
    const thread = await ensureThread(workspaceId, threadId, client);

    const sender = await query(
      `
        SELECT email, display_name, username
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
      client
    );

    const user = sender.rows[0] || null;
    const senderEmail = user?.email || thread.contact_email;
    const senderName = user?.display_name || user?.username || user?.email || "Workspace member";

    const inserted = await query(
      `
        INSERT INTO inbox_messages (
          thread_id,
          workspace_id,
          sender_user_id,
          direction,
          sender_email,
          sender_name,
          body,
          created_at
        )
        VALUES ($1,$2,$3,'outbound',$4,$5,$6,NOW())
        RETURNING
          id,
          thread_id,
          workspace_id,
          sender_user_id,
          direction,
          sender_email,
          sender_name,
          body,
          created_at
      `,
      [thread.id, workspaceId, userId, senderEmail, senderName, body],
      client
    );

    await query(
      `
        UPDATE inbox_threads
        SET
          status = 'open',
          last_message_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
          AND workspace_id = $2
      `,
      [thread.id, workspaceId],
      client
    );

    return mapMessageRow(inserted.rows[0]);
  });
}

async function createInboxCampaign(workspaceId, userId, payload = {}) {
  const name = assertString(payload.name, "name", { min: 2, max: 160 });
  const subject = assertString(payload.subject, "subject", { min: 2, max: 220 });
  const previewText = assertOptionalString(payload.previewText, "previewText", { max: 280 });

  const status = String(payload.status || "draft")
    .trim()
    .toLowerCase();
  if (!CAMPAIGN_STATUSES.has(status)) {
    throw badRequest("status is invalid");
  }

  const audienceFilter =
    payload.audienceFilter && typeof payload.audienceFilter === "object"
      ? payload.audienceFilter
      : {};

  const scheduledFor = payload.scheduledFor ? new Date(payload.scheduledFor) : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
    throw badRequest("scheduledFor is invalid");
  }

  const result = await query(
    `
      INSERT INTO inbox_campaigns (
        workspace_id,
        created_by_user_id,
        name,
        subject,
        preview_text,
        status,
        audience_filter,
        scheduled_for,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW(),NOW())
      RETURNING
        id,
        workspace_id,
        name,
        subject,
        preview_text,
        status,
        audience_filter,
        scheduled_for,
        sent_at,
        created_at,
        updated_at
    `,
    [
      workspaceId,
      userId,
      name,
      subject,
      previewText,
      status,
      JSON.stringify(audienceFilter),
      scheduledFor ? scheduledFor.toISOString() : null,
    ]
  );

  return mapCampaignRow(result.rows[0]);
}

async function listInboxCampaigns(workspaceId, { status = "all", limit = 100 } = {}) {
  const safeStatus = normalizeCampaignStatus(status);
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 300 });

  const params = [workspaceId];
  let statusClause = "";
  if (safeStatus !== "all") {
    params.push(safeStatus);
    statusClause = `AND status = $${params.length}`;
  }
  params.push(safeLimit);

  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        name,
        subject,
        preview_text,
        status,
        audience_filter,
        scheduled_for,
        sent_at,
        created_at,
        updated_at
      FROM inbox_campaigns
      WHERE workspace_id = $1
        ${statusClause}
      ORDER BY updated_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map(mapCampaignRow);
}

module.exports = {
  listInboxThreads,
  listInboxThreadMessages,
  replyInboxThread,
  createInboxCampaign,
  listInboxCampaigns,
};
