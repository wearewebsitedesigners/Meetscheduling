const { query } = require("../db/pool");
const { badRequest, conflict, notFound } = require("../utils/http-error");
const {
  assertEmail,
  assertIsoDate,
  assertOptionalString,
  assertString,
} = require("../utils/validation");

const CONTACT_FILTERS = new Set(["all", "lead", "customer", "vip"]);
const CONTACT_SOURCES = new Set([
  "manual",
  "booking_link",
  "landing_page",
  "booking_widget",
  "import",
  "api",
]);

function isMissingBookingContactIdColumnError(error) {
  return error && String(error.code || "") === "42703" &&
    /contact_id/i.test(String(error.message || ""));
}

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

function normalizePhone(value, field = "phone") {
  const phone = assertOptionalString(value, field, { max: 40 });
  return phone;
}

function normalizeSource(value, field = "source", fallback = "manual") {
  const source = assertOptionalString(value, field, { max: 40 })
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!source) return fallback;
  if (!CONTACT_SOURCES.has(source)) {
    throw badRequest(`${field} is invalid`);
  }
  return source;
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
    workspaceId: row.workspace_id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    company: row.company || "",
    type: row.type,
    tags: Array.isArray(row.tags) ? row.tags : [],
    notes: row.notes || "",
    source: row.source || "manual",
    lastMeeting: row.last_meeting_date
      ? String(row.last_meeting_date)
      : row.last_booking_at
        ? String(row.last_booking_at).slice(0, 10)
        : "Never",
    nextMeetingAt: row.next_booking_at || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listContactsForUser(workspaceId, { search = "", filter = "all" } = {}) {
  const safeFilter = CONTACT_FILTERS.has(String(filter || "").toLowerCase())
    ? String(filter || "").toLowerCase()
    : "all";
  const safeSearch = assertOptionalString(search, "search", { max: 200 });

  const params = [workspaceId];
  const conditions = ["c.workspace_id = $1"];

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
      `(name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx} OR phone ILIKE $${idx} OR notes ILIKE $${idx})`
    );
  }

  const baseSelect = `
    SELECT
      c.id,
      c.user_id,
      c.workspace_id,
      c.name,
      c.email,
      c.phone,
      c.company,
      c.type,
      c.tags,
      c.notes,
      c.source,
      c.last_meeting_date,
      c.created_at,
      c.updated_at,
      next_booking.next_booking_at,
      prev_booking.last_booking_at
    FROM contacts c
  `;

  let result;
  try {
    result = await query(
      `
        ${baseSelect}
        LEFT JOIN LATERAL (
          SELECT MIN(b.start_at_utc) AS next_booking_at
          FROM bookings b
          WHERE b.workspace_id = c.workspace_id
            AND (
              b.contact_id = c.id
              OR (b.contact_id IS NULL AND LOWER(b.invitee_email) = LOWER(c.email))
            )
            AND b.status = 'confirmed'
            AND b.start_at_utc >= NOW()
        ) next_booking ON TRUE
        LEFT JOIN LATERAL (
          SELECT MAX(b.start_at_utc) AS last_booking_at
          FROM bookings b
          WHERE b.workspace_id = c.workspace_id
            AND (
              b.contact_id = c.id
              OR (b.contact_id IS NULL AND LOWER(b.invitee_email) = LOWER(c.email))
            )
            AND b.status = 'confirmed'
            AND b.start_at_utc < NOW()
        ) prev_booking ON TRUE
        WHERE ${conditions.join(" AND ")}
        ORDER BY c.updated_at DESC
      `,
      params
    );
  } catch (error) {
    if (!isMissingBookingContactIdColumnError(error)) throw error;
    result = await query(
      `
        ${baseSelect}
        LEFT JOIN LATERAL (
          SELECT MIN(b.start_at_utc) AS next_booking_at
          FROM bookings b
          WHERE b.workspace_id = c.workspace_id
            AND LOWER(b.invitee_email) = LOWER(c.email)
            AND b.status = 'confirmed'
            AND b.start_at_utc >= NOW()
        ) next_booking ON TRUE
        LEFT JOIN LATERAL (
          SELECT MAX(b.start_at_utc) AS last_booking_at
          FROM bookings b
          WHERE b.workspace_id = c.workspace_id
            AND LOWER(b.invitee_email) = LOWER(c.email)
            AND b.status = 'confirmed'
            AND b.start_at_utc < NOW()
        ) prev_booking ON TRUE
        WHERE ${conditions.join(" AND ")}
        ORDER BY c.updated_at DESC
      `,
      params
    );
  }

  return result.rows.map(mapContactRow);
}

