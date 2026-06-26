import User from '../models/User.js';
import { isDbReady } from '../config/db.js';
import { normalizePhone } from '../utils/validators.js';
import { matchesOtp } from '../utils/phoneVerification.js';
import { sendWhatsAppMessage } from '../utils/whatsapp.js';

// @desc    Meta's one-time handshake when you register the webhook URL in
//          the App Dashboard. Must echo back hub.challenge verbatim.
// @route   GET /api/whatsapp/webhook
// @access  Public (secured by the shared verify token, not auth)
export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// @desc    Receives incoming WhatsApp messages. When a farmer sends the OTP
//          we issued them, this is the proof of phone ownership that flips
//          isPhoneVerified to true - no outbound SMS/WhatsApp cost involved.
// @route   POST /api/whatsapp/webhook
// @access  Public (Meta does not authenticate webhook deliveries beyond the
//          verify-token handshake above; nothing here trusts the payload
//          for anything beyond "which OTP did this phone number send back")
export const receiveWebhook = async (req, res) => {
  // Always acknowledge quickly - Meta retries (and can disable the webhook)
  // if it doesn't get a fast 200, regardless of what we do with the payload.
  res.sendStatus(200);

  try {
    if (!isDbReady()) return;

    const messages = req.body?.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages || messages.length === 0) return;

    for (const message of messages) {
      const fromPhone = normalizePhone(message.from);
      const text = message.text?.body || '';
      const otpMatch = text.match(/\d{6}/);
      if (!fromPhone || !otpMatch) continue;

      const user = await User.findOne({ phone: fromPhone, role: 'farmer', isPhoneVerified: false })
        .select('+phoneVerificationOtp +phoneVerificationExpire');
      if (!user) continue;

      if (matchesOtp(user, otpMatch[0])) {
        user.isPhoneVerified = true;
        user.phoneVerificationOtp = undefined;
        user.phoneVerificationExpire = undefined;
        await user.save();

        await sendWhatsAppMessage(message.from, 'Your AgriGuard Punjab account has been verified! You can now log in.');
      }
    }
  } catch (error) {
    console.error('Error in receiveWebhook:', error);
  }
};
