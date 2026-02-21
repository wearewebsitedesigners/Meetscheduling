const { query } = require("../db/pool");
const { badRequest, conflict, notFound } = require("../utils/http-error");
const {
  assertEmail,
  assertIsoDate,
  assertOptionalString,
  assertString,
} = require("../utils/validation");

const CONTACT_FILTERS = new Set(["all", "lead", "customer", "vip"]);

function normalizeContactType(value, field = "type") {
  const text = String(value || "")
    .trim()
    .toLowerCase();
  if (text === "lead") return "Lead";
  if (text === "customer") return "Customer";
  throw badRequest(`${field} must be Lead or Customer`);
}

function normalizeTags(tags) {
  if (tags === undefined || tags === null) return [];
  if (!Array.isArray(tags)) throw badRequest("tags must be an array");
  const unique = new Set();
  tags.forEach((tag) => {
    const value = assertString(tag, "tag", { min: 1, max: 40 });
    unique.add(value);
  });
  return Array.from(unique);
}

function normalizeLastMeeting(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text || text.toLowerCase() === "never") return null;
    return assertIsoDate(text, "lastMeeting");
  }
  throw badRequest("lastMeeting must be YYYY-MM-DD");
}

function mapContactRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    company: row.company || "",
    type: row.type,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || "",
    lastMeeting: row.last_meeting_date ? String(row.last_meeting_date) : "Never",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listContactsForUser(userId, { search = "", filter = "all" } = {}) {
  const safeFilter = CONTACT_FILTERS.has(String(filter || "").toLowerCase())
    ? String(filter || "").toLowerCase()
    : "all";
  const safeSearch = assertOptionalString(search, "search", { max: 200 });

  const params = [userId];
  const conditions = ["user_id = $1"];

  if (safeFilter === "lead") {
    conditions.push("type = 'Lead'");
  } else if (safeFilter === "customer") {
    conditions.push("type = 'Customer'");
  } else if (safeFilter === "vip") {
    conditions.push("'VIP' = ANY(tags)");
  }

  if (safeSearch) {
    params.push(`%${safeSearch}%`);
    const idx = params.length;
    conditions.push(
      `(name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx} OR notes ILIKE $${idx})`
    );
  }

  const result = await query(
    `
      SELECT
        id,
        user_id,
        name,
        email,
        company,
        type,
        tags,
        notes,
        last_meeting_date,
        created_at,
        updated_at
      FROM contacts
      WHERE ${conditions.join(" AND ")}
      ORDER BY updated_at DESC
    `,
    params
  );

  return result.rows.map(mapContactRow);
}

async function createContactForUser(userId, payload = {}) {
  const name = assertString(payload.name, "name", { min: 2, max: 120 });
  const email = assertEmail(payload.email, "email");
  const company = assertOptionalString(payload.company, "company", { max: 160 });
  const type = normalizeContactType(payload.type || "Lead");
  const tags = normalizeTags(payload.tags);
  const notes = assertOptionalString(payload.notes, "notes", { max: 5000 });
  const lastMeeting = normalizeLastMeeting(payload.lastMeeting);

  try {
    const result = await query(
      `
        INSERT INTO contacts (
          user_id,
          name,
          email,
          company,
          type,
          tags,
          notes,
          last_meeting_date,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        RETURNING
          id,
          user_id,
          name,
          email,
          company,
          type,
          tags,
          notes,
          last_meeting_date,
          created_at,
          updated_at
      `,
      [userId, name, email, company, type, tags, notes, lastMeeting]
    );
    return mapContactRow(result.rows[0]);
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("A contact with this email already exists");
    }
    throw error;
  }
}

async function updateContactForUser(userId, contactId, payload = {}) {
  const existingResult = await query(
    `
      SELECT
        id,
        user_id,
        name,
        email,
        company,
        type,
        tags,
        notes,
        last_meeting_date
      FROM contacts
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [contactId, userId]
  );
  const existing = existingResult.rows[0];
  if (!existing) throw notFound("Contact not found");

  const next = {
    name:
      payload.name === undefined
        ? existing.name
        : assertString(payload.name, "name", { min: 2, max: 120 }),
    email:
      payload.email === undefined
        ? existing.email
        : assertEmail(payload.email, "email"),
    company:
      payload.company === undefined
        ? existing.company
        : assertOptionalString(payload.company, "company", { max: 160 }),
    type:
      payload.type === undefined
        ? existing.type
        : normalizeContactType(payload.type),
    tags: payload.tags === undefined ? existing.tags : normalizeTags(payload.tags),
    notes:
      payload.notes === undefined
        ? existing.notes
        : assertOptionalString(payload.notes, "notes", { max: 5000 }),
    lastMeeting:
      payload.lastMeeting === undefined
        ? existing.last_meeting_date
        : normalizeLastMeeting(payload.lastMeeting),
  };

  try {
    const result = await query(
      `
        UPDATE contacts
        SET
          name = $1,
          email = $2,
          company = $3,
          type = $4,
          tags = $5,
          notes = $6,
          last_meeting_date = $7,
          updated_at = NOW()
        WHERE id = $8 AND user_id = $9
        RETURNING
          id,
          user_id,
          name,
          email,
          company,
          type,
          tags,
          notes,
          last_meeting_date,
          created_at,
          updated_at
      `,
      [
        next.name,
        next.email,
        next.company,
        next.type,
        next.tags,
        next.notes,
        next.lastMeeting,
        contactId,
        userId,
      ]
    );
    return mapContactRow(result.rows[0]);
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("A contact with this email already exists");
    }
    throw error;
  }
}

async function deleteContactForUser(userId, contactId) {
  const result = await query(
    `
      DELETE FROM contacts
      WHERE id = $1 AND user_id = $2
    `,
    [contactId, userId]
  );
  if (!result.rowCount) throw notFound("Contact not found");
  return { deleted: true };
}

module.exports = {
  listContactsForUser,
  createContactForUser,
  updateContactForUser,
  deleteContactForUser,
};

