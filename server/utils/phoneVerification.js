import crypto from 'crypto';
import { buildWhatsAppDeepLink, isWhatsAppConfigured } from './whatsapp.js';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const generateOtp = () => String(crypto.randomInt(100000, 999999));
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

// Generates a fresh phone-verification OTP, saves its hash, and returns
// everything the frontend needs to either deep-link into WhatsApp (real
// flow) or display the code directly (dev-mode fallback, same pattern as
// email verification when no SMTP/WhatsApp credentials are configured).
export const issuePhoneOtp = async (user) => {
  const otp = generateOtp();
  user.phoneVerificationOtp = hashOtp(otp);
  user.phoneVerificationExpire = Date.now() + OTP_EXPIRY_MS;
  await user.save();

  const configured = isWhatsAppConfigured();
  return {
    configured,
    otp,
    deepLink: buildWhatsAppDeepLink(otp),
    whatsappNumber: process.env.WHATSAPP_BUSINESS_NUMBER || null
  };
};

export const matchesOtp = (user, otp) =>
  user.phoneVerificationOtp === hashOtp(String(otp).trim()) &&
  user.phoneVerificationExpire &&
  user.phoneVerificationExpire > Date.now();
