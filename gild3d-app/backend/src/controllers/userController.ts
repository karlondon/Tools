import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { profile: { include: { photos: { where: { isPrivate: false } } } } },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { passwordHash, email, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { ...(email && { email }) },
    });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.update({ where: { id: req.userId }, data: { isActive: false } });
    res.json({ message: 'Account deactivated' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
};

export const blockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.block.create({
      data: { blockerId: req.userId as string, blockedId: req.params.id },
    });
    res.json({ message: 'User blocked' });
  } catch {
    res.status(500).json({ error: 'Block failed' });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.block.deleteMany({
      where: { blockerId: req.userId, blockedId: req.params.id },
    });
    res.json({ message: 'User unblocked' });
  } catch {
    res.status(500).json({ error: 'Unblock failed' });
  }
};