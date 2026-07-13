import { Router } from 'express';
import { getPublicLandingContent } from '../controllers/landingController.js';

const router = Router();

// Public: the marketing landing page reads its editable content unauthenticated.
router.get('/landing-content', getPublicLandingContent);

export default router;
