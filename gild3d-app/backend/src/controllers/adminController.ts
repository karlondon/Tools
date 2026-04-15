import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const createCompanion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, displayName, age, location, bio, headline, hourlyRate, inCall, outCall } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'email, password and displayName are required' });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        memberType: 'COMPANION',
        emailVerified: true,
        isActive: true,
        profile: {
          create: {
            displayName,
            age: age ? parseInt(age) : null,
            location: location || null,
            bio: bio || null,
            headline: headline || null,
            hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
            inCall: inCall !== false,
            outCall: outCall === true,
            isPublished: false,
          },
        },
      },
      include: { profile: true },
    });
    res.status(201).json({ message: 'Companion created', userId: user.id, profileId: user.profile?.id, email: user.email });
  } catch (err: any) {
    console.error('createCompanion:', err);
    res.status(500).json({ error: 'Failed to create companion' });
  }
};

export const listCompanions = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companions = await prisma.user.findMany({
      where: { memberType: 'COMPANION' },
      include: { profile: { include: { photos: { where: { isPrimary: true }, take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(companions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list companions' });
  }
};

export const setCompanionPublished = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isPublished } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user || user.memberType !== 'COMPANION') { res.status(404).json({ error: 'Companion not found' }); return; }
    if (!user.profile) { res.status(400).json({ error: 'Companion has no profile' }); return; }
    await prisma.profile.update({ where: { id: user.profile.id }, data: { isPublished: Boolean(isPublished) } });
    res.json({ message: `Profile ${isPublished ? 'published' : 'unpublished'}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update companion' });
  }
};

export const listMembers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const members = await prisma.user.findMany({
      where: { memberType: 'MEMBER' },
      select: { id: true, email: true, membershipTier: true, isActive: true, emailVerified: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list members' });
  }
};

export const setUserActive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.memberType === 'SUPER_ADMIN') { res.status(403).json({ error: 'Cannot disable a super admin' }); return; }
    await prisma.user.update({ where: { id: userId }, data: { isActive: Boolean(isActive) } });
    res.json({ message: `User ${isActive ? 'enabled' : 'disabled'}`, userId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.memberType === 'SUPER_ADMIN') { res.status(403).json({ error: 'Cannot delete a super admin' }); return; }
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted', userId });
  } catch (err: any) {
    console.error('deleteUser error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const getDashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalMembers, totalCompanions, activeMembers, pendingVerification] = await Promise.all([
      prisma.user.count({ where: { memberType: 'MEMBER' } }),
      prisma.user.count({ where: { memberType: 'COMPANION' } }),
      prisma.user.count({ where: { memberType: 'MEMBER', isActive: true } }),
      prisma.user.count({ where: { memberType: 'MEMBER', emailVerified: false } }),
    ]);
    res.json({ totalMembers, totalCompanions, activeMembers, pendingVerification });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};