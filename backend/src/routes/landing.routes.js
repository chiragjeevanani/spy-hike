import { Router } from 'express';
import { getPublicLandingContent } from '../controllers/landingController.js';
import { getPublicSiteContent } from '../controllers/contentController.js';

const router = Router();

// Public: the marketing landing page reads its editable content unauthenticated.
router.get('/landing-content', getPublicLandingContent);

// Public: Privacy Policy / Support pages and the "account deactivated" popup
// read the CMS-editable legal/support content unauthenticated.
router.get('/site-content', getPublicSiteContent);

export default router;
