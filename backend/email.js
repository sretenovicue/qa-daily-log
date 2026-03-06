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

module.exports = { sendWelcomeEmail };
