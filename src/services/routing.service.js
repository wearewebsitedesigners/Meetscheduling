const { query } = require("../db/pool");
const { badRequest, notFound } = require("../utils/http-error");
const {
  assertEmail,
  assertInteger,
  assertOptionalString,
  assertString,
} = require("../utils/validation");

const ROUTING_FILTERS = new Set(["all", "active", "paused"]);
const PRIORITY_SET = new Set(["high", "normal"]);
const LEAD_STATUS_SET = new Set(["New", "Pending", "Routed"]);

function normalizePriority(value, field = "priority") {
  const priority = String(value || "normal")
    .trim()
    .toLowerCase();
  if (!PRIORITY_SET.has(priority)) {
    throw badRequest(`${field} must be high or normal`);
  }
  return priority;
}

function normalizeLeadStatus(value, field = "status") {
  const raw = String(value || "New").trim().toLowerCase();
  if (raw === "new") return "New";
  if (raw === "pending") return "Pending";
  if (raw === "routed") return "Routed";
  throw badRequest(`${field} must be New, Pending or Routed`);
}

function mapRoutingFormRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    destination: row.destination,
    priority: row.priority,
    active: !!row.active,
    submissionsToday: Number(row.submissions_today) || 0,
    conversionRate: Number(row.conversion_rate) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoutingLeadRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    formId: row.form_id,
    name: row.name,
    email: row.email,
    company: row.company || "",
    status: row.status,
    routeTo: row.route_to || "Unassigned",
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listRoutingDataForUser(userId, { search = "", filter = "all" } = {}) {
  const safeFilter = ROUTING_FILTERS.has(String(filter || "").toLowerCase())
    ? String(filter || "").toLowerCase()
    : "all";
  const safeSearch = assertOptionalString(search, "search", { max: 200 });

  const formParams = [userId];
  const formConditions = ["user_id = $1"];

  if (safeFilter === "active") formConditions.push("active = TRUE");
  if (safeFilter === "paused") formConditions.push("active = FALSE");

  if (safeSearch) {
    formParams.push(`%${safeSearch}%`);
    const idx = formParams.length;
    formConditions.push(`(name ILIKE $${idx} OR destination ILIKE $${idx})`);
  }

  const leadParams = [userId];
  const leadConditions = ["user_id = $1"];
  if (safeSearch) {
    leadParams.push(`%${safeSearch}%`);
    const idx = leadParams.length;
    leadConditions.push(
      `(name ILIKE $${idx} OR email ILIKE $${idx} OR company ILIKE $${idx} OR route_to ILIKE $${idx})`
    );
  }

  const [formsResult, leadsResult] = await Promise.all([
    query(
      `
        SELECT
          id,
          user_id,
          name,
          destination,
          priority,
          active,
          submissions_today,
          conversion_rate,
          created_at,
          updated_at
        FROM routing_forms
        WHERE ${formConditions.join(" AND ")}
        ORDER BY updated_at DESC
      `,
      formParams
    ),
    query(
      `
        SELECT
          id,
          user_id,
          form_id,
          name,
          email,
          company,
          status,
          route_to,
          submitted_at,
          created_at,
          updated_at
        FROM routing_leads
        WHERE ${leadConditions.join(" AND ")}
        ORDER BY submitted_at DESC
      `,
      leadParams
    ),
  ]);

  return {
    forms: formsResult.rows.map(mapRoutingFormRow),
    leads: leadsResult.rows.map(mapRoutingLeadRow),
    filter: safeFilter,
    search: safeSearch,
  };
}

