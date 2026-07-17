# AgriGuard Punjab — Presentation Guide

**Final Year Project | Web Application Modules**
Prepared for panel presentation — covers project overview, tech stack, architecture, code logic, design decisions, and expected questions.

---

## 1. What Is AgriGuard Punjab?

AgriGuard Punjab is a **hybrid AI + IoT crop disease detection web application** targeted at Pakistani farmers, specifically Punjab province. The long-term vision is a platform where:

- **Farmers** register, monitor real-time IoT sensor data (temperature, humidity, soil moisture), upload leaf images for AI disease diagnosis, and receive early risk alerts.
- **Admins** (agriculture officers) manage registered farmers, view system-wide sensor analytics, and generate reports.

The modules built and demonstrated in this phase are the **complete authentication system, dashboards, settings, and multilingual UI** — the foundation on which the AI and IoT modules will be layered.

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI component library — builds the entire user interface |
| React Router DOM | 7 | Client-side routing between pages |
| Vite | 8 | Build tool and dev server — replaces Create React App |
| Axios | 1.x | HTTP requests to the backend API |
| Lucide React | 1.x | Icon library (SVG icons as React components) |
| Plain CSS | — | All styling hand-written; no UI framework used |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 22 | JavaScript runtime for the server |
| Express.js | 4.x | Web framework — handles routing and middleware |
| MongoDB Atlas | Cloud | NoSQL database (hosted) |
| Mongoose | 8.x | MongoDB ODM — schema definition, validation, querying |
| JSON Web Token (JWT) | 9.x | Stateless authentication tokens |
| bcryptjs | 2.x | Password hashing |
| Helmet | 8.x | Sets secure HTTP response headers |
| express-rate-limit | 8.x | Rate limiting on auth endpoints |
| CORS | 2.x | Cross-origin request control |
| express-mongo-sanitize | 2.x | Strips NoSQL injection operators from request bodies |
| Nodemailer | 9.x | Sends OTP and reset-link emails via Gmail SMTP |
| Nodemon | 3.x | Auto-restarts server on file changes (dev only) |

### External Services

| Service | Purpose |
|---|---|
| MongoDB Atlas | Cloud-hosted database (free tier M0) |
| Green API | Outbound WhatsApp OTP delivery (free 200 msg/day, QR-scan based) |
| Gmail SMTP (App Password) | Email OTP and password reset emails |

### Dev Tools

| Tool | Purpose |
|---|---|
| Concurrently | Runs frontend (Vite) and backend (Node) in one terminal |
| Nodemon | Hot-reloads the Express server on save |

---

## 3. System Architecture

```
Browser (React SPA)
        │
        │  HTTP / REST JSON
        ▼
  Vite Dev Server  ──── proxies /api/* ──▶  Express (port 5000)
  (port 5173)                                    │
                                                  ├── Helmet (security headers)
                                                  ├── CORS (whitelist CLIENT_URL)
                                                  ├── express-mongo-sanitize
                                                  ├── Rate limiters (per route)
                                                  │
                                                  ├── /api/auth/*  ◀── authRoutes
                                                  └── /api/users/* ◀── userRoutes
                                                            │
                                                            ▼
                                                   Mongoose Models
                                                  ┌──────────────────┐
                                                  │  User             │
                                                  │  FarmerProfile    │
                                                  │  AdminProfile     │
                                                  │  PendingReg.      │
                                                  └──────────────────┘
                                                            │
                                                            ▼
                                                   MongoDB Atlas (cloud)

Side channels:
  Green API  ◀── sendWhatsAppOtp()   (OTP via WhatsApp)
  Gmail SMTP ◀── sendEmail()         (OTP / reset link via email)
```

**Pattern**: Standard REST API. The React app is a Single Page Application (SPA) — it loads once and React Router handles navigation client-side without full page reloads. All data comes from `/api` endpoints as JSON.

---

## 4. Database Design

### Collections

#### `users`
Stores all **verified** users (both roles).

