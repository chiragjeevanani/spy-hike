import { Router } from 'express';
import { getPublicLandingContent } from '../controllers/landingController.js';
import { getPublicSiteContent } from '../controllers/contentController.js';
import { cached, TTL } from '../lib/cache.js';

const router = Router();

// Both are near-static CMS content fetched on nearly every page load, and both
// are evicted centrally when an admin PATCHes them (see app.js).
router.get('/landing-content', cached(() => 'content:landing', TTL.content), getPublicLandingContent);
router.get('/site-content', cached(() => 'content:site', TTL.content), getPublicSiteContent);

export default router;
