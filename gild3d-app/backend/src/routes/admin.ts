import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  createCompanion, listCompanions, setCompanionPublished,
  listMembers, setUserActive, deleteUser, getDashboard,
  setCompanionRate, getAuditBookings, getAuditMessages, getReports,
} from '../controllers/adminController';

const router = Router();

// All admin routes require authentication + SUPER_ADMIN role
router.use(authenticate, requireSuperAdmin);

router.get('/dashboard', getDashboard);

// Companion management
router.post('/companions', createCompanion);
router.get('/companions', listCompanions);
router.patch('/companions/:userId/publish', setCompanionPublished);
router.patch('/companions/:userId/rate', setCompanionRate);

// Member / user management
router.get('/members', listMembers);
router.patch('/users/:userId/active', setUserActive);
router.delete('/users/:userId', deleteUser);

// Audit
router.get('/audit/bookings', getAuditBookings);
router.get('/audit/messages', getAuditMessages);

// Reports
router.get('/reports', getReports);

export default router;