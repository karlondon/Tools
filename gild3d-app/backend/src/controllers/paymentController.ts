import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const COINBASE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY || '';
const COINBASE_API_URL = 'https://api.commerce.coinbase.com';
const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_WEBHOOK_SECRET || '';

// Membership tier pricing
const TIER_PRICES: Record<string, { amount: string; name: string; description: string }> = {
  SILVER: { amount: '19.99', name: 'Silver Membership', description: 'Gilded Companions Silver – message up to 5 providers' },
  GOLD:   { amount: '49.99', name: 'Gold Membership',   description: 'Gilded Companions Gold – unlimited messages + priority' },
  PLATINUM: { amount: '99.99', name: 'Platinum Membership', description: 'Gilded Companions Platinum – all features + verified badge' },
};

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { tierId } = req.body;

    if (!tierId || !TIER_PRICES[tierId.toUpperCase()]) {
      return res.status(400).json({ error: 'Valid tierId required (SILVER, GOLD, PLATINUM)' });
    }

    const tier = TIER_PRICES[tierId.toUpperCase()];

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: parseFloat(tier.amount),
        currency: 'USD',
        status: 'PENDING',
        tierId: tierId.toUpperCase(),
      },
    });

    // If Coinbase Commerce is configured, create a charge
    if (COINBASE_API_KEY) {
      const charge = await axios.post(
        `${COINBASE_API_URL}/charges`,
        {
          name: tier.name,
          description: tier.description,
          pricing_type: 'fixed_price',
          local_price: { amount: tier.amount, currency: 'USD' },
          metadata: { paymentId: payment.id, userId, tierId: tierId.toUpperCase() },
          redirect_url: `${process.env.SITE_URL || 'http://localhost:3000'}/upgrade?status=success&ref=${payment.id}`,
          cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/upgrade?status=cancelled`,
        },
        {
          headers: {
            'X-CC-Api-Key': COINBASE_API_KEY,
            'X-CC-Version': '2018-03-22',
            'Content-Type': 'application/json',
          },
        }
      );

      await prisma.payment.update({
        where: { id: payment.id },
        data: { btcpayInvoiceId: charge.data.data.id },
      });

      return res.json({
        paymentId: payment.id,
        checkoutUrl: charge.data.data.hosted_url,
        chargeId: charge.data.data.id,
      });
    }

    // No payment gateway configured — return payment ID for manual handling
    return res.json({
      paymentId: payment.id,
      checkoutUrl: null,
      message: 'Payment gateway not configured. Set COINBASE_COMMERCE_API_KEY in .env',
    });
  } catch (err: any) {
    console.error('createInvoice error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create payment' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const eventType = event?.event?.type;

    // Coinbase Commerce successful events
    if (!['charge:confirmed', 'charge:resolved'].includes(eventType)) {
      return res.sendStatus(200);
    }

    const metadata = event?.event?.data?.metadata;
    const paymentId = metadata?.paymentId;
    const tierId = metadata?.tierId;
    const userId = metadata?.userId;

    if (!paymentId) return res.sendStatus(200);

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED' },
    });

    if (tierId && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { membershipTier: tierId as any },
      });
    }

    return res.sendStatus(200);
  } catch (err: any) {
    console.error('webhook error:', err);
    return res.sendStatus(500);
  }
};

export const getMyPayments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(payments);
  } catch (err: any) {
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getPlans = async (_req: Request, res: Response) => {
  return res.json({
    plans: [
      { id: 'SILVER',   name: 'Silver',   price: 19.99, currency: 'USD', features: ['Message up to 5 providers', 'View full profiles', 'Basic search filters'] },
      { id: 'GOLD',     name: 'Gold',     price: 49.99, currency: 'USD', features: ['Unlimited messages', 'Priority in search', 'Advanced filters', 'Read receipts'] },
      { id: 'PLATINUM', name: 'Platinum', price: 99.99, currency: 'USD', features: ['All Gold features', 'Verified badge', 'Featured profile', 'Concierge support'] },
    ],
  });
};