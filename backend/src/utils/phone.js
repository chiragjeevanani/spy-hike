// Phone-number rules shared by the traveler register and account profiles.
//
// Numbers here are not India-only: a traveller's emergency contact may be
// reachable anywhere. Rather than guessing each country's format, this enforces
// the ITU E.164 envelope every real number fits inside — at most 15 digits
// including the country code, and enough digits to be a phone number at all.
// An optional leading '+' is accepted and preserved.
export const PHONE_MAX_DIGITS = 15;
export const PHONE_MIN_DIGITS = 7;

export const phoneDigits = (value) => String(value ?? '').replace(/\D/g, '');

// True when `value` contains a plausible international number. Formatting
// characters (spaces, dashes, brackets) are ignored, and a name wrapped around
// the number — "Priya Sharma (+91 98765 43210)" — still passes, which is the
// shape the profile's emergency-contact field stores.
export const isValidPhone = (value) => {
  const digits = phoneDigits(value);
  return digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS;
};

export const PHONE_RULE_MESSAGE =
  `a phone number of ${PHONE_MIN_DIGITS}-${PHONE_MAX_DIGITS} digits (with the country code for numbers outside India)`;
