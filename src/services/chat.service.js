const { query, withTransaction } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const {
  assertEmail,
  assertInteger,
  assertJsonObject,
  assertOptionalString,
  assertString,
} = require("../utils/validation");

const CHAT_STATUSES = new Set(["open", "resolved", "archived"]);
const CHAT_CHANNELS = new Set(["chat", "support", "lead", "internal"]);

function normalizeStatus(status = "") {
  const value = String(status || "")
    .trim()
    .toLowerCase();
  if (!value) return "all";
  if (!CHAT_STATUSES.has(value)) throw badRequest("status is invalid");
  return value;
}

function normalizeChannel(channel = "") {
  const value = String(channel || "")
    .trim()
    .toLowerCase();
  if (!value) return "chat";
  if (!CHAT_CHANNELS.has(value)) throw badRequest("channel is invalid");
  return value;
}

function normalizeParticipants(participants) {
  if (participants === undefined || participants === null) return [];
  if (!Array.isArray(participants)) {
    throw badRequest("participants must be an array");
  }
  if (participants.length > 50) {
    throw badRequest("participants contains too many entries");
  }

  return participants.map((participant, index) => {
    if (!participant || typeof participant !== "object" || Array.isArray(participant)) {
      throw badRequest(`participants[${index}] must be an object`);
    }

    const participantEmailRaw = assertOptionalString(
      participant.email,
      `participants[${index}].email`,
      { max: 320 }
    );
    const participantEmail = participantEmailRaw
      ? assertEmail(participantEmailRaw, `participants[${index}].email`)
      : "";
    const participantName = assertOptionalString(
      participant.displayName || participant.name,
      `participants[${index}].displayName`,
      { max: 160 }
    );

    if (!participantEmail && !participantName) {
      throw badRequest(`participants[${index}] must include email or displayName`);
    }

    return {
      email: participantEmail,
      displayName: participantName || participantEmail || "Participant",
    };
  });
}

function mapConversationRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    subject: row.subject,
    channel: row.channel,
    status: row.status,
    lastMessageAt: row.last_message_at,
    lastMessage: row.last_message_body || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    workspaceId: row.workspace_id,
    senderUserId: row.sender_user_id,
    senderName: row.sender_name,
    body: row.body,
    messageType: row.message_type,
    metadata: row.metadata_json || {},
    createdAt: row.created_at,
  };
}

async function ensureConversation(workspaceId, conversationId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        created_by_user_id,
        subject,
        channel,
        status,
        last_message_at,
        created_at,
        updated_at
      FROM chat_conversations
      WHERE workspace_id = $1
        AND id = $2
      LIMIT 1
    `,
    [workspaceId, conversationId],
    client
  );

  const row = result.rows[0];
  if (!row) throw notFound("Conversation not found");
  return row;
}

async function listChatConversations(
  workspaceId,
  { status = "all", search = "", limit = 50 } = {}
) {
  const safeStatus = normalizeStatus(status);
  const safeSearch = assertOptionalString(search, "search", { max: 200 });
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 200 });

  const params = [workspaceId];
  const conditions = ["c.workspace_id = $1"];

  if (safeStatus !== "all") {
    params.push(safeStatus);
    conditions.push(`c.status = $${params.length}`);
  }

  if (safeSearch) {
    params.push(`%${safeSearch}%`);
    const idx = params.length;
    conditions.push(`(c.subject ILIKE $${idx} OR lm.body ILIKE $${idx})`);
  }

  params.push(safeLimit);

  const result = await query(
    `
      SELECT
        c.id,
        c.workspace_id,
        c.subject,
        c.channel,
        c.status,
        c.last_message_at,
        c.created_at,
        c.updated_at,
        lm.body AS last_message_body
      FROM chat_conversations c
      LEFT JOIN LATERAL (
        SELECT body
        FROM chat_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON TRUE
      WHERE ${conditions.join(" AND ")}
      ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC, c.updated_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map(mapConversationRow);
}

async function createChatConversation(workspaceId, userId, payload = {}) {
  const subject = assertString(payload.subject || "New conversation", "subject", {
    min: 2,
    max: 200,
  });
  const channel = normalizeChannel(payload.channel || "chat");
  const participants = normalizeParticipants(payload.participants);

  return withTransaction(async (client) => {
    const insertedConversation = await query(
      `
        INSERT INTO chat_conversations (
          workspace_id,
          created_by_user_id,
          subject,
          channel,
          status,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,'open',NOW(),NOW())
        RETURNING
          id,
          workspace_id,
          subject,
          channel,
          status,
          last_message_at,
          created_at,
          updated_at
      `,
      [workspaceId, userId, subject, channel],
      client
    );

    const conversation = insertedConversation.rows[0];

    const ownerResult = await query(
      `
        SELECT display_name, email
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
      client
    );

    const owner = ownerResult.rows[0] || { display_name: "Team", email: "" };

    await query(
      `
        INSERT INTO chat_participants (
          conversation_id,
          workspace_id,
          user_id,
          email,
          display_name,
          role,
          joined_at
        )
        VALUES ($1,$2,$3,$4,$5,'owner',NOW())
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [conversation.id, workspaceId, userId, owner.email, owner.display_name || owner.email || "Owner"],
      client
    );

    for (const participant of participants) {
      await query(
        `
          INSERT INTO chat_participants (
            conversation_id,
            workspace_id,
            email,
            display_name,
            role,
            joined_at
          )
          VALUES ($1,$2,$3,$4,'external',NOW())
          ON CONFLICT (conversation_id, email)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            joined_at = chat_participants.joined_at
        `,
        [
          conversation.id,
          workspaceId,
          participant.email || null,
          participant.displayName,
        ],
        client
      );
    }

    return mapConversationRow(conversation);
  });
}

async function listChatMessages(workspaceId, conversationId, { limit = 200 } = {}) {
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 500 });
  await ensureConversation(workspaceId, conversationId);

  const result = await query(
    `
      SELECT
        id,
        conversation_id,
        workspace_id,
        sender_user_id,
        sender_name,
        body,
        message_type,
        metadata_json,
        created_at
      FROM chat_messages
      WHERE workspace_id = $1
        AND conversation_id = $2
      ORDER BY created_at ASC
      LIMIT $3
    `,
    [workspaceId, conversationId, safeLimit]
  );

  return result.rows.map(mapMessageRow);
}

