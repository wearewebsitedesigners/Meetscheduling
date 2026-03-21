const { query, withTransaction } = require("../db/pool");
const { badRequest, conflict, notFound } = require("../utils/http-error");
const {
  assertEmail,
  assertInteger,
  assertIsoDate,
  assertJsonObject,
  assertOptionalString,
  assertString,
} = require("../utils/validation");

const INVOICE_STATUSES = new Set(["draft", "issued", "paid", "void", "overdue"]);

function toMoney(value, field) {
  const num = Number(value);
  if (!Number.isFinite(num)) throw badRequest(`${field} must be a valid number`);
  return Number(num.toFixed(2));
}

function normalizeStatus(value, fallback = "draft") {
  const status = String(value || fallback)
    .trim()
    .toLowerCase();
  if (!INVOICE_STATUSES.has(status)) throw badRequest("status is invalid");
  return status;
}

function normalizeCurrency(value = "USD") {
  const currency = String(value || "USD")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw badRequest("currency must be ISO code");
  return currency;
}

function normalizeInvoiceItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw badRequest("items must be a non-empty array");
  }

  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw badRequest(`items[${index}] must be an object`);
    }
    const description = assertString(item.description, `items[${index}].description`, {
      min: 1,
      max: 500,
    });
    const quantity = toMoney(item.quantity === undefined ? 1 : item.quantity, `items[${index}].quantity`);
    const unitPrice = toMoney(
      item.unitPrice === undefined ? 0 : item.unitPrice,
      `items[${index}].unitPrice`
    );
    const taxPercent = toMoney(
      item.taxPercent === undefined ? 0 : item.taxPercent,
      `items[${index}].taxPercent`
    );

    if (quantity <= 0) throw badRequest(`items[${index}].quantity must be > 0`);
    if (unitPrice < 0) throw badRequest(`items[${index}].unitPrice must be >= 0`);
    if (taxPercent < 0) throw badRequest(`items[${index}].taxPercent must be >= 0`);

    const subtotal = quantity * unitPrice;
    const tax = subtotal * (taxPercent / 100);
    const lineTotal = Number((subtotal + tax).toFixed(2));

    return {
      description,
      quantity: Number(quantity.toFixed(2)),
      unitPrice: Number(unitPrice.toFixed(2)),
      taxPercent: Number(taxPercent.toFixed(2)),
      lineTotal,
      subtotal,
      tax,
    };
  });
}

function summarizeItems(items) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = items.reduce((sum, item) => sum + item.tax, 0);
  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number((subtotal + tax).toFixed(2)),
  };
}

function mapInvoiceRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdByUserId: row.created_by_user_id,
    templateId: row.template_id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerCompany: row.customer_company || "",
    currency: row.currency,
    subtotalAmount: Number(row.subtotal_amount || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    amountPaid: Number(row.amount_paid || 0),
    dueDate: row.due_date ? String(row.due_date) : null,
    issuedAt: row.issued_at,
    paidAt: row.paid_at,
    status: row.status,
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoiceTemplateRow(row) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    notes: row.notes || "",
    footer: row.footer || "",
    defaultTermsDays: Number(row.default_terms_days || 0),
    defaultTaxPercent: Number(row.default_tax_percent || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInvoiceItemRow(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description,
    quantity: Number(row.quantity || 0),
    unitPrice: Number(row.unit_price || 0),
    taxPercent: Number(row.tax_percent || 0),
    lineTotal: Number(row.line_total || 0),
    createdAt: row.created_at,
  };
}

function mapInvoiceEventRow(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    eventType: row.event_type,
    payload: row.payload_json || {},
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
  };
}

function normalizeDueDate(value, field = "dueDate") {
  if (value === undefined || value === null || value === "") return null;
  return assertIsoDate(value, field);
}

