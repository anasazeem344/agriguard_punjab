import crypto from 'crypto';
import { sendEmail } from './sendEmail.js';
import { isOpenWaConfigured, sendWhatsAppOtp } from './whatsapp.js';

const OTP_EXPIRY_MS = 10 * 60 * 1000;           // 10 minutes
const PENDING_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_OTP_ATTEMPTS = 5;

const generateOtp = () => String(crypto.randomInt(100000, 999999));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const sendEmailOtp = async (user, otp) => {
  const { mocked } = await sendEmail({
    to: user.email,
    subject: 'AgriGuard Punjab - Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2d6a4f;margin-bottom:4px;">AgriGuard Punjab</h2>
        <p>Hello ${user.fullName},</p>
        <p>Your verification code is:</p>
        <div style="font-size:38px;font-weight:700;letter-spacing:10px;text-align:center;
                    padding:20px;background:#f0fdf4;border-radius:8px;color:#2d6a4f;margin:16px 0;">
          ${otp}
        </div>
        <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color:#9ca3af;font-size:12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  });
  return { sent: !mocked };
};

// Issues a fresh OTP and delivers it via the chosen channel (whatsapp or email).
// Also generates a pending-session token so completePhoneVerification can only be
// called by the browser tab that initiated the registration.
export const issueOtp = async (user, channel = 'whatsapp') => {
  const otp = generateOtp();
  user.phoneVerificationOtp = hashOtp(otp);
  user.phoneVerificationExpire = Date.now() + OTP_EXPIRY_MS;

  const rawPendingToken = crypto.randomBytes(32).toString('hex');
  user.pendingVerificationToken = crypto.createHash('sha256').update(rawPendingToken).digest('hex');
  user.pendingVerificationExpire = Date.now() + PENDING_TOKEN_EXPIRY_MS;
  user.otpAttempts = 0;
  user.verificationChannel = channel;

  await user.save();

  let devOtp = null;

  if (channel === 'email') {
    const { sent } = await sendEmailOtp(user, otp);
    if (!sent) devOtp = otp; // email not configured — show on screen
  } else {
    if (isOpenWaConfigured()) {
      const { sent } = await sendWhatsAppOtp(user.phone, otp);
      if (!sent) devOtp = otp; // open-wa not reachable/session not ready — show on screen
    } else {
      devOtp = otp; // open-wa not configured — show on screen
    }
  }

  return { otp: devOtp, pendingToken: rawPendingToken, channel };
};

export const matchesOtp = (user, otp) =>
  user.phoneVerificationOtp === hashOtp(String(otp).trim()) &&
  user.phoneVerificationExpire &&
  user.phoneVerificationExpire > Date.now();
