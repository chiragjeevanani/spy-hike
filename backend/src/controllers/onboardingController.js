import { getOnboardingContent } from '../models/OnboardingContent.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const SECTIONS = ['customer', 'organizer'];

// GET /onboarding-content — public: customer & organizer apps read this unauthenticated.
export const getPublicOnboardingContent = asyncHandler(async (req, res) => {
  const doc = await getOnboardingContent();
  res.json({ content: doc.toPublicJSON() });
});

// GET /admin/onboarding-content — same payload, admin-scoped.
export const getAdminOnboardingContent = asyncHandler(async (req, res) => {
  const doc = await getOnboardingContent();
  res.json({ content: doc.toPublicJSON() });
});

// PATCH /admin/onboarding-content — update customer and/or organizer onboarding config & slides.
export const updateAdminOnboardingContent = asyncHandler(async (req, res) => {
  const doc = await getOnboardingContent();
  const current = doc.toObject();

  for (const section of SECTIONS) {
    if (req.body[section] && typeof req.body[section] === 'object') {
      doc.set(section, { ...current[section], ...req.body[section] });
    }
  }

  await doc.save();
  res.json({ content: doc.toPublicJSON() });
});
