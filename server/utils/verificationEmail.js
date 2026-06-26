import crypto from 'crypto';
import { sendEmail } from './sendEmail.js';

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Generates a fresh email-verification token for a user, saves it, and
// emails it (or returns it directly when no SMTP is configured, same
// dev-mode-fallback pattern used for password resets).
export const issueVerificationEmail = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.emailVerificationExpire = Date.now() + VERIFICATION_EXPIRY_MS;
  await user.save();

  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${rawToken}`;

  const { mocked } = await sendEmail({
    to: user.email,
    subject: 'AgriGuard Punjab - Verify Your Email',
    html: `<p>Hello ${user.fullName},</p>
           <p>Please verify your email address to activate your account (link valid for 24 hours):</p>
           <p><a href="${verifyUrl}">${verifyUrl}</a></p>
           <p>If you did not request this, you can safely ignore this email.</p>`
  });

  return { mocked, verifyUrl };
};
