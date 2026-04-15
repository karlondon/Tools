import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPlans, createInvoice, getPaymentStatus, btcpayWebhook } from '../controllers/paymentController';

const router = Router();

router.get('/plans', getPlans);
router.post('/invoice', authenticate, createInvoice);
router.get('/status/:invoiceId', authenticate, getPaymentStatus);
router.post('/webhook', btcpayWebhook); // BTCPay Server webhook – no auth, verified by secret

export default router;