async function createContactForUser(workspaceId, actorUserId, payload = {}) {
  const name = assertString(payload.name, "name", { min: 2, max: 120 });
  const email = assertEmail(payload.email, "email");
  const phone = normalizePhone(payload.phone);
  const company = assertOptionalString(payload.company, "company", { max: 160 });
  const type = normalizeContactType(payload.type || "Lead");
  const tags = normalizeTags(payload.tags);
  const notes = assertOptionalString(payload.notes, "notes", { max: 5000 });
  const lastMeeting = normalizeLastMeeting(payload.lastMeeting);
  const source = normalizeSource(payload.source, "source", "manual");

  try {
    const result = await query(
      `
        INSERT INTO contacts (
          workspace_id,
          user_id,
          name,
          email,
          phone,
          company,
          type,
          tags,
          notes,
          source,
          last_meeting_date,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        RETURNING
          id,
          workspace_id,
          user_id,
          name,
          email,
          phone,
          company,
          type,
          tags,
          notes,
          source,
          last_meeting_date,
          created_at,
          updated_at
      `,
      [workspaceId, actorUserId, name, email, phone, company, type, tags, notes, source, lastMeeting]
    );
    await linkBookingsToContact(workspaceId, result.rows[0].id, email);
    return refreshContactMeetingFacts(workspaceId, result.rows[0].id, email);
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("A contact with this email already exists");
    }
    throw error;
  }
}

