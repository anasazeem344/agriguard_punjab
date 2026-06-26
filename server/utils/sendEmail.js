import nodemailer from 'nodemailer';

const isEmailConfigured = () =>
  process.env.EMAIL_USER &&
  process.env.EMAIL_APP_PASSWORD &&
  !process.env.EMAIL_USER.includes('xxxx');

let transporter = null;
if (isEmailConfigured()) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });
}

// Sends an email if Gmail SMTP is configured; otherwise logs it to the
// console so the reset flow stays testable without any email service set up.
export const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log('----------------------------------------------------');
    console.log('[DEV MODE] Email sending is not configured (EMAIL_USER / EMAIL_APP_PASSWORD missing).');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(html);
    console.log('----------------------------------------------------');
    return { mocked: true };
  }

  await transporter.sendMail({
    from: `"AgriGuard Punjab" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
  return { mocked: false };
};