async function ensureInvoice(workspaceId, invoiceId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        created_by_user_id,
        template_id,
        invoice_number,
        customer_name,
        customer_email,
        customer_company,
        currency,
        subtotal_amount,
        tax_amount,
        total_amount,
        amount_paid,
        due_date,
        issued_at,
        paid_at,
        status,
        notes,
        created_at,
        updated_at
      FROM invoices
      WHERE workspace_id = $1
        AND id = $2
      LIMIT 1
    `,
    [workspaceId, invoiceId],
    client
  );

  const row = result.rows[0];
  if (!row) throw notFound("Invoice not found");
  return row;
}

async function loadInvoiceItems(workspaceId, invoiceId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        invoice_id,
        workspace_id,
        description,
        quantity,
        unit_price,
        tax_percent,
        line_total,
        created_at
      FROM invoice_items
      WHERE workspace_id = $1
        AND invoice_id = $2
      ORDER BY created_at ASC
    `,
    [workspaceId, invoiceId],
    client
  );
  return result.rows.map(mapInvoiceItemRow);
}

async function loadInvoiceEvents(workspaceId, invoiceId, client = null) {
  const result = await query(
    `
      SELECT
        id,
        invoice_id,
        workspace_id,
        actor_user_id,
        event_type,
        payload_json,
        created_at
      FROM invoice_events
      WHERE workspace_id = $1
        AND invoice_id = $2
      ORDER BY created_at DESC
    `,
    [workspaceId, invoiceId],
    client
  );
  return result.rows.map(mapInvoiceEventRow);
}

async function logInvoiceEvent(
  client,
  workspaceId,
  invoiceId,
  actorUserId,
  eventType,
  payload = {}
) {
  const safePayload =
    payload === undefined || payload === null ? {} : assertJsonObject(payload, "payload");
  await query(
    `
      INSERT INTO invoice_events (
        invoice_id,
        workspace_id,
        actor_user_id,
        event_type,
        payload_json,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5::jsonb,NOW())
    `,
    [invoiceId, workspaceId, actorUserId, eventType, JSON.stringify(safePayload)],
    client
  );
}

function buildInvoiceNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `INV-${timestamp}-${rand}`;
}

async function listInvoices(workspaceId, { status = "all", search = "", limit = 100 } = {}) {
  const safeStatus = String(status || "all")
    .trim()
    .toLowerCase();
  if (safeStatus !== "all" && !INVOICE_STATUSES.has(safeStatus)) {
    throw badRequest("status is invalid");
  }
  const safeSearch = assertOptionalString(search, "search", { max: 220 });
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 400 });

  const params = [workspaceId];
  const conditions = ["workspace_id = $1"];

  if (safeStatus !== "all") {
    params.push(safeStatus);
    conditions.push(`status = $${params.length}`);
  }

  if (safeSearch) {
    params.push(`%${safeSearch}%`);
    const idx = params.length;
    conditions.push(
      `(invoice_number ILIKE $${idx} OR customer_name ILIKE $${idx} OR customer_email ILIKE $${idx})`
    );
  }

  params.push(safeLimit);

  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        created_by_user_id,
        template_id,
        invoice_number,
        customer_name,
        customer_email,
        customer_company,
        currency,
        subtotal_amount,
        tax_amount,
        total_amount,
        amount_paid,
        due_date,
        issued_at,
        paid_at,
        status,
        notes,
        created_at,
        updated_at
      FROM invoices
      WHERE ${conditions.join(" AND ")}
      ORDER BY updated_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows.map(mapInvoiceRow);
}