async function createChatMessage(workspaceId, conversationId, userId, payload = {}) {
  const body = assertString(payload.body, "body", { min: 1, max: 10000 });
  const metadata =
    payload.metadata === undefined ? {} : assertJsonObject(payload.metadata, "metadata");
  const messageType = String(payload.messageType || "text")
    .trim()
    .toLowerCase();
  if (!["text", "note", "system"].includes(messageType)) {
    throw badRequest("messageType is invalid");
  }

  return withTransaction(async (client) => {
    const conversation = await ensureConversation(workspaceId, conversationId, client);

    const senderResult = await query(
      `
        SELECT display_name, email, username
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
      client
    );

    const sender = senderResult.rows[0] || null;
    const senderName =
      sender?.display_name || sender?.username || sender?.email || "Workspace member";

    const inserted = await query(
      `
        INSERT INTO chat_messages (
          conversation_id,
          workspace_id,
          sender_user_id,
          sender_name,
          body,
          message_type,
          metadata_json,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
        RETURNING
          id,
          conversation_id,
          workspace_id,
          sender_user_id,
          sender_name,
          body,
          message_type,
          metadata_json,
          created_at
      `,
      [
        conversation.id,
        workspaceId,
        userId,
        senderName,
        body,
        messageType,
        JSON.stringify(metadata),
      ],
      client
    );

    const message = inserted.rows[0];

    await query(
      `
        UPDATE chat_conversations
        SET
          last_message_at = $1,
          updated_at = NOW(),
          status = CASE WHEN status = 'archived' THEN 'open' ELSE status END
        WHERE id = $2
          AND workspace_id = $3
      `,
      [message.created_at, conversation.id, workspaceId],
      client
    );

    await query(
      `
        INSERT INTO chat_read_states (
          conversation_id,
          user_id,
          workspace_id,
          last_read_message_id,
          last_read_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,NOW(),NOW())
        ON CONFLICT (conversation_id, user_id)
        DO UPDATE SET
          last_read_message_id = EXCLUDED.last_read_message_id,
          last_read_at = NOW(),
          updated_at = NOW()
      `,
      [conversation.id, userId, workspaceId, message.id],
      client
    );

    return mapMessageRow(message);
  });
}

async function markConversationRead(workspaceId, conversationId, userId) {
  const conversation = await ensureConversation(workspaceId, conversationId);

  const latestMessage = await query(
    `
      SELECT id, created_at
      FROM chat_messages
      WHERE conversation_id = $1
        AND workspace_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [conversation.id, workspaceId]
  );

  const latest = latestMessage.rows[0] || null;

  await query(
    `
      INSERT INTO chat_read_states (
        conversation_id,
        user_id,
        workspace_id,
        last_read_message_id,
        last_read_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,NOW(),NOW())
      ON CONFLICT (conversation_id, user_id)
      DO UPDATE SET
        last_read_message_id = EXCLUDED.last_read_message_id,
        last_read_at = NOW(),
        updated_at = NOW()
    `,
    [conversation.id, userId, workspaceId, latest?.id || null]
  );

  return {
    conversationId,
    lastReadMessageId: latest?.id || null,
    markedAt: new Date().toISOString(),
  };
}

module.exports = {
  listChatConversations,
  createChatConversation,
  listChatMessages,
  createChatMessage,
  markConversationRead,
};
