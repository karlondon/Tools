import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyProfile, updateEmail, deactivateAccount } from '../controllers/userController';

const router = Router();

router.get('/me', authenticate, getMyProfile);
router.put('/me/email', authenticate, updateEmail);
router.delete('/me', authenticate, deactivateAccount);

export default router;