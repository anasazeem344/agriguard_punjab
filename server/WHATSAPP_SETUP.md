# WhatsApp Cloud API Setup (Farmer Phone Verification)

Farmers verify their phone number by sending a one-time code to your WhatsApp
Business number over WhatsApp. Until you complete this setup, the app runs in
**dev-mode**: the code is shown directly on-screen instead of requiring a real
WhatsApp message, so registration/login work fully without any of this.

## Important limitation

Meta's free **test number** can only message/receive from **up to 5 phone
numbers** that you manually whitelist in the dashboard. Any other real
farmer's number will not be able to verify until you complete **Meta Business
Verification** (real business documents, can take days). This setup is fine
for demoing with your own test numbers; it is not yet ready for the public.

## 1. Create a Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in.
2. Create App → choose **Business** type → name it (e.g. "AgriGuard Punjab").
3. In the App Dashboard, find **WhatsApp** under "Add a product" and set it up.

## 2. Get your test number and credentials

On the WhatsApp → **API Setup** page you'll see:
- A free **test phone number** (the "From" number) → copy it into `WHATSAPP_BUSINESS_NUMBER` in `server/.env` (digits only, e.g. `15550123456`).
- A **Phone number ID** → copy into `WHATSAPP_PHONE_NUMBER_ID`.
- A **temporary access token** (valid 24 hours) → copy into `WHATSAPP_ACCESS_TOKEN` to start testing.
  - For a token that doesn't expire every 24h: Business Settings → System Users → create one → generate a token with the `whatsapp_business_messaging` permission.

## 3. Whitelist test recipient numbers

Still on **API Setup**, under "To", click **Manage phone number list** and add
the phone number(s) you'll test with (your own number is fine). Each one needs
a verification code sent to it once. This is the 5-number cap mentioned above.

## 4. Expose your local server to the internet (for the webhook)

Meta needs to call your server when a message arrives — `localhost` isn't
reachable from their side. Use a tunnel during development:

```bash
npx ngrok http 5000
```

This prints a public URL like `https://abcd1234.ngrok-free.app`. Your webhook
endpoint is `https://abcd1234.ngrok-free.app/api/whatsapp/webhook`.

**Note:** the free ngrok URL changes every time you restart it — you'll need
to re-register it in step 5 each time, or upgrade ngrok for a static domain.

## 5. Register the webhook

In the App Dashboard → WhatsApp → **Configuration**:
1. Callback URL: your ngrok URL + `/api/whatsapp/webhook`
2. Verify Token: the value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `server/.env`
3. Click **Verify and Save** (this triggers the `GET` handshake our server already handles).
4. Under "Webhook fields", subscribe to **messages**.

## 6. Test it

1. Register a farmer in the app using one of your whitelisted test numbers.
2. The "Verify Your Phone" screen shows a button that opens WhatsApp with the code pre-filled — tap **Send**.
3. Meta delivers the message to your webhook, the server marks the phone verified, and the page auto-redirects you into the dashboard within a few seconds.

If `WHATSAPP_ACCESS_TOKEN` is still `xxxx` in `.env`, none of this is needed —
the dev-mode fallback (on-screen code + "Simulate Verification" button) keeps
everything fully testable in the meantime.
