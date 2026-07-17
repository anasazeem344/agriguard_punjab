# WhatsApp OTP Setup (Green API)

Farmers verify their phone by receiving a one-time code **on their WhatsApp**,
then entering it on the website. The server sends the code outbound via Green API —
no webhook, no ngrok, works from localhost.

Until you complete this setup the app runs in **dev mode**: the OTP is shown
directly on the verification screen so registration works without any WhatsApp setup.

## 1. Sign up for Green API

1. Go to [green-api.com](https://green-api.com) and create a free account.
2. Create a new instance (the free Developer plan is enough for testing).
3. On the instance page, scan the **QR code** with the WhatsApp number you want
   to send from (your personal number is fine for FYP).
4. Once the instance status shows **"Authorized"**, copy:
   - **Instance ID** → `GREEN_API_INSTANCE_ID` in `server/.env`
   - **API Token** → `GREEN_API_API_TOKEN` in `server/.env`

## 2. Add to server/.env

```
GREEN_API_INSTANCE_ID=your_instance_id_here
GREEN_API_API_TOKEN=your_api_token_here
```

Restart the server after saving. That's it — the OTP will now be delivered to
the farmer's WhatsApp automatically on registration.

## How it works

1. Farmer submits the registration form.
2. Server generates a 6-digit OTP, hashes it, and sends it to the farmer's
   WhatsApp via Green API (`POST /waInstance.../sendMessage`).
3. Farmer sees the code on their phone, types it into the website.
4. Server verifies the hash and issues a JWT → farmer is logged in.

## Dev mode (no Green API credentials)

If `GREEN_API_INSTANCE_ID` is `xxxx` or missing, the OTP is displayed directly
on the verification screen instead of being sent via WhatsApp. All other logic
(hashing, pending token, expiry) is identical — dev mode is safe for testing.

## Free tier limits

Green API's free developer plan allows approximately **200 messages per day**,
which is more than sufficient for a FYP demo. For production scale, paid plans
start from ~$2/month.
