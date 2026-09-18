/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Phone-number rules for every field that collects one.
//
// These numbers are not India-only: a traveller's emergency contact may be
// reachable anywhere. Rather than guessing each country's format, the fields
// enforce the ITU E.164 envelope every real number fits inside — at most 15
// digits including the country code, and enough digits to be a phone number at
// all. An optional leading '+' is accepted so a country code can be given.
//
// Mirrors backend/src/utils/phone.js, which enforces the same rule on requests
// that bypass the UI.
export const PHONE_MAX_DIGITS = 15;
export const PHONE_MIN_DIGITS = 7;

export const phoneDigits = (value) => String(value ?? '').replace(/\D/g, '');

// Sanitises a keystroke-by-keystroke value: keeps a leading '+', drops
// everything that isn't a digit, and refuses digits past the maximum so the
// field cannot be overfilled (rather than accepting them and failing later).
export const sanitizePhoneInput = (raw) => {
  const value = String(raw ?? '');
  const plus = value.trimStart().startsWith('+') ? '+' : '';
  return plus + phoneDigits(value).slice(0, PHONE_MAX_DIGITS);
};

export const isValidPhone = (value) => {
  const digits = phoneDigits(value);
  return digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS;
};

// One wording for every phone field, so the rule reads the same everywhere.
export const PHONE_RULE_MESSAGE =
  `Enter a valid phone number (${PHONE_MIN_DIGITS}-${PHONE_MAX_DIGITS} digits, with the country code for numbers outside India).`;
