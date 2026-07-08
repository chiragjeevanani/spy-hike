/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Admin-managed discount coupons, shared across the customer checkout flow
// and the admin console. Same-origin localStorage, no server — consistent
// with the rest of this demo (see utils/loyalty.js for the sibling pattern).
//
// Coupon shape:
// { id, code, type: 'flat' | 'percentage', value, maxDiscount (percentage cap,
//   optional), minBookingAmount, expiresAt ('YYYY-MM-DD' or null = never),
//   status: 'Active' | 'Inactive' | 'Expired', usedCount, createdAt, updatedAt }

const COUPONS_KEY = 'trekigo_coupons';

// Seeded to match the codes/discounts already referenced by the promo
// banners on the customer home feed (see modules/user/data/trips.js), so
// those banners keep working once coupons became admin-managed instead of
// hardcoded in the booking flow.
const SEED_COUPONS = [
  {
    id: 'cp-seed-1',
    code: 'TREKIGO20',
    type: 'percentage',
    value: 20,
    maxDiscount: null,
    minBookingAmount: 0,
    expiresAt: '2026-12-31',
    status: 'Active',
    usedCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cp-seed-2',
    code: 'VALLEY50',
    type: 'flat',
    value: 50,
    maxDiscount: null,
    minBookingAmount: 0,
    expiresAt: '2026-12-31',
    status: 'Active',
    usedCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cp-seed-3',
    code: 'GHATS15',
    type: 'percentage',
    value: 15,
    maxDiscount: null,
    minBookingAmount: 0,
    expiresAt: '2026-12-31',
    status: 'Active',
    usedCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const todayStr = () => new Date().toISOString().split('T')[0];

const persist = (coupons) => {
  localStorage.setItem(COUPONS_KEY, JSON.stringify(coupons));
  return coupons;
};

// A coupon whose expiry date has passed is auto-flipped to 'Expired' on every
// load — this self-heals regardless of who last touched it, so an expired
// code goes inactive on its own without any admin action.
const applyAutoExpiry = (coupons) => {
  let changed = false;
  const today = todayStr();
  const next = coupons.map(c => {
    if (c.expiresAt && c.expiresAt < today && c.status !== 'Expired') {
      changed = true;
      return { ...c, status: 'Expired' };
    }
    return c;
  });
  if (changed) persist(next);
  return next;
};

export const loadCoupons = () => {
  try {
    const val = localStorage.getItem(COUPONS_KEY);
    const coupons = val ? JSON.parse(val) : persist(SEED_COUPONS);
    return applyAutoExpiry(coupons);
  } catch (e) {
    console.error(e);
    return SEED_COUPONS;
  }
};

export const createCoupon = (fields) => {
  const coupons = loadCoupons();
  const newCoupon = {
    id: `cp-${Date.now()}`,
    code: (fields.code || '').trim().toUpperCase(),
    type: fields.type === 'flat' ? 'flat' : 'percentage',
    value: Math.max(0, Number(fields.value) || 0),
    maxDiscount: fields.maxDiscount ? Math.max(0, Number(fields.maxDiscount)) : null,
    minBookingAmount: fields.minBookingAmount ? Math.max(0, Number(fields.minBookingAmount)) : 0,
    expiresAt: fields.expiresAt || null,
    status: 'Active',
    usedCount: 0,
    createdAt: new Date().toISOString(),
  };
  persist([...coupons, newCoupon]);
  return newCoupon;
};

export const updateCoupon = (id, fields) => {
  const coupons = loadCoupons();
  const idx = coupons.findIndex(c => c.id === id);
  if (idx < 0) return null;

  const merged = { ...coupons[idx], ...fields, updatedAt: new Date().toISOString() };
  // Renewing an expired coupon's date (pushing it back into the future)
  // revives it to Active, unless the admin also explicitly set it Inactive.
  if (merged.expiresAt && merged.expiresAt >= todayStr() && coupons[idx].status === 'Expired' && fields.status !== 'Inactive') {
    merged.status = 'Active';
  }
  coupons[idx] = merged;
  persist(coupons);
  return merged;
};

// Manual Active <-> Inactive toggle. An Expired coupon can't be reactivated
// this way — its expiry must be renewed first (via updateCoupon) since an
// expired code should never silently come back just by flipping a switch.
export const toggleCouponStatus = (id) => {
  const coupons = loadCoupons();
  const idx = coupons.findIndex(c => c.id === id);
  if (idx < 0 || coupons[idx].status === 'Expired') return null;
  coupons[idx] = { ...coupons[idx], status: coupons[idx].status === 'Active' ? 'Inactive' : 'Active' };
  persist(coupons);
  return coupons[idx];
};

export const deleteCoupon = (id) => {
  persist(loadCoupons().filter(c => c.id !== id));
};

// Case-insensitive lookup + full eligibility check used by the customer
// checkout flow. Returns the computed discount amount so callers don't have
// to re-derive flat-vs-percentage math themselves.
export const validateCouponCode = (code, bookingAmount = 0) => {
  const formatted = (code || '').trim().toUpperCase();
  if (!formatted) return { ok: false, message: 'Please enter a coupon code.' };

  const coupon = loadCoupons().find(c => c.code === formatted);
  if (!coupon) return { ok: false, message: 'Invalid coupon code.' };
  if (coupon.status === 'Expired') return { ok: false, message: 'This coupon has expired.' };
  if (coupon.status === 'Inactive') return { ok: false, message: 'This coupon is not currently active.' };
  if (coupon.minBookingAmount && bookingAmount < coupon.minBookingAmount) {
    return { ok: false, message: `This coupon needs a minimum booking value of ₹${coupon.minBookingAmount}.` };
  }

  let discountAmount = coupon.type === 'flat'
    ? coupon.value
    : (bookingAmount * coupon.value) / 100;
  if (coupon.type === 'percentage' && coupon.maxDiscount) {
    discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  }
  discountAmount = Math.round(Math.min(discountAmount, bookingAmount) * 100) / 100;

  return {
    ok: true,
    coupon,
    discountAmount,
    message: coupon.type === 'flat'
      ? `Success! Coupon applied: ₹${coupon.value} off.`
      : `Success! Coupon applied: ${coupon.value}% off.`,
  };
};

export const markCouponUsed = (codeOrId) => {
  const coupons = loadCoupons();
  const idx = coupons.findIndex(c => c.id === codeOrId || c.code === codeOrId);
  if (idx < 0) return;
  coupons[idx] = { ...coupons[idx], usedCount: (coupons[idx].usedCount || 0) + 1 };
  persist(coupons);
};
