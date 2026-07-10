import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// GET /wishlist — the customer's bookmarked trip ids.
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) throw ApiError.notFound('Account not found');
  res.json({ wishlist: user.wishlist || [] });
});

// PUT /wishlist { wishlist: [tripId] } — replace the whole list (matches the
// frontend's saveWishlist(array) call).
export const setWishlist = asyncHandler(async (req, res) => {
  const list = Array.isArray(req.body.wishlist) ? [...new Set(req.body.wishlist.map(String))] : [];
  const user = await User.findByIdAndUpdate(req.user.sub, { wishlist: list }, { new: true });
  if (!user) throw ApiError.notFound('Account not found');
  res.json({ wishlist: user.wishlist });
});
