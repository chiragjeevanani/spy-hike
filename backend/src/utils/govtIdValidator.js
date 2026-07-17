export function validateGovtId(type, number) {
  if (!number) return 'Government ID number is required.';
  
  // Clean all whitespace, hyphens, and convert to uppercase for validation
  const clean = number.replace(/[\s-]/g, '').toUpperCase();
  
  switch (type) {
    case 'Aadhaar':
      if (!/^\d{12}$/.test(clean)) {
        return 'Aadhaar Card must be exactly 12 digits (e.g. 1234 5678 9012).';
      }
      break;
    case 'PAN':
      if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(clean)) {
        return 'PAN Card must be in the format ABCDE1234F (5 letters, 4 digits, 1 letter).';
      }
      break;
    case 'GST':
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(clean)) {
        return 'GST Certificate must be a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5).';
      }
      break;
    case 'Passport':
      if (!/^[A-PR-WY-Z]{1}\d{7}$/.test(clean)) {
        return 'Passport must start with one letter (excluding Q, X, Z) followed by 7 digits.';
      }
      break;
    case 'TIN':
      if (!/^\d{11}$/.test(clean)) {
        return 'TIN (Travel India License) must be exactly 11 digits.';
      }
      break;
    default:
      if (clean.length < 5) {
        return 'Please enter a valid government ID number.';
      }
  }
  return null; // Valid!
}
