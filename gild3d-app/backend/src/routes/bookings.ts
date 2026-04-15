import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createBooking,
  createBookingPayment,
  getMyBookings,
  getBooking,
  cancelBooking,
} from '../controllers/bookingController';

const router = Router();

router.use(authenticate);

router.post('/', createBooking);
router.get('/', getMyBookings);
router.get('/:bookingId', getBooking);
router.post('/:bookingId/payment', createBookingPayment);
router.patch('/:bookingId/cancel', cancelBooking);

export default router;