| Field | Type | Notes |
|---|---|---|
| fullName | String | 2–50 chars, Unicode (Urdu/English) |
| email | String | sparse unique — farmers may omit it |
| phone | String | sparse unique — admins may omit it; stored as `03XXXXXXXXX` |
| password | String | bcrypt hash, never plain text |
| role | `farmer` / `admin` | |
| isEmailVerified | Boolean | Admin verification gate |
| isPhoneVerified | Boolean | Farmer verification gate |
| verificationChannel | `whatsapp` / `email` | Channel farmer chose at registration |
| otpAttempts | Number | Brute-force counter; select: false |
| phoneVerificationOtp | String | SHA-256 hashed OTP; select: false |
| pendingVerificationToken | String | SHA-256 hashed session token; select: false |
| resetPasswordToken | String | SHA-256 hashed reset token; select: false |
| passwordChangedAt | Date | Used to invalidate old JWTs |

#### `farmerprofiles`
One-to-one with `users` where role = farmer.

| Field | Type |
|---|---|
| user | ObjectId ref → User |
| province | String |
| district | String |
| farmArea | Number (acres) |

#### `adminprofiles`
One-to-one with `users` where role = admin.

| Field | Type |
|---|---|
| user | ObjectId ref → User |
| accessCode | String (invite code required to register) |

#### `pendingregistrations`
Temporary holding collection — exists **only until OTP is verified**.

| Field | Notes |
|---|---|
| All farmer fields | fullName, phone, email, password (hashed), province, district, farmArea |
| OTP / token fields | same structure as User |
| TTL index | MongoDB auto-deletes after 30 min (background cleanup) |

> Key design decision: real `User` records are only created after OTP verification. Unverified registrations live in `PendingRegistration` and never pollute the `users` collection.

---

## 5. Modules Built

### Auth System (fully functional)

| Screen / Endpoint | What it does |
|---|---|
| Role Selection | Entry screen — choose Admin or Farmer registration |
| Farmer Registration | Collects all farmer data, lets user choose WhatsApp or Email OTP, creates `PendingRegistration` |
| Admin Registration | Collects admin data + access code, creates `User` directly, sends email verification link |
| Login | Phone or email + password; role-aware redirect |
| Phone Verification Pending | OTP input screen — 6-digit code, resend button, 5-attempt lockout |
| Email Verification Pending | Waiting screen for admin email link |
| Forgot Password | Step 1: choose WhatsApp (OTP) or Email (reset link). Step 2: enter identifier. Step 3a: enter OTP. Step 3b: email link sent |
| Reset Password | New password + confirm, consumes token |
| Settings | Profile update (phone locked for farmers), password change with auto-logout |

### Dashboards (UI scaffold)

| Screen | Contents |
|---|---|
| Farmer Dashboard | IoT sensor readings (temperature, humidity, soil moisture), early risk alerts, image upload panel, activity log — all wired to real UI, data currently mocked/static |
| Admin Dashboard | Farmer management table, disease statistics by sector, filter/pagination — UI complete, data currently static |

### System-Wide Features

| Feature | Detail |
|---|---|
| Multilingual (i18n) | English and Urdu. Full translation of all UI strings. Switching activates RTL layout automatically via `rtl-mode` CSS class on `<body>` |
| Urdu Virtual Keyboard | Floating Urdu character keyboard on name fields when Urdu mode is active |
| Session Management | `Remember Me` stores token in `localStorage`; without it, `sessionStorage` (cleared on tab close) |
| Auto-logout on 401 | `authEvents` EventTarget — any 401 on an authenticated request fires a global event, `SessionWatcher` catches it, logs the user out, and shows a toast |
| Toast notifications | Global `ToastContext` — shows success/error/info banners without blocking UI |
| Protected Routes | `ProtectedRoute` component checks JWT + role before rendering admin or farmer routes |

---

## 6. Authentication Flow — Code Logic

### 6.1 Farmer Registration (Pending Registration Pattern)

