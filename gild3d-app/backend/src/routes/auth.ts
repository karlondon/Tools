import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, verifyEmail, resendCode } from '../controllers/authController';

const router = Router();

// 5 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// 3 registrations per hour per IP — prevents spam account creation
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again in an hour.' },
});

// 3 resend attempts per 15 minutes — prevents email flooding
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many resend attempts. Please wait before requesting again.' },
});

// 10 verify attempts per 15 minutes per IP — OTP codes also self-invalidate on failure
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please request a new code.' },
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/verify-email', verifyLimiter, verifyEmail);
router.post('/resend-code', resendLimiter, resendCode);

export default router;
