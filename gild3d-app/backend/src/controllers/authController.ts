import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Cryptographically secure OTP — replaces Math.random()
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Min 8 chars, at least one uppercase and one digit
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

async function sendVerificationEmail(email: string, code: string): Promise<void> {
  await mailer.sendMail({
    from: process.env.SMTP_FROM || 'noreply@gild3d.com',
    to: email,
    subject: 'Gilded Companions – Verify Your Email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1a1a2e;color:#f0e6d3;border-radius:8px;">
        <h1 style="color:#d4af37;margin-bottom:8px;">Gilded Companions</h1>
        <p style="color:#b0a090;margin-bottom:24px;">Where Luxury Meets Connection</p>
        <p>Thank you for registering. Please verify your email address using the code below:</p>
        <div style="background:#2d2d4e;border:2px solid #d4af37;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;color:#d4af37;letter-spacing:8px;">${code}</span>
        </div>
        <p style="color:#b0a090;font-size:14px;">This code expires in 15 minutes. If you did not register, please ignore this email.</p>
      </div>
    `,
  });
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'email, password and displayName are required' });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      res.status(400).json({ error: 'Password must be at least 8 characters with one uppercase letter and one number' });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateOTP();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        memberType: 'MEMBER',
        emailVerified: false,
        verificationCode: code,
        verificationExpiry: expiry,
      },
    });
    try {
      await sendVerificationEmail(user.email, code);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }
    res.status(201).json({
      message: 'Registration successful. Please check your email for a 6-digit verification code.',
      userId: user.id,
      emailVerified: false,
    });
  } catch (err: any) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      res.status(400).json({ error: 'userId and code are required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.emailVerified) { res.json({ message: 'Email already verified' }); return; }
    if (!user.verificationCode || user.verificationCode !== code) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }
    if (!user.verificationExpiry || user.verificationExpiry < new Date()) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, verificationCode: null, verificationExpiry: null },
    });
    const token = jwt.sign(
      { userId: user.id, memberType: user.memberType, membershipTier: user.membershipTier },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ message: 'Email verified successfully', token });
  } catch (err: any) {
    console.error('verifyEmail error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
};

export const resendCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.emailVerified) { res.json({ message: 'Already verified' }); return; }
    const code = generateOTP();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: { verificationCode: code, verificationExpiry: expiry },
    });
    try {
      await sendVerificationEmail(user.email, code);
      res.json({ message: 'Verification code resent' });
    } catch (emailErr: any) {
      console.error('resendCode email failed:', emailErr.message);
      res.status(500).json({ error: 'Email delivery failed. Please check SMTP configuration.' });
    }
  } catch (err: any) {
    console.error('resendCode error:', err);
    res.status(500).json({ error: 'Failed to resend code' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: 'Your account has been disabled. Please contact support.' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    if (!user.emailVerified && user.memberType === 'MEMBER') {
      res.status(403).json({
        error: 'Please verify your email before logging in.',
        userId: user.id,
        requiresVerification: true,
      });
      return;
    }
    const token = jwt.sign(
      { userId: user.id, memberType: user.memberType, membershipTier: user.membershipTier },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        memberType: user.memberType,
        membershipTier: user.membershipTier,
        emailVerified: user.emailVerified,
      },
    });
  } catch (err: any) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};