```
User fills form → clicks Register
        │
        ▼
Frontend validates (phone format, email format, password strength, Unicode name)
        │
        ▼
POST /api/auth/register/farmer  { fullName, phone, email, ..., verificationChannel }
        │
        ▼
Backend:
  1. Validate all fields (isValidName, normalizePhone, isValidEmail, isStrongPassword)
  2. Check User collection for existing verified account with same phone/email → 400 if found
  3. Delete any existing PendingRegistration for same phone/email (allows clean re-register)
  4. Hash password with bcrypt (10 salt rounds)
  5. Create PendingRegistration document
  6. Call issueOtp(pending, channel):
       - Generate 6-digit OTP (crypto.randomInt)
       - SHA-256 hash the OTP → store in pending.phoneVerificationOtp
       - Generate 32-byte random pendingToken → SHA-256 hash → store in pending.pendingVerificationToken
       - Reset otpAttempts = 0
       - If channel='email': send via Gmail SMTP
       - If channel='whatsapp': send via Green API (phone: 03XX → 923XX@c.us)
  7. Return: { phone, channel, pendingToken, devOtp? }
        │
        ▼
Frontend navigates to /verify-phone-pending with { phone, channel, pendingToken }
```

### 6.2 OTP Verification (Promoting Pending → Real User)

```
User types 6-digit OTP → clicks Verify
        │
        ▼
POST /api/auth/complete-phone-verification  { phone, otp, pendingToken }
        │
        ▼
Backend:
  1. Find PendingRegistration by normalizedPhone (with +select for hidden fields)
  2. Hash received pendingToken → compare to stored hash (session binding check)
  3. Check pendingVerificationExpire > now (15-min window)
  4. Check otpAttempts < MAX_OTP_ATTEMPTS (5)
  5. Hash received OTP → compare to stored hash + check expire
  6. On wrong OTP: increment otpAttempts, return remaining count
  7. On correct OTP:
       - Start MongoDB session/transaction
       - Create User ({ ...pending fields, isPhoneVerified: true })
       - Create FarmerProfile ({ user, province, district, farmArea })
       - Commit transaction
       - Delete PendingRegistration
       - Issue JWT → return token + user object
        │
        ▼
Frontend stores token (localStorage or sessionStorage), navigates to /farmer
```

**Why the pendingToken?** — Without it, anyone who knows a farmer's phone number could poll `/complete-phone-verification` with guessed OTPs. The pendingToken binds verification to the specific browser tab that initiated registration.

### 6.3 JWT Authentication Middleware

Every protected route passes through `protect` middleware:

```
Request arrives with: Authorization: Bearer <token>
        │
        ▼
jwt.verify(token, JWT_SECRET)  →  decoded { id, role, iat }
        │
        ▼
User.findById(decoded.id)  →  full user document
        │
        ▼
Check passwordChangedAt > decoded.iat  →  401 if token issued before last password change
        │
        ▼
Check isEmailVerified (admin) / isPhoneVerified (farmer)  →  403 if not verified
        │
        ▼
req.user = user → next()
```

Password change immediately invalidates all existing sessions — no token blacklist needed, because the check is embedded in every request.

### 6.4 Forgot Password — Two Paths

```
User chooses method:
  WhatsApp path:                          Email path:
  Enter phone number                      Enter email address
        │                                       │
  POST /forgot-password                   POST /forgot-password
  (phone → OTP via Green API)            (email → reset link via Gmail)
        │                                       │
  POST /verify-forgot-otp                User clicks link in email
  { phone, otp, pendingToken }          GET /reset-password/:token (frontend)
        │                                       │
  Returns { resetToken }                POST /reset-password/:token
        │                               { newPassword }
  Navigate to /reset-password/:token
```

Both paths converge at the same ResetPassword screen.

---

## 7. Security Measures

