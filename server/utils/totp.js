import crypto from 'crypto';
import { generateSecret, generateURI, generate, verify } from 'otplib';

// RFC 6238 standard ±1 time-step (±30s) clock-drift tolerance. otplib's
// epochTolerance is in seconds, not a step count.
const EPOCH_TOLERANCE_SECONDS = 30;
const BACKUP_CODE_COUNT = 10;

export const generateTotpSecret = () => generateSecret();

export const buildTotpKeyUri = (email, secret, issuer = 'AgriGuard Punjab AMS') =>
  generateURI({ issuer, label: email, secret });

// Used only during enrollment confirm, to show the live code alongside the
// QR for a self-test — not used at login (the app generates the code there).
export const generateTotpCode = (secret) => generate({ secret });

// Verifies a 6-digit code against the secret. `afterStep`, when given a
// non-negative value, rejects any code at or before that already-used time
// step (anti-replay) — otplib throws on a negative afterTimeStep, so the -1
// "never used yet" sentinel stored on a fresh account must be omitted here.
// Returns { valid, timeStep } where timeStep is the absolute RFC 6238 counter
// the code matched at, to be persisted as the new totpLastUsedStep.
export const verifyTotpCode = async (code, secret, afterStep) => {
  const result = await verify({
    secret,
    token: code,
    epochTolerance: EPOCH_TOLERANCE_SECONDS,
    ...(Number.isInteger(afterStep) && afterStep >= 0 ? { afterTimeStep: afterStep } : {})
  });
  return result.valid ? { valid: true, timeStep: result.timeStep } : { valid: false, timeStep: null };
};

export const generateBackupCodes = () =>
  Array.from({ length: BACKUP_CODE_COUNT }, () => crypto.randomBytes(5).toString('hex'));
