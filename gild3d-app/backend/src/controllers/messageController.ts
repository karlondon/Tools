import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: req.userId }, { receiverId: req.userId }] },
      orderBy: { createdAt: 'desc' },
      distinct: ['senderId', 'receiverId'],
      include: {
        sender: { include: { profile: { include: { photos: { where: { isPrimary: true }, take: 1 } } } } },
        receiver: { include: { profile: { include: { photos: { where: { isPrimary: true }, take: 1 } } } } },
      },
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to get conversations' });
  }
};

export const getConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.userId, receiverId: req.params.userId },
          { senderId: req.params.userId, receiverId: req.userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to get conversation' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: 'Message cannot be empty' }); return; }
    const message = await prisma.message.create({
      data: { senderId: req.userId as string, receiverId: req.params.userId, content: content.trim() },
    });
    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.message.updateMany({
      where: { senderId: req.params.userId, receiverId: req.userId, status: 'SENT' },
      data: { status: 'READ' },
    });
    res.json({ message: 'Marked as read' });
  } catch {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};