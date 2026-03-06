import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

// Config
const JWT_SECRET = process.env.JWT_SECRET || 'vibelist-change-me';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_API = process.env.PAYPAL_API || 'https://api-m.sandbox.paypal.com';
const PAYPAL_PLAN_ID = process.env.PAYPAL_PLAN_ID || '';

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://vibelist:password@localhost:5432/vibelist',
});

// Helpers
function hashPw(pw: string, salt: string): string {
  return crypto.pbkdf2Sync(pw, salt, 100000, 64, 'sha512').toString('hex');
}
function mkSalt(): string { return crypto.randomBytes(16).toString('hex'); }

function mkToken(id: number, email: string): string {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ id, email, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+(7*86400) })).toString('base64url');
  const s = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}

function readToken(t: string): {id:number;email:string}|null {
  try {
    const [h,p,s] = t.split('.');
    if (crypto.createHmac('sha256',JWT_SECRET).update(`${h}.${p}`).digest('base64url') !== s) return null;
    const d = JSON.parse(Buffer.from(p,'base64url').toString());
    return d.exp < Math.floor(Date.now()/1000) ? null : {id:d.id,email:d.email};
  } catch { return null; }
}

function getAge(dob: string): number {
  const b = new Date(dob), t = new Date();
  let a = t.getFullYear()-b.getFullYear();
  if (t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate())) a--;
  return a;
}

// Auth middleware
function auth(req: any, _res: any, next: any) {
  const hdr = req.headers.authorization;
  if (hdr?.startsWith('Bearer ')) { req.user = readToken(hdr.slice(7)); }
  next();
}
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({error:'Login required'});
  next();
}
async function requireSubscription(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({error:'Login required'});
  const {rows} = await pool.query('SELECT subscription_status FROM users WHERE id=$1',[req.user.id]);
  if (!rows[0] || rows[0].subscription_status !== 'active') return res.status(403).json({error:'Active subscription required', code:'NO_SUBSCRIPTION'});
  next();
}

app.use(auth);

