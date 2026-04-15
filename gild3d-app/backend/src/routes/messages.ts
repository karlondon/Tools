import { Router } from 'express';
import { authenticate, requirePremium } from '../middleware/auth';
import { getConversations, getConversation, sendMessage, markRead } from '../controllers/messageController';

const router = Router();

router.get('/', authenticate, getConversations);
router.get('/:userId', authenticate, requirePremium, getConversation);
router.post('/:userId', authenticate, requirePremium, sendMessage);
router.put('/:userId/read', authenticate, markRead);

export default router;