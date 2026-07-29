export const formatGovtIdInput = (type, val) => {
  if (!val) return '';
  const clean = String(val).replace(/\s+/g, '');
  switch (type) {
    case 'Aadhaar':
      // Strictly accept digits only, capped at 12 digits
      return clean.replace(/\D/g, '').slice(0, 12);
    case 'TIN':
      // Strictly accept digits only, capped at 11 digits
      return clean.replace(/\D/g, '').slice(0, 11);
    case 'PAN':
      // Max 10 characters, auto-uppercase alphanumeric
      return clean.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    case 'GST':
      // Max 15 characters, auto-uppercase alphanumeric
      return clean.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    case 'Passport':
      // Max 8 characters, auto-uppercase alphanumeric
      return clean.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    default:
      return clean.slice(0, 20);
  }
};

export const getGovtIdMeta = (type) => {
  switch (type) {
    case 'Aadhaar':
      return { maxLength: 12, inputMode: 'numeric', placeholder: '12-digit Aadhaar number' };
    case 'TIN':
      return { maxLength: 11, inputMode: 'numeric', placeholder: '11-digit TIN number' };
    case 'PAN':
      return { maxLength: 10, inputMode: 'text', placeholder: '10-char PAN (ABCDE1234F)' };
    case 'GST':
      return { maxLength: 15, inputMode: 'text', placeholder: '15-char GSTIN' };
    case 'Passport':
      return { maxLength: 8, inputMode: 'text', placeholder: 'Passport number' };
    default:
      return { maxLength: 20, inputMode: 'text', placeholder: 'Enter ID number' };
  }
};
