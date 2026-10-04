import crypto from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { toDataURL } from 'qrcode';
import User from '../models/User.js';
import AdminProfile from '../models/AdminProfile.js';
import AdminInvite from '../models/AdminInvite.js';
import AuditLog from '../models/AuditLog.js';
import { isDbReady } from '../config/db.js';
import { isNonEmptyString, isValidEmail, isValidName, isStrongPassword } from '../utils/validators.js';
import { encryptSecret, decryptSecret } from '../utils/totpEncryption.js';
import { generateTotpSecret, buildTotpKeyUri, verifyTotpCode, generateBackupCodes } from '../utils/totp.js';
import { verifyAndConsumeCode } from '../utils/totpAuth.js';
import { sendEmail } from '../utils/sendEmail.js';

const REGIONAL_SENSORS_PLACEHOLDER = 1284; // no sensor data model exists yet anywhere in the app
const ENROLL_TOKEN_EXPIRY_MS = 10 * 60 * 1000;
const INVITE_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '30d' });

const dbUnavailableResponse = (res) =>
  res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' });

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

export const issueEnrollToken = async (user) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.totpEnrollToken = hashToken(rawToken);
  user.totpEnrollTokenExpire = Date.now() + ENROLL_TOKEN_EXPIRY_MS;
  await user.save();
  return rawToken;
};

const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role
});

