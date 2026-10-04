import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerFarmer,
  loginUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  completePhoneVerification,
  resendPhoneOtp,
  verifyForgotOtp
} from '../controllers/authController.js';

const router = express.Router();

const makeLimiter = (windowMs, max, message) =>
  rateLimit({ windowMs, max, message: { message }, standardHeaders: true, legacyHeaders: false });

const loginLimiter         = makeLimiter(15 * 60 * 1000, 10, 'Too many login attempts. Please try again in 15 minutes.');
const registerLimiter      = makeLimiter(60 * 60 * 1000, 20, 'Too many registration attempts. Please try again later.');
const verifyEmailLimiter   = makeLimiter(60 * 60 * 1000, 20, 'Too many verification attempts. Please try again later.');
const resendVerifyLimiter  = makeLimiter(60 * 60 * 1000, 5,  'Too many requests. Please try again in an hour.');
const forgotPasswordLimiter= makeLimiter(60 * 60 * 1000, 5,  'Too many requests. Please try again in an hour.');
const resetPasswordLimiter = makeLimiter(60 * 60 * 1000, 10, 'Too many requests. Please try again in an hour.');
const verifyOtpLimiter     = makeLimiter(15 * 60 * 1000, 10, 'Too many verification attempts. Please try again in 15 minutes.');
const resendOtpLimiter     = makeLimiter(60 * 60 * 1000, 5,  'Too many requests. Please try again in an hour.');
const verifyForgotOtpLimiter = makeLimiter(15 * 60 * 1000, 10, 'Too many attempts. Please try again in 15 minutes.');

router.post('/register/farmer',             registerLimiter,       registerFarmer);
router.post('/login',                       loginLimiter,          loginUser);
router.post('/verify-email/:token',         verifyEmailLimiter,    verifyEmail);
router.post('/resend-verification',         resendVerifyLimiter,   resendVerification);
router.post('/forgot-password',             forgotPasswordLimiter, forgotPassword);
router.post('/reset-password/:token',       resetPasswordLimiter,  resetPassword);
router.post('/complete-phone-verification', verifyOtpLimiter,        completePhoneVerification);
router.post('/resend-phone-otp',            resendOtpLimiter,        resendPhoneOtp);
router.post('/verify-forgot-otp',           verifyForgotOtpLimiter,  verifyForgotOtp);

export default router;
