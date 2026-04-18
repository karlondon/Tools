import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  getProfiles, getProfile, updateProfile,
  uploadPhoto, deletePhoto,
} from '../controllers/profileController';

const router = Router();

router.get('/', getProfiles);
router.get('/:userId', optionalAuthenticate, getProfile);
router.put('/me', authenticate, updateProfile);
router.post('/me/photos', authenticate, upload.single('photo'), uploadPhoto);
router.delete('/me/photos/:photoId', authenticate, deletePhoto);

export default router;