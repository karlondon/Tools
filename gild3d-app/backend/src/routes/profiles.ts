import { Router } from 'express';
import { authenticate, requirePremium } from '../middleware/auth';
import { uploadPhoto, uploadPhotos } from '../middleware/upload';
import {
  getProfiles, getProfile, updateProfile,
  uploadProfilePhoto, deletePhoto, setPrimaryPhoto,
  likeProfile, unlikeProfile,
} from '../controllers/profileController';

const router = Router();

router.get('/', authenticate, getProfiles);
router.get('/:id', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);
router.post('/me/photos', authenticate, uploadPhotos, uploadProfilePhoto);
router.delete('/me/photos/:photoId', authenticate, deletePhoto);
router.put('/me/photos/:photoId/primary', authenticate, setPrimaryPhoto);
router.post('/:id/like', authenticate, requirePremium, likeProfile);
router.delete('/:id/like', authenticate, requirePremium, unlikeProfile);

export default router;