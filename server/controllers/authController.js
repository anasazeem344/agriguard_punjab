import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import FarmerProfile from '../models/FarmerProfile.js';
import AdminProfile from '../models/AdminProfile.js';
import PendingRegistration from '../models/PendingRegistration.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/sendEmail.js';
import { isDbReady } from '../config/db.js';
import { isNonEmptyString, isValidEmail, normalizePhone, isPositiveNumber, isValidName, isStrongPassword } from '../utils/validators.js';
import { issueVerificationEmail } from '../utils/verificationEmail.js';
import { issueOtp, matchesOtp, MAX_OTP_ATTEMPTS } from '../utils/phoneVerification.js';
import { verifyAndConsumeCode } from '../utils/totpAuth.js';
import { issueEnrollToken } from './amsController.js';
import AuditLog from '../models/AuditLog.js';

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const dbUnavailableResponse = (res) =>
  res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' });

// @desc    Register Farmer
// @route   POST /api/auth/register/farmer
// @access  Public
export const registerFarmer = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { fullName, phone, email, province, district, farmArea, password, verificationChannel, adminCode } = req.body;
    const channel = verificationChannel === 'email' ? 'email' : 'whatsapp';

    const normalizedPhone = normalizePhone(phone);
    if (!isValidName(fullName) || !normalizedPhone || !isValidEmail(email) || !isNonEmptyString(province) ||
      !isNonEmptyString(district) || !isPositiveNumber(farmArea) || !isStrongPassword(password) || !isNonEmptyString(adminCode)) {
      return res.status(400).json({ message: 'All fields are required. Password must be strong (8+ chars, uppercase, lowercase, number, special char).' });
    }

    // The admin code links this farmer to a specific admin — no match (wrong
    // code, or that admin suspended/removed) gets one generic message, same
    // information-hiding shape used for login errors elsewhere.
    const adminProfile = await AdminProfile.findOne({ linkCode: adminCode.trim().toUpperCase() });
    const linkedAdminUser = adminProfile
      ? await User.findOne({ _id: adminProfile.user, role: 'admin', status: 'active' })
      : null;
    if (!linkedAdminUser) {
      return res.status(400).json({ message: 'Invalid admin code. Please check with your admin and try again.' });
    }

    // Reject if a fully-verified account already holds this phone or email.
    const verifiedByPhone = await User.findOne({ phone: normalizedPhone });
    if (verifiedByPhone) {
      return res.status(400).json({ message: 'An account with this phone number already exists' });
    }
    const verifiedByEmail = await User.findOne({ email: email.toLowerCase() });
    if (verifiedByEmail) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Remove any previous incomplete registration for the same phone or email
    // so the user can start fresh without hitting a duplicate-key error.
    await PendingRegistration.deleteMany({
      $or: [{ phone: normalizedPhone }, { email: email.toLowerCase() }]
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const pending = await PendingRegistration.create({
      fullName,
      phone: normalizedPhone,
      email: email.toLowerCase(),
      password: hashedPassword,
      province,
      district,
      farmArea: Number(farmArea),
      linkedAdmin: linkedAdminUser._id
    });

    const { otp, pendingToken } = await issueOtp(pending, channel);

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: `Please enter the OTP sent to your ${channel === 'email' ? 'email' : 'WhatsApp'} to activate your account.`,
      phone: pending.phone,
      channel,
      pendingToken,
      ...(otp !== null && { devOtp: otp })
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account with this phone number or email already exists' });
    }
    console.error('Error in registerFarmer:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Login (Admin via email, Farmer via phone or email)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { identifier, password } = req.body;

    if (!isNonEmptyString(identifier) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: 'Phone/email and password are required' });
    }

    const isEmail = identifier.includes('@');
    const normalizedId = isEmail ? identifier.toLowerCase() : (normalizePhone(identifier) || identifier);
    const query = isEmail ? { email: normalizedId } : { phone: normalizedId };
    const user = await User.findOne(query).select('+totpSecretEncrypted +totpBackupCodes +totpLastUsedStep');

    if (!user) {
      // Check if a pending (unverified) registration exists for this identifier.
      const pending = await PendingRegistration.findOne(query);
      if (pending) {
        return res.status(403).json({
          message: 'Your registration is not yet verified. Please complete phone verification.',
          requiresVerification: true,
          verificationChannel: 'phone',
          otpChannel: pending.verificationChannel || 'whatsapp',
          phone: pending.phone
        });
      }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Superadmin accounts never authenticate here — this endpoint has no
    // TOTP step, so letting it through would bypass 2FA entirely. Only
    // reachable after a correct password match, so this doesn't leak
    // anything beyond what the submitter already proved they know.
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'Superadmin accounts must log in at /ams/login.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended.' });
    }

    if (user.role === 'admin' && !user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        verificationChannel: 'email',
        email: user.email
      });
    }

    if (user.role === 'farmer' && !user.isPhoneVerified) {
      return res.status(403).json({
        message: 'Please verify your account before logging in.',
        requiresVerification: true,
        verificationChannel: 'phone',
        otpChannel: user.verificationChannel || 'whatsapp',
        phone: user.phone
      });
    }

    // New admins are TOTP-enrolled during invite acceptance (see
    // amsInviteAcceptConfirm), but an admin created before that existed has
    // no secret yet — route them into the same enrollment amsLogin uses for
    // superadmin's first login, rather than locking them out.
    let totpVia = null;
    if (user.role === 'admin' && !user.totpEnabled) {
      const enrollToken = await issueEnrollToken(user);
      return res.status(200).json({ success: true, phase: 'enroll', identifier: user.email, enrollToken });
    }
    if (user.role === 'admin') {
      const { code } = req.body;
      if (!isNonEmptyString(code)) {
        return res.status(200).json({ success: true, phase: 'totp' });
      }
      const { consumed, via } = await verifyAndConsumeCode(user, code);
      if (!consumed) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      totpVia = via;
    }

    const token = generateToken(user._id, user.role);

    if (user.role === 'admin') {
      await AuditLog.create({
        actorId: user._id,
        actorName: user.fullName,
        kind: totpVia === 'backup' ? 'admin_login_backup_code_used' : 'admin_login'
      });
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error in loginUser:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Verify an account's email using the token from the verification email
// @route   POST /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { token } = req.params;
    if (!isNonEmptyString(token)) {
      return res.status(400).json({ message: 'This verification link is invalid or has expired' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpire');

    if (!user) {
      return res.status(400).json({ message: 'This verification link is invalid or has expired' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // Verifying ownership of the email is sufficient proof of identity here,
    // so log the user straight in rather than making them sign in again.
    const token2 = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      token: token2,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error in verifyEmail:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Resend the email-verification link for an unverified account
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
  const genericMessage = 'If an unverified account matches that phone/email, a new verification link has been sent.';
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { identifier } = req.body;
    if (!isNonEmptyString(identifier)) {
      return res.status(400).json({ message: 'Phone or email is required' });
    }

    const isEmail = identifier.includes('@');
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) || identifier };
    const user = await User.findOne(query);

    // Respond identically regardless of whether the account exists or is
    // already verified (avoids leaking account existence/state). Email
    // verification only applies to admins - farmers verify via phone OTP.
    if (!user || user.role !== 'admin' || user.isEmailVerified) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const { mocked, verifyUrl } = await issueVerificationEmail(user);

    res.status(200).json({
      success: true,
      message: genericMessage,
      ...(mocked && { devVerificationUrl: verifyUrl })
    });
  } catch (error) {
    console.error('Error in resendVerification:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Request a password reset link (accepts email or phone number)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const genericMessage = 'If an account matching that identifier exists, a password reset link has been sent to the associated email.';
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { identifier } = req.body;
    if (!isNonEmptyString(identifier)) {
      return res.status(400).json({ message: 'Please enter your email address or phone number' });
    }

    // Accept email or Pakistani phone number — find user by whichever was provided.
    const isEmail = identifier.includes('@');
    let query;
    if (isEmail) {
      if (!isValidEmail(identifier)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }
      query = { email: identifier.toLowerCase() };
    } else {
      const normalizedPhone = normalizePhone(identifier);
      if (!normalizedPhone) {
        return res.status(400).json({ message: 'Please enter a valid email address or Pakistani mobile number' });
      }
      query = { phone: normalizedPhone };
    }

    const user = await User.findOne(query);

    // Phone path: send OTP via WhatsApp instead of an email link.
    if (!isEmail) {
      // Respond identically for non-existent / unverified accounts to avoid enumeration.
      if (!user || !user.isPhoneVerified) {
        return res.status(200).json({ success: true, message: genericMessage });
      }
      const { otp, pendingToken } = await issueOtp(user, 'whatsapp');
      return res.status(200).json({
        success: true,
        channel: 'whatsapp',
        message: 'A verification code has been sent to your WhatsApp number.',
        phone: user.phone,
        pendingToken,
        ...(otp !== null && { devOtp: otp })
      });
    }

    // Email path: send reset link. Superadmin is deliberately excluded —
    // by design there is no self-service password recovery for that
    // account via any path outside AMS itself (see server/AMS_SETUP.md).
    // Treated identically to a non-existent account, same generic message,
    // so this doesn't become a way to confirm the superadmin's email either.
    if (!user || !user.email || user.role === 'superadmin') {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;

    const { mocked } = await sendEmail({
      to: user.email,
      subject: 'AgriGuard Punjab - Password Reset',
      html: `<p>Hello ${user.fullName},</p>
             <p>You requested a password reset. Click the link below to set a new password (valid for 30 minutes):</p>
             <p><a href="${resetUrl}">${resetUrl}</a></p>
             <p>If you did not request this, you can safely ignore this email.</p>`
    });

    res.status(200).json({
      success: true,
      message: genericMessage,
      ...(mocked && { devResetUrl: resetUrl })
    });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Reset password using the token emailed to the user
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { token } = req.params;
    const { password } = req.body;

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&)' });
    }
    if (!isNonEmptyString(token)) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Farmer submits the OTP they received on WhatsApp. Validates the OTP
//          and the pending-session token, then marks the phone verified and
//          issues a JWT in one step — no polling or webhook required.
// @route   POST /api/auth/complete-phone-verification
// @access  Public
export const completePhoneVerification = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const normalizedPhone = normalizePhone(req.body.phone);
    const { otp, pendingToken } = req.body;
    if (!normalizedPhone || !isNonEmptyString(otp) || !isNonEmptyString(pendingToken)) {
      return res.status(400).json({ message: 'Phone number, OTP, and session token are required' });
    }

    const pending = await PendingRegistration.findOne({ phone: normalizedPhone })
      .select('+phoneVerificationOtp +phoneVerificationExpire +pendingVerificationToken +pendingVerificationExpire +otpAttempts +password');

    if (!pending) {
      return res.status(400).json({ message: 'No pending registration found. Please register again.' });
    }

    const hashedPendingToken = crypto.createHash('sha256').update(pendingToken).digest('hex');
    const tokenValid =
      pending.pendingVerificationToken === hashedPendingToken &&
      pending.pendingVerificationExpire &&
      pending.pendingVerificationExpire > Date.now();

    if (!tokenValid) {
      return res.status(400).json({
        message: 'This verification session has expired. Please register again.'
      });
    }

    if ((pending.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({ message: 'Too many incorrect attempts. Please register again.' });
    }

    if (!matchesOtp(pending, otp)) {
      pending.otpAttempts = (pending.otpAttempts || 0) + 1;
      await pending.save();
      const remaining = MAX_OTP_ATTEMPTS - pending.otpAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please register again.'
      });
    }

    // OTP correct — promote the pending record into a real verified user.
    const session = await mongoose.startSession();
    let user;
    try {
      await session.withTransaction(async () => {
        user = await User.create([{
          fullName:        pending.fullName,
          phone:           pending.phone,
          email:           pending.email,
          password:        pending.password,
          role:            'farmer',
          isPhoneVerified: true
        }], { session }).then(docs => docs[0]);

        await FarmerProfile.create([{
          user:     user._id,
          province: pending.province,
          district: pending.district,
          farmArea: pending.farmArea,
          linkedAdmin: pending.linkedAdmin
        }], { session });
      });
    } finally {
      await session.endSession();
    }

    await PendingRegistration.deleteOne({ _id: pending._id });

    const token = generateToken(user._id, user.role);
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account already exists with this phone or email. Please log in.' });
    }
    console.error('Error in completePhoneVerification:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Regenerate a farmer's phone-verification OTP
// @route   POST /api/auth/resend-phone-otp
// @access  Public
export const resendPhoneOtp = async (req, res) => {
  const genericMessage = 'If a pending registration exists for that number, a new code has been issued.';
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const normalizedPhone = normalizePhone(req.body.phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const pending = await PendingRegistration.findOne({ phone: normalizedPhone });
    if (!pending) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const channel = pending.verificationChannel || 'whatsapp';
    const { otp, pendingToken } = await issueOtp(pending, channel);
    res.status(200).json({
      success: true,
      message: genericMessage,
      channel,
      pendingToken,
      ...(otp !== null && { devOtp: otp })
    });
  } catch (error) {
    console.error('Error in resendPhoneOtp:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Verify the WhatsApp OTP issued during "forgot password" for a farmer.
//          On success, issues a short-lived password-reset token so the farmer
//          can set a new password without receiving an email.
// @route   POST /api/auth/verify-forgot-otp
// @access  Public
export const verifyForgotOtp = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const normalizedPhone = normalizePhone(req.body.phone);
    const { otp, pendingToken } = req.body;
    if (!normalizedPhone || !isNonEmptyString(otp) || !isNonEmptyString(pendingToken)) {
      return res.status(400).json({ message: 'Phone number, OTP, and session token are required' });
    }

    const user = await User.findOne({ phone: normalizedPhone, role: 'farmer', isPhoneVerified: true })
      .select('+phoneVerificationOtp +phoneVerificationExpire +pendingVerificationToken +pendingVerificationExpire +otpAttempts');

    if (!user) {
      return res.status(400).json({ message: 'No account found for this phone number' });
    }

    const hashedPendingToken = crypto.createHash('sha256').update(pendingToken).digest('hex');
    const tokenValid =
      user.pendingVerificationToken === hashedPendingToken &&
      user.pendingVerificationExpire &&
      user.pendingVerificationExpire > Date.now();

    if (!tokenValid) {
      return res.status(400).json({ message: 'This session has expired. Please request a new code.' });
    }

    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new code.' });
    }

    if (!matchesOtp(user, otp)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      const remaining = MAX_OTP_ATTEMPTS - user.otpAttempts;
      return res.status(400).json({
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new code.'
      });
    }

    // OTP verified — issue a password-reset token and consume the OTP.
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    user.phoneVerificationOtp = undefined;
    user.phoneVerificationExpire = undefined;
    user.pendingVerificationToken = undefined;
    user.pendingVerificationExpire = undefined;
    user.otpAttempts = 0;
    await user.save();

    res.status(200).json({ success: true, resetToken: rawResetToken });
  } catch (error) {
    console.error('Error in verifyForgotOtp:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};