| Layer | Measure | Why |
|---|---|---|
| HTTP | Helmet sets 11 security headers | Prevents clickjacking, MIME sniffing, XSS via headers |
| HTTP | CORS whitelist (CLIENT_URL only) | Blocks requests from other origins |
| Transport | JSON body limit 50 KB | Memory exhaustion prevention |
| Input | mongoSanitize strips `$` and `.` keys | Prevents NoSQL injection (`{ $gt: "" }` attacks) |
| Input | Per-field validators in every controller | Type guards before any DB query |
| Input | Unicode name regex `/^[\p{L}\s\-']+$/u` | Accepts Urdu/any script, rejects code injection |
| Rate Limits | Per-endpoint rate limiters | Login: 10/15min. Register: 20/hour. OTP: 10/15min. Forgot: 5/hour |
| Passwords | bcrypt 10 rounds | ~100ms hash — makes brute-force computationally expensive |
| Passwords | Strong password regex | Min 8 chars, uppercase, lowercase, digit, special char |
| OTP | SHA-256 hash stored, plain OTP never in DB | Even a DB breach doesn't reveal valid OTPs |
| OTP | 5-attempt lockout | Brute force on 6-digit space (1M possibilities) blocked |
| OTP | 10-minute expiry | Short window limits attack surface |
| Session | pendingToken (session binding) | Binds OTP verification to the registering browser tab |
| JWT | `passwordChangedAt` check | Password change immediately expires all existing sessions |
| JWT | Fail-fast on missing JWT_SECRET | Server refuses to start without a real secret |
| Secrets | `.env` gitignored | Credentials never committed to source control |
| Roles | `restrictTo(...roles)` middleware | Enforces role-based access on every protected endpoint |

---

## 8. Why This Stack? Alternatives Considered

### React vs Angular vs Vue

| | React | Angular | Vue |
|---|---|---|---|
| Learning curve | Medium | High | Low |
| Ecosystem | Largest | Large | Medium |
| Used by | Meta, Netflix, Airbnb | Google, enterprise | Alibaba, small teams |
| FYP suitability | Best — most tutorials, most jobs | Overkill for FYP | Good but smaller ecosystem |

**Chose React** because team familiarity, largest community, and most relevant for Pakistan's job market.

### Vite vs Create React App (CRA)

CRA is deprecated as of 2023. Vite uses native ES modules — cold start in ~300ms vs CRA's 10–30 seconds. No contest.

### MongoDB vs PostgreSQL vs MySQL

| | MongoDB | PostgreSQL | MySQL |
|---|---|---|---|
| Schema | Flexible (document) | Rigid (relational) | Rigid (relational) |
| IoT data fit | Excellent — variable sensor structures | Needs ALTER TABLE for schema changes | Same |
| Free cloud tier | Atlas M0 (512 MB) | Supabase (500 MB) | PlanetScale (5 GB, discontinued free tier) |
| Pakistan hosting | Atlas has Singapore cluster (low latency) | Supabase has same | Varies |

**Chose MongoDB** because IoT sensor data has variable structure (different sensors send different fields), and MongoDB Atlas offers a free tier that is genuinely free without credit card.

### JWT vs Session-Cookie Auth

| | JWT | Sessions |
|---|---|---|
| Server storage | None (stateless) | Redis/DB required |
| Scalability | Horizontal scaling trivial | Sticky sessions or shared Redis |
| Logout | Cannot truly invalidate (mitigated by `passwordChangedAt`) | Instant by deleting session |
| FYP suitability | Perfect — no Redis setup required | Overkill for FYP scale |

**Chose JWT** — stateless, no extra infrastructure, standard for REST APIs.

### Express vs NestJS vs Fastify

NestJS adds TypeScript decorators, dependency injection, and heavy boilerplate — great for large teams, unnecessary complexity for a 2-person FYP. Fastify is faster but smaller community. Express has the most tutorials and is industry standard for Node.js REST APIs.

### Green API vs Meta WhatsApp Business API vs Twilio

