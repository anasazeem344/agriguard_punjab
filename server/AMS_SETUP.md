# AMS (Admin Management System) Setup

AMS is the superadmin-only console that replaces the old self-service admin
registration flow. There is normally exactly one superadmin account, created
once via a manual seed script — there is no public sign-up for it.

Login is protected by a real TOTP authenticator (Google Authenticator / Authy
/ Microsoft Authenticator / etc.) — free, no third-party service, scanned
into the app **once** at first login. Every login after that just needs the
password plus the live 6-digit code already on the phone.

## 1. Add to server/.env

```
SUPERADMIN_EMAIL=you@agriguard.gov.pk
SUPERADMIN_PASSWORD=ChooseAStrongPassword1!
TOTP_ENCRYPTION_KEY=<64 hex characters — see below>
```

- `SUPERADMIN_PASSWORD` must be strong (8+ chars, uppercase, lowercase, number, special char) — same rule as every other account in the app.
- `TOTP_ENCRYPTION_KEY` encrypts the TOTP secret at rest. Generate one with:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  The server refuses to start without a valid one. This key is separate from
  `JWT_SECRET` — treat it the same way (never commit it, never share it).

## 2. Run the seed script

```
node server/scripts/seedSuperadmin.js
```

This requires a live `MONGO_URI` (mock-mode is not supported here, since it
needs a real persisted account). It refuses to run if a superadmin already
exists, so it's safe even if you run it twice by accident.

## 3. First login — authenticator enrollment (one-time)

Go to `/ams/login` and sign in with the email and password from step 1. The
first time, no code is asked for yet — instead you're taken to a one-time
enrollment screen:

1. Scan the QR code with your authenticator app (Google Authenticator, Authy,
   Microsoft Authenticator, 1Password, etc.), or enter the shown key manually.
2. Enter the current 6-digit code to confirm the scan worked.
3. You'll see **10 backup codes once** — save them somewhere safe (a password
   manager, printed and locked away). They're the only way back in if you
   lose the phone, and each one works exactly once. They are never shown
   again after this screen.

From then on, every login is just email + password + whatever 6-digit code
is currently on your phone — no rescanning, ever.

## 4. Lost your phone? (re-enrollment)

From within AMS (once logged in), re-enrollment requires your password
**and** a currently-valid code (from the app or a saved backup code) before
a new QR is issued — this stops a merely-stolen login session from silently
swapping out your 2FA. All 10 backup codes are replaced when you confirm a
new device.

**If both the phone and every backup code are gone**, there's no
self-service recovery — by design, the same reasoning as not offering an
email/SMS reset for this account. Recovery is a one-time manual step: in
MongoDB, on the superadmin's `User` document, clear `totpEnabled` (set to
`false`), `totpSecretEncrypted`, and `totpBackupCodes` (set to `[]`). The
next login at `/ams/login` will route back into first-time enrollment.

## How it works

1. The regular `/register/admin` self-service flow and its shared access
   code have been removed entirely — admins are now invited through AMS's
   Manage Admins screen (`POST /api/ams/admins/invite`), which emails a
   7-day activation link. The invited person sets their own password to
   activate the account; there is no other way to create an admin.
2. AMS login (`POST /api/ams/login`) is a separate endpoint from the regular
   `/api/auth/login`, with its own stricter rate limit, since this is the
   highest-value account in the system. The same rate limit covers password
   guesses, TOTP code guesses, and backup-code guesses — there's no separate
   unauthenticated surface to brute-force codes against.
3. TOTP codes can't be replayed: a code is only accepted if its time step is
   strictly newer than the last one that was accepted, enforced atomically
   against the database.
4. Every successful login, enrollment, and re-enrollment is written to an
   audit log, visible on the AMS Overview screen.
