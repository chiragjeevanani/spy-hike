import { getPromotionalBannersDoc, DEFAULT_PROMOTIONAL_BANNERS } from '../models/PromotionalBanner.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /promotional-banners — public endpoint for customer app
export const getPublicBanners = asyncHandler(async (req, res) => {
  const doc = await getPromotionalBannersDoc();
  res.json(doc.toPublicJSON());
});

// GET /admin/promotional-banners — admin endpoint returning all banners
export const getAdminBanners = asyncHandler(async (req, res) => {
  const doc = await getPromotionalBannersDoc();
  res.json(doc.toAdminJSON());
});

// PUT /admin/promotional-banners — updates whole list of banners
export const updateAdminBanners = asyncHandler(async (req, res) => {
  const { banners, reset } = req.body;
  const doc = await getPromotionalBannersDoc();

  if (reset) {
    doc.banners = DEFAULT_PROMOTIONAL_BANNERS;
  } else if (Array.isArray(banners)) {
    doc.banners = banners.map((b, idx) => ({
      id: b.id || `promo-${Date.now()}-${idx}`,
      title: typeof b.title === 'string' ? b.title.trim() : '',
      subtitle: typeof b.subtitle === 'string' ? b.subtitle.trim() : '',
      tag: typeof b.tag === 'string' ? b.tag.trim() : '',
      discount: typeof b.discount === 'string' ? b.discount.trim() : '',
      code: typeof b.code === 'string' ? b.code.trim().toUpperCase() : '',
      img: typeof b.img === 'string' ? b.img.trim() : '',
      tripId: typeof b.tripId === 'string' ? b.tripId.trim() : '',
      active: b.active !== false,
    }));
  } else {
    return res.status(400).json({ error: { message: 'banners array is required' } });
  }

  await doc.save();
  res.json(doc.toAdminJSON());
});

