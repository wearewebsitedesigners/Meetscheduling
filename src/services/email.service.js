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

function getMeetingLinkLines({
  locationType,
  meetingLink,
  meetingLinkStatus,
  hostFacing = false,
}) {
  const safeLink = String(meetingLink || "").trim();
  if (safeLink) {
    return [`Meeting link: ${safeLink}`];
  }

  const status = String(meetingLinkStatus || "").trim().toLowerCase();
  const type = String(locationType || "").trim().toLowerCase();
  if (type !== "google_meet") return [];

  if (status === "pending_calendar_connection") {
    const lines = [
      "Google Meet link pending: Google Calendar is not connected for this host.",
    ];
    if (hostFacing) {
      lines.push(`Connect Google Calendar: ${env.appBaseUrl}/dashboard.html?tab=integrations`);
    }
    return lines;
  }

  if (status === "generation_failed") {
    return hostFacing
      ? [
        "Google Meet link generation failed. Please reconnect/sync Google Calendar from Integrations.",
      ]
      : [
        "Google Meet link is temporarily unavailable. Please check your reminder email for an updated link.",
      ];
  }

  return ["Google Meet link is being generated. It will be shared shortly."];
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
  locationType,
  meetingLink,
  meetingLinkStatus,
}) {
  const mailer = getTransport();
  if (!mailer) return { sent: false, reason: "SMTP not configured" };

  const formatIcsDate = (dateObj) => {
    return new Date(dateObj).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const inviteeMeetingLines = getMeetingLinkLines({
    locationType,
    meetingLink,
    meetingLinkStatus,
    hostFacing: false,
  });
  const hostMeetingLines = getMeetingLinkLines({
    locationType,
    meetingLink,
    meetingLinkStatus,
    hostFacing: true,
  });

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
    `DESCRIPTION:${(inviteeMeetingLines[0] || "Details to follow.").replace(/\r?\n/g, " ")}`,
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
  lines.push(...inviteeMeetingLines);
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
    hostLines.push(...hostMeetingLines);
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

  lines.push(
    ...getMeetingLinkLines({
      locationType: bookingRow.location_type,
      meetingLink: bookingRow.meeting_link,
      meetingLinkStatus: bookingRow.meeting_link_status,
      hostFacing: false,
    })
  );
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
    hostLines.push(
      ...getMeetingLinkLines({
        locationType: bookingRow.location_type,
        meetingLink: bookingRow.meeting_link,
        meetingLinkStatus: bookingRow.meeting_link_status,
        hostFacing: true,
      })
    );
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
