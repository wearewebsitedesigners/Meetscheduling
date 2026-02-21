const { query } = require("./pool");

async function seedDefaults() {
  const users = await query(
    `
      SELECT id, email, username
      FROM users
      LIMIT 1
    `
  );

  let userId = users.rows[0]?.id || null;
  if (!userId) {
    const created = await query(
      `
        INSERT INTO users (email, username, display_name, timezone, plan)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [
        "demo@meetscheduling.app",
        "demo-user",
        "Demo User",
        "America/Chicago",
        "free",
      ]
    );
    userId = created.rows[0].id;
  }

  const weeklyCount = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM user_weekly_availability
      WHERE user_id = $1
    `,
    [userId]
  );
  if ((weeklyCount.rows[0]?.count || 0) === 0) {
    const rows = [
      [1, "09:00", "17:00"],
      [2, "09:00", "17:00"],
      [3, "09:00", "17:00"],
      [4, "09:00", "17:00"],
      [5, "09:00", "17:00"],
    ];
    for (const [weekday, start, end] of rows) {
      await query(
        `
          INSERT INTO user_weekly_availability (
            user_id, weekday, start_time, end_time, is_available
          )
          VALUES ($1, $2, $3, $4, TRUE)
        `,
        [userId, weekday, start, end]
      );
    }
  }

  const eventCount = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM event_types
      WHERE user_id = $1
    `,
    [userId]
  );
  if ((eventCount.rows[0]?.count || 0) === 0) {
    await query(
      `
        INSERT INTO event_types (
          user_id,
          title,
          description,
          duration_minutes,
          slug,
          location_type,
          custom_location,
          buffer_before_min,
          buffer_after_min,
          max_bookings_per_day,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, NULL, 0, 0, 0, TRUE)
      `,
      [
        userId,
        "30 Minute Intro",
        "Quick intro meeting",
        30,
        "intro-call",
        "google_meet",
      ]
    );
  }

  const contactsCount = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM contacts
      WHERE user_id = $1
    `,
    [userId]
  );
  if ((contactsCount.rows[0]?.count || 0) === 0) {
    await query(
      `
        INSERT INTO contacts (user_id, name, email, company, type, tags, notes, last_meeting_date)
        VALUES
          ($1, 'Ananya Kapoor', 'ananya@acme.com', 'Acme Inc.', 'Lead', ARRAY['VIP'], 'Interested in onboarding call.', CURRENT_DATE - INTERVAL '2 days'),
          ($1, 'Ryan Brooks', 'ryan@northlane.io', 'Northlane', 'Customer', ARRAY['Renewal'], 'Weekly sync every Tuesday.', CURRENT_DATE - INTERVAL '1 day')
      `,
      [userId]
    );
  }

  const workflowsCount = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM workflows
      WHERE user_id = $1
    `,
    [userId]
  );
  if ((workflowsCount.rows[0]?.count || 0) === 0) {
    await query(
      `
        INSERT INTO workflows (user_id, name, trigger, channel, offset_label, status, last_run_at)
        VALUES
          ($1, 'Booking reminder', '24h before event', 'Email', '24 hours before', 'active', NOW() - INTERVAL '3 hours'),
          ($1, 'No-show follow up', '1h after no-show', 'Email + SMS', '1 hour after', 'paused', NOW() - INTERVAL '2 days'),
          ($1, 'Post-meeting thank you', '2h after event', 'Email', '2 hours after', 'draft', NULL)
      `,
      [userId]
    );
  }

  const routingFormsCount = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM routing_forms
      WHERE user_id = $1
    `,
    [userId]
  );
  if ((routingFormsCount.rows[0]?.count || 0) === 0) {
    const formResult = await query(
      `
        INSERT INTO routing_forms (user_id, name, destination, priority, active, submissions_today, conversion_rate)
        VALUES
          ($1, 'Inbound demo requests', 'Sales Team', 'high', TRUE, 6, 58),
          ($1, 'Support escalation', 'Customer Success', 'normal', FALSE, 2, 84)
        RETURNING id, name
      `,
      [userId]
    );
    const inbound = formResult.rows.find((row) => row.name === "Inbound demo requests");
    const support = formResult.rows.find((row) => row.name === "Support escalation");
    await query(
      `
        INSERT INTO routing_leads (user_id, form_id, name, email, company, status, route_to, submitted_at)
        VALUES
          ($1, $2, 'Ivy Thompson', 'ivy@growthlabs.io', 'GrowthLabs', 'New', 'Unassigned', NOW() - INTERVAL '30 minutes'),
          ($1, $3, 'Kabir Mehta', 'kabir@northlane.io', 'Northlane', 'Routed', 'Sales Team', NOW() - INTERVAL '1 hour')
      `,
      [userId, inbound?.id || null, support?.id || null]
    );
  }
}

module.exports = {
  seedDefaults,
};
