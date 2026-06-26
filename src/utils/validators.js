// Shared client-side validation helpers used across registration, login,
// settings, and reset-password forms to avoid copy-pasted logic.

export const isValidEmailFormat = (value) => /^\S+@\S+\.\S+$/.test(value);

// Mirrors the backend's normalizePhone: accepts 03001234567, 0300-1234567,
// +923001234567, etc. and returns the canonical 03XXXXXXXXX form, or null.
export const normalizePhone = (value) => {
  if (!value) return null;
  let digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith('92')) digits = `0${digits.slice(2)}`;
  if (!/^03\d{9}$/.test(digits)) return null;
  return digits;
};

export const isValidPhoneFormat = (value) => Boolean(normalizePhone(value));

export const validateRequired = (value, message) => (!value || !String(value).trim() ? message : null);

export const validatePasswordPair = (password, confirmPassword, t) => {
  if (!password) return { password: t.errorRequired };
  if (password.length < 8) return { password: t.errorLength };
  if (!confirmPassword) return { confirmPassword: t.errorRequired };
  if (password !== confirmPassword) return { confirmPassword: t.errorMatch };
  return {};
};
