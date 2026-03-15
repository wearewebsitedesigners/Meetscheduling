const { query } = require("../db/pool");

function numberValue(row, key) {
  return Number(row?.[key] || 0);
}

async function getDashboardOverview(workspaceId, { limit = 5 } = {}) {
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));

  const [
    bookingsResult,
    contactsResult,
    workflowsResult,
    integrationsResult,
    chatsResult,
    invoicesResult,
    paidRevenueResult,
    upcomingBookingsResult,
    recentContactsResult,
  ] = await Promise.all([
    query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
          COUNT(*) FILTER (WHERE status = 'canceled')::int AS canceled,
          COUNT(*) FILTER (WHERE start_at_utc >= NOW() AND status = 'confirmed')::int AS upcoming
        FROM bookings
        WHERE workspace_id = $1
      `,
      [workspaceId]
    ),
    query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE type = 'Lead')::int AS leads,
          COUNT(*) FILTER (WHERE type = 'Customer')::int AS customers
        FROM contacts
        WHERE workspace_id = $1
      `,
      [workspaceId]
    ),
    query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'paused')::int AS paused,
          COUNT(*) FILTER (WHERE status = 'draft')::int AS draft
        FROM workflows
        WHERE workspace_id = $1
      `,
      [workspaceId]
    ),
    query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE connected = TRUE)::int AS connected
        FROM user_integrations
        WHERE workspace_id = $1
      `,
      [workspaceId]
    ),
    query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'open')::int AS open,
          COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
        FROM chat_conversations
        WHERE workspace_id = $1
      `,
      [workspaceId]
    ),
    query(
      `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
          COUNT(*) FILTER (WHERE status = 'issued')::int AS issued,
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid,
          COUNT(*) FILTER (WHERE status = 'overdue')::int AS overdue
        FROM invoices
        WHERE workspace_id = $1
      `,
      [workspaceId]
    ),
    query(
      `
        SELECT COALESCE(SUM(amount_paid), 0)::numeric(14,2) AS revenue
        FROM invoices
        WHERE workspace_id = $1
          AND status = 'paid'
      `,
      [workspaceId]
    ),
    query(
      `
        SELECT
          b.id,
          b.invitee_name,
          b.invitee_email,
          b.start_at_utc,
          b.end_at_utc,
          b.status,
          b.meeting_link,
          b.meeting_link_status,
          b.visitor_timezone,
          e.title AS event_type_title
        FROM bookings b
        JOIN event_types e ON e.id = b.event_type_id
        WHERE b.workspace_id = $1
          AND b.status = 'confirmed'
          AND b.start_at_utc >= NOW()
        ORDER BY b.start_at_utc ASC
        LIMIT $2
      `,
      [workspaceId, safeLimit]
    ),
    query(
      `
        SELECT
          id,
          name,
          email,
          company,
          type,
          created_at
        FROM contacts
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [workspaceId, safeLimit]
    ),
  ]);

  const bookings = bookingsResult.rows[0] || {};
  const contacts = contactsResult.rows[0] || {};
  const workflows = workflowsResult.rows[0] || {};
  const integrations = integrationsResult.rows[0] || {};
  const chats = chatsResult.rows[0] || {};
  const invoices = invoicesResult.rows[0] || {};

  return {
    metrics: {
      bookings: {
        total: numberValue(bookings, "total"),
        confirmed: numberValue(bookings, "confirmed"),
        canceled: numberValue(bookings, "canceled"),
        upcoming: numberValue(bookings, "upcoming"),
      },
      contacts: {
        total: numberValue(contacts, "total"),
        leads: numberValue(contacts, "leads"),
        customers: numberValue(contacts, "customers"),
      },
      workflows: {
        total: numberValue(workflows, "total"),
        active: numberValue(workflows, "active"),
        paused: numberValue(workflows, "paused"),
        draft: numberValue(workflows, "draft"),
      },
      integrations: {
        total: numberValue(integrations, "total"),
        connected: numberValue(integrations, "connected"),
      },
      chats: {
        total: numberValue(chats, "total"),
        open: numberValue(chats, "open"),
        resolved: numberValue(chats, "resolved"),
      },
      invoices: {
        total: numberValue(invoices, "total"),
        draft: numberValue(invoices, "draft"),
        issued: numberValue(invoices, "issued"),
        paid: numberValue(invoices, "paid"),
        overdue: numberValue(invoices, "overdue"),
      },
      paidRevenue: Number(paidRevenueResult.rows[0]?.revenue || 0),
    },
    upcomingBookings: upcomingBookingsResult.rows.map((row) => ({
      id: row.id,
      inviteeName: row.invitee_name,
      inviteeEmail: row.invitee_email,
      eventTypeTitle: row.event_type_title,
      startAt: row.start_at_utc,
      endAt: row.end_at_utc,
      status: row.status,
      meetingLink: row.meeting_link || "",
      meetingLinkStatus: row.meeting_link_status || "",
      inviteeTimezone: row.visitor_timezone || "UTC",
    })),
    recentContacts: recentContactsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company || "",
      type: row.type,
      createdAt: row.created_at,
    })),
  };
}

module.exports = {
  getDashboardOverview,
};
