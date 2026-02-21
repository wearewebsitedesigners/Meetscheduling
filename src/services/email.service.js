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
  hostName,
  eventTitle,
  startLocal,
  endLocal,
  timezone,
  meetingLink,
}) {
  const mailer = getTransport();
  if (!mailer) return { sent: false, reason: "SMTP not configured" };

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

  await mailer.sendMail({
    from: env.smtp.from,
    to: toEmail,
    subject: `Booking Confirmed: ${eventTitle}`,
    text: lines.join("\n"),
  });
  return { sent: true };
}

module.exports = {
  sendBookingConfirmation,
};

