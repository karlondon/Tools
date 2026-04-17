import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createBooking,
  createBookingPayment,
  getMyBookings,
  getBooking,
  cancelBooking,
  handleBookingWebhook,
} from '../controllers/bookingController';

const router = Router();

// Webhook must be unauthenticated — NOWPayments calls this directly
router.post('/webhook/nowpayments', handleBookingWebhook);

router.use(authenticate);

router.post('/', createBooking);
router.get('/', getMyBookings);
router.get('/:bookingId', getBooking);
router.post('/:bookingId/payment', createBookingPayment);
router.patch('/:bookingId/cancel', cancelBooking);

export default router;