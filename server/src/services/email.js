import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

// Substitui base44.integrations.Core.SendEmail / Core-SendEmail.
export async function sendEmail({ to, subject, body, from }) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] SMTP não configurado — email para ${to} ("${subject}") não enviado.`);
    return { sent: false, reason: 'smtp_not_configured' };
  }
  await t.sendMail({
    from: from || process.env.SMTP_FROM,
    to,
    subject,
    html: body,
  });
  return { sent: true };
}