async function createInvoice(workspaceId, userId, payload = {}) {
  const customerName = assertString(payload.customerName, "customerName", { min: 2, max: 180 });
  const customerEmail = assertEmail(payload.customerEmail, "customerEmail");
  const customerCompany = assertOptionalString(payload.customerCompany, "customerCompany", {
    max: 180,
  });
  const currency = normalizeCurrency(payload.currency || "USD");
  const dueDate = normalizeDueDate(payload.dueDate, "dueDate");
  const notes = assertOptionalString(payload.notes, "notes", { max: 5000 });
  const status = normalizeStatus(payload.status || "draft");
  const invoiceNumber =
    assertOptionalString(payload.invoiceNumber, "invoiceNumber", { max: 80 }) ||
    buildInvoiceNumber();
  const templateId = assertOptionalString(payload.templateId, "templateId", { max: 80 }) || null;

  const normalizedItems = normalizeInvoiceItems(payload.items || []);
  const totals = summarizeItems(normalizedItems);

  return withTransaction(async (client) => {
    try {
      const insertedInvoice = await query(
        `
          INSERT INTO invoices (
            workspace_id,
            created_by_user_id,
            template_id,
            invoice_number,
            customer_name,
            customer_email,
            customer_company,
            currency,
            subtotal_amount,
            tax_amount,
            total_amount,
            amount_paid,
            due_date,
            status,
            notes,
            created_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,$12,$13,$14,NOW(),NOW())
          RETURNING
            id,
            workspace_id,
            created_by_user_id,
            template_id,
            invoice_number,
            customer_name,
            customer_email,
            customer_company,
            currency,
            subtotal_amount,
            tax_amount,
            total_amount,
            amount_paid,
            due_date,
            issued_at,
            paid_at,
            status,
            notes,
            created_at,
            updated_at
        `,
        [
          workspaceId,
          userId,
          templateId,
          invoiceNumber,
          customerName,
          customerEmail,
          customerCompany,
          currency,
          totals.subtotal,
          totals.tax,
          totals.total,
          dueDate,
          status,
          notes,
        ],
        client
      );

      const invoice = insertedInvoice.rows[0];

      for (const item of normalizedItems) {
        await query(
          `
            INSERT INTO invoice_items (
              invoice_id,
              workspace_id,
              description,
              quantity,
              unit_price,
              tax_percent,
              line_total,
              created_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
          `,
          [
            invoice.id,
            workspaceId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.taxPercent,
            item.lineTotal,
          ],
          client
        );
      }

      await logInvoiceEvent(client, workspaceId, invoice.id, userId, "invoice.created", {
        status,
        totalAmount: totals.total,
      });

      const items = await loadInvoiceItems(workspaceId, invoice.id, client);
      return {
        ...mapInvoiceRow(invoice),
        items,
      };
    } catch (error) {
      if (error && error.code === "23505") {
        throw conflict("Invoice number already exists");
      }
      throw error;
    }
  });
}

async function getInvoice(workspaceId, invoiceId) {
  const invoice = await ensureInvoice(workspaceId, invoiceId);
  const [items, events] = await Promise.all([
    loadInvoiceItems(workspaceId, invoiceId),
    loadInvoiceEvents(workspaceId, invoiceId),
  ]);

  return {
    ...mapInvoiceRow(invoice),
    items,
    events,
  };
}

