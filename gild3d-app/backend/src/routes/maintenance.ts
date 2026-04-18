import { Router } from 'express';
import {
  getMaintenanceStatus,
  setMaintenanceStatus,
  sendMaintenanceAlert,
} from '../controllers/maintenanceController';

const router = Router();

router.get('/status', getMaintenanceStatus);
router.post('/status', setMaintenanceStatus);
router.post('/alert', sendMaintenanceAlert);

export default router;
