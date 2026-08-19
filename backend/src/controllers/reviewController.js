import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const todayStr = () => new Date().toISOString().split('T')[0];

// Recomputes a trip's rolled-up rating + reviewsCount and refreshes its
// denormalized reviews[] from the Review collection.
async function denormalizeTripReviews(tripId) {
  const reviews = await Review.find({ tripId }).sort({ createdAt: -1 });
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  await Trip.findByIdAndUpdate(tripId, {
    rating: Math.round(avg * 10) / 10,
    reviewsCount: count,
    reviews: reviews.map((r) => ({
      id: r._id.toString(),
      userName: r.userName,
      userAvatar: r.userAvatar,
      rating: r.rating,
      comment: r.comment,
      date: r.date,
    })),
  });
}

// POST /bookings/:bookingId/review { rating, comment } — a customer reviews a
// trip they booked. One review per booking; updates the trip's rollups.
export const createReview = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ bookingId: req.params.bookingId, userEmail: req.user.email });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (await Review.exists({ bookingId: booking.bookingId })) {
    throw ApiError.conflict('You have already reviewed this booking');
  }

  const rating = Number(req.body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw ApiError.badRequest('rating must be between 1 and 5');
  }
  if (!req.body.comment?.trim()) {
    throw ApiError.badRequest('A review comment is required');
  }

  const user = await User.findById(req.user.sub);
  const review = await Review.create({
    tripId: booking.tripId,
    bookingId: booking.bookingId,
    userEmail: req.user.email,
    userName: user?.name || booking.userName || 'Traveller',
    userAvatar: user?.avatar || '',
    rating,
    comment: req.body.comment.trim(),
    date: todayStr(),
  });

  await denormalizeTripReviews(booking.tripId);
  res.status(201).json({ review: review.toPublicJSON() });
});

// GET /reviews/mine — the signed-in customer's own reviews, newest first.
//
// Profile used to build this in the browser by scanning every trip's embedded
// `reviews` array for one matching the user's display name. That broke when
// list responses stopped shipping `reviews`, and it was wrong anyway: two
// customers with the same name saw each other's. Matching on userEmail against
// the Review collection is both correct and a single indexed query.
export const listMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ userEmail: req.user.email }).sort({ createdAt: -1 });

  // Profile shows which trip each review belongs to, so resolve the names in
  // one query rather than N.
  const tripIds = [...new Set(reviews.map((r) => r.tripId))];
  const trips = await Trip.find({ _id: { $in: tripIds } }).select('name');
  const nameById = new Map(trips.map((t) => [t._id, t.name]));

  res.json({
    reviews: reviews.map((r) => ({
      ...r.toPublicJSON(),
      tripName: nameById.get(r.tripId) || '',
    })),
  });
});

// GET /trips/:id/reviews — a trip's reviews (newest first).
export const listTripReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ tripId: req.params.id }).sort({ createdAt: -1 });
  res.json({ reviews: reviews.map((r) => r.toPublicJSON()) });
});