async function updateContactForUser(workspaceId, contactId, payload = {}) {
  const existingResult = await query(
    `
      SELECT
        id,
        workspace_id,
        user_id,
        name,
        email,
        phone,
        company,
        type,
        tags,
        notes,
        source,
        last_meeting_date
      FROM contacts
      WHERE id = $1 AND workspace_id = $2
      LIMIT 1
    `,
    [contactId, workspaceId]
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
    phone:
      payload.phone === undefined
        ? existing.phone
        : normalizePhone(payload.phone),
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
    source:
      payload.source === undefined
        ? existing.source
        : normalizeSource(payload.source),
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
          phone = $3,
          company = $4,
          type = $5,
          tags = $6,
          notes = $7,
          source = $8,
          last_meeting_date = $9,
          updated_at = NOW()
        WHERE id = $10 AND workspace_id = $11
        RETURNING
          id,
          workspace_id,
          user_id,
          name,
          email,
          phone,
          company,
          type,
          tags,
          notes,
          source,
          last_meeting_date,
          created_at,
          updated_at
      `,
      [
        next.name,
        next.email,
        next.phone,
        next.company,
        next.type,
        next.tags,
        next.notes,
        next.source,
        next.lastMeeting,
        contactId,
        workspaceId,
      ]
    );
    await linkBookingsToContact(workspaceId, result.rows[0].id, next.email);
    return refreshContactMeetingFacts(workspaceId, result.rows[0].id, next.email);
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("A contact with this email already exists");
    }
    throw error;
  }
}

async function deleteContactForUser(workspaceId, contactId) {
  const result = await query(
    `
      DELETE FROM contacts
      WHERE id = $1 AND workspace_id = $2
    `,
    [contactId, workspaceId]
  );
  if (!result.rowCount) throw notFound("Contact not found");
  return { deleted: true };
}

async function linkBookingsToContact(workspaceId, contactId, email, client = null) {
  try {
    await query(
      `
        UPDATE bookings
        SET
          contact_id = $1,
          updated_at = NOW()
        WHERE workspace_id = $2
          AND LOWER(invitee_email) = LOWER($3)
          AND (contact_id IS NULL OR contact_id <> $1)
      `,
      [contactId, workspaceId, email],
      client
    );
  } catch (error) {
    if (isMissingBookingContactIdColumnError(error)) return;
    throw error;
  }
}

async function refreshContactMeetingFacts(workspaceId, contactId, email, client = null) {
  let facts;
  try {
    facts = await query(
      `
        SELECT
          MAX(CASE WHEN start_at_utc < NOW() THEN start_at_utc END) AS last_booking_at,
          MIN(CASE WHEN start_at_utc >= NOW() THEN start_at_utc END) AS next_booking_at
        FROM bookings
        WHERE workspace_id = $1
          AND status = 'confirmed'
          AND (
            contact_id = $2
            OR (contact_id IS NULL AND LOWER(invitee_email) = LOWER($3))
          )
      `,
      [workspaceId, contactId, email],
      client
    );
  } catch (error) {
    if (!isMissingBookingContactIdColumnError(error)) throw error;
    facts = await query(
      `
        SELECT
          MAX(CASE WHEN start_at_utc < NOW() THEN start_at_utc END) AS last_booking_at,
          MIN(CASE WHEN start_at_utc >= NOW() THEN start_at_utc END) AS next_booking_at
        FROM bookings
        WHERE workspace_id = $1
          AND status = 'confirmed'
          AND LOWER(invitee_email) = LOWER($2)
      `,
      [workspaceId, email],
      client
    );
  }

  const row = facts.rows[0] || {};
  const lastMeetingDate = row.last_booking_at
    ? new Date(row.last_booking_at).toISOString().slice(0, 10)
    : null;

  const updated = await query(
    `
      UPDATE contacts
      SET
        last_meeting_date = $1,
        updated_at = NOW()
      WHERE id = $2 AND workspace_id = $3
      RETURNING *
    `,
    [lastMeetingDate, contactId, workspaceId],
    client
  );

  return mapContactRow({
    ...updated.rows[0],
    last_booking_at: row.last_booking_at,
    next_booking_at: row.next_booking_at,
  });
}

async function upsertContactFromBooking(workspaceId, actorUserId, booking = {}, options = {}, client = null) {
  const email = assertEmail(
    options.inviteeEmail || booking.inviteeEmail || booking.invitee_email,
    "inviteeEmail"
  );
  const name = assertString(
    options.inviteeName || booking.inviteeName || booking.invitee_name,
    "inviteeName",
    { min: 2, max: 120 }
  );
  const phone = normalizePhone(options.inviteePhone || booking.inviteePhone || booking.invitee_phone);
  const company = assertOptionalString(
    options.inviteeCompany || booking.inviteeCompany || booking.invitee_company,
    "inviteeCompany",
    { max: 160 }
  );
  const notes = assertOptionalString(options.notes || booking.notes, "notes", { max: 5000 });
  const source = normalizeSource(options.source, "source", "booking_link");
  const bookingId = options.bookingId || booking.id;

  const existingResult = await query(
    `
      SELECT *
      FROM contacts
      WHERE workspace_id = $1
        AND LOWER(email) = LOWER($2)
      ORDER BY updated_at DESC, created_at DESC, id DESC
      LIMIT 1
    `,
    [workspaceId, email],
    client
  );

  let contact;
  if (existingResult.rows[0]) {
    const existing = existingResult.rows[0];
    const nextName = existing.name || name;
    const nextPhone = phone || existing.phone || "";
    const nextCompany = company || existing.company || "";
    const nextNotes = existing.notes || notes;
    const nextSource = existing.source || source;

    const updated = await query(
      `
        UPDATE contacts
        SET
          name = $1,
          email = $2,
          phone = $3,
          company = $4,
          notes = $5,
          source = $6,
          updated_at = NOW()
        WHERE id = $7 AND workspace_id = $8
        RETURNING *
      `,
      [nextName, email, nextPhone, nextCompany, nextNotes, nextSource, existing.id, workspaceId],
      client
    );
    contact = updated.rows[0];
  } else {
    const inserted = await query(
      `
        INSERT INTO contacts (
          workspace_id,
          user_id,
          name,
          email,
          phone,
          company,
          type,
          tags,
          notes,
          source,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,'Lead','{}',$7,$8,NOW())
        RETURNING *
      `,
      [workspaceId, actorUserId, name, email, phone, company, notes, source],
      client
    );
    contact = inserted.rows[0];
  }

  await linkBookingsToContact(workspaceId, contact.id, email, client);

  if (bookingId) {
    try {
      await query(
        `
          UPDATE bookings
          SET
            contact_id = $1,
            updated_at = NOW()
          WHERE id = $2 AND workspace_id = $3
        `,
        [contact.id, bookingId, workspaceId],
        client
      );
    } catch (error) {
      if (!isMissingBookingContactIdColumnError(error)) throw error;
    }
  }

  return refreshContactMeetingFacts(workspaceId, contact.id, email, client);
}

module.exports = {
  listContactsForUser,
  createContactForUser,
  updateContactForUser,
  deleteContactForUser,
  upsertContactFromBooking,
};