| | Green API | Meta Cloud API | Twilio |
|---|---|---|---|
| Business verification | No (QR scan personal WhatsApp) | Yes (takes weeks, needs a business) | No |
| Cost | Free 200 msg/day | Free tier + per message | $0.005/msg |
| Setup time | 15 minutes | Weeks | Hours |
| FYP suitability | Perfect | Impossible without registered business | Costs money |

**Chose Green API** — only viable zero-budget option for WhatsApp that works immediately.

### No CSS Framework (vs Tailwind vs Bootstrap)

We wrote all CSS from scratch to demonstrate understanding of the fundamentals. No utility-class bloat, full control over design, and nothing hidden behind a framework abstraction.

---

## 9. Key Design Patterns in the Code

### Context API (React global state)

Three contexts manage global state:
- `AuthContext` — token + user object, login/logout/updateUser functions
- `LanguageContext` — current language, translation object `t`, `isRtl` flag
- `ToastContext` — global notification system

Any component deep in the tree can call `useAuth()` or `useLanguage()` without prop drilling.

### Axios Interceptors

`axiosClient` has two interceptors:
1. **Request interceptor** — automatically attaches `Authorization: Bearer <token>` to every request. No need to pass the token manually in each API call.
2. **Response interceptor** — if any authenticated request returns 401, fires a global `authEvents` custom event. `SessionWatcher` (mounted in App.jsx) catches it, logs the user out, and redirects to login. This handles token expiry silently anywhere in the app.

### Mongoose `select: false`

Sensitive fields (OTP hashes, token hashes, password, attempt counters) have `select: false` in the schema. This means they are **never included** in query results by default. To read them, you must explicitly call `.select('+fieldName')`. This prevents accidentally leaking sensitive data in API responses.

### Pending Registration Pattern

The core idea: never put a user in the `users` collection until they prove they own the phone/email. This solves the "zombie account" problem — a user who starts registration and never verifies can never block anyone else from registering with the same contact details. MongoDB TTL index auto-cleans abandoned pending records after 30 minutes.

---

## 10. What Is Coming Next (Planned Modules)

These modules are scaffolded (sidebar links exist, `ComingSoon` placeholder renders) but not yet implemented:

- **AI Diagnostics** — upload leaf photo → CNN model (likely ResNet or EfficientNet) → disease diagnosis + confidence score
- **IoT Sensors** — real-time sensor dashboard connected to hardware (Arduino/Raspberry Pi + DHT22, soil moisture sensor)
- **Alerts** — push notifications when sensor readings cross disease risk thresholds
- **Reports** — PDF generation of farm health history
- **Admin System Analytics** — aggregate disease maps, regional risk heatmaps
- **Global Sensors** — admin view of all sensor nodes across regions

---

## 11. Panel Questions — Preparation

### General / Project Understanding

**Q: What problem does AgriGuard Punjab solve?**
> Pakistani farmers, especially in Punjab, lack early warning systems for crop diseases. By combining IoT sensor monitoring (humidity, temperature, soil moisture) and AI image recognition, farmers get alerts before diseases spread — reducing crop loss. The web platform connects farmers with agriculture officers for oversight.

**Q: What is the scope of what you have built for this demonstration?**
> We have built the complete authentication system (registration, OTP verification, login, forgot password, password reset), role-based access control for two user roles (admin/farmer), the dashboard shells with real UI for both roles, profile settings, and a bilingual (English/Urdu) interface with RTL support.

**Q: Why a web app and not a mobile app?**
> A web app is accessible on any device with a browser — smartphones, tablets, computers — without requiring app store approval or installation. Pakistan has high mobile browser penetration. A Progressive Web App (PWA) upgrade can add offline capability later without rebuilding.

---

### Tech Stack Questions

**Q: Why did you use React instead of Angular or Vue?**
> React has the largest ecosystem and community. It's the most in-demand frontend technology in Pakistan's job market. Its component-based model maps naturally to our UI — reusable cards, forms, and dashboard sections. Angular adds TypeScript and dependency injection which is overkill for a two-developer FYP. Vue is simpler but smaller ecosystem.

