import crypto from 'crypto';

// AES-256-GCM: authenticated encryption (confidentiality + tamper detection).
// Needed because the TOTP secret must be reversible to verify a live code
// against it — unlike a password, it can't be a one-way hash.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended length for GCM

const getKey = () => Buffer.from(process.env.TOTP_ENCRYPTION_KEY, 'hex');

export const encryptSecret = (plaintext) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
};

export const decryptSecret = (encrypted) => {
  const [ivHex, authTagHex, cipherHex] = encrypted.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
};
