import Payout from '../models/Payout.js';
import Booking, { SETTLED_BOOKING_FILTER } from '../models/Booking.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyOrganizer } from '../services/notificationService.js';

import { autoResolveBookingStatuses } from '../utils/bookingStatusHelper.js';

// Format checks for a real payout destination — this data drives where money
// actually gets sent, so it's validated for real rather than trusted as-is.
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
const UPI_REGEX = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]{1}$/;

// Available balance = organizer payout earned on non-cancelled bookings minus
// everything already requested/settled (Processing + Paid payouts). Refunds
// need no reversal here because cancelled bookings are simply excluded.
//
// Bookings whose online payment never landed are excluded too, and that
// exclusion is load-bearing: without it an organizer could withdraw real money
// against a checkout a customer abandoned at the payment screen.
async function computeAvailable(organizerEmail) {
  await autoResolveBookingStatuses();
  const [bookings, payouts] = await Promise.all([
    Booking.find({ organizerEmail, status: { $ne: 'Cancelled' }, ...SETTLED_BOOKING_FILTER }),
    Payout.find({ organizerEmail, status: { $in: ['Processing', 'Paid'] } }),
  ]);
  const earned = bookings.reduce((s, b) => s + (b.organizerPayout || 0), 0);
  const committed = payouts.reduce((s, p) => s + p.amount, 0);
  return { earned, committed, available: Math.max(0, Math.round((earned - committed) * 100) / 100) };
}

// GET /organizer/financials — balance summary + payout history.
export const getOrganizerFinancials = asyncHandler(async (req, res) => {
  const email = req.organizer.email;
  const { earned, committed, available } = await computeAvailable(email);
  const payouts = await Payout.find({ organizerEmail: email }).sort({ createdAt: -1 });
  const paidOut = payouts.filter((p) => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  res.json({
    financials: { totalEarned: earned, totalCommitted: committed, available, totalPaidOut: paidOut },
    payouts: payouts.map((p) => p.toPublicJSON()),
  });
});

// GET /organizer/payouts — payout history.
export const listOrganizerPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find({ organizerEmail: req.organizer.email }).sort({ createdAt: -1 });
  res.json({ payouts: payouts.map((p) => p.toPublicJSON()) });
});

// A short human reference like PO-2026-000042 (sequential-ish per year).
async function nextReference() {
  const year = new Date().getFullYear();
  const count = await Payout.countDocuments();
  return `PO-${year}-${String(count + 1).padStart(6, '0')}`;
}

// POST /organizer/payouts { amount } — request a payout, capped at the
// available balance and requiring a configured payout method.
export const requestPayout = asyncHandler(async (req, res) => {
  const amount = Math.round((Number(req.body.amount) || 0) * 100) / 100;
  if (amount <= 0) throw ApiError.badRequest('Payout amount must be greater than zero');

  const bank = req.organizer.bankDetails || {};
  const hasUpi = !!bank.upiId?.trim();
  const hasBank = !!(bank.accountNumber?.trim() && bank.ifsc?.trim());
  if (!hasUpi && !hasBank) {
    throw ApiError.badRequest('Add a UPI id or bank account before requesting a payout');
  }

  const { available } = await computeAvailable(req.organizer.email);
  if (amount > available) {
    throw ApiError.badRequest(`Requested amount exceeds your available balance of ₹${available}`);
  }

  const payout = await Payout.create({
    organizerEmail: req.organizer.email,
    organizerName: req.organizer.name,
    agencyName: req.organizer.agencyName,
    amount,
    method: hasUpi ? 'UPI' : 'Bank Transfer',
    status: 'Processing',
    reference: await nextReference(),
    bankSnapshot: {
      accountHolderName: bank.accountHolderName,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      ifsc: bank.ifsc,
      upiId: bank.upiId,
    },
  });
  res.status(201).json({ payout: payout.toPublicJSON() });
});

