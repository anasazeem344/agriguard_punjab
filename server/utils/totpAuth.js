import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { decryptSecret } from './totpEncryption.js';
import { verifyTotpCode } from './totp.js';

// Shared TOTP-then-backup-code verification, used by both login and
// re-enrollment so the logic (and its race-condition handling) isn't
// duplicated. `user` must have been fetched with
// +totpSecretEncrypted +totpBackupCodes +totpLastUsedStep selected.
// Returns true/false; on success, atomically consumes the matched
// TOTP time step or backup code so it can never be reused.
export const verifyAndConsumeCode = async (user, rawCode) => {
  const normalizedCode = String(rawCode || '').replace(/[\s-]/g, '');

  if (/^\d{6}$/.test(normalizedCode) && user.totpSecretEncrypted) {
    const secret = decryptSecret(user.totpSecretEncrypted);
    const { valid, timeStep } = await verifyTotpCode(normalizedCode, secret, user.totpLastUsedStep);
    if (valid) {
      // Atomic check-and-set closes the race where two concurrent requests
      // with the same still-window-valid code could otherwise both read
      // "not yet used" before either writes.
      const updated = await User.findOneAndUpdate(
        { _id: user._id, totpLastUsedStep: { $lt: timeStep } },
        { $set: { totpLastUsedStep: timeStep } }
      );
      if (updated) return { consumed: true, via: 'totp' };
    }
  }

  const lowerCode = normalizedCode.toLowerCase();
  for (const entry of user.totpBackupCodes || []) {
    if (entry.usedAt) continue;
    // eslint-disable-next-line no-await-in-loop -- backup codes are few (10) and bcrypt.compare must run sequentially per candidate
    if (await bcrypt.compare(lowerCode, entry.codeHash)) {
      const updated = await User.findOneAndUpdate(
        { _id: user._id, 'totpBackupCodes.codeHash': entry.codeHash, 'totpBackupCodes.usedAt': null },
        { $set: { 'totpBackupCodes.$.usedAt': new Date() } }
      );
      if (updated) return { consumed: true, via: 'backup' };
      break;
    }
  }

  return { consumed: false, via: null };
};
