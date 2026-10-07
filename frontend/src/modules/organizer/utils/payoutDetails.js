export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
export const UPI_REGEX = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;
export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

export function normalizePayoutDetails(details = {}) {
  return {
    accountHolderName: details.accountHolderName?.trim() || '',
    bankName: details.bankName?.trim() || '',
    accountNumber: details.accountNumber?.trim() || '',
    ifsc: details.ifsc?.trim().toUpperCase() || '',
    upiId: details.upiId?.trim() || '',
    panNumber: details.panNumber?.trim().toUpperCase() || '',
  };
}

export function validatePayoutDetails(details = {}) {
  const value = normalizePayoutDetails(details);
  const errors = {};

  if (!value.accountHolderName) {
    errors.accountHolderName = 'Account holder name is required.';
  }

  const upiFilled = Boolean(value.upiId);
  const validUpi = upiFilled && UPI_REGEX.test(value.upiId);
  if (upiFilled && !validUpi) {
    errors.upiId = 'Enter a valid UPI ID (e.g. name@bank).';
  }

  const bankFilled = Boolean(value.bankName || value.accountNumber || value.ifsc);
  let validBank = false;
  if (bankFilled) {
    if (!value.bankName) errors.bankName = 'Bank name is required.';
    if (!ACCOUNT_NUMBER_REGEX.test(value.accountNumber)) {
      errors.accountNumber = 'Enter a valid bank account number (9-18 digits).';
    }
    if (!IFSC_REGEX.test(value.ifsc)) {
      errors.ifsc = 'Enter a valid IFSC code (e.g. HDFC0001234).';
    }
    validBank = !errors.bankName && !errors.accountNumber && !errors.ifsc;
  }

  if (value.panNumber && !PAN_REGEX.test(value.panNumber)) {
    errors.panNumber = 'Enter a valid PAN number (e.g. ABCDE1234F).';
  }

  if (!validUpi && !validBank) {
    errors.method = 'Add either a UPI ID or full bank account details (Bank Name, Account Number, IFSC).';
  }

  return { value, errors, valid: Object.keys(errors).length === 0 };
}

export function hasCompletePayoutDetails(details = {}) {
  return validatePayoutDetails(details).valid;
}
