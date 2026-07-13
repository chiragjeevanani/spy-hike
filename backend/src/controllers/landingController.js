import { getLandingContent } from '../models/LandingContent.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// The editable top-level sections. The admin CMS sends whole sections, so a
// per-section replace (with an object merge for scalar fields) is enough —
// arrays are replaced wholesale, which is exactly what a list editor wants.
const SECTIONS = ['header', 'hero', 'features', 'expeditions', 'portals', 'testimonials', 'faq', 'footer'];

// GET /landing-content — public: the marketing page reads this unauthenticated.
export const getPublicLandingContent = asyncHandler(async (req, res) => {
  const doc = await getLandingContent();
  res.json({ content: doc.toPublicJSON() });
});

// GET /admin/landing-content — same payload, admin-scoped.
export const getAdminLandingContent = asyncHandler(async (req, res) => {
  const doc = await getLandingContent();
  res.json({ content: doc.toPublicJSON() });
});

// PATCH /admin/landing-content — update any subset of sections. Each provided
// section is merged over the current one (arrays replaced), so the client can
// save one section at a time or the whole page.
export const updateAdminLandingContent = asyncHandler(async (req, res) => {
  const doc = await getLandingContent();
  const current = doc.toObject();
  for (const section of SECTIONS) {
    if (req.body[section] && typeof req.body[section] === 'object') {
      doc.set(section, { ...current[section], ...req.body[section] });
    }
  }
  await doc.save();
  res.json({ content: doc.toPublicJSON() });
});
