import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import profileRoutes from './routes/profiles';
import messageRoutes from './routes/messages';
import paymentRoutes from './routes/payments';
import bookingRoutes from './routes/bookings';
import adminRoutes from './routes/admin';
import maintenanceRoutes from './routes/maintenance';

const app = express();
const PORT = process.env.PORT || 4000;

// Trust Cloudflare proxy — required for rate limiting by real IP
app.set('trust proxy', 1);

// Security headers via helmet
app.use(helmet({
  contentSecurityPolicy: false, // handled by Nginx
  crossOriginEmbedderPolicy: false,
}));

// CORS — allow configured origin plus www variant, never wildcard in production
const corsBase = (process.env.CORS_ORIGIN || 'https://gild3d.com').replace(/\/$/, '');
const allowedOrigins = new Set([
  corsBase,
  corsBase.replace('https://', 'https://www.'),
  corsBase.replace('https://www.', 'https://'),
]);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body size: 1MB max — prevents payload flooding
// verify stores raw buffer so webhook handlers can compute HMAC signatures
app.use(express.json({
  limit: '1mb',
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global API rate limit — 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', globalLimiter);

// Static uploads — served directly by Nginx in production, this is a fallback
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maintenance', maintenanceRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler — never leak stack traces to clients
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`✦ Gilded Companions API running on port ${PORT}`));
