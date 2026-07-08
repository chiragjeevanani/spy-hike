// Dependency-free PDF financial report generator (same hand-written PDF
// approach as ../../user/utils/ticketPdf.js). Unlike the single-page ticket,
// this report can span multiple pages once the transaction/payout tables
// grow, so it tracks a per-page ops buffer and breaks pages on overflow.
//
// PDF text uses standard Helvetica/Courier fonts which only cover ASCII,
// so the rupee glyph is written as "Rs." and other non-ASCII is stripped.

const A4_W = 595;
const A4_H = 842;
const M = 40;
const CONTENT_W = A4_W - M * 2;
const CONTENT_BOTTOM = A4_H - M; // max "distance from top" any content may reach

const BROWN = [0.61, 0.4, 0.27];      // #9c6644
const ESPRESSO = [0.5, 0.33, 0.22];   // #7f5539
const INK = [0.13, 0.11, 0.09];
const MUTED = [0.48, 0.42, 0.37];
const GREEN = [0.02, 0.59, 0.41];
const RED = [0.75, 0.15, 0.2];
const CARD = [0.97, 0.96, 0.94];
const STRIPE = [0.965, 0.955, 0.94];
const LINE_COL = [0.85, 0.82, 0.78];
const WHITE = [1, 1, 1];

const clean = (value) =>
  String(value ?? '')
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const rs = (n) => `Rs.${Math.round(n || 0).toLocaleString('en-IN')}`;
const trunc = (s, n) => { s = String(s ?? ''); return s.length > n ? `${s.slice(0, n - 3)}...` : s; };

const commissionOf = (b) => b.commissionAmount !== undefined ? b.commissionAmount : (b.finalAmount || 0) * 0.1;
const netOf = (b) => (b.finalAmount || 0) - commissionOf(b);

