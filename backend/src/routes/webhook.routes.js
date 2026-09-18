import { Router } from 'express';
import { payuWebhook } from '../controllers/webhookController.js';
import { payuReturn } from '../controllers/paymentController.js';

// Inbound gateway callbacks. Deliberately unauthenticated: PayU's servers and
// the customer's browser coming back from PayU hold no JWT. The reverse hash
// (or, for refunds, a re-fetch from PayU's API) is what proves they are genuine.
// See webhookController.js and paymentController.payuReturn for the contract.
const router = Router();

router.post('/webhooks/payu', payuWebhook);
// PayU's surl and furl.
router.post('/payments/payu/return', payuReturn);

export default router;