**Q: Why MongoDB over a relational database like MySQL?**
> IoT sensor data is schema-variable — different hardware sends different fields. MongoDB's flexible document model handles this without ALTER TABLE migrations. MongoDB Atlas provides a genuinely free cloud-hosted tier. For the relational data we do have (User → FarmerProfile), Mongoose handles the relationship via ObjectId references and population.

**Q: What is JWT and why did you use it instead of sessions?**
> JSON Web Token is a self-contained signed token. The server encodes user ID and role into it, signs it with a secret key, and sends it to the client. On every request, the client sends the token back. The server verifies the signature — no database lookup needed to validate the session. This means no session storage (Redis, database) is required, the server is completely stateless, and it scales horizontally. We mitigate JWT's logout weakness (cannot invalidate individual tokens) by storing `passwordChangedAt` and rejecting any token issued before the last password change.

**Q: How does your OTP work? Walk us through it.**
> When a farmer registers, we generate a 6-digit OTP using `crypto.randomInt` (cryptographically secure). We immediately SHA-256 hash it and store the hash — the plain OTP is never in the database. Simultaneously we generate a 32-byte random session token (pendingToken), hash that too, and store it alongside the OTP hash. The plain OTP is sent to the farmer's WhatsApp via Green API or email via Gmail. The pendingToken is returned to the browser. When the farmer submits the OTP, we hash it and compare to the stored hash, and verify the pendingToken matches too. This two-factor check (OTP + session token) means random internet requests cannot brute-force someone else's OTP.

**Q: Why store a hash of the OTP rather than the OTP itself?**
> If an attacker reads the database (SQL/NoSQL injection, misconfigured Atlas permissions), they would find hashed values. You cannot reverse a SHA-256 hash to get the original 6-digit OTP. The same principle as storing hashed passwords — defense in depth.

**Q: What is the Pending Registration pattern and why did you implement it?**
> Without it, a `User` record is created the moment someone hits Register, before they verify their phone. If they never verify, that record sits in the database permanently — blocking anyone else from registering with the same phone number. We call these "zombie users." Instead, we store the incomplete registration in a separate `PendingRegistration` collection with a MongoDB TTL index (auto-delete after 30 minutes). The real `User` is only created inside a database transaction the moment the OTP is verified successfully. If they abandon the flow and come back later, the re-registration silently cleans up the old pending record.

---

### Security Questions

**Q: How do you prevent someone from sending millions of requests to your login endpoint (brute force)?**
> `express-rate-limit` middleware on the login route allows a maximum of 10 attempts per IP in 15 minutes. On the OTP endpoint: 10 attempts per 15 minutes. On forgot-password: 5 attempts per hour. Additionally, OTP verification has an application-level counter — after 5 wrong OTP attempts, the session is locked regardless of IP.

**Q: What is NoSQL injection and how do you prevent it?**
> In MongoDB, an attacker can send `{ "$gt": "" }` as a username to match all documents. `express-mongo-sanitize` middleware strips any key starting with `$` or containing `.` from the request body before it reaches any controller. Additionally, every controller validates field types before building queries — we never construct queries directly from raw request body.

**Q: How do you protect sensitive fields in the database?**
> Mongoose `select: false` on fields like `phoneVerificationOtp`, `pendingVerificationToken`, `password`, `otpAttempts`. These fields are excluded from all query results unless the developer explicitly requests them with `.select('+fieldName')`. This means even if a controller accidentally returns `user` as JSON, the sensitive fields are not in the object.

**Q: How does your password reset work? Can someone reset another person's password?**
> The server generates a 32-byte cryptographically random token, stores its SHA-256 hash in the database with a 30-minute expiry, and sends the plain token in the reset link or returns it after OTP verification. An attacker guessing reset tokens has to guess 32 bytes (256^32 possibilities) within 30 minutes — computationally impossible. After use, the token is deleted from the database (one-time use).

