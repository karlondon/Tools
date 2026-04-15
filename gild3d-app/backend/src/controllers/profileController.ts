import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getProfiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { memberType, minAge, maxAge, location, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const profiles = await prisma.profile.findMany({
      where: {
        isPublic: true,
        user: { isActive: true, isBanned: false, ...(memberType && { memberType: memberType as 'SUCCESSFUL' | 'COMPANION' }) },
        ...(location && { location: { contains: location, mode: 'insensitive' } }),
        ...(minAge && { age: { gte: parseInt(minAge) } }),
        ...(maxAge && { age: { lte: parseInt(maxAge) } }),
      },
      include: { photos: { where: { isPrimary: true, isPrivate: false }, take: 1 }, user: { select: { memberType: true, membershipTier: true } } },
      skip,
      take: parseInt(limit),
      orderBy: { lastSeen: 'desc' },
    });
    res.json({ profiles, page: parseInt(page), limit: parseInt(limit) });
  } catch {
    res.status(500).json({ error: 'Failed to get profiles' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await prisma.profile.findFirst({
      where: { userId: req.params.id },
      include: { photos: { where: { isPrivate: false } }, user: { select: { memberType: true, membershipTier: true, createdAt: true } } },
    });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    await prisma.profile.update({ where: { id: profile.id }, data: { profileViews: { increment: 1 } } });
    res.json(profile);
  } catch {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, age, gender, location, country, bio, headline, height, bodyType, ethnicity, education, occupation, income, lookingFor, relationshipType, interests, isPublic } = req.body;
    const profile = await prisma.profile.upsert({
      where: { userId: req.userId as string },
      update: { displayName, age, gender, location, country, bio, headline, height, bodyType, ethnicity, education, occupation, income, lookingFor, relationshipType, interests, isPublic },
      create: { userId: req.userId as string, displayName: displayName || 'User', interests: interests || [] },
    });
    res.json(profile);
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const uploadProfilePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ error: 'No files uploaded' }); return; }
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    const existingCount = await prisma.photo.count({ where: { profileId: profile.id } });
    const photos = await Promise.all(
      files.map((file, i) => prisma.photo.create({
        data: { profileId: profile.id, url: `/uploads/${file.filename}`, isPrimary: existingCount === 0 && i === 0 },
      }))
    );
    res.status(201).json(photos);
  } catch {
    res.status(500).json({ error: 'Photo upload failed' });
  }
};

export const deletePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    await prisma.photo.deleteMany({ where: { id: req.params.photoId, profileId: profile.id } });
    res.json({ message: 'Photo deleted' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
};

export const setPrimaryPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    await prisma.photo.updateMany({ where: { profileId: profile.id }, data: { isPrimary: false } });
    await prisma.photo.update({ where: { id: req.params.photoId }, data: { isPrimary: true } });
    res.json({ message: 'Primary photo updated' });
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
};

export const likeProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.like.create({ data: { userId: req.userId as string, targetId: req.params.id } });
    res.json({ message: 'Liked' });
  } catch {
    res.status(500).json({ error: 'Like failed' });
  }
};

export const unlikeProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.like.deleteMany({ where: { userId: req.userId, targetId: req.params.id } });
    res.json({ message: 'Unliked' });
  } catch {
    res.status(500).json({ error: 'Unlike failed' });
  }
};