// PATCH /organizer/bank-details — update payout bank/UPI details.
export const updateBankDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user || !user.isOrganizer) throw ApiError.notFound('Organizer not found');
  const { accountHolderName, bankName, accountNumber, ifsc, upiId, panNumber } = req.body;

  if (accountHolderName !== undefined && !accountHolderName.trim()) {
    throw ApiError.badRequest('Account holder name is required');
  }
  if (upiId !== undefined && upiId.trim() && !UPI_REGEX.test(upiId.trim())) {
    throw ApiError.badRequest('Enter a valid UPI ID (e.g. name@bank)');
  }
  // Bank account fields are all-or-nothing: if any one is being set with real
  // content, all three are required and format-checked together.
  const settingBank = [bankName, accountNumber, ifsc].some((v) => v !== undefined && v.trim());
  if (settingBank) {
    if (!bankName?.trim()) throw ApiError.badRequest('Bank name is required');
    if (!accountNumber || !ACCOUNT_NUMBER_REGEX.test(accountNumber.trim())) {
      throw ApiError.badRequest('Enter a valid bank account number (9-18 digits)');
    }
    if (!ifsc || !IFSC_REGEX.test(ifsc.trim().toUpperCase())) {
      throw ApiError.badRequest('Enter a valid IFSC code (e.g. HDFC0001234)');
    }
  }
  if (panNumber !== undefined && panNumber.trim() && !PAN_REGEX.test(panNumber.trim().toUpperCase())) {
    throw ApiError.badRequest('Enter a valid PAN number (e.g. ABCDE1234F)');
  }

  const org = user.organizer || {};
  org.bankDetails = { ...(org.bankDetails?.toObject?.() ?? org.bankDetails ?? {}), ...req.body };
  user.organizer = org;
  await user.save();
  res.json({ organizer: user.toOrganizerJSON() });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// GET /admin/payouts?status=&search= — all payout requests, filterable, with a
// report summary for the dashboard header.
export const listAllPayouts = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status && ['Processing', 'Paid', 'Rejected'].includes(status)) filter.status = status;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ organizerName: rx }, { agencyName: rx }, { organizerEmail: rx }, { reference: rx }, { utr: rx }];
  }

  const [payouts, all] = await Promise.all([
    Payout.find(filter).sort({ createdAt: -1 }),
    Payout.find().select('amount status'),
  ]);
  const sumBy = (s) => all.filter((p) => p.status === s).reduce((t, p) => t + p.amount, 0);
  const countBy = (s) => all.filter((p) => p.status === s).length;
  res.json({
    payouts: payouts.map((p) => p.toPublicJSON()),
    summary: {
      pendingAmount: Math.round(sumBy('Processing') * 100) / 100,
      paidAmount: Math.round(sumBy('Paid') * 100) / 100,
      rejectedAmount: Math.round(sumBy('Rejected') * 100) / 100,
      pendingCount: countBy('Processing'),
      paidCount: countBy('Paid'),
      rejectedCount: countBy('Rejected'),
      totalCount: all.length,
    },
  });
});

// PATCH /admin/payouts/:id { action: 'approve' | 'reject', reason? } — settle a
// payout. Approving stamps a UTR; rejecting records a reason and frees the
// amount back to the organizer's available balance. The organizer is notified.
export const settlePayout = asyncHandler(async (req, res) => {
  const payout = await Payout.findById(req.params.id);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status !== 'Processing') {
    throw ApiError.badRequest(`This payout is already ${payout.status.toLowerCase()}`);
  }
  payout.settledBy = req.user.email;

  if (req.body.action === 'approve') {
    payout.status = 'Paid';
    payout.completedAt = new Date();
    payout.utr = `UTR${Date.now().toString().slice(-10)}`;
    await payout.save();
    await notifyOrganizer(payout.organizerEmail, {
      title: '💸 Payout Settled',
      content: `Your payout ${payout.reference} of ₹${payout.amount} has been paid (UTR ${payout.utr}).`,
      type: 'Payment',
    });
  } else if (req.body.action === 'reject') {
    payout.status = 'Rejected';
    payout.completedAt = new Date();
    payout.rejectionReason = (req.body.reason || 'Rejected by admin').trim();
    await payout.save();
    await notifyOrganizer(payout.organizerEmail, {
      title: '⚠️ Payout Rejected',
      content: `Your payout ${payout.reference} of ₹${payout.amount} was rejected: ${payout.rejectionReason}. The amount is back in your available balance.`,
      type: 'Payment',
    });
  } else {
    throw ApiError.badRequest("action must be 'approve' or 'reject'");
  }
  res.json({ payout: payout.toPublicJSON() });
});
