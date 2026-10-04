const isOpenWaConfigured = () =>
  process.env.OPENWA_BASE_URL && process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID;

// 03XXXXXXXXX -> 92XXXXXXXXX@c.us
const toWhatsAppChatId = (normalizedPhone) => `92${normalizedPhone.slice(1)}@c.us`;

const sendWhatsAppOtp = async (normalizedPhone, otp) => {
  const url = `${process.env.OPENWA_BASE_URL}/api/sessions/${process.env.OPENWA_SESSION_ID}/messages/send-text`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.OPENWA_API_KEY
      },
      body: JSON.stringify({
        chatId: toWhatsAppChatId(normalizedPhone),
        text: `Your AgriGuard Punjab verification code is ${otp}. It expires in 10 minutes.`
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`[open-wa] send-text failed (${response.status}): ${body}`);
      return { sent: false };
    }

    return { sent: true };
  } catch (err) {
    console.warn(`[open-wa] send-text request error: ${err.message}`);
    return { sent: false };
  }
};

export { isOpenWaConfigured, sendWhatsAppOtp };
