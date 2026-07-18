import { getSiteContent } from '../models/SiteContent.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// The editable top-level sections — same whole-section-replace merge pattern
// as landingController.js.
const SECTIONS = ['privacyPolicy', 'support'];

// GET /site-content — public: the Privacy Policy / Support pages and the
// "account deactivated" popup all read this unauthenticated.
export const getPublicSiteContent = asyncHandler(async (req, res) => {
  const doc = await getSiteContent();
  res.json({ content: doc.toPublicJSON() });
});

// GET /admin/site-content — same payload, admin-scoped.
export const getAdminSiteContent = asyncHandler(async (req, res) => {
  const doc = await getSiteContent();
  res.json({ content: doc.toPublicJSON() });
});

// PATCH /admin/site-content — update any subset of sections (privacyPolicy
// and/or support). Each provided section is merged over the current one
// (arrays like `sections`/`faqs` are replaced wholesale).
export const updateAdminSiteContent = asyncHandler(async (req, res) => {
  const doc = await getSiteContent();
  const current = doc.toObject();
  for (const section of SECTIONS) {
    if (req.body[section] && typeof req.body[section] === 'object') {
      doc.set(section, { ...current[section], ...req.body[section] });
    }
  }
  await doc.save();
  res.json({ content: doc.toPublicJSON() });
});
