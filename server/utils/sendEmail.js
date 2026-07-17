import nodemailer from 'nodemailer';

const isEmailConfigured = () =>
  process.env.EMAIL_USER &&
  process.env.EMAIL_APP_PASSWORD &&
  !process.env.EMAIL_USER.includes('xxxx');

// Transporter is created on first use so that dotenv has already loaded
// by the time we read the env vars (ESM hoists imports before module body runs).
let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  if (!isEmailConfigured()) return null;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });
  return transporter;
};

export const sendEmail = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) {
    console.log('----------------------------------------------------');
    console.log('[DEV MODE] Email sending is not configured (EMAIL_USER / EMAIL_APP_PASSWORD missing).');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(html);
    console.log('----------------------------------------------------');
    return { mocked: true };
  }

  await t.sendMail({
    from: `"AgriGuard Punjab" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
  return { mocked: false };
};
