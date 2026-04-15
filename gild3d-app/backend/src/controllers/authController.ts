import { Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const signToken = (userId: string, memberType: string, membershipTier: string) =>
  jwt.sign(
    { userId, memberType, membershipTier },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { email, password, memberType } = req.body;
  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, memberType },
    });
    await prisma.profile.create({
      data: { userId: user.id, displayName: email.split('@')[0], interests: [] },
    });

    const token = signToken(user.id, user.memberType, user.membershipTier);
    res.status(201).json({ token, user: { id: user.id, email: user.email, memberType: user.memberType, membershipTier: user.membershipTier } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid email or password' }); return;
    }
    if (user.isBanned) { res.status(403).json({ error: 'Account suspended' }); return; }

    const token = signToken(user.id, user.memberType, user.membershipTier);
    res.json({ token, user: { id: user.id, email: user.email, memberType: user.memberType, membershipTier: user.membershipTier } });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: { include: { photos: true } } },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const token = signToken(user.id, user.memberType, user.membershipTier);
    res.json({ token });
  } catch {
    res.status(500).json({ error: 'Token refresh failed' });
  }
};