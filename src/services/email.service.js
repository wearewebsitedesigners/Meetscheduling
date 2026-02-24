const nodemailer = require("nodemailer");
const env = require("../config/env");

let transport = null;

function getTransport() {
  if (transport) return transport;
  const smtp = env.smtp;
  if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.from) {
    return null;
  }
  transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });
  return transport;
}

async function sendBookingConfirmation({
  toEmail,
  inviteeName,
  hostEmail,
  hostName,
  eventTitle,
  startLocal,
  endLocal,
  timezone,
  startUtc,
  endUtc,
  meetingLink,
}) {
  const mailer = getTransport();
  if (!mailer) return { sent: false, reason: "SMTP not configured" };

  const formatIcsDate = (dateObj) => {
    return new Date(dateObj).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const icsData = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meetscheduling//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@meetscheduling.com`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startUtc)}`,
    `DTEND:${formatIcsDate(endUtc)}`,
    `SUMMARY:${eventTitle} with ${inviteeName}`,
    `DESCRIPTION:${meetingLink ? "Meeting link: " + meetingLink : "Details to follow."}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const lines = [
    `Hi ${inviteeName},`,
    "",
    "Your booking is confirmed.",
    `Host: ${hostName}`,
    `Event: ${eventTitle}`,
    `Date: ${startLocal.date}`,
    `Time: ${startLocal.time} - ${endLocal.time} (${timezone})`,
  ];
  if (meetingLink) {
    lines.push(`Meeting link: ${meetingLink}`);
  }
  lines.push("", "Thanks,", "Meetscheduling");

  const mailOptions = {
    from: env.smtp.from,
    to: toEmail,
    subject: `Booking Confirmed: ${eventTitle}`,
    text: lines.join("\n"),
    attachments: [
      {
        filename: "invite.ics",
        content: icsData,
        contentType: "text/calendar",
      },
    ],
  };

  // Send to invitee
  await mailer.sendMail(mailOptions);

  // Send to host
  if (hostEmail) {
    const hostLines = [
      `Hi ${hostName},`,
      "",
      `A new booking has been made by ${inviteeName} (${toEmail}).`,
      `Event: ${eventTitle}`,
      `Date: ${startLocal.date}`,
      `Time: ${startLocal.time} - ${endLocal.time} (${timezone})`,
    ];
    if (meetingLink) hostLines.push(`Meeting link: ${meetingLink}`);
    hostLines.push("", "Thanks,", "Meetscheduling");

    await mailer.sendMail({
      from: env.smtp.from,
      to: hostEmail,
      subject: `New Booking: ${eventTitle} with ${inviteeName}`,
      text: hostLines.join("\n"),
      attachments: [
        {
          filename: "invite.ics",
          content: icsData,
          contentType: "text/calendar",
        },
      ],
    });
  }

  return { sent: true };
}

async function sendReminderMail(bookingRow, type) {
  const mailer = getTransport();
  if (!mailer) return;

  const intro = type === '30m' ? 'Starting in 30 minutes:' : 'Starting now:';
  const subject = `Reminder: ${bookingRow.event_title} ${type === '30m' ? 'in 30 mins' : 'now'}`;

  const lines = [
    `Hi ${bookingRow.invitee_name},`,
    "",
    intro,
    `Event: ${bookingRow.event_title}`,
    `Host: ${bookingRow.host_name}`,
  ];

  if (bookingRow.meeting_link) {
    lines.push(`Meeting link: ${bookingRow.meeting_link}`);
  }
  lines.push("", "Thanks,", "Meetscheduling");

  // Send to invitee
  await mailer.sendMail({
    from: env.smtp.from,
    to: bookingRow.invitee_email,
    subject,
    text: lines.join("\n"),
  });

  // Send to host
  if (bookingRow.host_email) {
    const hostLines = [
      `Hi ${bookingRow.host_name},`,
      "",
      intro,
      `Event: ${bookingRow.event_title} with ${bookingRow.invitee_name}`,
    ];
    if (bookingRow.meeting_link) {
      hostLines.push(`Meeting link: ${bookingRow.meeting_link}`);
    }
    hostLines.push("", "Thanks,", "Meetscheduling");

    await mailer.sendMail({
      from: env.smtp.from,
      to: bookingRow.host_email,
      subject,
      text: hostLines.join("\n"),
    });
  }
}

module.exports = {
  sendBookingConfirmation,
  sendReminderMail,
};

