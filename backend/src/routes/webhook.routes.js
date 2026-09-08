import { Router } from 'express';
import { razorpayWebhook } from '../controllers/webhookController.js';

// Inbound gateway callbacks. Deliberately unauthenticated: Razorpay's servers
// hold no JWT, and the request's HMAC signature is what proves it is genuine.
// See webhookController.js for the full contract.
const router = Router();

router.post('/webhooks/razorpay', razorpayWebhook);

export default router;
