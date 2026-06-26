import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerAdmin,
  registerFarmer,
  loginUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  phoneVerificationStatus,
  completePhoneVerification,
  resendPhoneOtp,
  devVerifyPhone
} from '../controllers/authController.js';

const router = express.Router();

// Each sensitive action gets its OWN limiter instance. Sharing one instance
// across routes would pool their request counts into a single budget, so
// e.g. verifying an email could lock a user out of resetting their password.
const makeLimiter = (windowMs, max, message) =>
  rateLimit({ windowMs, max, message: { message }, standardHeaders: true, legacyHeaders: false });

const loginLimiter = makeLimiter(15 * 60 * 1000, 10, 'Too many login attempts. Please try again in 15 minutes.');
const registerLimiter = makeLimiter(60 * 60 * 1000, 20, 'Too many registration attempts. Please try again later.');
const verifyEmailLimiter = makeLimiter(60 * 60 * 1000, 20, 'Too many verification attempts. Please try again later.');
const resendVerificationLimiter = makeLimiter(60 * 60 * 1000, 5, 'Too many requests. Please try again in an hour.');
const forgotPasswordLimiter = makeLimiter(60 * 60 * 1000, 5, 'Too many requests. Please try again in an hour.');
const resetPasswordLimiter = makeLimiter(60 * 60 * 1000, 10, 'Too many requests. Please try again in an hour.');
// Polled every few seconds while the user is on the "check your WhatsApp" screen.
const statusPollLimiter = makeLimiter(5 * 60 * 1000, 80, 'Too many status checks. Please slow down.');
const resendOtpLimiter = makeLimiter(60 * 60 * 1000, 5, 'Too many requests. Please try again in an hour.');
const devVerifyLimiter = makeLimiter(15 * 60 * 1000, 20, 'Too many requests. Please try again later.');

router.post('/register/admin', registerLimiter, registerAdmin);
router.post('/register/farmer', registerLimiter, registerFarmer);
router.post('/login', loginLimiter, loginUser);
router.post('/verify-email/:token', verifyEmailLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, resendVerification);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password/:token', resetPasswordLimiter, resetPassword);
router.get('/phone-verification-status', statusPollLimiter, phoneVerificationStatus);
router.post('/complete-phone-verification', loginLimiter, completePhoneVerification);
router.post('/resend-phone-otp', resendOtpLimiter, resendPhoneOtp);
router.post('/dev-verify-phone', devVerifyLimiter, devVerifyPhone);

export default router;
