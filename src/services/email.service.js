const crypto = require("crypto");
const fs = require("fs/promises");
const nodemailer = require("nodemailer");
const path = require("path");
const env = require("../config/env");
const { generateIcs } = require("./ics.service");

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

function isSmtpConfigured() {
  const smtp = env.smtp;
  return Boolean(smtp.host && smtp.port && smtp.user && smtp.pass && smtp.from);
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
      lines.push(
        `Connect Google Calendar: ${env.appBaseUrl}/dashboard/scheduling`
      );
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeName(name, fallback = "there") {
  const value = String(name || "").trim();
  return value || fallback;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function formatLoginTime(dateValue) {
  try {
    return new Date(dateValue).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return String(dateValue || "");
  }
}

function buildSaasTemplate({
  preheader,
  title,
  subtitle,
  bodyHtml,
  ctaLabel,
  ctaHref,
  footerLine = "",
}) {
  const appUrl = env.appBaseUrl || "https://meetscheduling.com";
  const safePreheader = escapeHtml(preheader);
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaHref = escapeHtml(ctaHref || appUrl);
  const safeFooterLine = footerLine ? `<p style="margin:0;color:#94a3b8;font-size:12px;">${escapeHtml(footerLine)}</p>` : "";

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:24px 24px 8px;">
                <p style="margin:0 0 12px;color:#3b82f6;font-weight:700;letter-spacing:0.08em;font-size:11px;text-transform:uppercase;">MeetScheduling</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#0f172a;">${safeTitle}</h1>
                <p style="margin:12px 0 0;color:#475569;font-size:15px;line-height:1.6;">${safeSubtitle}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 24px 0;color:#334155;font-size:15px;line-height:1.6;">${bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <a href="${safeCtaHref}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;line-height:1;padding:13px 18px;border-radius:10px;">
                  ${safeCtaLabel}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 24px;">
                <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                  Need help? Reply to this email or contact <a href="mailto:${escapeHtml(env.authEmail?.supportEmail || env.smtp.from || "support@meetscheduling.com")}" style="color:#2563eb;text-decoration:none;">${escapeHtml(env.authEmail?.supportEmail || env.smtp.from || "support@meetscheduling.com")}</a>.
                </p>
                ${safeFooterLine}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

async function sendAuthLifecycleEmail({ toEmail, subject, text, html }) {
  const mailer = getTransport();
  const to = normalizeEmail(toEmail);
  if (!to) return { sent: false, reason: "Recipient email missing" };

  if (!mailer) {
    if (env.nodeEnv === "production") {
      return { sent: false, reason: "SMTP not configured" };
    }

    const outboxDir = env.authEmail?.outboxDir || "/tmp/meetscheduling-email-outbox";
    await fs.mkdir(outboxDir, { recursive: true });
    const filePath = path.join(
      outboxDir,
      `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.json`
    );
    await fs.writeFile(
      filePath,
      JSON.stringify(
        {
          to,
          subject,
          text,
          html,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      ),
      "utf8"
    );
    return { sent: true, mode: "file", path: filePath };
  }

  await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}

async function sendWelcomeEmail({ toEmail, displayName, username = "" }) {
  if (!env.authEmail?.welcomeEnabled) {
    return { sent: false, reason: "Welcome email disabled" };
  }

  const appUrl = (env.appBaseUrl || "https://meetscheduling.com").replace(/\/+$/, "");
  const bookingUsername = String(username || "").trim() || "yourusername";
  const bookingLink = `${appUrl}/${bookingUsername}`;
  const subject = "Welcome to MeetScheduling";
  const textLines = [
    "Hi there,",
    "",
    "Welcome to MeetScheduling — we're excited to have you on board!",
    "",
    "MeetScheduling is designed to make booking meetings simple, professional, and completely automated. Instead of going back and forth with emails to find a time, you can now share your personal scheduling link and let people book time with you instantly.",
    "",
    "Here's what you can do next:",
    "",
    "• Connect your Google Calendar to avoid double bookings",
    "• Create your first event type (e.g., 30-minute meeting, consultation, demo)",
    "• Share your booking link with clients, teammates, or prospects",
    "• Automatically generate Google Meet links for every scheduled meeting",
    "",
    "Once someone books a meeting, MeetScheduling will automatically:",
    "",
    "* Add the event to your calendar",
    "* Send confirmation emails",
    "* Generate the meeting link",
    "* Keep your schedule organized",
    "",
    "Your personal scheduling link will look like this:",
    bookingLink,
    "",
    "You can start sharing it right away.",
    "",
    "If you ever need help, feel free to reach out to our support team. We're here to make scheduling effortless for you.",
    "",
    "Welcome again, and happy scheduling!",
    "",
    "Best regards,",
    "The MeetScheduling Team",
    "",
    `Website: ${appUrl}`,
    `Support: ${env.authEmail?.supportEmail || env.smtp.from || "support@meetscheduling.com"}`,
  ];

  const html = buildSaasTemplate({
    preheader: "Welcome to MeetScheduling - your scheduling workspace is ready.",
    title: "Welcome to MeetScheduling",
    subtitle:
      "We're excited to have you on board. Your scheduling workspace is ready to share.",
    bodyHtml: `
      <p style="margin:0 0 14px;">Hi there,</p>
      <p style="margin:0 0 14px;">Welcome to <strong>MeetScheduling</strong> — we're excited to have you on board!</p>
      <p style="margin:0 0 14px;">MeetScheduling is designed to make booking meetings simple, professional, and completely automated. Instead of going back and forth with emails to find a time, you can now share your personal scheduling link and let people book time with you instantly.</p>
      <p style="margin:0 0 10px;"><strong>Here's what you can do next:</strong></p>
      <ul style="margin:0 0 14px;padding-left:18px;">
        <li>Connect your Google Calendar to avoid double bookings</li>
        <li>Create your first event type (e.g., 30-minute meeting, consultation, demo)</li>
        <li>Share your booking link with clients, teammates, or prospects</li>
        <li>Automatically generate Google Meet links for every scheduled meeting</li>
      </ul>
      <p style="margin:0 0 10px;">Once someone books a meeting, MeetScheduling will automatically:</p>
      <ul style="margin:0 0 14px;padding-left:18px;">
        <li>Add the event to your calendar</li>
        <li>Send confirmation emails</li>
        <li>Generate the meeting link</li>
        <li>Keep your schedule organized</li>
      </ul>
      <p style="margin:0 0 10px;">Your personal scheduling link will look like this:</p>
      <p style="margin:0 0 14px;"><a href="${escapeHtml(bookingLink)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${escapeHtml(bookingLink)}</a></p>
      <p style="margin:0 0 14px;">You can start sharing it right away.</p>
      <p style="margin:0 0 14px;">If you ever need help, feel free to reach out to our support team. We're here to make scheduling effortless for you.</p>
      <p style="margin:0;">Welcome again, and happy scheduling!</p>
      <p style="margin:14px 0 0;"><strong>The MeetScheduling Team</strong></p>
    `,
    ctaLabel: "Open your booking link",
    ctaHref: bookingLink,
    footerLine: "You received this email because a MeetScheduling account was created with this address.",
  });

  return sendAuthLifecycleEmail({
    toEmail,
    subject,
    text: textLines.join("\n"),
    html,
  });
}

async function sendEmailVerificationEmail({
  toEmail,
  displayName,
  verifyUrl,
  expiresAt,
}) {
  const appUrl = env.appBaseUrl || "https://meetscheduling.com";
  const name = safeName(displayName);
  const safeVerifyUrl = String(verifyUrl || "").trim();
  if (!safeVerifyUrl) return { sent: false, reason: "Verification URL missing" };
  const expiresText = formatLoginTime(expiresAt || new Date());
  const supportEmail = env.authEmail?.supportEmail || env.smtp.from || "support@meetscheduling.com";
  const subject = "Verify your MeetScheduling email";

  const textLines = [
    `Hi ${name},`,
    "",
    "Verify your email address to activate your MeetScheduling account.",
    "Open the secure link below:",
    safeVerifyUrl,
    "",
    `This link expires on ${expiresText}.`,
    "",
    "If you did not create this account, you can ignore this email.",
    `Need help? Contact ${supportEmail}.`,
    "",
    "Thanks,",
    "MeetScheduling Security",
  ];

  const html = buildSaasTemplate({
    preheader: "Verify your MeetScheduling email address.",
    title: "Verify your email",
    subtitle:
      "Confirm this email address to activate your account and continue securely.",
    bodyHtml: `<p style="margin:0 0 12px;">For your security, this verification link expires on <strong>${escapeHtml(
      expiresText
    )}</strong>.</p>
      <p style="margin:0;">If you did not sign up for MeetScheduling, no action is required.</p>`,
    ctaLabel: "Verify email",
    ctaHref: safeVerifyUrl,
    footerLine: `Need help? Visit ${appUrl}/login.html or contact support.`,
  });

  return sendAuthLifecycleEmail({
    toEmail,
    subject,
    text: textLines.join("\n"),
    html,
  });
}

async function sendLoginNotificationEmail({
  toEmail,
  displayName,
  ipAddress = "",
  userAgent = "",
  loginAt = new Date(),
}) {
  if (!env.authEmail?.loginEnabled) {
    return { sent: false, reason: "Login email disabled" };
  }

  const appUrl = env.appBaseUrl || "https://meetscheduling.com";
  const name = safeName(displayName);
  const timestamp = formatLoginTime(loginAt);
  const subject = "New login to your MeetScheduling account";
  const cleanIp = String(ipAddress || "").trim() || "Unavailable";
  const cleanAgent = String(userAgent || "").trim() || "Unavailable";

  const textLines = [
    `Hi ${name},`,
    "",
    "We noticed a new login to your MeetScheduling account.",
    `Time: ${timestamp}`,
    `IP: ${cleanIp}`,
    `Device: ${cleanAgent}`,
    "",
    `If this wasn't you, contact ${env.authEmail?.supportEmail || env.smtp.from || "support@meetscheduling.com"} immediately.`,
    "",
    `Security settings: ${appUrl}/verify-2fa.html`,
    "",
    "Thanks,",
    "MeetScheduling Security",
  ];

  const html = buildSaasTemplate({
    preheader: "A new login was detected on your MeetScheduling account.",
    title: `Hi ${name}, new login detected`,
    subtitle:
      "Your account was just accessed. If this was you, no action is required.",
    bodyHtml: `<p style="margin:0 0 12px;">Login details:</p>
      <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:90px;">Time</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(timestamp)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">IP</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(cleanIp)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Device</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(cleanAgent)}</td></tr>
      </table>`,
    ctaLabel: "Review account security",
    ctaHref: `${appUrl}/verify-2fa.html`,
    footerLine: "If you didn't log in, reset your password immediately.",
  });

  return sendAuthLifecycleEmail({
    toEmail,
    subject,
    text: textLines.join("\n"),
    html,
  });
}

async function sendWorkspaceInviteEmail({
  toEmail,
  inviterName,
  workspaceName,
  role,
  existingUser = false,
}) {
  const appUrl = env.appBaseUrl || "https://www.meetscheduling.com";
  const normalizedRole = String(role || "member").trim().toLowerCase() || "member";
  const safeWorkspaceName = safeName(workspaceName, "MeetScheduling workspace");
  const safeInviter = safeName(inviterName, "A teammate");
  const actionHref = existingUser ? `${appUrl}/login.html` : `${appUrl}/signup.html`;
  const actionLabel = existingUser ? "Open MeetScheduling" : "Create your account";
  const subject = `${safeInviter} invited you to ${safeWorkspaceName} on MeetScheduling`;
  const textLines = [
    `Hi,`,
    "",
    `${safeInviter} invited you to join ${safeWorkspaceName} on MeetScheduling as ${normalizedRole}.`,
    existingUser
      ? "Sign in to accept the invite and start collaborating."
      : "Create your MeetScheduling account using this email address to accept the invite and start collaborating.",
    "",
    `${actionLabel}: ${actionHref}`,
    "",
    `Support: ${env.authEmail?.supportEmail || env.smtp.from || "support@meetscheduling.com"}`,
    "",
    "Thanks,",
    "MeetScheduling",
  ];

  const html = buildSaasTemplate({
    preheader: `${safeInviter} invited you to a MeetScheduling workspace.`,
    title: `Workspace invite`,
    subtitle: `${safeInviter} invited you to join ${safeWorkspaceName} as ${normalizedRole}.`,
    bodyHtml: existingUser
      ? "<p style=\"margin:0;\">Sign in to your MeetScheduling account to access the workspace and start collaborating.</p>"
      : "<p style=\"margin:0;\">Create your MeetScheduling account with this email address to access the workspace and start collaborating.</p>",
    ctaLabel: actionLabel,
    ctaHref: actionHref,
    footerLine: "You received this email because someone invited you to a MeetScheduling workspace.",
  });

  return sendAuthLifecycleEmail({
    toEmail,
    subject,
    text: textLines.join("\n"),
    html,
  });
}

async function sendPasswordResetEmail({
  toEmail,
  displayName,
  resetUrl,
  expiresAt,
}) {
  const appUrl = env.appBaseUrl || "https://meetscheduling.com";
  const name = safeName(displayName);
  const safeResetUrl = String(resetUrl || "").trim();
  if (!safeResetUrl) return { sent: false, reason: "Reset URL missing" };
  const expiresText = formatLoginTime(expiresAt || new Date());
  const subject = "Reset your MeetScheduling password";
  const supportEmail = env.authEmail?.supportEmail || env.smtp.from || "support@meetscheduling.com";

  const textLines = [
    `Hi ${name},`,
    "",
    "We received a request to reset your password.",
    "Use this secure link to set a new password:",
    safeResetUrl,
    "",
    `This link expires on ${expiresText}.`,
    "",
    "If you did not request this, you can safely ignore this email.",
    `Need help? Contact ${supportEmail}.`,
    "",
    "Thanks,",
    "MeetScheduling Security",
  ];

  const html = buildSaasTemplate({
    preheader: "Use this secure link to reset your MeetScheduling password.",
    title: "Reset your password",
    subtitle:
      "A secure password reset was requested for your account. Click below to create a new password.",
    bodyHtml: `<p style="margin:0 0 10px;">For your security, this link expires on <strong>${escapeHtml(
      expiresText
    )}</strong>.</p>
      <p style="margin:0;">If you didn’t request a reset, no action is needed and your account remains safe.</p>`,
    ctaLabel: "Create new password",
    ctaHref: safeResetUrl,
    footerLine: `Didn't request this? Visit ${appUrl}/login.html or contact support.`,
  });

  return sendAuthLifecycleEmail({
    toEmail,
    subject,
    text: textLines.join("\n"),
    html,
  });
}

async function sendWorkflowBroadcastEmail({
  ownerName,
  workflowName,
  triggerLabel,
  offsetLabel,
  recipients = [],
}) {
  const mailer = getTransport();
  if (!mailer) {
    return {
      sent: false,
      reason: "SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM.",
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
    };
  }

  const uniqueRecipients = [];
  const seen = new Set();
  recipients.forEach((recipient) => {
    const email = normalizeEmail(recipient?.email);
    if (!email || seen.has(email)) return;
    seen.add(email);
    uniqueRecipients.push({
      email,
      name: safeName(recipient?.name, "there"),
    });
  });

  if (!uniqueRecipients.length) {
    return {
      sent: false,
      reason: "No recipients found (add contacts first).",
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
    };
  }

  const appUrl = env.appBaseUrl || "https://meetscheduling.com";
  const safeOwner = safeName(ownerName, "MeetScheduling Team");
  const safeWorkflow = safeName(workflowName, "Email update");
  const safeTrigger = safeName(triggerLabel, "Manual run");
  const safeOffset = safeName(offsetLabel, "Immediate");
  const subject = `${safeOwner}: ${safeWorkflow}`;

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of uniqueRecipients) {
    const textLines = [
      `Hi ${recipient.name},`,
      "",
      `You received this update from ${safeOwner}.`,
      `Automation: ${safeWorkflow}`,
      `Trigger: ${safeTrigger}`,
      `Schedule: ${safeOffset}`,
      "",
      `Open MeetScheduling: ${appUrl}`,
      "",
      "Thanks,",
      safeOwner,
    ];

    const html = buildSaasTemplate({
      preheader: `${safeOwner} sent you an automated update from MeetScheduling.`,
      title: `${safeOwner} sent you an update`,
      subtitle: "This email was sent using MeetScheduling automation.",
      bodyHtml: `<p style="margin:0 0 10px;">Automation details:</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#64748b;width:90px;">Workflow</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(
            safeWorkflow
          )}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Trigger</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(
            safeTrigger
          )}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Timing</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(
            safeOffset
          )}</td></tr>
        </table>`,
      ctaLabel: "Open MeetScheduling",
      ctaHref: `${appUrl}/dashboard`,
      footerLine: "You can unsubscribe by contacting the sender directly.",
    });

    try {
      await mailer.sendMail({
        from: env.smtp.from,
        to: recipient.email,
        subject,
        text: textLines.join("\n"),
        html,
      });
      sentCount += 1;
    } catch (error) {
      failedCount += 1;
      // eslint-disable-next-line no-console
      console.error(
        `Workflow email send failed for ${recipient.email}:`,
        error?.message || error
      );
    }
  }

  return {
    sent: sentCount > 0,
    reason: sentCount ? "" : "All email sends failed.",
    totalRecipients: uniqueRecipients.length,
    sentCount,
    failedCount,
  };
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
  // Calendar Reminders integration: optional enhanced ICS params
  reminderTimingsMinutes = [1440, 60, 15],
  organizerEmail = "",
  organizerName = "",
}) {
  const mailer = getTransport();
  if (!mailer) return { sent: false, reason: "SMTP not configured" };
  let inviteeSent = false;
  let hostSent = false;

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

  const locationStr = String(meetingLink || "").trim() || "Online";
  const descriptionStr = [
    inviteeMeetingLines[0] || "",
    timezone ? `Timezone: ${timezone}` : "",
  ].filter(Boolean).join(" | ");

  // Generate ICS for invitee — includes VALARM blocks for calendar reminders
  const inviteeIcs = generateIcs({
    startUtc,
    endUtc,
    summary: `${eventTitle} with ${hostName || "host"}`,
    description: descriptionStr,
    location: locationStr,
    organizerEmail: organizerEmail || hostEmail || "",
    organizerName: organizerName || hostName || "",
    attendeeEmail: toEmail,
    attendeeName: inviteeName,
    reminderTimingsMinutes,
  });

  // Generate ICS for owner — same event, attendee/organizer roles swapped
  const ownerIcs = generateIcs({
    startUtc,
    endUtc,
    summary: `${eventTitle} with ${inviteeName}`,
    description: [
      hostMeetingLines[0] || "",
      timezone ? `Timezone: ${timezone}` : "",
    ].filter(Boolean).join(" | "),
    location: locationStr,
    organizerEmail: organizerEmail || hostEmail || "",
    organizerName: organizerName || hostName || "",
    attendeeEmail: toEmail,
    attendeeName: inviteeName,
    reminderTimingsMinutes,
  });

  const icsData = inviteeIcs; // keep legacy reference in scope

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
        content: inviteeIcs,
        contentType: "text/calendar; method=REQUEST",
      },
    ],
  };

  // Send to invitee
  await mailer.sendMail(mailOptions);
  inviteeSent = true;

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
          content: ownerIcs,
          contentType: "text/calendar; method=REQUEST",
        },
      ],
    });
    hostSent = true;
  }

  return {
    sent: inviteeSent || hostSent,
    inviteeSent,
    hostSent,
  };
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
  sendWelcomeEmail,
  sendEmailVerificationEmail,
  sendWorkspaceInviteEmail,
  sendLoginNotificationEmail,
  sendPasswordResetEmail,
  sendWorkflowBroadcastEmail,
  isSmtpConfigured,
};
