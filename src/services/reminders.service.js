const { query } = require("../db/pool");
const { getTransport } = require("./email.service"); // Wait, getTransport isn't exported, let me export it or write a new send method
const env = require("../config/env");

async function sendReminderEmail(booking, type) {
    // getTransport is not exported from email.service.js right now.
    // Actually I can just export a `sendReminder` from email.service.js, or I can just import email.service.js and add the method there.
    // I will add sendReminderEmail to email.service.js and require it here.
}

async function processReminders() {
    try {
        // 30m reminders
        const res30 = await query(`
      SELECT b.*, e.title as event_title, e.location_type, e.custom_location, u.email as host_email, u.display_name as host_name
      FROM bookings b
      JOIN event_types e ON b.event_type_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE b.status = 'confirmed'
        AND b.reminder_30m_sent = false
        AND b.start_at_utc <= (NOW() + interval '30 minutes')
        AND b.start_at_utc > NOW()
    `);

        for (const row of res30.rows) {
            // Send email
            await sendReminder(row, '30m');
            // Mark as sent
            await query(`UPDATE bookings SET reminder_30m_sent = true WHERE id = $1`, [row.id]);
        }

        // 0m reminders
        const res0 = await query(`
      SELECT b.*, e.title as event_title, e.location_type, e.custom_location, u.email as host_email, u.display_name as host_name
      FROM bookings b
      JOIN event_types e ON b.event_type_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE b.status = 'confirmed'
        AND b.reminder_0m_sent = false
        AND b.start_at_utc <= NOW()
        AND b.end_at_utc > NOW()
    `);

        for (const row of res0.rows) {
            await sendReminder(row, '0m');
            await query(`UPDATE bookings SET reminder_0m_sent = true WHERE id = $1`, [row.id]);
        }

    } catch (err) {
        console.error("Error processing reminders:", err);
    }
}

async function sendReminder(bookingRow, type) {
    const { sendReminderMail } = require("./email.service");
    await sendReminderMail(bookingRow, type);
}

module.exports = {
    processReminders
};
