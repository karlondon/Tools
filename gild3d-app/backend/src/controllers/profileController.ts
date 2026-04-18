import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getProfiles = async (req: Request, res: Response) => {
  try {
    const { location, minAge, maxAge, inCall, outCall, minRate, maxRate, sort } = req.query as any;
    const where: any = { isPublished: true, user: { isActive: true } };
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (minAge) where.age = { ...where.age, gte: parseInt(minAge) };
    if (maxAge) where.age = { ...where.age, lte: parseInt(maxAge) };
    if (inCall === '1') where.inCall = true;
    if (outCall === '1') where.outCall = true;
    if (minRate) where.hourlyRate = { ...where.hourlyRate, gte: parseFloat(minRate) };
    if (maxRate) where.hourlyRate = { ...where.hourlyRate, lte: parseFloat(maxRate) };

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'rate_asc') orderBy = { hourlyRate: 'asc' };
    if (sort === 'rate_desc') orderBy = { hourlyRate: 'desc' };

    const profiles = await prisma.profile.findMany({
      where,
      orderBy,
      include: { photos: { where: { isPrimary: true }, take: 1 } },
    });

    return res.json({ profiles, total: profiles.length });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authReq = req as AuthRequest;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: true,
        privateMedia: true,
        user: { select: { id: true, memberType: true, membershipTier: true, isVerified: true } },
      },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    if (profile.isVip) {
      const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(authReq.memberType || '');
      const isPlatinum = authReq.membershipTier === 'PLATINUM';
      if (!isAdmin && !isPlatinum) {
        return res.json({
          ...profile,
          vipLocked: true,
          privateMedia: [],
          bio: null,
          services: null,
          languages: null,
          lookingFor: null,
        });
      }
    }

    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      displayName, bio, age, location, headline,
      hourlyRate, minBookingHours, inCall, outCall,
    } = req.body;

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        displayName, bio, age: age ? parseInt(age) : undefined,
        location, headline,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        minBookingHours: minBookingHours ? parseInt(minBookingHours) : undefined,
        inCall: inCall !== undefined ? Boolean(inCall) : undefined,
        outCall: outCall !== undefined ? Boolean(outCall) : undefined,
      },
      create: {
        userId,
        displayName: displayName || 'New Profile',
        bio, age: age ? parseInt(age) : undefined,
        location, headline,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        minBookingHours: minBookingHours ? parseInt(minBookingHours) : undefined,
        inCall: inCall !== undefined ? Boolean(inCall) : false,
        outCall: outCall !== undefined ? Boolean(outCall) : false,
      },
    });

    return res.json(profile);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const file = req.file as any;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const existingCount = await prisma.photo.count({ where: { profileId: profile.id } });
    const photo = await prisma.photo.create({
      data: {
        profileId: profile.id,
        url: `/uploads/${file.filename}`,
        isPrimary: existingCount === 0,
      },
    });

    return res.status(201).json(photo);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const deletePhoto = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { photoId } = req.params;
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { profile: true },
    });
    if (!photo || photo.profile.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.photo.delete({ where: { id: photoId } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error' });
  }
};