async function updateInvoice(workspaceId, userId, invoiceId, payload = {}) {
  return withTransaction(async (client) => {
    const current = await ensureInvoice(workspaceId, invoiceId, client);

    const customerName =
      payload.customerName === undefined
        ? current.customer_name
        : assertString(payload.customerName, "customerName", { min: 2, max: 180 });

    const customerEmail =
      payload.customerEmail === undefined
        ? current.customer_email
        : assertEmail(payload.customerEmail, "customerEmail");

    const customerCompany =
      payload.customerCompany === undefined
        ? current.customer_company
        : assertOptionalString(payload.customerCompany, "customerCompany", { max: 180 });

    const currency =
      payload.currency === undefined
        ? current.currency
        : normalizeCurrency(payload.currency);

    const dueDate =
      payload.dueDate === undefined
        ? current.due_date
          ? String(current.due_date).slice(0, 10)
          : null
        : normalizeDueDate(payload.dueDate, "dueDate");

    const notes =
      payload.notes === undefined
        ? current.notes
        : assertOptionalString(payload.notes, "notes", { max: 5000 });

    const status =
      payload.status === undefined
        ? current.status
        : normalizeStatus(payload.status, current.status);

    const invoiceNumber =
      payload.invoiceNumber === undefined
        ? current.invoice_number
        : assertString(payload.invoiceNumber, "invoiceNumber", { min: 3, max: 80 });

    let items = await loadInvoiceItems(workspaceId, invoiceId, client);
    let totals = {
      subtotal: Number(current.subtotal_amount || 0),
      tax: Number(current.tax_amount || 0),
      total: Number(current.total_amount || 0),
    };

    if (payload.items !== undefined) {
      const normalizedItems = normalizeInvoiceItems(payload.items || []);
      totals = summarizeItems(normalizedItems);

      await query(
        `
          DELETE FROM invoice_items
          WHERE workspace_id = $1
            AND invoice_id = $2
        `,
        [workspaceId, invoiceId],
        client
      );

      for (const item of normalizedItems) {
        await query(
          `
            INSERT INTO invoice_items (
              invoice_id,
              workspace_id,
              description,
              quantity,
              unit_price,
              tax_percent,
              line_total,
              created_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
          `,
          [
            invoiceId,
            workspaceId,
            item.description,
            item.quantity,
            item.unitPrice,
            item.taxPercent,
            item.lineTotal,
          ],
          client
        );
      }

      items = await loadInvoiceItems(workspaceId, invoiceId, client);
    }

    try {
      const updatedResult = await query(
        `
          UPDATE invoices
          SET
            invoice_number = $1,
            customer_name = $2,
            customer_email = $3,
            customer_company = $4,
            currency = $5,
            subtotal_amount = $6,
            tax_amount = $7,
            total_amount = $8,
            due_date = $9,
            status = $10,
            notes = $11,
            updated_at = NOW()
          WHERE workspace_id = $12
            AND id = $13
          RETURNING
            id,
            workspace_id,
            created_by_user_id,
            template_id,
            invoice_number,
            customer_name,
            customer_email,
            customer_company,
            currency,
            subtotal_amount,
            tax_amount,
            total_amount,
            amount_paid,
            due_date,
            issued_at,
            paid_at,
            status,
            notes,
            created_at,
            updated_at
        `,
        [
          invoiceNumber,
          customerName,
          customerEmail,
          customerCompany,
          currency,
          totals.subtotal,
          totals.tax,
          totals.total,
          dueDate,
          status,
          notes,
          workspaceId,
          invoiceId,
        ],
        client
      );

      const updated = updatedResult.rows[0];
      if (!updated) throw notFound("Invoice not found");

      await logInvoiceEvent(client, workspaceId, invoiceId, userId, "invoice.updated", {
        status,
        totalAmount: totals.total,
      });

      const events = await loadInvoiceEvents(workspaceId, invoiceId, client);

      return {
        ...mapInvoiceRow(updated),
        items,
        events,
      };
    } catch (error) {
      if (error && error.code === "23505") {
        throw conflict("Invoice number already exists");
      }
      throw error;
    }
  });
}

async function issueInvoice(workspaceId, userId, invoiceId) {
  return withTransaction(async (client) => {
    const current = await ensureInvoice(workspaceId, invoiceId, client);

    const updatedResult = await query(
      `
        UPDATE invoices
        SET
          status = 'issued',
          issued_at = COALESCE(issued_at, NOW()),
          updated_at = NOW()
        WHERE workspace_id = $1
          AND id = $2
        RETURNING
          id,
          workspace_id,
          created_by_user_id,
          template_id,
          invoice_number,
          customer_name,
          customer_email,
          customer_company,
          currency,
          subtotal_amount,
          tax_amount,
          total_amount,
          amount_paid,
          due_date,
          issued_at,
          paid_at,
          status,
          notes,
          created_at,
          updated_at
      `,
      [workspaceId, invoiceId],
      client
    );

    const updated = updatedResult.rows[0] || current;

    await logInvoiceEvent(client, workspaceId, invoiceId, userId, "invoice.issued", {
      previousStatus: current.status,
      nextStatus: "issued",
    });

    const [items, events] = await Promise.all([
      loadInvoiceItems(workspaceId, invoiceId, client),
      loadInvoiceEvents(workspaceId, invoiceId, client),
    ]);

    return {
      ...mapInvoiceRow(updated),
      items,
      events,
    };
  });
}

