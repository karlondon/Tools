import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import nodemailer from 'nodemailer';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendBookingEmail(to: string, booking: any, profile: any) {
  const typeLabel = booking.type === 'INCALL' ? 'InCall' : 'OutCall';
  const dateStr = new Date(booking.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const outcallDetails = booking.type === 'OUTCALL'
    ? `<p><strong>Location:</strong> ${booking.hotelName || ''} ${booking.hotelAddress ? '- ' + booking.hotelAddress : ''}, ${booking.hotelCity || ''}</p><p><strong>Room Number:</strong> To be confirmed on the day</p>`
    : '';

  await mailer.sendMail({
    from: `"Gilded Companions" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `Booking Confirmed – Ref #${booking.ref.slice(-8).toUpperCase()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:24px;border-radius:8px;">
        <h2 style="color:#f59e0b;">✦ Booking Confirmed</h2>
        <p>Your booking has been received and is pending confirmation.</p>
        <hr style="border-color:#333;"/>
        <p><strong>Booking Reference:</strong> #${booking.ref.slice(-8).toUpperCase()}</p>
        <p><strong>Companion:</strong> ${profile.displayName}</p>
        <p><strong>Type:</strong> ${typeLabel}</p>
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Time:</strong> ${booking.startTime} (24hr)</p>
        <p><strong>Duration:</strong> ${booking.hours} hour${booking.hours > 1 ? 's' : ''}</p>
        <p><strong>Total:</strong> $${booking.totalAmount.toFixed(2)} USD</p>
        ${outcallDetails}
        <p><strong>Status:</strong> ${booking.status.replace('_', ' ')}</p>
        <hr style="border-color:#333;"/>
        <p style="color:#888;font-size:12px;">If you have any questions, please reply to this email or contact support.</p>
        <p style="color:#888;font-size:12px;">Gilded Companions – gild3d.com</p>
      </div>
    `,
  });
}

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { profileId, type, date, startTime, hours, hotelName, hotelAddress, hotelCity, notes } = req.body;

    if (!profileId || !type || !date || !startTime || !hours) {
      res.status(400).json({ error: 'Missing required booking fields' }); return;
    }
    if (hours < 1) { res.status(400).json({ error: 'Minimum booking is 1 hour' }); return; }
    if (!['INCALL', 'OUTCALL'].includes(type)) { res.status(400).json({ error: 'Invalid booking type' }); return; }
    if (type === 'OUTCALL' && !hotelCity) { res.status(400).json({ error: 'Location required for OutCall' }); return; }

    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    if (!profile.hourlyRate) { res.status(400).json({ error: 'This companion has not set their rates' }); return; }
    if (profile.isVip) {
      const member = await prisma.user.findUnique({ where: { id: req.userId as string } });
      if (member?.membershipTier !== 'PLATINUM') {
        res.status(403).json({ error: 'PLATINUM membership required to book VIP companions', upgrade: true }); return;
      }
    }
    if (type === 'INCALL' && !profile.inCall) { res.status(400).json({ error: 'This companion does not offer InCall' }); return; }
    if (type === 'OUTCALL' && !profile.outCall) { res.status(400).json({ error: 'This companion does not offer OutCall' }); return; }

    const totalAmount = profile.hourlyRate * hours;
    const bookingDate = new Date(date);
    if (bookingDate < new Date()) { res.status(400).json({ error: 'Booking date must be in the future' }); return; }

    const booking = await prisma.booking.create({
      data: {
        memberId: req.userId as string,
        profileId,
        type,
        date: bookingDate,
        startTime,
        hours,
        totalAmount,
        hotelName: type === 'OUTCALL' ? hotelName : null,
        hotelAddress: type === 'OUTCALL' ? hotelAddress : null,
        hotelCity: type === 'OUTCALL' ? hotelCity : null,
        notes,
        status: 'PENDING_PAYMENT',
      },
      include: { profile: { select: { displayName: true, hourlyRate: true } }, member: { select: { email: true } } },
    });

    res.status(201).json({ booking, bookingId: booking.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

export const createBookingPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: { profile: true, member: { select: { email: true } } },
    });
    if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }
    if (booking.memberId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (booking.status !== 'PENDING_PAYMENT') { res.status(400).json({ error: 'Booking already paid or cancelled' }); return; }

    const dateStr = new Date(booking.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const invoice = await axios.post(
      `${NOWPAYMENTS_API_URL}/invoice`,
      {
        price_amount: booking.totalAmount,
        price_currency: 'usd',
        order_id: booking.id,
        order_description: `${booking.type} · ${booking.hours}h on ${dateStr} · Ref #${booking.ref.slice(-8).toUpperCase()}`,
        ipn_callback_url: `${process.env.SITE_URL}/api/bookings/webhook/nowpayments`,
        success_url: `${process.env.SITE_URL}/bookings?ref=${booking.ref}&status=success`,
        cancel_url: `${process.env.SITE_URL}/bookings`,
      },
      {
        headers: {
          'x-api-key': process.env.NOWPAYMENTS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const { id: invoiceId, invoice_url: checkoutUrl } = invoice.data;

    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        btcpayInvoiceId: String(invoiceId),
        checkoutUrl,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      create: {
        userId: req.userId as string,
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: 'USD',
        btcpayInvoiceId: String(invoiceId),
        checkoutUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    res.json({ checkoutUrl, invoiceId });
  } catch (err: any) {
    console.error('createBookingPayment error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, include: { profile: true } });
    let bookings;
    if (user?.memberType === 'COMPANION' && user.profile) {
      bookings = await prisma.booking.findMany({
        where: { profileId: user.profile.id, status: { in: ['CONFIRMED', 'COMPLETED'] } },
        include: { payment: true },
        orderBy: { date: 'asc' },
      });
    } else {
      bookings = await prisma.booking.findMany({
        where: { memberId: req.userId },
        include: { profile: { include: { photos: { where: { isPrimary: true }, take: 1 } } }, payment: true },
        orderBy: { date: 'asc' },
      });
    }
    res.json(bookings);
  } catch {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

export const getBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      include: {
        profile: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
        member: { select: { email: true } },
        payment: true,
      },
    });
    if (!booking) { res.status(404).json({ error: 'Not found' }); return; }
    const user = await prisma.user.findUnique({ where: { id: req.userId }, include: { profile: true } });
    const isOwner = booking.memberId === req.userId || user?.profile?.id === booking.profileId;
    if (!isOwner) { res.status(403).json({ error: 'Forbidden' }); return; }
    res.json(booking);
  } catch {
    res.status(500).json({ error: 'Failed to get booking' });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
    if (!booking) { res.status(404).json({ error: 'Not found' }); return; }
    if (booking.memberId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (['COMPLETED', 'CANCELLED'].includes(booking.status)) { res.status(400).json({ error: 'Cannot cancel this booking' }); return; }
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelReason: req.body.reason },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

export const handleBookingWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  // Mandatory NOWPayments IPN signature check — reject anything unsigned
  const signature = req.headers['x-nowpayments-sig'] as string;
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!signature || !ipnSecret) {
    res.status(401).json({ error: 'Webhook signature required' }); return;
  }
  const sortedBody = JSON.stringify(
    Object.fromEntries(Object.entries(req.body as object).sort(([a], [b]) => a.localeCompare(b)))
  );
  const hmac = crypto.createHmac('sha512', ipnSecret).update(sortedBody).digest('hex');
  if (hmac !== signature) {
    res.status(401).json({ error: 'Invalid signature' }); return;
  }

  const { payment_status, order_id: bookingId } = req.body;

  // NOWPayments statuses: waiting → confirming → confirmed → sending → finished
  // "finished" = fully settled, safe to mark as paid
  if (payment_status !== 'finished') {
    res.json({ received: true }); return;
  }

  try {
    if (!bookingId) { res.json({ received: true }); return; }

    const payment = await prisma.payment.findFirst({
      where: { bookingId },
      include: { booking: { include: { member: { select: { email: true } }, profile: true } } },
    });

    if (payment && payment.status === 'PENDING' && payment.booking) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
      await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } });
      if (payment.booking.member.email) {
        await sendBookingEmail(
          payment.booking.member.email,
          { ...payment.booking, status: 'CONFIRMED' },
          payment.booking.profile
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Booking webhook error:', err);
  }

  res.json({ received: true });
};