export function downloadFinancialReportPDF({ organizer, bookings, payouts }) {
  const activeBookings = bookings.filter(b => b.status !== 'Cancelled').slice().reverse();
  const completed = bookings.filter(b => b.status === 'Completed');
  const upcoming = bookings.filter(b => b.status === 'Upcoming');

  const totalGross = activeBookings.reduce((s, b) => s + (b.finalAmount || 0), 0);
  const totalCommission = activeBookings.reduce((s, b) => s + commissionOf(b), 0);
  const totalNet = totalGross - totalCommission;
  const settledNet = completed.reduce((s, b) => s + netOf(b), 0);
  const pendingNet = upcoming.reduce((s, b) => s + netOf(b), 0);
  const paidOut = payouts.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const processingAmt = payouts.filter(p => p.status === 'Processing').reduce((s, p) => s + p.amount, 0);
  const availableBalance = Math.max(0, settledNet - paidOut - processingAmt);

  // ---------- Multi-page ops buffer ----------
  const pagesOps = [[]];
  let pageIndex = 0;
  let y = 0;

  const yy = (fromTop) => A4_H - fromTop;
  const op = (str) => pagesOps[pageIndex].push(str);

  const rect = (x, yTop, w, h, [r, g, b]) => op(`${r} ${g} ${b} rg ${x} ${yy(yTop) - h} ${w} ${h} re f`);
  const text = (x, yTop, str, { font = 'F1', size = 9, color = INK } = {}) => {
    const [r, g, b] = color;
    op(`BT /${font} ${size} Tf ${r} ${g} ${b} rg ${x} ${yy(yTop)} Td (${clean(str)}) Tj ET`);
  };
  const line = (x1, y1Top, x2, y2Top, [r, g, b] = LINE_COL) =>
    op(`${r} ${g} ${b} RG 0.8 w ${x1} ${yy(y1Top)} m ${x2} ${yy(y2Top)} l S`);

  const drawContinuationHeader = () => {
    text(M, 36, 'TREKIGO', { font: 'F2', size: 13, color: BROWN });
    text(M + 78, 36, 'FINANCIAL REPORT (continued)', { font: 'F3', size: 8, color: MUTED });
    line(M, 46, A4_W - M, 46);
    y = 66;
  };

  const newPage = () => {
    pageIndex++;
    pagesOps.push([]);
    drawContinuationHeader();
  };

  const ensureSpace = (needed) => {
    if (y + needed > CONTENT_BOTTOM) newPage();
  };

  // ---------- Page 1 header ----------
  text(M, 40, 'TREKIGO', { font: 'F2', size: 20, color: BROWN });
  text(M + 112, 40, 'FINANCIAL REPORT', { font: 'F3', size: 10, color: MUTED });
  text(M, 58, `${organizer?.agencyName || organizer?.name || 'Partner'}  -  ${organizer?.email || ''}`, { size: 9, color: MUTED });
  text(M, 72, `Generated ${new Date().toLocaleString('en-IN')}  -  Report Period: All-Time`, { size: 8, color: MUTED });
  line(M, 82, A4_W - M, 82);
  y = 104;

  // ---------- Summary grid (2 cols x 3 rows) ----------
  const stats = [
    { label: 'TOTAL GROSS REVENUE', value: rs(totalGross) },
    { label: 'PLATFORM COMMISSION', value: `-${rs(totalCommission)}`, color: RED },
    { label: 'TOTAL NET EARNINGS', value: rs(totalNet), color: GREEN },
    { label: 'AVAILABLE BALANCE', value: rs(availableBalance), color: GREEN },
    { label: 'PENDING SETTLEMENT', value: rs(pendingNet) },
    { label: 'TOTAL PAID OUT', value: rs(paidOut) },
  ];
  const gap = 12;
  const boxW = (CONTENT_W - gap) / 2;
  const boxH = 54;
  const rowGap = 60;
  stats.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * (boxW + gap);
    const boxTop = y + row * rowGap;
    rect(x, boxTop, boxW, boxH, CARD);
    text(x + 12, boxTop + 18, s.label, { font: 'F3', size: 6.5, color: MUTED });
    text(x + 12, boxTop + 40, s.value, { font: 'F2', size: 14, color: s.color || INK });
  });
  y += 3 * rowGap + 6;

  // ---------- Payout method on file ----------
  const bank = organizer?.bankDetails || {};
  const hasPayoutMethod = !!(bank.upiId?.trim()) || !!(bank.accountNumber?.trim() && bank.ifsc?.trim());
  ensureSpace(46);
  text(M, y, 'PAYOUT METHOD ON FILE', { font: 'F2', size: 10, color: ESPRESSO });
  y += 6; line(M, y, A4_W - M, y); y += 16;
  if (hasPayoutMethod) {
    const methodLine = bank.upiId?.trim()
      ? `UPI: ${bank.upiId}`
      : `${bank.bankName || 'Bank Account'}  -  A/C ...${(bank.accountNumber || '').slice(-4)}  -  IFSC ${bank.ifsc}`;
    text(M, y, methodLine, { font: 'F3', size: 9 });
    y += 14;
    text(M, y, `Account Holder: ${bank.accountHolderName || '-'}${bank.panNumber ? `   PAN: ${bank.panNumber}` : ''}`, { size: 8, color: MUTED });
    y += 20;
  } else {
    text(M, y, 'No payout method configured yet.', { size: 9, color: MUTED });
    y += 20;
  }

  // ---------- Generic table drawer ----------
  const drawTable = (title, columns, rows) => {
    ensureSpace(40);
    text(M, y, title, { font: 'F2', size: 10, color: ESPRESSO });
    y += 6; line(M, y, A4_W - M, y); y += 14;

    const drawHeader = () => {
      rect(M, y, CONTENT_W, 20, ESPRESSO);
      let cx = M;
      columns.forEach(col => {
        text(cx + 6, y + 14, col.label, { font: 'F2', size: 7, color: WHITE });
        cx += col.width;
      });
      y += 20;
    };

    if (rows.length === 0) {
      text(M, y, 'No records yet.', { size: 8.5, color: MUTED });
      y += 20;
      return;
    }

    drawHeader();
    rows.forEach((cells, i) => {
      if (y + 18 > CONTENT_BOTTOM) {
        newPage();
        text(M, y, `${title} (continued)`, { font: 'F2', size: 9, color: ESPRESSO });
        y += 16;
        drawHeader();
      }
      if (i % 2 === 1) rect(M, y, CONTENT_W, 18, STRIPE);
      let cx = M;
      columns.forEach((col, ci) => {
        const cell = cells[ci] || {};
        text(cx + 6, y + 13, cell.text ?? '', { size: 7.5, font: cell.font || 'F1', color: cell.color || INK });
        cx += col.width;
      });
      y += 18;
    });
    y += 16;
  };

  // ---------- Transaction statement ----------
  const statementColumns = [
    { label: 'TRIP', width: 140 },
    { label: 'BOOKING ID', width: 75 },
    { label: 'DATE', width: 65 },
    { label: 'STATUS', width: 55 },
    { label: 'GROSS', width: 60 },
    { label: 'COMM.', width: 55 },
    { label: 'NET', width: 65 },
  ];
  const statementRows = activeBookings.map(b => ([
    { text: trunc(b.tripName, 22) },
    { text: b.bookingId || b.id, font: 'F3' },
    { text: b.selectedDate || '-' },
    { text: b.status, color: b.status === 'Completed' ? GREEN : [0.7, 0.5, 0.05] },
    { text: rs(b.finalAmount) },
    { text: b.loyaltyRewardApplied ? 'Rs.0' : `-${rs(commissionOf(b))}`, color: RED },
    { text: rs(netOf(b)), color: GREEN, font: 'F2' },
  ]));
  drawTable('TRANSACTION STATEMENT', statementColumns, statementRows);

  // ---------- Payout history ----------
  const payoutColumns = [
    { label: 'REQUESTED', width: 85 },
    { label: 'AMOUNT', width: 80 },
    { label: 'METHOD', width: 90 },
    { label: 'STATUS', width: 70 },
    { label: 'REFERENCE (UTR)', width: 190 },
  ];
  const payoutRows = payouts.slice().reverse().map(p => ([
    { text: new Date(p.requestedAt).toLocaleDateString('en-IN') },
    { text: rs(p.amount), font: 'F2' },
    { text: p.method },
    { text: p.status, color: p.status === 'Paid' ? GREEN : p.status === 'Processing' ? [0.7, 0.5, 0.05] : RED },
    { text: p.utr || '-', font: 'F3' },
  ]));
  drawTable('PAYOUT HISTORY', payoutColumns, payoutRows);

  // ---------- Footer on every page ----------
  const totalPages = pagesOps.length;
  const FOOTER_PDF_Y = 24; // distance from the physical bottom edge, inside the page margin
  pagesOps.forEach((page, i) => {
    const footerStr = `Page ${i + 1} of ${totalPages}  |  Trekigo Partner Network - Confidential Financial Report`;
    page.push(`BT /F1 7 Tf ${MUTED[0]} ${MUTED[1]} ${MUTED[2]} rg ${M} ${FOOTER_PDF_Y} Td (${clean(footerStr)}) Tj ET`);
  });

  // ---------- Assemble the multi-page PDF ----------
  const numPages = pagesOps.length;
  const pageObjStart = 3;
  const contentObjStart = pageObjStart + numPages;
  const fontObjStart = contentObjStart + numPages;

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = Array.from({ length: numPages }, (_, i) => `${pageObjStart + i} 0 R`);
  objects.push(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${numPages} >>`);
  for (let i = 0; i < numPages; i++) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Contents ${contentObjStart + i} 0 R ` +
      `/Resources << /Font << /F1 ${fontObjStart} 0 R /F2 ${fontObjStart + 1} 0 R /F3 ${fontObjStart + 2} 0 R >> >> >>`
    );
  }
  for (let i = 0; i < numPages; i++) {
    const stream = pagesOps[i].join('\n');
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>');

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
  const stamp = new Date().toISOString().split('T')[0];
  a.download = `Trekigo-Financial-Report-${(organizer?.agencyName || organizer?.name || 'Partner').replace(/[^a-zA-Z0-9]+/g, '-')}-${stamp}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
