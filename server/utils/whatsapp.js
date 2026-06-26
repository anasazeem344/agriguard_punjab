const GRAPH_API_VERSION = 'v19.0';

export const isWhatsAppConfigured = () =>
  Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    !process.env.WHATSAPP_ACCESS_TOKEN.includes('xxxx')
  );

// Builds a wa.me deep link that opens WhatsApp with the OTP message
// pre-filled, so the user only has to tap "Send" on their end.
export const buildWhatsAppDeepLink = (otp) => {
  const number = (process.env.WHATSAPP_BUSINESS_NUMBER || '').replace(/[^\d]/g, '');
  const text = encodeURIComponent(`Verify: ${otp}`);
  return `https://wa.me/${number}?text=${text}`;
};

// Sends a WhatsApp message via the Cloud API. Best-effort: failures are
// logged but never thrown, since this is only used for a "nice to have"
// confirmation reply, not the verification proof itself (that's the
// incoming message the user sends us, handled by the webhook).
export const sendWhatsAppMessage = async (toPhoneE164Digits, body) => {
  if (!isWhatsAppConfigured()) return { sent: false };

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhoneE164Digits,
        type: 'text',
        text: { body }
      })
    });

    if (!res.ok) {
      console.error('WhatsApp send failed:', res.status, await res.text());
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.error('WhatsApp send error:', error.message);
    return { sent: false };
  }
};