async function createRoutingFormForUser(userId, payload = {}) {
  const name = assertString(payload.name, "name", { min: 2, max: 140 });
  const destination = assertString(payload.destination || "Sales Team", "destination", {
    min: 2,
    max: 140,
  });
  const priority = normalizePriority(payload.priority || "normal");
  const active = payload.active === undefined ? true : !!payload.active;
  const submissionsToday =
    payload.submissionsToday === undefined
      ? 0
      : assertInteger(payload.submissionsToday, "submissionsToday", {
          min: 0,
          max: 1000000,
        });
  const conversionRate =
    payload.conversionRate === undefined
      ? 0
      : assertInteger(payload.conversionRate, "conversionRate", { min: 0, max: 100 });

  const result = await query(
    `
      INSERT INTO routing_forms (
        user_id,
        name,
        destination,
        priority,
        active,
        submissions_today,
        conversion_rate,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      RETURNING
        id,
        user_id,
        name,
        destination,
        priority,
        active,
        submissions_today,
        conversion_rate,
        created_at,
        updated_at
    `,
    [userId, name, destination, priority, active, submissionsToday, conversionRate]
  );
  return mapRoutingFormRow(result.rows[0]);
}

async function updateRoutingFormForUser(userId, formId, payload = {}) {
  const existingResult = await query(
    `
      SELECT
        id,
        user_id,
        name,
        destination,
        priority,
        active,
        submissions_today,
        conversion_rate
      FROM routing_forms
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [formId, userId]
  );
  const existing = existingResult.rows[0];
  if (!existing) throw notFound("Routing form not found");

  const next = {
    name:
      payload.name === undefined
        ? existing.name
        : assertString(payload.name, "name", { min: 2, max: 140 }),
    destination:
      payload.destination === undefined
        ? existing.destination
        : assertString(payload.destination, "destination", { min: 2, max: 140 }),
    priority:
      payload.priority === undefined
        ? existing.priority
        : normalizePriority(payload.priority),
    active:
      payload.active === undefined ? existing.active : !!payload.active,
    submissionsToday:
      payload.submissionsToday === undefined
        ? existing.submissions_today
        : assertInteger(payload.submissionsToday, "submissionsToday", {
            min: 0,
            max: 1000000,
          }),
    conversionRate:
      payload.conversionRate === undefined
        ? existing.conversion_rate
        : assertInteger(payload.conversionRate, "conversionRate", { min: 0, max: 100 }),
  };

  const result = await query(
    `
      UPDATE routing_forms
      SET
        name = $1,
        destination = $2,
        priority = $3,
        active = $4,
        submissions_today = $5,
        conversion_rate = $6,
        updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING
        id,
        user_id,
        name,
        destination,
        priority,
        active,
        submissions_today,
        conversion_rate,
        created_at,
        updated_at
    `,
    [
      next.name,
      next.destination,
      next.priority,
      next.active,
      next.submissionsToday,
      next.conversionRate,
      formId,
      userId,
    ]
  );
  return mapRoutingFormRow(result.rows[0]);
}

async function deleteRoutingFormForUser(userId, formId) {
  const result = await query(
    `
      DELETE FROM routing_forms
      WHERE id = $1 AND user_id = $2
    `,
    [formId, userId]
  );
  if (!result.rowCount) throw notFound("Routing form not found");
  return { deleted: true };
}

async function createRoutingLeadForUser(userId, payload = {}) {
  const formId =
    payload.formId === undefined || payload.formId === null || payload.formId === ""
      ? null
      : assertString(payload.formId, "formId", { min: 3, max: 80 });
  const name = assertString(payload.name, "name", { min: 2, max: 140 });
  const email = assertEmail(payload.email, "email");
  const company = assertOptionalString(payload.company, "company", { max: 160 });
  const status = normalizeLeadStatus(payload.status || "New");
  const routeTo = assertOptionalString(payload.routeTo, "routeTo", { max: 160 }) || "Unassigned";

  let submittedAt = null;
  if (payload.submittedAt !== undefined && payload.submittedAt !== null && payload.submittedAt !== "") {
    const value = new Date(payload.submittedAt);
    if (Number.isNaN(value.getTime())) {
      throw badRequest("submittedAt is invalid");
    }
    submittedAt = value.toISOString();
  }

  const result = await query(
    `
      INSERT INTO routing_leads (
        user_id,
        form_id,
        name,
        email,
        company,
        status,
        route_to,
        submitted_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz, NOW()),NOW())
      RETURNING
        id,
        user_id,
        form_id,
        name,
        email,
        company,
        status,
        route_to,
        submitted_at,
        created_at,
        updated_at
    `,
    [userId, formId, name, email, company, status, routeTo, submittedAt]
  );
  return mapRoutingLeadRow(result.rows[0]);
}

async function updateRoutingLeadForUser(userId, leadId, payload = {}) {
  const existingResult = await query(
    `
      SELECT
        id,
        user_id,
        form_id,
        name,
        email,
        company,
        status,
        route_to,
        submitted_at
      FROM routing_leads
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [leadId, userId]
  );
  const existing = existingResult.rows[0];
  if (!existing) throw notFound("Routing lead not found");

  const next = {
    formId:
      payload.formId === undefined
        ? existing.form_id
        : payload.formId
        ? assertString(payload.formId, "formId", { min: 3, max: 80 })
        : null,
    name:
      payload.name === undefined
        ? existing.name
        : assertString(payload.name, "name", { min: 2, max: 140 }),
    email:
      payload.email === undefined
        ? existing.email
        : assertEmail(payload.email, "email"),
    company:
      payload.company === undefined
        ? existing.company
        : assertOptionalString(payload.company, "company", { max: 160 }),
    status:
      payload.status === undefined
        ? existing.status
        : normalizeLeadStatus(payload.status),
    routeTo:
      payload.routeTo === undefined
        ? existing.route_to
        : assertOptionalString(payload.routeTo, "routeTo", { max: 160 }) || "Unassigned",
    submittedAt:
      payload.submittedAt === undefined || payload.submittedAt === null || payload.submittedAt === ""
        ? existing.submitted_at
        : (() => {
            const value = new Date(payload.submittedAt);
            if (Number.isNaN(value.getTime())) {
              throw badRequest("submittedAt is invalid");
            }
            return value.toISOString();
          })(),
  };

  const result = await query(
    `
      UPDATE routing_leads
      SET
        form_id = $1,
        name = $2,
        email = $3,
        company = $4,
        status = $5,
        route_to = $6,
        submitted_at = $7::timestamptz,
        updated_at = NOW()
      WHERE id = $8 AND user_id = $9
      RETURNING
        id,
        user_id,
        form_id,
        name,
        email,
        company,
        status,
        route_to,
        submitted_at,
        created_at,
        updated_at
    `,
    [
      next.formId,
      next.name,
      next.email,
      next.company,
      next.status,
      next.routeTo,
      next.submittedAt,
      leadId,
      userId,
    ]
  );
  return mapRoutingLeadRow(result.rows[0]);
}

async function routeLeadForUser(userId, leadId, routeTo) {
  const safeRouteTo = assertString(routeTo, "routeTo", { min: 2, max: 160 });
  const result = await query(
    `
      UPDATE routing_leads
      SET
        route_to = $1,
        status = 'Routed',
        updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING
        id,
        user_id,
        form_id,
        name,
        email,
        company,
        status,
        route_to,
        submitted_at,
        created_at,
        updated_at
    `,
    [safeRouteTo, leadId, userId]
  );
  if (!result.rows[0]) throw notFound("Routing lead not found");
  return mapRoutingLeadRow(result.rows[0]);
}

async function deleteRoutingLeadForUser(userId, leadId) {
  const result = await query(
    `
      DELETE FROM routing_leads
      WHERE id = $1 AND user_id = $2
    `,
    [leadId, userId]
  );
  if (!result.rowCount) throw notFound("Routing lead not found");
  return { deleted: true };
}

module.exports = {
  listRoutingDataForUser,
  createRoutingFormForUser,
  updateRoutingFormForUser,
  deleteRoutingFormForUser,
  createRoutingLeadForUser,
  updateRoutingLeadForUser,
  routeLeadForUser,
  deleteRoutingLeadForUser,
};

