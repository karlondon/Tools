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

export const setCompanionVip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isVip } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user || user.memberType !== 'COMPANION') { res.status(404).json({ error: 'Companion not found' }); return; }
    if (!user.profile) { res.status(400).json({ error: 'Companion has no profile' }); return; }
    await prisma.profile.update({ where: { id: user.profile.id }, data: { isVip: Boolean(isVip) } });
    res.json({ message: `VIP status ${isVip ? 'granted' : 'removed'}`, isVip: Boolean(isVip) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update VIP status' });
  }
};

export const listMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const where: any = { memberType: { in: ['MEMBER', 'COMPANION'] } };
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        memberType: true,
        membershipTier: true,
        isActive: true,
        isVerified: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { displayName: true, location: true } },
        bookings: { select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list members' });
  }
};

export const setUserTier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { membershipTier } = req.body;
    const valid = ['FREE', 'SILVER', 'GOLD', 'PLATINUM'];
    if (!valid.includes(membershipTier)) {
      res.status(400).json({ error: `Invalid tier. Must be one of: ${valid.join(', ')}` }); return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.memberType !== 'MEMBER') { res.status(400).json({ error: 'Tier can only be set on MEMBER accounts' }); return; }
    await prisma.user.update({ where: { id: userId }, data: { membershipTier } });
    res.json({ message: `Membership tier updated to ${membershipTier}`, userId, membershipTier });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update membership tier' });
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
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalMembers, totalCompanions, activeMembers, inactiveMembers,
      disabledUsers, pendingVerification,
      bookingsThisWeek, bookingsThisMonth,
      totalRevenue, weekRevenue, monthRevenue,
      recentBookings,
    ] = await Promise.all([
      prisma.user.count({ where: { memberType: 'MEMBER' } }),
      prisma.user.count({ where: { memberType: 'COMPANION' } }),
      prisma.user.count({ where: { memberType: 'MEMBER', isActive: true } }),
      prisma.user.count({ where: { memberType: 'MEMBER', isActive: true, emailVerified: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { memberType: 'MEMBER', emailVerified: false } }),
      prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.booking.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: weekAgo } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: monthAgo } }, _sum: { amount: true } }),
      prisma.booking.findMany({
        take: 10, orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { email: true } },
          profile: { select: { displayName: true } },
        },
      }),
    ]);

    res.json({
      totalMembers, totalCompanions, activeMembers, inactiveMembers,
      disabledUsers, pendingVerification,
      bookingsThisWeek, bookingsThisMonth,
      totalRevenue: totalRevenue._sum.amount || 0,
      weekRevenue: weekRevenue._sum.amount || 0,
      monthRevenue: monthRevenue._sum.amount || 0,
      recentBookings,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

export const setCompanionRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const body = req.body as any;
    const usr = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!usr || usr.memberType !== 'COMPANION') { res.status(404).json({ error: 'Companion not found' }); return; }
    if (!usr.profile) { res.status(400).json({ error: 'No profile' }); return; }
    const data: any = {};
    if (body.hourlyRate !== undefined) data.hourlyRate = parseFloat(String(body.hourlyRate));
    if (body.minBookingHours !== undefined) data.minBookingHours = parseInt(String(body.minBookingHours));
    if (body.inCall !== undefined) data.inCall = body.inCall === true || body.inCall === 'true';
    if (body.outCall !== undefined) data.outCall = body.outCall === true || body.outCall === 'true';
    if (body.isPublished !== undefined) data.isPublished = body.isPublished === true || body.isPublished === 'true';
    if (body.isVip !== undefined) data.isVip = body.isVip === true || body.isVip === 'true';
    if (body.displayName !== undefined) data.displayName = body.displayName;
    if (body.age !== undefined) data.age = body.age ? parseInt(String(body.age)) : null;
    if (body.location !== undefined) data.location = body.location;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.headline !== undefined) data.headline = body.headline;
    await prisma.profile.update({ where: { id: usr.profile.id }, data });
    res.json({ message: 'Companion updated', userId });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to update companion' });
  }
};

export const getAuditBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { from, to, companionId, memberId, status } = req.query;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }
    if (status) where.status = status;
    if (companionId) where.profileId = companionId;
    if (memberId) where.memberId = memberId;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        member: { select: { id: true, email: true } },
        profile: { select: { id: true, displayName: true } },
        payment: { select: { amount: true, currency: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

export const getAuditMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, page = '1' } = req.query;
    const take = 50;
    const skip = (parseInt(page as string) - 1) * take;
    const where: any = {};
    if (userId) where.OR = [{ senderId: userId }, { receiverId: userId }];

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          receiver: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.message.count({ where }),
    ]);
    res.json({ messages, total, page: parseInt(page as string), pages: Math.ceil(total / take) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = 'month' } = req.query;
    const now = new Date();
    const from = period === 'week'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Earnings per companion
    const companionEarnings = await prisma.booking.findMany({
      where: { createdAt: { gte: from }, status: { in: ['CONFIRMED', 'COMPLETED'] } },
      include: {
        profile: { select: { id: true, displayName: true } },
        payment: { select: { amount: true, status: true } },
      },
    });

    const earningsMap: Record<string, { displayName: string; bookings: number; revenue: number }> = {};
    for (const b of companionEarnings) {
      const key = b.profileId;
      if (!earningsMap[key]) earningsMap[key] = { displayName: b.profile.displayName, bookings: 0, revenue: 0 };
      earningsMap[key].bookings += 1;
      if (b.payment?.status === 'COMPLETED') earningsMap[key].revenue += b.payment.amount || 0;
    }

    // Booking status breakdown
    const statusBreakdown = await prisma.booking.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from } },
      _count: { id: true },
    });

    // New registrations
    const newUsers = await prisma.user.count({ where: { createdAt: { gte: from }, memberType: 'MEMBER' } });

    // Total revenue
    const revenue = await prisma.payment.aggregate({
      where: { status: 'COMPLETED', createdAt: { gte: from } },
      _sum: { amount: true },
    });

    res.json({
      period,
      from,
      companionEarnings: Object.values(earningsMap).sort((a, b) => b.revenue - a.revenue),
      statusBreakdown: statusBreakdown.map(s => ({ status: s.status, count: s._count.id })),
      newUsers,
      totalRevenue: revenue._sum.amount || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
};