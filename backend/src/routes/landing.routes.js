import { Router } from 'express';
import { getPublicLandingContent } from '../controllers/landingController.js';
import { getPublicSiteContent } from '../controllers/contentController.js';
import { getPublicOnboardingContent } from '../controllers/onboardingController.js';
import { cached, TTL } from '../lib/cache.js';

const router = Router();

// Near-static CMS content fetched on page loads, and evicted
// centrally when an admin PATCHes them (see app.js).
router.get('/landing-content', cached(() => 'content:landing', TTL.content), getPublicLandingContent);
router.get('/site-content', cached(() => 'content:site', TTL.content), getPublicSiteContent);
router.get('/onboarding-content', cached(() => 'content:onboarding', TTL.content), getPublicOnboardingContent);

export default router;

