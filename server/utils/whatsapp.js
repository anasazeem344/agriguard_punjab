export const isGreenApiConfigured = () =>
  Boolean(
    process.env.GREEN_API_INSTANCE_ID &&
    process.env.GREEN_API_API_TOKEN &&
    !process.env.GREEN_API_INSTANCE_ID.includes('xxxx')
  );

export const sendWhatsAppOtp = async (phone, otp) => {
  if (!isGreenApiConfigured()) return { sent: false };

  const intlPhone = phone.startsWith('0') ? `92${phone.slice(1)}` : phone;
  const chatId = `${intlPhone}@c.us`;
  const message = `Your AgriGuard Punjab verification code is: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;

  try {
    const url = `https://api.green-api.com/waInstance${process.env.GREEN_API_INSTANCE_ID}/sendMessage/${process.env.GREEN_API_API_TOKEN}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message })
    });

    if (!res.ok) {
      console.error('Green API send failed:', res.status, await res.text());
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.error('Green API send error:', error.message);
    return { sent: false };
  }
};
