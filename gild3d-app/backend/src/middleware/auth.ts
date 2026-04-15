import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  memberType?: string;
  membershipTier?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      memberType: string;
      membershipTier: string;
    };
    req.userId = decoded.userId;
    req.memberType = decoded.memberType;
    req.membershipTier = decoded.membershipTier;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requirePremium = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.membershipTier || req.membershipTier === 'FREE') {
    res.status(403).json({ error: 'Premium membership required', upgrade: true });
    return;
  }
  next();
};