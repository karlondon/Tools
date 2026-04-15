import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const PLANS = [
  { tier: 'SILVER', label: 'Silver', priceUsd: 29.99, durationDays: 30, features: ['Unlimited messages', 'See who liked you', 'Advanced search'] },
  { tier: 'GOLD', label: 'Gold', priceUsd: 59.99, durationDays: 30, features: ['All Silver features', 'Priority listing', 'Read receipts', 'Private photos'] },
  { tier: 'PLATINUM', label: 'Platinum', priceUsd: 99.99, durationDays: 30, features: ['All Gold features', 'Profile boost', 'VIP badge', 'Dedicated support'] },
];

export const getPlans = (_req: Request, res: Response): void => {
  res.json(PLANS);
};

export const createInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tier } = req.body;
  const plan = PLANS.find(p => p.tier === tier);
  if (!plan) { res.status(400).json({ error: 'Invalid plan' }); return; }

  try {
    const response = await axios.post(
      `${process.env.BTCPAY_URL}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices`,
      {
        amount: plan.priceUsd,
        currency: 'USD',
        metadata: { userId: req.userId, tier, orderId: `${req.userId}-${tier}-${Date.now()}` },
        checkout: {
          redirectURL: `${process.env.SITE_URL}/upgrade?status=success`,
          defaultLanguage: 'en',
        },
      },
      { headers: { Authorization: `token ${process.env.BTCPAY_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    const invoice = response.data;
    await prisma.payment.create({
      data: {
        userId: req.userId as string,
        tier: tier as 'SILVER' | 'GOLD' | 'PLATINUM',
        amountUsd: plan.priceUsd,
        currency: 'BTC',
        btcpayInvoiceId: invoice.id,
        btcpayCheckoutUrl: invoice.checkoutLink,
        durationDays: plan.durationDays,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    res.json({ invoiceId: invoice.id, checkoutUrl: invoice.checkoutLink });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

export const getPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { btcpayInvoiceId: req.params.invoiceId },
    });
    if (!payment || payment.userId !== req.userId) { res.status(404).json({ error: 'Invoice not found' }); return; }
    res.json(payment);
  } catch {
    res.status(500).json({ error: 'Failed to get status' });
  }
};

export const btcpayWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['btcpay-sig'] as string;
  const body = JSON.stringify(req.body);
  const expected = `sha256=${crypto.createHmac('sha256', process.env.BTCPAY_WEBHOOK_SECRET || '').update(body).digest('hex')}`;

  if (sig !== expected) { res.status(401).json({ error: 'Invalid signature' }); return; }

  const { type, invoiceId } = req.body;
  if (type === 'InvoiceSettled') {
    try {
      const payment = await prisma.payment.findUnique({ where: { btcpayInvoiceId: invoiceId } });
      if (payment && payment.status === 'PENDING') {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
        const expiresAt = new Date(Date.now() + payment.durationDays * 86400000);
        await prisma.user.update({
          where: { id: payment.userId },
          data: { membershipTier: payment.tier },
        });
      }
    } catch { /* log error */ }
  }
  res.json({ received: true });
};