**Q: What HTTP security headers does your server set?**
> Helmet sets: `X-Content-Type-Options: nosniff` (no MIME sniffing), `X-Frame-Options: DENY` (no clickjacking), `Strict-Transport-Security` (force HTTPS), `X-XSS-Protection`, `Referrer-Policy`, and Content Security Policy defaults. These are automatically handled by the Helmet package.

---

### Architecture / Design Questions

**Q: How does the frontend communicate with the backend?**
> The React app makes HTTP requests to `/api/*` paths using Axios. During development, Vite's dev server proxies `/api` requests to `localhost:5000` (Express). The Axios client has interceptors that automatically attach the JWT Bearer token to every request header, and automatically log the user out if any authenticated request returns 401.

**Q: How do you handle multiple languages and RTL layout?**
> A `LanguageContext` React context holds the current language (`English` or `Urdu`). All UI strings are stored in a `translations.js` file — an object with `English` and `Urdu` keys. Components access the string via `const { t } = useLanguage()` and use `t.buttonLabel` etc. When Urdu is selected, a `useEffect` in `LanguageContext` adds the class `rtl-mode` to `<body>`. CSS rules under `.rtl-mode` flip the layout direction (`direction: rtl`), reverse icon orientations, and switch font families to Noto Nastaliq Urdu.

**Q: How does `ProtectedRoute` work?**
> It's a wrapper component that reads the current user from `AuthContext`. If no token exists, it redirects to `/login`. If the user's role doesn't match the required role for that route (e.g., a farmer trying to reach `/admin`), it redirects them to their own dashboard. Otherwise it renders the protected page.

**Q: What is a Mongoose TTL index?**
> TTL stands for Time To Live. MongoDB's TTL index is a special index on a `Date` field. MongoDB runs a background thread every 60 seconds that deletes any document where the indexed date + `expireAfterSeconds` is in the past. We use this on `PendingRegistration.createdAt` with `expireAfterSeconds: 1800` to automatically purge abandoned registrations after 30 minutes without any cron job or scheduled task.

**Q: How does the "Remember Me" checkbox work?**
> If checked, the JWT and user object are saved in `localStorage` (persists across browser restarts). If unchecked, they go into `sessionStorage` (cleared when the tab/window closes). The `AuthContext` reads from both on startup. On login, it writes to one and clears the other.

---

### Code-Level Questions

**Q: Why does `sendEmail.js` create the transporter lazily (inside a function)?**
> Node.js ES modules hoist all `import` statements and execute them before the module body runs. This means if `sendEmail.js` created `nodemailer.createTransport(process.env.EMAIL_APP_PASSWORD)` at the top level, it would run before `dotenv.config()` in `server.js` had a chance to load the environment variables. `process.env.EMAIL_APP_PASSWORD` would be `undefined`. By moving transporter creation into a `getTransporter()` function that's called on first use, we guarantee `dotenv` has already loaded.

**Q: Why do you hash the OTP instead of encrypting it?**
> Encryption is reversible — you can decrypt back to the original. A hash is one-way — you cannot reverse it. For verification, we don't need to recover the original OTP. We hash what the user submits and compare it to the stored hash. Hashing is the right tool because we only need to verify equality, not recover the value.

**Q: What happens if two farmers register with the same phone number at the exact same millisecond?**
> The `phone` field in `PendingRegistration` has a unique index. The second insert will fail with a MongoDB duplicate key error (code 11000). Both the `registerFarmer` and `completePhoneVerification` controllers catch error code 11000 and return a 400 with a clear message. The `deleteMany` of old pending records and the `create` of the new one are not atomic, so a race condition is theoretically possible — but the unique index is the final safety net.

**Q: Why do you use a MongoDB transaction in `completePhoneVerification`?**
> Creating a `User` and a `FarmerProfile` are two separate database writes. If the first succeeds but the second fails (e.g., network error, validation failure), we would have a `User` with no profile. The application would break for that user. A Mongoose session with `withTransaction` wraps both writes in an atomic operation — either both commit or both roll back.

---

*End of Guide*
