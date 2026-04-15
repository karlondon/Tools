import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  createCompanion, listCompanions, setCompanionPublished,
  listMembers, setUserActive, deleteUser, getDashboard,
} from '../controllers/adminController';

const router = Router();

// All admin routes require authentication + SUPER_ADMIN role
router.use(authenticate, requireSuperAdmin);

router.get('/dashboard', getDashboard);

// Companion management
router.post('/companions', createCompanion);
router.get('/companions', listCompanions);
router.patch('/companions/:userId/publish', setCompanionPublished);

// Member management
router.get('/members', listMembers);
router.patch('/users/:userId/active', setUserActive);
router.delete('/users/:userId', deleteUser);

export default router;