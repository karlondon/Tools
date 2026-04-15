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

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.memberType || !['ADMIN', 'SUPER_ADMIN'].includes(req.memberType)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.memberType !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
};