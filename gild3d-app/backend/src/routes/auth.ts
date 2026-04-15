import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, refreshToken } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('memberType').isIn(['SUCCESSFUL', 'COMPANION']),
], register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], login);

router.get('/me', authenticate, getMe);
router.post('/refresh', authenticate, refreshToken);

export default router;