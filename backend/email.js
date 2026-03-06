const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendWelcomeEmail({ to, username }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  await transporter.sendMail({
    from: `"QA Daily Log" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to QA Daily Log!',
    html: `<p>Hi <strong>${username}</strong>,</p>
<p>Your account has been approved! You can now log in to <strong>QA Daily Log</strong> and start tracking your work.</p>
<p>👉 <a href="https://qa-daily-log.online">Login here</a></p>
<p>If you have any questions, contact us at <strong>boskobsk@gmail.com</strong>.</p>
<p>Best regards,<br><strong>The QA Daily Log Team</strong></p>`,
  });
}

async function sendConfirmEmail({ to, username, token }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const url = `${process.env.APP_URL || 'https://qa-daily-log.online'}/confirm/${token}`;
  await transporter.sendMail({
    from: `"QA Daily Log" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Potvrdite email adresu — QA Daily Log',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#1a1a2e;color:#e2e8f0;border-radius:12px">
  <div style="font-size:28px;margin-bottom:8px">🧪</div>
  <h2 style="margin:0 0 8px;color:#7c6ff7">QA Daily Log</h2>
  <p>Hi <strong>${username}</strong>,</p>
  <p>Potvrdite vašu email adresu da biste završili registraciju:</p>
  <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c6ff7;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">✅ Potvrdi email adresu</a>
  <p style="font-size:12px;color:#94a3b8;margin-top:24px">Link važi 24 sata. Ako se niste registrovali, ignorišite ovaj email.</p>
</div>`,
  });
}

module.exports = { sendWelcomeEmail, sendConfirmEmail };
