import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null/undefined values for farmers who don't register with email
    lowercase: true,
    trim: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null/undefined values for admins who don't register with phone
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    maxlength: [128, 'Password cannot exceed 128 characters']
  },
  role: {
    type: String,
    enum: ['farmer', 'admin', 'superadmin'],
    required: true
  },
  // Only meaningful for admin/superadmin today — a suspended account is
  // rejected by the auth middleware even with a valid, unexpired JWT.
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpire: {
    type: Date,
    select: false
  },
  // Farmers verify via WhatsApp OTP instead of email (admins use email above).
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationOtp: {
    type: String,
    select: false
  },
  phoneVerificationExpire: {
    type: Date,
    select: false
  },
  // One-time token required by completePhoneVerification to prevent anyone
  // who merely knows a farmer's phone from obtaining a session token later.
  pendingVerificationToken: {
    type: String,
    select: false
  },
  pendingVerificationExpire: {
    type: Date,
    select: false
  },
  // 'whatsapp' or 'email' — set at registration, used by resend to re-deliver via the same channel.
  verificationChannel: {
    type: String,
    enum: ['whatsapp', 'email'],
    default: 'whatsapp'
  },
  // Tracks consecutive wrong OTP submissions. Reset on new OTP issue or
  // successful verification. OTP is invalidated after MAX_OTP_ATTEMPTS.
  otpAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  // Superadmin-only: real TOTP (RFC 6238) second factor, scanned into an
  // authenticator app once at first-login enrollment. Nothing below is
  // "live" until totpEnabled flips true in amsEnrollConfirm.
  totpEnabled: {
    type: Boolean,
    default: false
  },
  // AES-256-GCM encrypted, not hashed — verifying a live code requires the
  // actual secret, unlike a password which only ever needs a comparison.
  totpSecretEncrypted: {
    type: String,
    select: false
  },
  totpEnrolledAt: {
    type: Date
  },
  // Anti-replay: a login is only accepted if its matched RFC 6238 time step
  // is strictly greater than this. -1 means "never used yet" (sentinel, not
  // a valid step — must never be passed to otplib's afterTimeStep as-is).
  totpLastUsedStep: {
    type: Number,
    select: false,
    default: -1
  },
  // 10 single-use recovery codes, bcrypt-hashed, generated once at
  // enrollment and replaced wholesale on re-enrollment.
  totpBackupCodes: {
    type: [{
      codeHash: { type: String, required: true },
      usedAt: { type: Date, default: null }
    }],
    select: false,
    default: []
  },
  // Enrollment-in-progress state — separate from the committed fields above
  // so a half-finished or abandoned enrollment can never lock out the real
  // superadmin (totpEnabled only flips once a live code has been proven).
  totpPendingSecretEncrypted: {
    type: String,
    select: false
  },
  totpEnrollToken: {
    type: String,
    select: false
  },
  totpEnrollTokenExpire: {
    type: Date,
    select: false
  },
  // Re-enrollment (lost/new phone) on an already-active account — its own
  // token/state so it never overlaps first-time enrollment.
  totpReenrollToken: {
    type: String,
    select: false
  },
  totpReenrollTokenExpire: {
    type: Date,
    select: false
  },
  // Bumped whenever the password changes; any JWT issued before this
  // instant is rejected by the auth middleware even if it hasn't expired yet.
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
export default User;
