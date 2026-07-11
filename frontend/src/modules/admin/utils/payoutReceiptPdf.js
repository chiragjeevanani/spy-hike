/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Dependency-free single-page PDF payout receipt — same hand-written PDF
// approach as modules/user/utils/ticketPdf.js. Helvetica/Courier cover ASCII
// only, so the rupee glyph is written as "Rs." and other non-ASCII stripped.

const A4_W = 595;
const A4_H = 842;

const clean = (value) =>
  String(value ?? '')
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const rs = (n) => `Rs.${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function downloadPayoutReceiptPDF(payout) {
  const ops = [];
  const yy = (fromTop) => A4_H - fromTop;

  const rect = (x, yTop, w, h, [r, g, b]) => ops.push(`${r} ${g} ${b} rg ${x} ${yy(yTop) - h} ${w} ${h} re f`);
  const text = (x, yTop, str, { font = 'F1', size = 9, color = [0.13, 0.11, 0.09] } = {}) => {
    const [r, g, b] = color;
    ops.push(`BT /${font} ${size} Tf ${r} ${g} ${b} rg ${x} ${yy(yTop)} Td (${clean(str)}) Tj ET`);
  };
  const line = (x1, y1Top, x2, y2Top, [r, g, b] = [0.85, 0.82, 0.78]) =>
    ops.push(`${r} ${g} ${b} RG 0.8 w ${x1} ${yy(y1Top)} m ${x2} ${yy(y2Top)} l S`);
  const dashed = (x1, y1Top, x2, y2Top, [r, g, b] = [0.65, 0.6, 0.55]) =>
    ops.push(`[3 3] 0 d ${r} ${g} ${b} RG 1 w ${x1} ${yy(y1Top)} m ${x2} ${yy(y2Top)} l S [] 0 d`);

  const BROWN = [0.61, 0.4, 0.27];
  const ESPRESSO = [0.5, 0.33, 0.22];
  const INK = [0.13, 0.11, 0.09];
  const MUTED = [0.48, 0.42, 0.37];
  const GREEN = [0.02, 0.59, 0.41];
  const RED = [0.75, 0.15, 0.2];
  const AMBER = [0.85, 0.6, 0.1];
  const CARD = [0.985, 0.975, 0.96];

  const M = 40;
  const W = A4_W - M * 2;

  const statusColor = payout.status === 'Paid' ? GREEN : payout.status === 'Rejected' ? RED : AMBER;

  // Header
  text(M, 52, 'TREKIGO', { font: 'F2', size: 18, color: BROWN });
  text(M + 92, 52, 'ORGANIZER PAYOUT RECEIPT', { font: 'F3', size: 9, color: MUTED });
  text(M, 66, `Generated on ${new Date().toISOString().split('T')[0]}`, { size: 8, color: MUTED });

  // Amount / status card
  const T = 86;
  rect(M, T, W, 84, CARD);
  rect(M, T, 5, 84, statusColor);
  text(M + 18, T + 24, 'PAYOUT AMOUNT', { size: 7.5, color: MUTED });
  text(M + 18, T + 52, rs(payout.amount), { font: 'F2', size: 24, color: ESPRESSO });
  text(M + 18, T + 70, `Reference: ${payout.reference || payout.id}`, { font: 'F3', size: 9, color: MUTED });
  text(M + W - 150, T + 24, 'STATUS', { size: 7.5, color: MUTED });
  text(M + W - 150, T + 44, String(payout.status).toUpperCase(), { font: 'F2', size: 14, color: statusColor });
  text(M + W - 150, T + 64, `Method: ${payout.method}`, { size: 8.5, color: MUTED });

  // Payee
  let y = T + 118;
  text(M, y, 'PAYEE (ORGANIZER)', { font: 'F2', size: 10, color: ESPRESSO });
  y += 6; line(M, y, M + W, y); y += 18;
  const row = (label, value, opts = {}) => {
    text(M, y, label, { size: 9, color: MUTED });
    text(M + 200, y, value || '—', { font: 'F1', size: 9, ...opts });
    y += 17;
  };
  row('Organizer', payout.organizerName);
  row('Agency', payout.agencyName);
  row('Email', payout.organizerEmail);

  // Destination
  y += 10;
  text(M, y, 'DESTINATION ACCOUNT', { font: 'F2', size: 10, color: ESPRESSO });
  y += 6; line(M, y, M + W, y); y += 18;
  const bank = payout.bank || {};
  if (payout.method === 'UPI' && bank.upiId) {
    row('UPI ID', bank.upiId);
  } else {
    row('Account Holder', bank.accountHolderName);
    row('Bank', bank.bankName);
    row('Account No.', bank.accountNumberMasked);
    row('IFSC', bank.ifsc);
  }

  // Settlement
  y += 10;
  text(M, y, 'SETTLEMENT', { font: 'F2', size: 10, color: ESPRESSO });
  y += 6; line(M, y, M + W, y); y += 18;
  row('Requested On', fmtDate(payout.requestedAt));
  if (payout.status === 'Paid') {
    row('Settled On', fmtDate(payout.completedAt));
    row('UTR / Txn Ref', payout.utr, { font: 'F2', color: GREEN });
  }
  if (payout.status === 'Rejected') {
    row('Rejected On', fmtDate(payout.completedAt));
    row('Reason', payout.rejectionReason, { color: RED });
  }
  if (payout.settledBy) row('Settled By', payout.settledBy);

  // Total strip
  y += 8;
  dashed(M, y, M + W, y); y += 22;
  text(M, y, 'NET AMOUNT TRANSFERRED', { font: 'F2', size: 11 });
  text(M + W - 140, y, payout.status === 'Paid' ? rs(payout.amount) : rs(0), { font: 'F2', size: 13, color: statusColor });

  // Footer
  y += 40;
  text(M, y, 'This is a system-generated payout receipt from the Trekigo platform.', { size: 8, color: MUTED });
  y += 12;
  text(M, y, 'For settlement queries, contact partners@trekigo.com quoting the reference above.', { size: 8, color: MUTED });

  // Assemble
  const stream = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Trekigo-Payout-${payout.reference || payout.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
