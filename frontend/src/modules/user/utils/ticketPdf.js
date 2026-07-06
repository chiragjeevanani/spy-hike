/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Dependency-free PDF ticket generator. Hand-writes a single-page PDF
// (boarding-pass ticket + hiker roster + bill summary) and downloads it.
//
// PDF text uses standard Helvetica/Courier fonts which only cover ASCII,
// so the rupee glyph is written as "Rs." and other non-ASCII is stripped.

const A4_W = 595;
const A4_H = 842;

const clean = (value) =>
  String(value ?? '')
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

// Same seed logic as the on-screen TravelTicket barcode.
const barcodePattern = (seed = 'SPYHIKE') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31 + seed.charCodeAt(i)) & 0x7fffffff) >>> 0;
  const bars = [];
  for (let i = 0; i < 36; i++) {
    h = ((h * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    bars.push((h % 3) + 1);
  }
  return bars;
};

export function downloadTicketPDF(booking) {
  const ops = [];

  // y is measured from the top of the page for readability; PDF origin is
  // bottom-left, so flip when emitting.
  const yy = (fromTop) => A4_H - fromTop;

  const rect = (x, yTop, w, h, [r, g, b]) => {
    ops.push(`${r} ${g} ${b} rg ${x} ${yy(yTop) - h} ${w} ${h} re f`);
  };

  const text = (x, yTop, str, { font = 'F1', size = 9, color = [0.13, 0.11, 0.09] } = {}) => {
    const [r, g, b] = color;
    ops.push(`BT /${font} ${size} Tf ${r} ${g} ${b} rg ${x} ${yy(yTop)} Td (${clean(str)}) Tj ET`);
  };

  const dashedLine = (x1, y1Top, x2, y2Top, [r, g, b] = [0.65, 0.6, 0.55]) => {
    ops.push(`[3 3] 0 d ${r} ${g} ${b} RG 1 w ${x1} ${yy(y1Top)} m ${x2} ${yy(y2Top)} l S [] 0 d`);
  };

  const line = (x1, y1Top, x2, y2Top, [r, g, b] = [0.85, 0.82, 0.78]) => {
    ops.push(`${r} ${g} ${b} RG 0.8 w ${x1} ${yy(y1Top)} m ${x2} ${yy(y2Top)} l S`);
  };

  // Brand palette (matches the app's brown theme)
  const BROWN = [0.61, 0.4, 0.27];      // #9c6644
  const ESPRESSO = [0.5, 0.33, 0.22];   // #7f5539
  const INK = [0.13, 0.11, 0.09];
  const MUTED = [0.48, 0.42, 0.37];
  const GREEN = [0.02, 0.59, 0.41];
  const CARD = [0.985, 0.975, 0.96];

  const M = 40;               // page margin
  const TICKET_W = A4_W - M * 2;
  const stubX = M + TICKET_W - 130;

  // ---------- Page header ----------
  text(M, 52, 'SPYHIKE', { font: 'F2', size: 18, color: BROWN });
  text(M + 92, 52, 'TREK BOARDING PASS', { font: 'F3', size: 9, color: MUTED });
  text(M, 66, `Generated on ${new Date().toISOString().split('T')[0]}`, { size: 8, color: MUTED });

  // ---------- Ticket ----------
  const T = 84;               // ticket top
  const TH = 190;             // ticket height

  rect(M, T, TICKET_W, TH, CARD);
  // Header band
  rect(M, T, TICKET_W, 30, BROWN);
  text(M + 14, T + 20, 'SPYHIKE  //  TREK BOARDING PASS', { font: 'F2', size: 10, color: [1, 1, 1] });
  text(stubX + 14, T + 20, 'TREK PASS', { font: 'F3', size: 8, color: [1, 1, 1] });
  // Stub perforation
  dashedLine(stubX, T + 30, stubX, T + TH);

  const leadHiker = booking.travelers?.[0]?.name || 'Registered Hiker';

  // Main pane fields
  const L = M + 14;
  text(L, T + 50, 'HIKER', { size: 6.5, color: MUTED });
  text(L, T + 63, leadHiker.toUpperCase(), { font: 'F2', size: 11 });

  text(L, T + 82, 'EXPEDITION', { size: 6.5, color: MUTED });
  text(L, T + 95, booking.tripName, { font: 'F2', size: 11 });
  text(L, T + 107, booking.tripLocation, { size: 8.5, color: MUTED });

  const col2 = L + 190;
  const col3 = L + 300;
  text(L, T + 126, 'DEPARTURE', { size: 6.5, color: MUTED });
  text(L, T + 138, booking.selectedDate, { font: 'F3', size: 10 });
  text(col2, T + 126, 'HIKERS', { size: 6.5, color: MUTED });
  text(col2, T + 138, `${booking.travelersCount} PAX`, { font: 'F2', size: 10 });
  text(col3, T + 126, 'STATUS', { size: 6.5, color: MUTED });
  text(col3, T + 138, String(booking.status).toUpperCase(), {
    font: 'F2', size: 10,
    color: booking.status === 'Cancelled' ? [0.86, 0.15, 0.3] : GREEN
  });

  text(L, T + 156, 'ORGANIZER', { size: 6.5, color: MUTED });
  text(L, T + 168, booking.organizerName, { font: 'F2', size: 9.5 });

  // Barcode (bottom-left of main pane)
  const bars = barcodePattern(booking.bookingId || booking.id);
  let bx = col2;
  for (const w of bars) {
    rect(bx, T + 150, w, 24, INK);
    bx += w + 1.5;
  }
  text(col2, T + 184, booking.bookingId, { font: 'F3', size: 8, color: MUTED });

  // Stub fields
  const S = stubX + 14;
  text(S, T + 50, 'PERMIT', { size: 6.5, color: MUTED });
  text(S, T + 62, booking.bookingId, { font: 'F3', size: 9 });
  text(S, T + 80, 'DATE', { size: 6.5, color: MUTED });
  text(S, T + 92, booking.selectedDate, { font: 'F3', size: 9 });
  text(S, T + 110, 'PAX', { size: 6.5, color: MUTED });
  text(S, T + 122, String(booking.travelersCount), { font: 'F2', size: 9 });
  text(S, T + 140, 'FARE', { size: 6.5, color: MUTED });
  text(S, T + 152, `Rs.${booking.finalAmount}`, { font: 'F2', size: 10, color: ESPRESSO });
  text(S, T + 176, 'SCAN AT BASE CAMP', { size: 6, color: MUTED });

  // ---------- Hikers roster ----------
  let y = T + TH + 34;
  text(M, y, 'HIKERS ROSTER', { font: 'F2', size: 10, color: ESPRESSO });
  y += 6;
  line(M, y, M + TICKET_W, y);
  y += 16;

  const travelers = booking.travelers?.length
    ? booking.travelers
    : [{ name: leadHiker, age: '-', gender: '-', emergencyContact: '-' }];

  travelers.forEach((t, i) => {
    text(M, y, `${i + 1}. ${t.name}`, { font: 'F2', size: 9 });
    text(M + 200, y, `Age: ${t.age}   Gender: ${t.gender}`, { size: 8.5, color: MUTED });
    text(M + 350, y, `SOS: ${t.emergencyContact}`, { size: 8.5, color: MUTED });
    y += 16;
  });

  // ---------- Bill summary ----------
  y += 14;
  text(M, y, 'SETTLED BILL SUMMARY', { font: 'F2', size: 10, color: ESPRESSO });
  y += 6;
  line(M, y, M + TICKET_W, y);
  y += 16;

  const billRow = (label, value, opts = {}) => {
    text(M, y, label, { size: 9, color: MUTED });
    text(M + 380, y, value, { font: 'F2', size: 9, ...opts });
    y += 15;
  };

  billRow('Base Booking Fee', `Rs.${booking.finalAmount}`);
  if (booking.couponUsed) {
    billRow(`Coupon Applied (${booking.couponUsed})`, `- Rs.${booking.couponDiscount}`, { color: GREEN });
  }
  billRow('Permit Royalties & Tax', booking.taxAmount ? `Rs.${booking.taxAmount}` : 'Included', { color: GREEN });
  y += 2;
  dashedLine(M, y - 8, M + TICKET_W, y - 8);
  text(M, y + 6, 'TOTAL VALUE CLEARED', { font: 'F2', size: 10 });
  text(M + 380, y + 6, `Rs.${booking.finalAmount}`, { font: 'F2', size: 11, color: GREEN });
  y += 30;

  // ---------- Footer notes ----------
  text(M, y, `Booked on: ${booking.bookingDate}    Permit Reference: ${booking.bookingId}`, { size: 8, color: MUTED });
  y += 14;
  text(M, y, 'Flexible Cancellation: 100% refund available up to 48 hours prior to the departure date.', { size: 8, color: MUTED });
  y += 12;
  text(M, y, 'Carry a government ID matching the lead hiker name. Show this pass at base camp gate control.', { size: 8, color: MUTED });

  // ---------- Assemble the PDF ----------
  const stream = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Contents 4 0 R ` +
      '/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SpyHike-Ticket-${booking.bookingId || booking.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
