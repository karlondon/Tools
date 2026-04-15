import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createInvoice, handleWebhook, getMyPayments } from '../controllers/paymentController';

const router = Router();

router.post('/invoice', authenticate, createInvoice);
router.get('/my', authenticate, getMyPayments);
router.post('/webhook', handleWebhook);

export default router;