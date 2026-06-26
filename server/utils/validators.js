// Strict type guards for any value that flows into a Mongoose query filter.
// Without these, an attacker can send { "$gt": "" } etc. as a field value and
// have Mongo interpret it as a query operator instead of a literal to match.
export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

export const isValidEmail = (value) => isNonEmptyString(value) && /^\S+@\S+\.\S+$/.test(value);

// Accepts Pakistani mobile numbers in common formats (03001234567, 0300-1234567,
// +923001234567) and normalizes to a single canonical digits-only form starting with 0.
export const normalizePhone = (value) => {
  if (!isNonEmptyString(value)) return null;
  let digits = value.replace(/[^\d]/g, '');
  if (digits.startsWith('92')) digits = `0${digits.slice(2)}`;
  if (!/^03\d{9}$/.test(digits)) return null;
  return digits;
};

export const isPositiveNumber = (value) => {
  const num = Number(value);
  return !Number.isNaN(num) && num > 0;
};