// PayPal helper
async function paypalFetch(path: string, method: string, body?: any): Promise<any> {
  const authStr = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST', headers: { 'Authorization': `Basic ${authStr}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const { access_token } = await tokenRes.json() as any;
  const opts: any = { method, headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${PAYPAL_API}${path}`, opts);
  return r.json();
}

// Init DB
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(64) NOT NULL,
        display_name VARCHAR(100),
        date_of_birth DATE NOT NULL,
        age_verified BOOLEAN DEFAULT false,
        email_verified BOOLEAN DEFAULT false,
        subscription_status VARCHAR(20) DEFAULT 'none',
        subscription_id VARCHAR(100),
        subscription_provider VARCHAR(20) DEFAULT 'none',
        subscription_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS vibes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'general',
        emoji VARCHAR(10) DEFAULT '✨',
        upvotes INTEGER DEFAULT 0,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    const {rows} = await pool.query('SELECT COUNT(*) FROM vibes');
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`INSERT INTO vibes (title, description, category, emoji) VALUES
        ('Sunday Roast at The Ivy','Perfect roast with all the trimmings','food','🍖'),
        ('Sunset at Primrose Hill','Best views of the London skyline','outdoors','🌅'),
        ('Vinyl Night at Rough Trade','Live DJ sets and rare finds','music','🎵'),
        ('Morning Yoga in Hyde Park','Free community sessions every Saturday','wellness','🧘'),
        ('Street Art Walk in Shoreditch','Self-guided tour of amazing murals','culture','🎨')`);
    }
    console.log('Database initialized successfully');
  } catch (err) { console.error('Database initialization error:', err); }
}

// ========== AUTH ROUTES ==========
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, display_name, date_of_birth } = req.body;
    if (!email || !password || !date_of_birth) return res.status(400).json({error:'Email, password and date of birth required'});
    if (password.length < 8) return res.status(400).json({error:'Password must be at least 8 characters'});
    const age = getAge(date_of_birth);
    if (age < 18) return res.status(403).json({error:'You must be 18 or older to register'});
    const existing = await pool.query('SELECT id FROM users WHERE email=$1',[email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(409).json({error:'Email already registered'});
    const salt = mkSalt();
    const hash = hashPw(password, salt);
    const {rows} = await pool.query(
      'INSERT INTO users (email,password_hash,salt,display_name,date_of_birth,age_verified) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,email,display_name,subscription_status',
      [email.toLowerCase(), hash, salt, display_name||email.split('@')[0], date_of_birth, true]
    );
    const user = rows[0];
    res.status(201).json({ user, token: mkToken(user.id, user.email) });
  } catch (err: any) { res.status(500).json({error:'Registration failed'}); }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({error:'Email and password required'});
    const {rows} = await pool.query('SELECT id,email,display_name,password_hash,salt,subscription_status,subscription_provider FROM users WHERE email=$1',[email.toLowerCase()]);
    if (rows.length === 0) return res.status(401).json({error:'Invalid credentials'});
    const u = rows[0];
    if (hashPw(password, u.salt) !== u.password_hash) return res.status(401).json({error:'Invalid credentials'});
    res.json({ user: {id:u.id,email:u.email,display_name:u.display_name,subscription_status:u.subscription_status,subscription_provider:u.subscription_provider}, token: mkToken(u.id, u.email) });
  } catch { res.status(500).json({error:'Login failed'}); }
});

app.get('/auth/me', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query('SELECT id,email,display_name,subscription_status,subscription_provider,subscription_expires_at,created_at FROM users WHERE id=$1',[req.user.id]);
    if (rows.length === 0) return res.status(404).json({error:'User not found'});
    res.json(rows[0]);
  } catch { res.status(500).json({error:'Failed to get user'}); }
});

// ========== PAYPAL SUBSCRIPTION ==========
app.post('/subscription/paypal/create', requireAuth, async (req: any, res) => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_PLAN_ID) return res.status(503).json({error:'PayPal not configured'});
    const sub = await paypalFetch('/v1/billing/subscriptions', 'POST', {
      plan_id: PAYPAL_PLAN_ID,
      subscriber: { email_address: req.user.email },
      application_context: {
        brand_name: 'VibeList',
        return_url: `${req.headers.origin || 'https://vibelist.uk'}/subscription/success`,
        cancel_url: `${req.headers.origin || 'https://vibelist.uk'}/subscription/cancel`,
      }
    });
    if (sub.id) {
      await pool.query('UPDATE users SET subscription_id=$1, subscription_provider=$2 WHERE id=$3', [sub.id, 'paypal', req.user.id]);
    }
    const approveLink = sub.links?.find((l: any) => l.rel === 'approve')?.href;
    res.json({ subscription_id: sub.id, approve_url: approveLink });
  } catch (err) { res.status(500).json({error:'Failed to create subscription'}); }
});

app.post('/subscription/paypal/activate', requireAuth, async (req: any, res) => {
  try {
    const { subscription_id } = req.body;
    if (!subscription_id) return res.status(400).json({error:'subscription_id required'});
    const sub = await paypalFetch(`/v1/billing/subscriptions/${subscription_id}`, 'GET');
    if (sub.status === 'ACTIVE') {
      const expires = new Date(); expires.setMonth(expires.getMonth() + 1);
      await pool.query('UPDATE users SET subscription_status=$1, subscription_id=$2, subscription_provider=$3, subscription_expires_at=$4 WHERE id=$5',
        ['active', subscription_id, 'paypal', expires.toISOString(), req.user.id]);
      res.json({status:'active', message:'Subscription activated!'});
    } else {
      res.json({status: sub.status, message:'Subscription not yet active'});
    }
  } catch { res.status(500).json({error:'Failed to activate subscription'}); }
});

// PayPal Webhook
app.post('/subscription/paypal/webhook', async (req, res) => {
  try {
    const event = req.body;
    const subId = event.resource?.id;
    if (!subId) return res.status(200).json({received:true});
    if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' || event.event_type === 'PAYMENT.SALE.COMPLETED') {
      const expires = new Date(); expires.setMonth(expires.getMonth() + 1);
      await pool.query('UPDATE users SET subscription_status=$1, subscription_expires_at=$2 WHERE subscription_id=$3', ['active', expires.toISOString(), subId]);
    } else if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || event.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      await pool.query("UPDATE users SET subscription_status='cancelled' WHERE subscription_id=$1", [subId]);
    }
    res.status(200).json({received:true});
  } catch { res.status(200).json({received:true}); }
});

// Manual/Crypto subscription (admin activates)
app.post('/subscription/manual/activate', async (req, res) => {
  try {
    const { admin_key, user_id, months, provider } = req.body;
    if (admin_key !== process.env.ADMIN_KEY) return res.status(403).json({error:'Unauthorized'});
    const expires = new Date(); expires.setMonth(expires.getMonth() + (months || 1));
    await pool.query('UPDATE users SET subscription_status=$1, subscription_provider=$2, subscription_expires_at=$3 WHERE id=$4',
      ['active', provider || 'manual', expires.toISOString(), user_id]);
    res.json({status:'active', expires_at: expires.toISOString()});
  } catch { res.status(500).json({error:'Failed'}); }
});

app.get('/subscription/status', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query('SELECT subscription_status,subscription_provider,subscription_expires_at FROM users WHERE id=$1',[req.user.id]);
    res.json(rows[0] || {subscription_status:'none'});
  } catch { res.status(500).json({error:'Failed'}); }
});

app.get('/subscription/config', (_req, res) => {
  res.json({ paypal_client_id: PAYPAL_CLIENT_ID, plan_id: PAYPAL_PLAN_ID, price: '£25/month', paypal_available: !!PAYPAL_CLIENT_ID });
});

// ========== VIBE ROUTES ==========
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vibelist-api', timestamp: new Date().toISOString() });
});

app.get('/vibes', async (_req, res) => {
  try {
    const {rows} = await pool.query('SELECT v.*, u.display_name as author FROM vibes v LEFT JOIN users u ON v.user_id=u.id ORDER BY v.upvotes DESC, v.created_at DESC');
    res.json(rows);
  } catch { res.status(500).json({error:'Failed to fetch vibes'}); }
});

app.get('/vibes/category/:category', async (req, res) => {
  try {
    const {rows} = await pool.query('SELECT v.*, u.display_name as author FROM vibes v LEFT JOIN users u ON v.user_id=u.id WHERE v.category=$1 ORDER BY v.upvotes DESC',[req.params.category]);
    res.json(rows);
  } catch { res.status(500).json({error:'Failed to fetch vibes'}); }
});

app.post('/vibes', requireSubscription, async (req: any, res) => {
  try {
    const { title, description, category, emoji } = req.body;
    if (!title) return res.status(400).json({error:'Title is required'});
    const {rows} = await pool.query(
      'INSERT INTO vibes (title,description,category,emoji,user_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, description||'', category||'general', emoji||'✨', req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({error:'Failed to create vibe'}); }
});

app.post('/vibes/:id/upvote', async (req, res) => {
  try {
    const {rows} = await pool.query('UPDATE vibes SET upvotes=upvotes+1 WHERE id=$1 RETURNING *',[req.params.id]);
    if (rows.length===0) return res.status(404).json({error:'Vibe not found'});
    res.json(rows[0]);
  } catch { res.status(500).json({error:'Failed to upvote'}); }
});

app.delete('/vibes/:id', requireAuth, async (req: any, res) => {
  try {
    const {rowCount} = await pool.query('DELETE FROM vibes WHERE id=$1 AND (user_id=$2 OR user_id IS NULL)',[req.params.id, req.user.id]);
    if (rowCount===0) return res.status(404).json({error:'Vibe not found or not yours'});
    res.json({message:'Vibe deleted'});
  } catch { res.status(500).json({error:'Failed to delete vibe'}); }
});

// Start
initDB().then(() => { app.listen(PORT, () => { console.log(`VibeList API running on port ${PORT}`); }); });