async function markInvoicePaid(workspaceId, userId, invoiceId, payload = {}) {
  return withTransaction(async (client) => {
    const current = await ensureInvoice(workspaceId, invoiceId, client);

    const amountPaid =
      payload.amountPaid === undefined
        ? Number(current.total_amount || 0)
        : toMoney(payload.amountPaid, "amountPaid");

    if (amountPaid < 0) throw badRequest("amountPaid must be >= 0");

    const updatedResult = await query(
      `
        UPDATE invoices
        SET
          status = 'paid',
          amount_paid = $1,
          paid_at = COALESCE(paid_at, NOW()),
          updated_at = NOW()
        WHERE workspace_id = $2
          AND id = $3
        RETURNING
          id,
          workspace_id,
          created_by_user_id,
          template_id,
          invoice_number,
          customer_name,
          customer_email,
          customer_company,
          currency,
          subtotal_amount,
          tax_amount,
          total_amount,
          amount_paid,
          due_date,
          issued_at,
          paid_at,
          status,
          notes,
          created_at,
          updated_at
      `,
      [amountPaid, workspaceId, invoiceId],
      client
    );

    const updated = updatedResult.rows[0];
    if (!updated) throw notFound("Invoice not found");

    await logInvoiceEvent(client, workspaceId, invoiceId, userId, "invoice.paid", {
      previousStatus: current.status,
      amountPaid,
    });

    const [items, events] = await Promise.all([
      loadInvoiceItems(workspaceId, invoiceId, client),
      loadInvoiceEvents(workspaceId, invoiceId, client),
    ]);

    return {
      ...mapInvoiceRow(updated),
      items,
      events,
    };
  });
}

async function listInvoiceTemplates(workspaceId, { limit = 100 } = {}) {
  const safeLimit = assertInteger(limit, "limit", { min: 1, max: 300 });
  const result = await query(
    `
      SELECT
        id,
        workspace_id,
        name,
        notes,
        footer,
        default_terms_days,
        default_tax_percent,
        created_at,
        updated_at
      FROM invoice_templates
      WHERE workspace_id = $1
      ORDER BY updated_at DESC
      LIMIT $2
    `,
    [workspaceId, safeLimit]
  );
  return result.rows.map(mapInvoiceTemplateRow);
}

async function createInvoiceTemplate(workspaceId, userId, payload = {}) {
  const name = assertString(payload.name, "name", { min: 2, max: 160 });
  const notes = assertOptionalString(payload.notes, "notes", { max: 5000 });
  const footer = assertOptionalString(payload.footer, "footer", { max: 1000 });
  const defaultTermsDays = payload.defaultTermsDays
    ? assertInteger(payload.defaultTermsDays, "defaultTermsDays", { min: 0, max: 365 })
    : 7;
  const defaultTaxPercent =
    payload.defaultTaxPercent === undefined
      ? 0
      : toMoney(payload.defaultTaxPercent, "defaultTaxPercent");

  try {
    const result = await query(
      `
        INSERT INTO invoice_templates (
          workspace_id,
          created_by_user_id,
          name,
          notes,
          footer,
          default_terms_days,
          default_tax_percent,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
        RETURNING
          id,
          workspace_id,
          name,
          notes,
          footer,
          default_terms_days,
          default_tax_percent,
          created_at,
          updated_at
      `,
      [
        workspaceId,
        userId,
        name,
        notes,
        footer,
        defaultTermsDays,
        defaultTaxPercent,
      ]
    );

    return mapInvoiceTemplateRow(result.rows[0]);
  } catch (error) {
    if (error && error.code === "23505") {
      throw conflict("Template name already exists");
    }
    throw error;
  }
}

module.exports = {
  listInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  issueInvoice,
  markInvoicePaid,
  listInvoiceTemplates,
  createInvoiceTemplate,
};
