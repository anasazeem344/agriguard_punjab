import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AdminProfile from '../models/AdminProfile.js';
import FarmerProfile from '../models/FarmerProfile.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/sendEmail.js';
import { isDbReady } from '../config/db.js';
import { isNonEmptyString, isValidEmail, normalizePhone, isPositiveNumber } from '../utils/validators.js';
import { issueVerificationEmail } from '../utils/verificationEmail.js';
import { issuePhoneOtp } from '../utils/phoneVerification.js';
import { isWhatsAppConfigured } from '../utils/whatsapp.js';

// Helper to generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'secretkey',
    { expiresIn: '30d' }
  );
};

const dbUnavailableResponse = (res) =>
  res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' });

// @desc    Register Admin
// @route   POST /api/auth/register/admin
// @access  Public
export const registerAdmin = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { fullName, email, accessCode, password } = req.body;

    if (!isNonEmptyString(fullName) || !isValidEmail(email) || !isNonEmptyString(accessCode) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: 'All fields are required and must be valid' });
    }

    const expectedAccessCode = process.env.ADMIN_ACCESS_CODE;
    if (!expectedAccessCode || accessCode !== expectedAccessCode) {
      return res.status(403).json({ message: 'Invalid admin access code' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this official email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const session = await mongoose.startSession();
    let user;
    try {
      await session.withTransaction(async () => {
        user = await User.create([{
          fullName,
          email,
          password: hashedPassword,
          role: 'admin'
        }], { session }).then((docs) => docs[0]);

        await AdminProfile.create([{
          user: user._id,
          accessCode
        }], { session });
      });
    } finally {
      await session.endSession();
    }

    const { mocked, verifyUrl } = await issueVerificationEmail(user);

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'Registration successful. Please verify your email to activate your account.',
      email: user.email,
      ...(mocked && { devVerificationUrl: verifyUrl })
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account with this official email already exists' });
    }
    console.error('Error in registerAdmin:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Register Farmer
// @route   POST /api/auth/register/farmer
// @access  Public
export const registerFarmer = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { fullName, phone, email, province, district, farmArea, password } = req.body;

    const normalizedPhone = normalizePhone(phone);
    if (!isNonEmptyString(fullName) || !normalizedPhone || !isValidEmail(email) || !isNonEmptyString(province) ||
      !isNonEmptyString(district) || !isPositiveNumber(farmArea) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: 'All fields are required and must be valid (phone must be a valid Pakistani mobile number)' });
    }

    const existingByPhone = await User.findOne({ phone: normalizedPhone });
    if (existingByPhone) {
      return res.status(400).json({ message: 'An account with this phone number already exists' });
    }
    const existingByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingByEmail) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const session = await mongoose.startSession();
    let user;
    try {
      await session.withTransaction(async () => {
        user = await User.create([{
          fullName,
          phone: normalizedPhone,
          email,
          password: hashedPassword,
          role: 'farmer'
        }], { session }).then((docs) => docs[0]);

        await FarmerProfile.create([{
          user: user._id,
          province,
          district,
          farmArea: Number(farmArea)
        }], { session });
      });
    } finally {
      await session.endSession();
    }

    const { configured, otp, deepLink, whatsappNumber } = await issuePhoneOtp(user);

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'Registration successful. Please verify your phone number via WhatsApp to activate your account.',
      phone: user.phone,
      deepLink,
      whatsappNumber,
      // Only included when WhatsApp isn't configured, so the flow stays testable.
      ...(!configured && { devOtp: otp })
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
    const query = isEmail ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) || identifier };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
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
        message: 'Please verify your phone number via WhatsApp before logging in.',
        requiresVerification: true,
        verificationChannel: 'phone',
        phone: user.phone
      });
    }

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

// @desc    Request a password reset link (email-based)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Respond identically whether the account exists or not (avoids email enumeration).
    if (!user) {
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
      // Only included when no real email service is configured, so the flow stays testable.
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

    if (!isNonEmptyString(password) || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
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

// @desc    Poll whether a farmer's phone has been verified yet (the webhook
//          flips isPhoneVerified to true once they message the WhatsApp number)
// @route   GET /api/auth/phone-verification-status?phone=...
// @access  Public
export const phoneVerificationStatus = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const normalizedPhone = normalizePhone(req.query.phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const user = await User.findOne({ phone: normalizedPhone, role: 'farmer' });
    res.status(200).json({ success: true, verified: Boolean(user?.isPhoneVerified) });
  } catch (error) {
    console.error('Error in phoneVerificationStatus:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Once isPhoneVerified is true, issue a session without asking for
//          the password again - the user already proved both phone and
//          password ownership in the same registration session.
// @route   POST /api/auth/complete-phone-verification
// @access  Public
export const completePhoneVerification = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const normalizedPhone = normalizePhone(req.body.phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const user = await User.findOne({ phone: normalizedPhone, role: 'farmer' });
    if (!user || !user.isPhoneVerified) {
      return res.status(400).json({ message: 'This phone number has not been verified yet' });
    }

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
    console.error('Error in completePhoneVerification:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Regenerate a farmer's phone-verification OTP
// @route   POST /api/auth/resend-phone-otp
// @access  Public
export const resendPhoneOtp = async (req, res) => {
  const genericMessage = 'If an unverified farmer account matches that phone number, a new code has been issued.';
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const normalizedPhone = normalizePhone(req.body.phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const user = await User.findOne({ phone: normalizedPhone, role: 'farmer' });
    if (!user || user.isPhoneVerified) {
      return res.status(200).json({ success: true, message: genericMessage });
    }

    const { configured, otp, deepLink, whatsappNumber } = await issuePhoneOtp(user);
    res.status(200).json({
      success: true,
      message: genericMessage,
      deepLink,
      whatsappNumber,
      ...(!configured && { devOtp: otp })
    });
  } catch (error) {
    console.error('Error in resendPhoneOtp:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Dev-only shortcut to mark a phone verified without WhatsApp set up.
//          Automatically disables itself once real WhatsApp credentials are
//          configured, so it can never be used as a backdoor in production.
// @route   POST /api/auth/dev-verify-phone
// @access  Public (but inert unless WhatsApp is unconfigured)
export const devVerifyPhone = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);
    if (isWhatsAppConfigured()) {
      return res.status(403).json({ message: 'Dev verification is disabled because WhatsApp is configured' });
    }

    const normalizedPhone = normalizePhone(req.body.phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const user = await User.findOne({ phone: normalizedPhone, role: 'farmer' });
    if (!user) {
      return res.status(400).json({ message: 'No pending registration found for this phone number' });
    }

    user.isPhoneVerified = true;
    user.phoneVerificationOtp = undefined;
    user.phoneVerificationExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Phone verified (dev mode).' });
  } catch (error) {
    console.error('Error in devVerifyPhone:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};
