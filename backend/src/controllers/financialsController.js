import Payout from '../models/Payout.js';
import Booking from '../models/Booking.js';
import Organizer from '../models/Organizer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Available balance = organizer payout earned on non-cancelled bookings minus
// everything already requested/settled (Processing + Paid payouts). Refunds
// need no reversal here because cancelled bookings are simply excluded.
async function computeAvailable(organizerEmail) {
  const [bookings, payouts] = await Promise.all([
    Booking.find({ organizerEmail, status: { $ne: 'Cancelled' } }),
    Payout.find({ organizerEmail, status: { $in: ['Processing', 'Paid'] } }),
  ]);
  const earned = bookings.reduce((s, b) => s + (b.organizerPayout || 0), 0);
  const committed = payouts.reduce((s, p) => s + p.amount, 0);
  return { earned, committed, available: Math.round((earned - committed) * 100) / 100 };
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

// POST /organizer/payouts { amount } — request a payout, capped at the
// available balance.
export const requestPayout = asyncHandler(async (req, res) => {
  const amount = Math.round((Number(req.body.amount) || 0) * 100) / 100;
  if (amount <= 0) throw ApiError.badRequest('Payout amount must be greater than zero');

  const { available } = await computeAvailable(req.organizer.email);
  if (amount > available) {
    throw ApiError.badRequest(`Requested amount exceeds your available balance of ₹${available}`);
  }

  const method = req.organizer.bankDetails?.upiId?.trim() ? 'UPI' : 'Bank Transfer';
  const payout = await Payout.create({ organizerEmail: req.organizer.email, amount, method, status: 'Processing' });
  res.status(201).json({ payout: payout.toPublicJSON() });
});

// PATCH /organizer/bank-details — update payout bank/UPI details.
export const updateBankDetails = asyncHandler(async (req, res) => {
  const org = await Organizer.findById(req.organizer._id);
  org.bankDetails = { ...org.bankDetails?.toObject?.() ?? org.bankDetails, ...req.body };
  await org.save();
  res.json({ organizer: org.toPublicJSON() });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// GET /admin/payouts — all payout requests.
export const listAllPayouts = asyncHandler(async (req, res) => {
  const payouts = await Payout.find().sort({ createdAt: -1 });
  res.json({ payouts: payouts.map((p) => p.toPublicJSON()) });
});

// PATCH /admin/payouts/:id { action: 'approve' | 'reject' } — settle a payout.
export const settlePayout = asyncHandler(async (req, res) => {
  const payout = await Payout.findById(req.params.id);
  if (!payout) throw ApiError.notFound('Payout not found');
  if (payout.status !== 'Processing') throw ApiError.badRequest('This payout has already been settled');

  if (req.body.action === 'approve') {
    payout.status = 'Paid';
    payout.completedAt = new Date();
    payout.utr = `UTR${Date.now().toString().slice(-10)}`;
  } else if (req.body.action === 'reject') {
    payout.status = 'Rejected';
    payout.completedAt = new Date();
  } else {
    throw ApiError.badRequest("action must be 'approve' or 'reject'");
  }
  await payout.save();
  res.json({ payout: payout.toPublicJSON() });
});
