import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getUser, updateUser, deleteUser, blockUser, unblockUser } from '../controllers/userController';

const router = Router();

router.get('/:id', authenticate, getUser);
router.put('/me', authenticate, updateUser);
router.delete('/me', authenticate, deleteUser);
router.post('/:id/block', authenticate, blockUser);
router.delete('/:id/block', authenticate, unblockUser);

export default router;