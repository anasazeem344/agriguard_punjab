import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  amsLogin,
  amsEnrollStart,
  amsEnrollConfirm,
  amsReenrollStart,
  amsReenrollConfirm,
  getStats,
  getAuditLog,
  inviteAdmin,
  resendAdminInvite,
  cancelAdminInvite,
  amsInviteAcceptStart,
  amsInviteAcceptConfirm,
  listAdmins,
  updateAdmin,
  suspendAdmin,
  reactivateAdmin,
  removeAdmin
} from '../controllers/amsController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// Stricter than the regular login limiter — this is the highest-value account.
const amsLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const amsEnrollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const amsInviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many invite requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const amsPublicTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', amsLoginLimiter, amsLogin);
router.post('/enroll/start', amsEnrollLimiter, amsEnrollStart);
router.post('/enroll/confirm', amsEnrollLimiter, amsEnrollConfirm);
router.get('/invites/accept/:token', amsPublicTokenLimiter, amsInviteAcceptStart);
router.post('/invites/accept/:token', amsPublicTokenLimiter, amsInviteAcceptConfirm);

router.use(protect, restrictTo('superadmin'));
router.get('/stats', getStats);
router.get('/audit-log', getAuditLog);
router.post('/reenroll/start', amsEnrollLimiter, amsReenrollStart);
router.post('/reenroll/confirm', amsEnrollLimiter, amsReenrollConfirm);

router.get('/admins', listAdmins);
router.post('/admins/invite', amsInviteLimiter, inviteAdmin);
router.post('/admins/invites/:id/resend', amsInviteLimiter, resendAdminInvite);
router.delete('/admins/invites/:id', cancelAdminInvite);
router.patch('/admins/:id', updateAdmin);
router.patch('/admins/:id/suspend', suspendAdmin);
router.patch('/admins/:id/reactivate', reactivateAdmin);
router.delete('/admins/:id', removeAdmin);

export default router;