// @desc    Superadmin login — password, then (first time) routes into
//          enrollment, or (once enrolled) requires a live TOTP/backup code.
// @route   POST /api/ams/login
// @access  Public
export const amsLogin = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { identifier, password, code } = req.body;
    if (!isValidEmail(identifier) || !isNonEmptyString(password)) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = await User.findOne({ email: identifier.toLowerCase(), role: 'superadmin' })
      .select('+password +totpSecretEncrypted +totpBackupCodes +totpLastUsedStep');

    // Same generic message and same response shape on every failure path —
    // don't leak whether the account exists or which field was wrong.
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.totpEnabled) {
      const enrollToken = await issueEnrollToken(user);
      return res.status(200).json({ success: true, phase: 'enroll', identifier: user.email, enrollToken });
    }

    if (!isNonEmptyString(code)) {
      return res.status(200).json({ success: true, phase: 'totp' });
    }

    const { consumed, via } = await verifyAndConsumeCode(user, code);
    if (!consumed) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);
    await AuditLog.create({
      actorId: user._id,
      actorName: user.fullName,
      kind: via === 'backup' ? 'login_backup_code_used' : 'login'
    });

    res.status(200).json({ success: true, token, user: publicUser(user) });
  } catch (error) {
    console.error('Error in amsLogin:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Start (or resume) first-time TOTP enrollment
// @route   POST /api/ams/enroll/start
// @access  Public (gated by a short-lived enrollment token issued by amsLogin)
export const amsEnrollStart = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { identifier, enrollToken, forceNew } = req.body;
    if (!isValidEmail(identifier) || !isNonEmptyString(enrollToken)) {
      return res.status(400).json({ message: 'Invalid or expired enrollment session. Please log in again.' });
    }

    const user = await User.findOne({ email: identifier.toLowerCase(), role: { $in: ['superadmin', 'admin'] } })
      .select('+totpEnrollToken +totpEnrollTokenExpire +totpPendingSecretEncrypted');

    const tokenValid =
      user &&
      !user.totpEnabled &&
      user.totpEnrollToken === hashToken(enrollToken) &&
      user.totpEnrollTokenExpire &&
      user.totpEnrollTokenExpire > Date.now();

    if (!tokenValid) {
      return res.status(401).json({ message: 'Invalid or expired enrollment session. Please log in again.' });
    }

    // Reuse the pending secret unless the caller explicitly wants a fresh
    // one — prevents a page refresh or a second login from silently
    // rotating the QR out from under someone mid-scan.
    let secret;
    if (user.totpPendingSecretEncrypted && !forceNew) {
      secret = decryptSecret(user.totpPendingSecretEncrypted);
    } else {
      secret = generateTotpSecret();
      user.totpPendingSecretEncrypted = encryptSecret(secret);
      await user.save();
    }

    const issuer = user.role === 'superadmin' ? 'AgriGuard Punjab AMS' : 'AgriGuard Punjab Admin';
    const qrCodeDataUrl = await toDataURL(buildTotpKeyUri(user.email, secret, issuer));

    res.status(200).json({ success: true, qrCodeDataUrl, secret, enrollToken });
  } catch (error) {
    console.error('Error in amsEnrollStart:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Confirm first-time TOTP enrollment with a live code — commits the
//          secret, generates backup codes, and logs the superadmin in.
// @route   POST /api/ams/enroll/confirm
// @access  Public (gated by the same short-lived enrollment token)
export const amsEnrollConfirm = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { identifier, enrollToken, code } = req.body;
    if (!isValidEmail(identifier) || !isNonEmptyString(enrollToken) || !isNonEmptyString(code)) {
      return res.status(400).json({ message: 'Invalid or expired enrollment session. Please log in again.' });
    }

    const user = await User.findOne({ email: identifier.toLowerCase(), role: { $in: ['superadmin', 'admin'] } })
      .select('+totpEnrollToken +totpEnrollTokenExpire +totpPendingSecretEncrypted');

    const hashedToken = hashToken(enrollToken);
    const tokenValid =
      user &&
      !user.totpEnabled &&
      user.totpPendingSecretEncrypted &&
      user.totpEnrollToken === hashedToken &&
      user.totpEnrollTokenExpire &&
      user.totpEnrollTokenExpire > Date.now();

    if (!tokenValid) {
      return res.status(401).json({ message: 'Invalid or expired enrollment session. Please log in again.' });
    }

    const secret = decryptSecret(user.totpPendingSecretEncrypted);
    const { valid, timeStep } = await verifyTotpCode(code, secret);
    if (!valid) {
      return res.status(400).json({ message: 'Incorrect code. Please try again.' });
    }

    const rawBackupCodes = generateBackupCodes();
    const backupCodeHashes = await Promise.all(
      rawBackupCodes.map(async (raw) => ({ codeHash: await bcrypt.hash(raw, 10), usedAt: null }))
    );

    // Atomic commit, not read-then-save — closes a double-submit race where
    // a retried confirm could silently regenerate/invalidate the backup
    // codes right after they were shown once.
    const committed = await User.findOneAndUpdate(
      { _id: user._id, totpEnabled: false, totpEnrollToken: hashedToken },
      {
        $set: {
          totpSecretEncrypted: user.totpPendingSecretEncrypted,
          totpEnabled: true,
          totpEnrolledAt: new Date(),
          totpLastUsedStep: timeStep,
          totpBackupCodes: backupCodeHashes
        },
        $unset: { totpPendingSecretEncrypted: '', totpEnrollToken: '', totpEnrollTokenExpire: '' }
      },
      { new: true }
    );

    if (!committed) {
      return res.status(409).json({ message: 'Authenticator already set up. Please log in with your authenticator app.' });
    }

    const token = generateToken(committed._id, committed.role);
    await AuditLog.create({ actorId: committed._id, actorName: committed.fullName, kind: 'totp_enrolled' });

    res.status(200).json({ success: true, token, user: publicUser(committed), backupCodes: rawBackupCodes });
  } catch (error) {
    console.error('Error in amsEnrollConfirm:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Start re-enrollment (lost/new phone) on an already-active account.
//          Requires proof of the OLD 2FA, not just the JWT — defends against
//          a stolen session being used to silently take over 2FA.
// @route   POST /api/ams/reenroll/start
// @access  Private (superadmin)
export const amsReenrollStart = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { password, currentCode } = req.body;
    if (!isNonEmptyString(password) || !isNonEmptyString(currentCode)) {
      return res.status(400).json({ message: 'Current password and a valid code are required' });
    }

    const user = await User.findById(req.user._id)
      .select('+password +totpSecretEncrypted +totpBackupCodes +totpLastUsedStep');

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const { consumed } = await verifyAndConsumeCode(user, currentCode);
    if (!consumed) {
      return res.status(401).json({ message: 'Incorrect code' });
    }

    // Old secret is left untouched until confirm — an abandoned
    // re-enrollment never breaks the existing authenticator.
    const secret = generateTotpSecret();
    user.totpPendingSecretEncrypted = encryptSecret(secret);
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.totpReenrollToken = hashToken(rawToken);
    user.totpReenrollTokenExpire = Date.now() + ENROLL_TOKEN_EXPIRY_MS;
    await user.save();

    const qrCodeDataUrl = await toDataURL(buildTotpKeyUri(user.email, secret));

    res.status(200).json({ success: true, qrCodeDataUrl, secret, reenrollToken: rawToken });
  } catch (error) {
    console.error('Error in amsReenrollStart:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Confirm re-enrollment — commits the new secret and replaces all
//          backup codes wholesale.
// @route   POST /api/ams/reenroll/confirm
// @access  Private (superadmin)
export const amsReenrollConfirm = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { reenrollToken, code } = req.body;
    if (!isNonEmptyString(reenrollToken) || !isNonEmptyString(code)) {
      return res.status(400).json({ message: 'Invalid or expired re-enrollment session. Please try again.' });
    }

    const user = await User.findById(req.user._id)
      .select('+totpReenrollToken +totpReenrollTokenExpire +totpPendingSecretEncrypted');

    const hashedToken = hashToken(reenrollToken);
    const tokenValid =
      user.totpPendingSecretEncrypted &&
      user.totpReenrollToken === hashedToken &&
      user.totpReenrollTokenExpire &&
      user.totpReenrollTokenExpire > Date.now();

    if (!tokenValid) {
      return res.status(401).json({ message: 'Invalid or expired re-enrollment session. Please try again.' });
    }

    const secret = decryptSecret(user.totpPendingSecretEncrypted);
    const { valid, timeStep } = await verifyTotpCode(code, secret);
    if (!valid) {
      return res.status(400).json({ message: 'Incorrect code. Please try again.' });
    }

    const rawBackupCodes = generateBackupCodes();
    const backupCodeHashes = await Promise.all(
      rawBackupCodes.map(async (raw) => ({ codeHash: await bcrypt.hash(raw, 10), usedAt: null }))
    );

    const committed = await User.findOneAndUpdate(
      { _id: user._id, totpReenrollToken: hashedToken },
      {
        $set: {
          totpSecretEncrypted: user.totpPendingSecretEncrypted,
          totpEnrolledAt: new Date(),
          totpLastUsedStep: timeStep,
          totpBackupCodes: backupCodeHashes
        },
        $unset: { totpPendingSecretEncrypted: '', totpReenrollToken: '', totpReenrollTokenExpire: '' }
      },
      { new: true }
    );

    if (!committed) {
      return res.status(409).json({ message: 'This re-enrollment session was already used. Please start again.' });
    }

    await AuditLog.create({ actorId: committed._id, actorName: committed.fullName, kind: 'totp_reenrolled' });

    res.status(200).json({ success: true, backupCodes: rawBackupCodes });
  } catch (error) {
    console.error('Error in amsReenrollConfirm:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    AMS Overview stats
// @route   GET /api/ams/stats
// @access  Private (superadmin)
export const getStats = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const [activeAdmins, admins, pendingInvites] = await Promise.all([
      User.countDocuments({ role: 'admin', status: 'active' }),
      User.find({ role: 'admin', status: 'active' }).select('_id'),
      AdminInvite.countDocuments({ expiresAt: { $gt: new Date() } })
    ]);

    const adminIds = admins.map((a) => a._id);
    const profiles = await AdminProfile.find({ user: { $in: adminIds }, district: { $ne: null } }).select('district');
    const districtsCovered = new Set(profiles.map((p) => p.district).filter(Boolean)).size;

    res.status(200).json({
      success: true,
      stats: {
        activeAdmins,
        regionalSensors: REGIONAL_SENSORS_PLACEHOLDER,
        districtsCovered,
        pendingInvites
      }
    });
  } catch (error) {
    console.error('Error in getStats:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Audit log entries — Overview's "recent activity" (?limit=5) and
//          the full Audit Log page (?page=&limit=&kind=) share this handler.
// @route   GET /api/ams/audit-log?limit=5&page=1&kind=admin_invited
// @access  Private (superadmin)
export const getAuditLog = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 100);
    const filter = isNonEmptyString(req.query.kind) ? { kind: req.query.kind } : {};

    const [entries, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      entries: entries.map((e) => ({
        id: e._id,
        kind: e.kind,
        actorName: e.actorName,
        createdAt: e.createdAt
      })),
      total,
      page,
      limit,
      hasMore: page * limit < total
    });
  } catch (error) {
    console.error('Error in getAuditLog:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

const INVITE_URL = (rawToken) => `${process.env.CLIENT_URL || 'http://localhost:5173'}/ams/accept-invite/${rawToken}`;

const generateUniqueEmployeeId = async (session) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    // eslint-disable-next-line no-await-in-loop -- sequential retry, not a batch operation
    const taken = await AdminProfile.exists({ employeeId: candidate }).session(session);
    if (!taken) return candidate;
  }
  throw new Error('Failed to generate a unique employee ID');
};

const generateUniqueLinkCode = async (session) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `LINK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    // eslint-disable-next-line no-await-in-loop -- sequential retry, not a batch operation
    const taken = await AdminProfile.exists({ linkCode: candidate }).session(session);
    if (!taken) return candidate;
  }
  throw new Error('Failed to generate a unique link code');
};

const inviteEmailHtml = (invite, inviteUrl) => `
  <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
    <h2 style="color:#14421a;margin-bottom:4px;">AgriGuard Punjab — AMS</h2>
    <p>Hello ${invite.fullName},</p>
    <p>${invite.invitedByName} has invited you to become an admin on AgriGuard Punjab.</p>
    <p><a href="${inviteUrl}">Activate your admin account</a> (link expires in 7 days).</p>
    <p style="color:#9ca3af;font-size:12px;">If you weren't expecting this, you can safely ignore this email.</p>
  </div>
`;

// @desc    Invite a new admin by email
// @route   POST /api/ams/admins/invite
// @access  Private (superadmin)
export const inviteAdmin = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { fullName, email, district } = req.body;
    if (!isValidName(fullName) || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid name and email are required' });
    }
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const existingInvite = await AdminInvite.findOne({ email: normalizedEmail });
    if (existingInvite) {
      if (existingInvite.expiresAt > new Date()) {
        return res.status(409).json({ message: 'An invite is already pending for this email. Resend it instead.' });
      }
      // Expired but not yet swept by Mongo's TTL monitor — clear it so the unique index doesn't block us.
      await AdminInvite.deleteOne({ _id: existingInvite._id });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    let invite;
    try {
      invite = await AdminInvite.create({
        email: normalizedEmail,
        fullName: fullName.trim(),
        district: isNonEmptyString(district) ? district.trim() : undefined,
        invitedBy: req.user._id,
        invitedByName: req.user.fullName,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITE_TOKEN_EXPIRY_MS)
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'An invite is already pending for this email.' });
      }
      throw err;
    }

    const inviteUrl = INVITE_URL(rawToken);
    const { mocked } = await sendEmail({
      to: invite.email,
      subject: 'You are invited to AgriGuard Punjab AMS',
      html: inviteEmailHtml(invite, inviteUrl)
    });

    await AuditLog.create({ actorId: req.user._id, actorName: req.user.fullName, kind: 'admin_invited' });

    res.status(201).json({
      success: true,
      invite: { id: invite._id, email: invite.email, fullName: invite.fullName, district: invite.district || null, expiresAt: invite.expiresAt },
      ...(mocked && { devInviteUrl: inviteUrl })
    });
  } catch (error) {
    console.error('Error in inviteAdmin:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Resend an admin invite (rotates the token/expiry)
// @route   POST /api/ams/admins/invites/:id/resend
// @access  Private (superadmin)
export const resendAdminInvite = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const invite = await AdminInvite.findById(req.params.id);
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    invite.tokenHash = hashToken(rawToken);
    invite.expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_MS);
    await invite.save();

    const inviteUrl = INVITE_URL(rawToken);
    const { mocked } = await sendEmail({
      to: invite.email,
      subject: 'Reminder: You are invited to AgriGuard Punjab AMS',
      html: inviteEmailHtml(invite, inviteUrl)
    });

    await AuditLog.create({ actorId: req.user._id, actorName: req.user.fullName, kind: 'invite_resent' });

    res.status(200).json({ success: true, ...(mocked && { devInviteUrl: inviteUrl }) });
  } catch (error) {
    console.error('Error in resendAdminInvite:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Cancel a pending admin invite
// @route   DELETE /api/ams/admins/invites/:id
// @access  Private (superadmin)
export const cancelAdminInvite = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const invite = await AdminInvite.findByIdAndDelete(req.params.id);
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }

    await AuditLog.create({ actorId: req.user._id, actorName: req.user.fullName, kind: 'invite_cancelled' });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in cancelAdminInvite:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Look up a pending invite by its raw token (for the "Hi {name}" screen)
// @route   GET /api/ams/invites/accept/:token
// @access  Public
export const amsInviteAcceptStart = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { token } = req.params;
    if (!isNonEmptyString(token)) {
      return res.status(400).json({ message: 'This invite link is invalid or has expired.' });
    }

    const invite = await AdminInvite.findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() }
    }).select('fullName email district');

    if (!invite) {
      return res.status(404).json({ message: 'This invite link is invalid or has expired.' });
    }

    res.status(200).json({
      success: true,
      invite: { fullName: invite.fullName, email: invite.email, district: invite.district || null }
    });
  } catch (error) {
    console.error('Error in amsInviteAcceptStart:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Accept an invite — creates the admin account, logs them in.
// @route   POST /api/ams/invites/accept/:token
// @access  Public
export const amsInviteAcceptConfirm = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { token } = req.params;
    const { password } = req.body;
    if (!isNonEmptyString(token) || !isStrongPassword(password)) {
      return res.status(400).json({ message: 'A valid token and a strong password are required' });
    }

    // Atomic claim: findOneAndDelete closes the double-submit race — a
    // retried POST finds nothing the second time and gets a clean 410,
    // instead of silently creating two User accounts for one invite.
    const invite = await AdminInvite.findOneAndDelete({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() }
    });
    if (!invite) {
      return res.status(410).json({ message: 'This invite link is invalid or has expired.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const session = await mongoose.startSession();
    let user;
    try {
      await session.withTransaction(async () => {
        user = await User.create([{
          fullName: invite.fullName,
          email: invite.email,
          password: hashedPassword,
          role: 'admin',
          status: 'active',
          // The invite link itself is the verification — there is no
          // separate email-verify step for invite-created admins.
          isEmailVerified: true
        }], { session }).then((docs) => docs[0]);

        await AdminProfile.create([{
          user: user._id,
          district: invite.district,
          employeeId: await generateUniqueEmployeeId(session),
          linkCode: await generateUniqueLinkCode(session)
        }], { session });
      });
    } finally {
      await session.endSession();
    }

    await AuditLog.create({ actorId: user._id, actorName: user.fullName, kind: 'admin_account_activated' });

    // Authenticator setup is mandatory before an admin ever gets a token —
    // same enroll-phase shape amsLogin returns for superadmin's first login,
    // so the existing AmsEnroll.jsx page can drive it unchanged.
    const enrollToken = await issueEnrollToken(user);
    res.status(200).json({ success: true, phase: 'enroll', identifier: user.email, enrollToken });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An account already exists for this email. Please log in.' });
    }
    console.error('Error in amsInviteAcceptConfirm:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    List admins + pending invites, merged, searchable, paginated
// @route   GET /api/ams/admins?search=&status=&page=&limit=
// @access  Private (superadmin)
export const listAdmins = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const search = (req.query.search || '').trim().toLowerCase();
    const statusFilter = req.query.status;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    const [admins, profiles, invites] = await Promise.all([
      User.find({ role: 'admin' }).select('_id fullName email status createdAt'),
      AdminProfile.find({}).select('user district employeeId linkCode'),
      AdminInvite.find({ expiresAt: { $gt: new Date() } }).select('_id fullName email district createdAt')
    ]);

    const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

    const merged = [
      ...admins.map((u) => {
        const profile = profileByUser.get(String(u._id));
        return {
          id: u._id,
          recordType: 'admin',
          fullName: u.fullName,
          email: u.email,
          district: profile?.district || null,
          employeeId: profile?.employeeId || null,
          linkCode: profile?.linkCode || null,
          status: u.status,
          createdAt: u.createdAt
        };
      }),
      ...invites.map((inv) => ({
        id: inv._id,
        recordType: 'invite',
        fullName: inv.fullName,
        email: inv.email,
        district: inv.district || null,
        employeeId: null,
        linkCode: null,
        status: 'pending',
        createdAt: inv.createdAt
      }))
    ];

    const filtered = merged
      .filter((r) => !statusFilter || r.status === statusFilter)
      .filter((r) => !search || r.fullName.toLowerCase().includes(search) || r.email.toLowerCase().includes(search))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = filtered.length;
    const start = (page - 1) * limit;
    const pageItems = filtered.slice(start, start + limit);

    res.status(200).json({ success: true, admins: pageItems, total, page, limit, hasMore: start + limit < total });
  } catch (error) {
    console.error('Error in listAdmins:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Edit an admin's name/district (email and employeeId are immutable)
// @route   PATCH /api/ams/admins/:id
// @access  Private (superadmin)
export const updateAdmin = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const { fullName, district } = req.body;
    if (fullName !== undefined && !isValidName(fullName)) {
      return res.status(400).json({ message: 'Invalid name' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      fullName !== undefined ? { $set: { fullName: fullName.trim() } } : {},
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (district !== undefined) {
      await AdminProfile.findOneAndUpdate(
        { user: user._id },
        { $set: { district: isNonEmptyString(district) ? district.trim() : null } }
      );
    }

    await AuditLog.create({ actorId: req.user._id, actorName: req.user.fullName, kind: 'admin_edited' });

    res.status(200).json({ success: true, admin: publicUser(user) });
  } catch (error) {
    console.error('Error in updateAdmin:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Suspend an admin
// @route   PATCH /api/ams/admins/:id/suspend
// @access  Private (superadmin)
export const suspendAdmin = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin', status: 'active' },
      { $set: { status: 'suspended' } },
      { new: true }
    );
    if (!user) {
      return res.status(409).json({ message: 'Admin not found or already suspended.' });
    }

    await AuditLog.create({ actorId: req.user._id, actorName: req.user.fullName, kind: 'admin_suspended' });

    res.status(200).json({ success: true, admin: publicUser(user) });
  } catch (error) {
    console.error('Error in suspendAdmin:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Reactivate a suspended admin
// @route   PATCH /api/ams/admins/:id/reactivate
// @access  Private (superadmin)
export const reactivateAdmin = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin', status: 'suspended' },
      { $set: { status: 'active' } },
      { new: true }
    );
    if (!user) {
      return res.status(409).json({ message: 'Admin not found or not suspended.' });
    }

    await AuditLog.create({ actorId: req.user._id, actorName: req.user.fullName, kind: 'admin_reactivated' });

    res.status(200).json({ success: true, admin: publicUser(user) });
  } catch (error) {
    console.error('Error in reactivateAdmin:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};

// @desc    Permanently remove an admin account
// @route   DELETE /api/ams/admins/:id
// @access  Private (superadmin)
export const removeAdmin = async (req, res) => {
  try {
    if (!isDbReady()) return dbUnavailableResponse(res);

    const session = await mongoose.startSession();
    let removed;
    try {
      await session.withTransaction(async () => {
        removed = await User.findOneAndDelete({ _id: req.params.id, role: 'admin' }, { session });
        if (removed) {
          await AdminProfile.deleteOne({ user: removed._id }, { session });
        }
      });
    } finally {
      await session.endSession();
    }

    if (!removed) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    await AuditLog.create({ actorId: req.user._id, actorName: req.user.fullName, kind: 'admin_removed' });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in removeAdmin:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};
