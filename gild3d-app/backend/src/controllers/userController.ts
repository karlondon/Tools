import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, memberType: true, membershipTier: true,
        isVerified: true, isActive: true, createdAt: true,
        profile: {
          include: { photos: true },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const updateEmail = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) return res.status(400).json({ error: 'Email in use' });
    const user = await prisma.user.update({ where: { id: userId }, data: { email } });
    return res.json({ id: user.id, email: user.email });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const deactivateAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error' });
  }
};