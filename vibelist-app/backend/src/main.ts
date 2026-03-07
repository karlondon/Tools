import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Config
const JWT_SECRET = process.env.JWT_SECRET || 'vibelist-change-me';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_API = process.env.PAYPAL_API || 'https://api-m.sandbox.paypal.com';
const PAYPAL_PLAN_ID = process.env.PAYPAL_PLAN_ID || '';
const FOUNDING_MEMBER_LIMIT = 25;
const DORMANT_DAYS = 90;

// Rate limiting store
const rateLimits: Record<string, { count: number; reset: number }> = {};
function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (!rateLimits[key] || rateLimits[key].reset < now) { rateLimits[key] = { count: 0, reset: now + windowMs }; }
  rateLimits[key].count++;
  return rateLimits[key].count > max;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://vibelist:password@localhost:5432/vibelist' });

const CATEGORIES = ['services','events','jobs','property','vehicles','electronics','fashion','beauty','health','community','other'];
const CITIES = ['london','manchester','birmingham','leeds','glasgow','liverpool','bristol','edinburgh','cardiff','belfast','sheffield','nottingham','other'];

// ========== HELPERS ==========
function hashPw(pw: string, salt: string): string { return crypto.pbkdf2Sync(pw, salt, 100000, 64, 'sha512').toString('hex'); }
function mkSalt(): string { return crypto.randomBytes(16).toString('hex'); }
function mkToken(id: number, email: string): string {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ id, email, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+(7*86400) })).toString('base64url');
  return `${h}.${p}.${crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`;
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

// Middleware
function authMw(req: any, _res: any, next: any) { const h = req.headers.authorization; if (h?.startsWith('Bearer ')) req.user = readToken(h.slice(7)); next(); }
function requireAuth(req: any, res: any, next: any) { if (!req.user) return res.status(401).json({error:'Login required'}); next(); }
async function requireSub(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({error:'Login required'});
  const {rows} = await pool.query('SELECT subscription_status, is_founding_member FROM users WHERE id=$1',[req.user.id]);
  if (!rows[0]) return res.status(401).json({error:'User not found'});
  if (rows[0].is_founding_member) return next();
  if (rows[0].subscription_status !== 'active') return res.status(403).json({error:'Active subscription required',code:'NO_SUBSCRIPTION'});
  next();
}
async function requireAdmin(req: any, res: any, next: any) {
  if (!req.user) return res.status(401).json({error:'Login required'});
  const {rows} = await pool.query('SELECT is_admin FROM users WHERE id=$1',[req.user.id]);
  if (!rows[0]?.is_admin) return res.status(403).json({error:'Admin access required'});
  next();
}
app.use(authMw);

// PayPal helper
async function paypalFetch(ep: string, method: string, body?: any): Promise<any> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const tr = await fetch(`${PAYPAL_API}/v1/oauth2/token`, { method:'POST', headers:{'Authorization':`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'}, body:'grant_type=client_credentials' });
  const {access_token} = await tr.json() as any;
  const opts: any = { method, headers:{'Authorization':`Bearer ${access_token}`,'Content-Type':'application/json'} };
  if (body) opts.body = JSON.stringify(body);
  return (await fetch(`${PAYPAL_API}${ep}`, opts)).json();
}

// ========== INIT DB ==========
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(64) NOT NULL, display_name VARCHAR(100), date_of_birth DATE NOT NULL,
        age_verified BOOLEAN DEFAULT false, email_verified BOOLEAN DEFAULT false,
        subscription_status VARCHAR(20) DEFAULT 'none', subscription_id VARCHAR(100),
        subscription_provider VARCHAR(20) DEFAULT 'none', subscription_expires_at TIMESTAMP,
        is_admin BOOLEAN DEFAULT false, is_founding_member BOOLEAN DEFAULT false, founding_member_number INTEGER,
        id_document_path VARCHAR(500), id_verified BOOLEAN DEFAULT false,
        cancelled_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) NOT NULL,
        title VARCHAR(255) NOT NULL, description TEXT, category VARCHAR(50) DEFAULT 'other',
        city VARCHAR(50) DEFAULT 'london', price DECIMAL(10,2), contact_info VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending', views INTEGER DEFAULT 0, featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS listing_images (
        id SERIAL PRIMARY KEY, listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        file_path VARCHAR(500) NOT NULL, thumbnail_path VARCHAR(500),
        sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY, listing_id INTEGER REFERENCES listings(id),
        reporter_id INTEGER, reporter_email VARCHAR(255) NOT NULL, reason VARCHAR(50) NOT NULL,
        details TEXT NOT NULL, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY, sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id), listing_id INTEGER REFERENCES listings(id),
        message_text TEXT NOT NULL, read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS deleted_users (
        id SERIAL PRIMARY KEY, original_user_id INTEGER NOT NULL, email VARCHAR(255) NOT NULL,
        display_name VARCHAR(100), reason VARCHAR(50) DEFAULT 'dormant_cleanup',
        deleted_at TIMESTAMP DEFAULT NOW(), original_created_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
      CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
      CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
      CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    `);
    // Migrations for existing DBs
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_founding_member') THEN ALTER TABLE users ADD COLUMN is_founding_member BOOLEAN DEFAULT false; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='founding_member_number') THEN ALTER TABLE users ADD COLUMN founding_member_number INTEGER; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_document_path') THEN ALTER TABLE users ADD COLUMN id_document_path VARCHAR(500); END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_verified') THEN ALTER TABLE users ADD COLUMN id_verified BOOLEAN DEFAULT false; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cancelled_at') THEN ALTER TABLE users ADD COLUMN cancelled_at TIMESTAMP; END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='reporter_email') THEN ALTER TABLE reports ADD COLUMN reporter_email VARCHAR(255); END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='deleted_users') THEN
          CREATE TABLE deleted_users (id SERIAL PRIMARY KEY, original_user_id INTEGER NOT NULL, email VARCHAR(255) NOT NULL, display_name VARCHAR(100), reason VARCHAR(50) DEFAULT 'dormant_cleanup', deleted_at TIMESTAMP DEFAULT NOW(), original_created_at TIMESTAMP);
        END IF;
      END $$;
    `);
    console.log('Database initialized with full feature set');
  } catch (err) { console.error('DB init error:', err); }
}

// Ensure upload dirs
try { fs.mkdirSync(path.join(UPLOAD_DIR, 'images'), { recursive: true }); fs.mkdirSync(path.join(UPLOAD_DIR, 'thumbnails'), { recursive: true }); fs.mkdirSync(path.join(UPLOAD_DIR, 'id_documents'), { recursive: true }); } catch {}

// ========== AUTH ==========
app.post('/auth/register', async (req, res) => {
  try {
    const ip = req.ip || 'unknown';
    if (rateLimit(`reg:${ip}`, 5, 3600000)) return res.status(429).json({error:'Too many registrations, try again later'});
    const { email, password, display_name, date_of_birth } = req.body;
    if (!email || !password || !date_of_birth) return res.status(400).json({error:'Email, password and date of birth required'});
    if (password.length < 8) return res.status(400).json({error:'Password must be at least 8 characters'});
    if (getAge(date_of_birth) < 18) return res.status(403).json({error:'You must be 18 or older to register'});
    const ex = await pool.query('SELECT id FROM users WHERE email=$1',[email.toLowerCase()]);
    if (ex.rows.length > 0) return res.status(409).json({error:'Email already registered'});
    const salt = mkSalt(); const hash = hashPw(password, salt);
    const userCountResult = await pool.query('SELECT COUNT(*) FROM users');
    const currentUserCount = parseInt(userCountResult.rows[0].count);
    const isFoundingMember = currentUserCount < FOUNDING_MEMBER_LIMIT;
    const foundingMemberNumber = isFoundingMember ? currentUserCount + 1 : null;
    const {rows} = await pool.query(
      `INSERT INTO users (email,password_hash,salt,display_name,date_of_birth,age_verified,is_founding_member,founding_member_number,subscription_status)
       VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8) RETURNING id,email,display_name,subscription_status,is_founding_member,founding_member_number`,
      [email.toLowerCase(), hash, salt, display_name||email.split('@')[0], date_of_birth, isFoundingMember, foundingMemberNumber, isFoundingMember ? 'active' : 'none']
    );
    const user = rows[0];
    if (isFoundingMember) console.log(`🌟 Founding Member #${foundingMemberNumber} registered: ${user.email}`);
    // Non-founding members need ID verification — return requires_id flag
    res.status(201).json({ user, token: mkToken(user.id, user.email), requires_id_upload: !isFoundingMember });
  } catch { res.status(500).json({error:'Registration failed'}); }
});

app.post('/auth/login', async (req, res) => {
  try {
    const ip = req.ip || 'unknown';
    if (rateLimit(`login:${ip}`, 10, 900000)) return res.status(429).json({error:'Too many attempts, try again later'});
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({error:'Email and password required'});
    const {rows} = await pool.query('SELECT id,email,display_name,password_hash,salt,subscription_status,subscription_provider,is_admin,is_founding_member,founding_member_number,id_verified,id_document_path FROM users WHERE email=$1',[email.toLowerCase()]);
    if (rows.length === 0) return res.status(401).json({error:'Invalid credentials'});
    const u = rows[0];
    if (hashPw(password, u.salt) !== u.password_hash) return res.status(401).json({error:'Invalid credentials'});
    res.json({ user:{id:u.id,email:u.email,display_name:u.display_name,subscription_status:u.subscription_status,is_admin:u.is_admin,is_founding_member:u.is_founding_member,founding_member_number:u.founding_member_number,id_verified:u.id_verified,has_id_document:!!u.id_document_path}, token:mkToken(u.id,u.email) });
  } catch { res.status(500).json({error:'Login failed'}); }
});

app.get('/auth/me', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query('SELECT id,email,display_name,subscription_status,subscription_provider,subscription_expires_at,is_admin,is_founding_member,founding_member_number,id_verified,id_document_path,cancelled_at,created_at FROM users WHERE id=$1',[req.user.id]);
    if (rows.length===0) return res.status(404).json({error:'User not found'});
    const u = rows[0];
    res.json({...u, has_id_document: !!u.id_document_path});
  } catch { res.status(500).json({error:'Failed'}); }
});

// ========== ID VERIFICATION UPLOAD ==========
app.post('/auth/upload-id', requireAuth, async (req: any, res) => {
  try {
    const { image_data } = req.body;
    if (!image_data) return res.status(400).json({error:'image_data required (base64)'});
    const matches = image_data.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
    if (!matches) return res.status(400).json({error:'Invalid image format. Use JPEG, PNG or WebP'});
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 10 * 1024 * 1024) return res.status(400).json({error:'ID document must be under 10MB'});
    const filename = `id-${req.user.id}-${Date.now()}.${ext}`;
    const filepath = path.join('id_documents', filename);
    fs.writeFileSync(path.join(UPLOAD_DIR, filepath), buffer);
    await pool.query('UPDATE users SET id_document_path=$1 WHERE id=$2',[filepath, req.user.id]);
    res.json({message:'Government ID uploaded successfully. Awaiting admin verification.', uploaded: true});
  } catch { res.status(500).json({error:'Failed to upload ID'}); }
});

// ========== SUBSCRIPTION ==========
app.post('/subscription/paypal/create', requireAuth, async (req: any, res) => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_PLAN_ID) return res.status(503).json({error:'PayPal not configured'});
    const sub = await paypalFetch('/v1/billing/subscriptions','POST',{
      plan_id:PAYPAL_PLAN_ID, subscriber:{email_address:req.user.email},
      application_context:{brand_name:'VibeList',return_url:`${req.headers.origin||'https://vibelist.uk'}/subscription/success`,cancel_url:`${req.headers.origin||'https://vibelist.uk'}/subscription/cancel`}
    });
    if (sub.id) await pool.query('UPDATE users SET subscription_id=$1,subscription_provider=$2 WHERE id=$3',[sub.id,'paypal',req.user.id]);
    res.json({subscription_id:sub.id, approve_url:sub.links?.find((l:any)=>l.rel==='approve')?.href});
  } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/subscription/paypal/activate', requireAuth, async (req: any, res) => {
  try {
    const {subscription_id} = req.body; if (!subscription_id) return res.status(400).json({error:'subscription_id required'});
    const sub = await paypalFetch(`/v1/billing/subscriptions/${subscription_id}`,'GET');
    if (sub.status==='ACTIVE') {
      const exp = new Date(); exp.setMonth(exp.getMonth()+1);
      await pool.query('UPDATE users SET subscription_status=$1,subscription_id=$2,subscription_provider=$3,subscription_expires_at=$4,cancelled_at=null WHERE id=$5',['active',subscription_id,'paypal',exp.toISOString(),req.user.id]);
      res.json({status:'active',message:'Subscription activated!'});
    } else res.json({status:sub.status,message:'Not yet active'});
  } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/subscription/paypal/webhook', async (req, res) => {
  try {
    const ev = req.body; const sid = ev.resource?.id; if (!sid) return res.status(200).json({received:true});
    if (ev.event_type==='BILLING.SUBSCRIPTION.ACTIVATED'||ev.event_type==='PAYMENT.SALE.COMPLETED') {
      const exp = new Date(); exp.setMonth(exp.getMonth()+1);
      await pool.query('UPDATE users SET subscription_status=$1,subscription_expires_at=$2 WHERE subscription_id=$3',['active',exp.toISOString(),sid]);
    } else if (ev.event_type==='BILLING.SUBSCRIPTION.CANCELLED'||ev.event_type==='BILLING.SUBSCRIPTION.SUSPENDED') {
      await pool.query("UPDATE users SET subscription_status='cancelled',cancelled_at=NOW() WHERE subscription_id=$1",[sid]);
    }
    res.status(200).json({received:true});
  } catch { res.status(200).json({received:true}); }
});
app.post('/subscription/manual/activate', async (req, res) => {
  try {
    const {admin_key,user_id,months,provider} = req.body;
    if (admin_key !== process.env.ADMIN_KEY) return res.status(403).json({error:'Unauthorized'});
    const exp = new Date(); exp.setMonth(exp.getMonth()+(months||1));
    await pool.query('UPDATE users SET subscription_status=$1,subscription_provider=$2,subscription_expires_at=$3,cancelled_at=null WHERE id=$4',['active',provider||'manual',exp.toISOString(),user_id]);
    res.json({status:'active',expires_at:exp.toISOString()});
  } catch { res.status(500).json({error:'Failed'}); }
});
app.get('/subscription/config', (_req, res) => { res.json({paypal_client_id:PAYPAL_CLIENT_ID,plan_id:PAYPAL_PLAN_ID,price:'£25/month',paypal_available:!!PAYPAL_CLIENT_ID}); });

// ========== CANCEL SUBSCRIPTION ==========
app.post('/subscription/cancel', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query('SELECT subscription_id,subscription_provider,is_founding_member FROM users WHERE id=$1',[req.user.id]);
    if (!rows[0]) return res.status(404).json({error:'User not found'});
    if (rows[0].is_founding_member) return res.status(400).json({error:'Founding members have permanent access and cannot cancel'});
    // Try to cancel PayPal subscription
    if (rows[0].subscription_provider === 'paypal' && rows[0].subscription_id) {
      try { await paypalFetch(`/v1/billing/subscriptions/${rows[0].subscription_id}/cancel`,'POST',{reason:'User requested cancellation'}); } catch {}
    }
    await pool.query("UPDATE users SET subscription_status='cancelled',cancelled_at=NOW() WHERE id=$1",[req.user.id]);
    res.json({message:'Subscription cancelled. Your access continues until the current billing period ends. After 90 days of inactivity, you will receive an email about account retention.'});
  } catch { res.status(500).json({error:'Failed to cancel subscription'}); }
});

// ========== DORMANT ACCOUNT CLEANUP ==========
app.get('/admin/dormant-accounts', requireAdmin, async (_req, res) => {
  try {
    const {rows} = await pool.query(`SELECT id,email,display_name,subscription_status,cancelled_at,subscription_expires_at,created_at FROM users WHERE subscription_status='cancelled' AND cancelled_at IS NOT NULL AND cancelled_at < NOW() - INTERVAL '${DORMANT_DAYS} days' AND is_founding_member=false ORDER BY cancelled_at ASC`);
    res.json(rows);
  } catch { res.status(500).json({error:'Failed'}); }
});

app.post('/admin/users/:id/delete-account', requireAdmin, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const {rows} = await pool.query('SELECT id,email,display_name,created_at FROM users WHERE id=$1',[userId]);
    if (rows.length === 0) return res.status(404).json({error:'User not found'});
    const u = rows[0];
    // Archive to deleted_users
    await pool.query('INSERT INTO deleted_users (original_user_id,email,display_name,reason,original_created_at) VALUES ($1,$2,$3,$4,$5)',[u.id,u.email,u.display_name,req.body.reason||'dormant_cleanup',u.created_at]);
    // Delete listing images from disk
    const imgs = await pool.query('SELECT li.file_path,li.thumbnail_path FROM listing_images li JOIN listings l ON li.listing_id=l.id WHERE l.user_id=$1',[userId]);
    for (const img of imgs.rows) {
      try { if (img.file_path) fs.unlinkSync(path.join(UPLOAD_DIR, img.file_path)); } catch {}
      try { if (img.thumbnail_path) fs.unlinkSync(path.join(UPLOAD_DIR, img.thumbnail_path)); } catch {}
    }
    // Delete ID document
    const {rows:uDoc} = await pool.query('SELECT id_document_path FROM users WHERE id=$1',[userId]);
    if (uDoc[0]?.id_document_path) { try { fs.unlinkSync(path.join(UPLOAD_DIR, uDoc[0].id_document_path)); } catch {} }
    // Delete messages, reports, listing_images, listings, then user
    await pool.query('DELETE FROM messages WHERE sender_id=$1 OR receiver_id=$1',[userId]);
    await pool.query('DELETE FROM reports WHERE reporter_id=$1',[userId]);
    await pool.query('DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE user_id=$1)',[userId]);
    await pool.query('DELETE FROM listings WHERE user_id=$1',[userId]);
    await pool.query('DELETE FROM users WHERE id=$1',[userId]);
    res.json({message:`User ${u.email} deleted and archived. All listings, media, and messages removed.`});
  } catch (err) { console.error(err); res.status(500).json({error:'Failed to delete account'}); }
});

// User self-delete
app.post('/account/delete', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query('SELECT id,email,display_name,is_founding_member,created_at FROM users WHERE id=$1',[req.user.id]);
    if (rows.length === 0) return res.status(404).json({error:'User not found'});
    const u = rows[0];
    await pool.query('INSERT INTO deleted_users (original_user_id,email,display_name,reason,original_created_at) VALUES ($1,$2,$3,$4,$5)',[u.id,u.email,u.display_name,'user_requested',u.created_at]);
    const imgs = await pool.query('SELECT li.file_path,li.thumbnail_path FROM listing_images li JOIN listings l ON li.listing_id=l.id WHERE l.user_id=$1',[u.id]);
    for (const img of imgs.rows) { try { if (img.file_path) fs.unlinkSync(path.join(UPLOAD_DIR, img.file_path)); } catch {} }
    if (u.id_document_path) { try { fs.unlinkSync(path.join(UPLOAD_DIR, u.id_document_path)); } catch {} }
    await pool.query('DELETE FROM messages WHERE sender_id=$1 OR receiver_id=$1',[u.id]);
    await pool.query('DELETE FROM reports WHERE reporter_id=$1',[u.id]);
    await pool.query('DELETE FROM listing_images WHERE listing_id IN (SELECT id FROM listings WHERE user_id=$1)',[u.id]);
    await pool.query('DELETE FROM listings WHERE user_id=$1',[u.id]);
    await pool.query('DELETE FROM users WHERE id=$1',[u.id]);
    res.json({message:'Account deleted successfully.'});
  } catch { res.status(500).json({error:'Failed'}); }
});

// ========== LISTINGS ==========
app.get('/listings', async (req, res) => {
  try {
    const { category, city, status, page, limit: lim } = req.query as any;
    const pg = Math.max(1, parseInt(page)||1); const lt = Math.min(50, Math.max(1, parseInt(lim)||20));
    let where = ["l.status='approved'"]; const params: any[] = [];
    if (category && CATEGORIES.includes(category)) { params.push(category); where.push(`l.category=$${params.length}`); }
    if (city && CITIES.includes(city)) { params.push(city); where.push(`l.city=$${params.length}`); }
    if (status === 'pending' || status === 'rejected' || status === 'hidden') { where = [`l.status='${status}'`]; }
    const offset = (pg-1)*lt; params.push(lt); params.push(offset);
    const q = `SELECT l.*, u.display_name as author, (SELECT file_path FROM listing_images WHERE listing_id=l.id ORDER BY sort_order LIMIT 1) as image
      FROM listings l LEFT JOIN users u ON l.user_id=u.id WHERE ${where.join(' AND ')} ORDER BY l.featured DESC, l.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`;
    const {rows} = await pool.query(q, params);
    res.json({listings:rows, page:pg, limit:lt});
  } catch (err) { console.error(err); res.status(500).json({error:'Failed to fetch listings'}); }
});

app.get('/listings/:id', async (req, res) => {
  try {
    const {rows} = await pool.query(`SELECT l.*, u.display_name as author, u.id as author_id FROM listings l LEFT JOIN users u ON l.user_id=u.id WHERE l.id=$1`,[req.params.id]);
    if (rows.length===0) return res.status(404).json({error:'Listing not found'});
    await pool.query('UPDATE listings SET views=views+1 WHERE id=$1',[req.params.id]);
    const imgs = await pool.query('SELECT id,file_path,thumbnail_path,sort_order FROM listing_images WHERE listing_id=$1 ORDER BY sort_order',[req.params.id]);
    res.json({...rows[0], images: imgs.rows});
  } catch { res.status(500).json({error:'Failed'}); }
});

app.get('/listings/user/mine', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query(`SELECT l.*, (SELECT file_path FROM listing_images WHERE listing_id=l.id ORDER BY sort_order LIMIT 1) as image FROM listings l WHERE l.user_id=$1 ORDER BY l.created_at DESC`,[req.user.id]);
    res.json(rows);
  } catch { res.status(500).json({error:'Failed'}); }
});

app.post('/listings', requireSub, async (req: any, res) => {
  try {
    if (rateLimit(`post:${req.user.id}`, 10, 3600000)) return res.status(429).json({error:'Posting too frequently'});
    const { title, description, category, city, price, contact_info } = req.body;
    if (!title || title.length < 5) return res.status(400).json({error:'Title must be at least 5 characters'});
    if (!description || description.length < 10) return res.status(400).json({error:'Description must be at least 10 characters'});
    const cat = CATEGORIES.includes(category) ? category : 'other';
    const ct = CITIES.includes(city) ? city : 'london';
    const {rows} = await pool.query(
      'INSERT INTO listings (user_id,title,description,category,city,price,contact_info,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, title, description, cat, ct, price||null, contact_info||null, 'pending']
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({error:'Failed to create listing'}); }
});

app.put('/listings/:id', requireAuth, async (req: any, res) => {
  try {
    const {rows:existing} = await pool.query('SELECT user_id,status FROM listings WHERE id=$1',[req.params.id]);
    if (existing.length===0) return res.status(404).json({error:'Not found'});
    if (existing[0].user_id !== req.user.id) return res.status(403).json({error:'Not your listing'});
    const { title, description, category, city, price, contact_info } = req.body;
    const cat = CATEGORIES.includes(category) ? category : existing[0].category;
    const ct = CITIES.includes(city) ? city : existing[0].city;
    const {rows} = await pool.query(
      'UPDATE listings SET title=COALESCE($1,title),description=COALESCE($2,description),category=$3,city=$4,price=COALESCE($5,price),contact_info=COALESCE($6,contact_info),status=$7,updated_at=NOW() WHERE id=$8 RETURNING *',
      [title, description, cat, ct, price, contact_info, 'pending', req.params.id]
    );
    res.json(rows[0]);
  } catch { res.status(500).json({error:'Failed'}); }
});

app.delete('/listings/:id', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query('SELECT user_id FROM listings WHERE id=$1',[req.params.id]);
    if (rows.length===0) return res.status(404).json({error:'Not found'});
    const {rows:usr} = await pool.query('SELECT is_admin FROM users WHERE id=$1',[req.user.id]);
    if (rows[0].user_id !== req.user.id && !usr[0]?.is_admin) return res.status(403).json({error:'Not authorized'});
    const imgs = await pool.query('SELECT file_path,thumbnail_path FROM listing_images WHERE listing_id=$1',[req.params.id]);
    for (const img of imgs.rows) {
      try { if (img.file_path) fs.unlinkSync(path.join(UPLOAD_DIR, img.file_path)); } catch {}
      try { if (img.thumbnail_path) fs.unlinkSync(path.join(UPLOAD_DIR, img.thumbnail_path)); } catch {}
    }
    await pool.query('DELETE FROM listings WHERE id=$1',[req.params.id]);
    res.json({message:'Listing deleted'});
  } catch { res.status(500).json({error:'Failed'}); }
});

// ========== IMAGE UPLOAD ==========
app.post('/listings/:id/images', requireAuth, async (req: any, res) => {
  try {
    const {rows:listing} = await pool.query('SELECT user_id FROM listings WHERE id=$1',[req.params.id]);
    if (listing.length===0) return res.status(404).json({error:'Listing not found'});
    if (listing[0].user_id !== req.user.id) return res.status(403).json({error:'Not your listing'});
    const {rows:imgCount} = await pool.query('SELECT COUNT(*) FROM listing_images WHERE listing_id=$1',[req.params.id]);
    if (parseInt(imgCount[0].count) >= 5) return res.status(400).json({error:'Maximum 5 images per listing'});
    const { image_data } = req.body;
    if (!image_data) return res.status(400).json({error:'image_data required (base64)'});
    const matches = image_data.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
    if (!matches) return res.status(400).json({error:'Invalid image format. Use JPEG, PNG or WebP'});
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) return res.status(400).json({error:'Image must be under 5MB'});
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join('images', filename);
    fs.writeFileSync(path.join(UPLOAD_DIR, filepath), buffer);
    const {rows} = await pool.query(
      'INSERT INTO listing_images (listing_id,file_path,sort_order) VALUES ($1,$2,(SELECT COALESCE(MAX(sort_order),0)+1 FROM listing_images WHERE listing_id=$1)) RETURNING *',
      [req.params.id, filepath]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({error:'Failed to upload image'}); }
});

app.delete('/listings/:listingId/images/:imageId', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query('SELECT li.file_path,l.user_id FROM listing_images li JOIN listings l ON li.listing_id=l.id WHERE li.id=$1',[req.params.imageId]);
    if (rows.length===0) return res.status(404).json({error:'Image not found'});
    if (rows[0].user_id !== req.user.id) return res.status(403).json({error:'Not authorized'});
    try { fs.unlinkSync(path.join(UPLOAD_DIR, rows[0].file_path)); } catch {}
    await pool.query('DELETE FROM listing_images WHERE id=$1',[req.params.imageId]);
    res.json({message:'Image deleted'});
  } catch { res.status(500).json({error:'Failed'}); }
});

// ========== REPORTS (enhanced — email + justification required) ==========
app.post('/listings/:id/report', async (req: any, res) => {
  try {
    const { reason, details, reporter_email } = req.body;
    if (!reason) return res.status(400).json({error:'Reason required'});
    if (!reporter_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporter_email)) return res.status(400).json({error:'A valid email address is required to submit a report'});
    if (!details || details.length < 20) return res.status(400).json({error:'Please provide a detailed justification (at least 20 characters)'});
    const valid = ['scam','inappropriate','duplicate','spam','misleading','other'];
    if (!valid.includes(reason)) return res.status(400).json({error:`Reason must be: ${valid.join(', ')}`});
    const reporterId = req.user?.id || null;
    if (reporterId) {
      const ex = await pool.query('SELECT id FROM reports WHERE listing_id=$1 AND reporter_id=$2',[req.params.id,reporterId]);
      if (ex.rows.length>0) return res.status(409).json({error:'You have already reported this listing'});
    }
    await pool.query('INSERT INTO reports (listing_id,reporter_id,reporter_email,reason,details) VALUES ($1,$2,$3,$4,$5)',[req.params.id,reporterId,reporter_email,reason,details]);
    res.status(201).json({message:'Report submitted successfully. Our team will review this listing.'});
  } catch { res.status(500).json({error:'Failed'}); }
});

// ========== MESSAGES ==========
app.post('/messages', requireAuth, async (req: any, res) => {
  try {
    if (rateLimit(`msg:${req.user.id}`, 30, 3600000)) return res.status(429).json({error:'Message rate limit reached'});
    const { receiver_id, listing_id, message_text } = req.body;
    if (!receiver_id || !message_text) return res.status(400).json({error:'receiver_id and message_text required'});
    if (receiver_id === req.user.id) return res.status(400).json({error:'Cannot message yourself'});
    const {rows} = await pool.query('INSERT INTO messages (sender_id,receiver_id,listing_id,message_text) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, receiver_id, listing_id||null, message_text]);
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({error:'Failed'}); }
});

app.get('/messages', requireAuth, async (req: any, res) => {
  try {
    const {rows} = await pool.query(`SELECT m.*, u.display_name as sender_name FROM messages m JOIN users u ON m.sender_id=u.id WHERE m.receiver_id=$1 ORDER BY m.created_at DESC LIMIT 50`,[req.user.id]);
    res.json(rows);
  } catch { res.status(500).json({error:'Failed'}); }
});

app.get('/messages/conversation/:userId', requireAuth, async (req: any, res) => {
  try {
    const other = parseInt(req.params.userId);
    const {rows} = await pool.query(`SELECT m.*, u.display_name as sender_name FROM messages m JOIN users u ON m.sender_id=u.id
      WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1) ORDER BY m.created_at ASC LIMIT 100`,[req.user.id, other]);
    await pool.query('UPDATE messages SET read=true WHERE receiver_id=$1 AND sender_id=$2 AND read=false',[req.user.id, other]);
    res.json(rows);
  } catch { res.status(500).json({error:'Failed'}); }
});

// ========== ADMIN ==========
app.get('/admin/listings', requireAdmin, async (req: any, res) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const {rows} = await pool.query(`SELECT l.*, u.display_name as author FROM listings l JOIN users u ON l.user_id=u.id WHERE l.status=$1 ORDER BY l.created_at DESC`,[status]);
    res.json(rows);
  } catch { res.status(500).json({error:'Failed'}); }
});

app.post('/admin/listings/:id/approve', requireAdmin, async (_req: any, res) => {
  try { await pool.query("UPDATE listings SET status='approved',updated_at=NOW() WHERE id=$1",[_req.params.id]); res.json({message:'Listing approved'}); } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/listings/:id/reject', requireAdmin, async (_req: any, res) => {
  try { await pool.query("UPDATE listings SET status='rejected',updated_at=NOW() WHERE id=$1",[_req.params.id]); res.json({message:'Listing rejected'}); } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/listings/:id/hide', requireAdmin, async (_req: any, res) => {
  try { await pool.query("UPDATE listings SET status='hidden',updated_at=NOW() WHERE id=$1",[_req.params.id]); res.json({message:'Listing hidden from public view'}); } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/listings/:id/unhide', requireAdmin, async (_req: any, res) => {
  try { await pool.query("UPDATE listings SET status='approved',updated_at=NOW() WHERE id=$1",[_req.params.id]); res.json({message:'Listing restored to public view'}); } catch { res.status(500).json({error:'Failed'}); }
});

app.get('/admin/reports', requireAdmin, async (_req, res) => {
  try {
    const {rows} = await pool.query(`SELECT r.*, l.title as listing_title, l.status as listing_status FROM reports r JOIN listings l ON r.listing_id=l.id WHERE r.status='pending' ORDER BY r.created_at DESC`);
    res.json(rows);
  } catch { res.status(500).json({error:'Failed'}); }
});

app.post('/admin/reports/:id/resolve', requireAdmin, async (req: any, res) => {
  try {
    const { action } = req.body; // 'dismiss' or 'hide_listing'
    await pool.query("UPDATE reports SET status='resolved' WHERE id=$1",[req.params.id]);
    if (action === 'hide_listing') {
      const {rows} = await pool.query('SELECT listing_id FROM reports WHERE id=$1',[req.params.id]);
      if (rows[0]) await pool.query("UPDATE listings SET status='hidden',updated_at=NOW() WHERE id=$1",[rows[0].listing_id]);
    }
    res.json({message:'Report resolved'});
  } catch { res.status(500).json({error:'Failed'}); }
});

app.get('/admin/stats', requireAdmin, async (_req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const listings = await pool.query('SELECT COUNT(*) FROM listings');
    const pending = await pool.query("SELECT COUNT(*) FROM listings WHERE status='pending'");
    const hidden = await pool.query("SELECT COUNT(*) FROM listings WHERE status='hidden'");
    const active = await pool.query("SELECT COUNT(*) FROM users WHERE subscription_status='active'");
    const reports = await pool.query("SELECT COUNT(*) FROM reports WHERE status='pending'");
    const founders = await pool.query("SELECT COUNT(*) FROM users WHERE is_founding_member=true");
    const dormant = await pool.query(`SELECT COUNT(*) FROM users WHERE subscription_status='cancelled' AND cancelled_at IS NOT NULL AND cancelled_at < NOW() - INTERVAL '${DORMANT_DAYS} days' AND is_founding_member=false`);
    const deleted = await pool.query('SELECT COUNT(*) FROM deleted_users');
    const pendingId = await pool.query("SELECT COUNT(*) FROM users WHERE id_document_path IS NOT NULL AND id_verified=false");
    res.json({
      total_users:parseInt(users.rows[0].count), total_listings:parseInt(listings.rows[0].count),
      pending_listings:parseInt(pending.rows[0].count), hidden_listings:parseInt(hidden.rows[0].count),
      active_subscribers:parseInt(active.rows[0].count), pending_reports:parseInt(reports.rows[0].count),
      founding_members:parseInt(founders.rows[0].count), founding_member_limit:FOUNDING_MEMBER_LIMIT,
      dormant_accounts:parseInt(dormant.rows[0].count), deleted_accounts:parseInt(deleted.rows[0].count),
      pending_id_verifications:parseInt(pendingId.rows[0].count),
    });
  } catch { res.status(500).json({error:'Failed'}); }
});

app.get('/admin/users', requireAdmin, async (_req, res) => {
  try {
    const {rows} = await pool.query(`SELECT id, email, display_name, subscription_status, subscription_provider, is_admin, is_founding_member, founding_member_number, id_verified, id_document_path, cancelled_at, created_at FROM users ORDER BY id ASC`);
    res.json(rows.map((u: any) => ({...u, has_id_document: !!u.id_document_path})));
  } catch { res.status(500).json({error:'Failed'}); }
});

app.post('/admin/users/:id/grant-founding', requireAdmin, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    const {rows:maxNum} = await pool.query('SELECT COALESCE(MAX(founding_member_number),0) as max_num FROM users WHERE is_founding_member=true');
    const nextNum = maxNum[0].max_num + 1;
    await pool.query('UPDATE users SET is_founding_member=true, founding_member_number=$1, subscription_status=$2 WHERE id=$3',[nextNum, 'active', userId]);
    res.json({message:`User granted Founding Member #${nextNum} status`});
  } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/users/:id/revoke-founding', requireAdmin, async (req: any, res) => {
  try { await pool.query('UPDATE users SET is_founding_member=false, founding_member_number=null, subscription_status=$1 WHERE id=$2',['none', parseInt(req.params.id)]); res.json({message:'Founding member status revoked'}); } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/users/:id/make-admin', async (req, res) => {
  try { if (req.body.admin_key !== process.env.ADMIN_KEY) return res.status(403).json({error:'Unauthorized'}); await pool.query('UPDATE users SET is_admin=true WHERE id=$1',[req.params.id]); res.json({message:'User is now admin'}); } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/users/:id/toggle-admin', requireAdmin, async (req: any, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json({error:'Cannot change your own admin status'});
    const {rows} = await pool.query('SELECT is_admin FROM users WHERE id=$1',[userId]);
    if (rows.length === 0) return res.status(404).json({error:'User not found'});
    await pool.query('UPDATE users SET is_admin=$1 WHERE id=$2',[!rows[0].is_admin, userId]);
    res.json({message: !rows[0].is_admin ? 'User promoted to admin' : 'Admin access removed'});
  } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/users/:id/suspend', requireAdmin, async (req: any, res) => {
  try { if (parseInt(req.params.id) === req.user.id) return res.status(400).json({error:'Cannot suspend yourself'}); await pool.query("UPDATE users SET subscription_status='suspended' WHERE id=$1",[req.params.id]); res.json({message:'User suspended'}); } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/users/:id/activate', requireAdmin, async (req: any, res) => {
  try { const exp = new Date(); exp.setMonth(exp.getMonth()+1); await pool.query('UPDATE users SET subscription_status=$1,subscription_provider=$2,subscription_expires_at=$3,cancelled_at=null WHERE id=$4',['active','admin',exp.toISOString(),req.params.id]); res.json({message:'User subscription activated for 1 month'}); } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/users/:id/verify-id', requireAdmin, async (req: any, res) => {
  try { await pool.query('UPDATE users SET id_verified=true WHERE id=$1',[req.params.id]); res.json({message:'User ID verified'}); } catch { res.status(500).json({error:'Failed'}); }
});
app.post('/admin/users/:id/reject-id', requireAdmin, async (req: any, res) => {
  try { await pool.query('UPDATE users SET id_verified=false, id_document_path=null WHERE id=$1',[req.params.id]); res.json({message:'User ID rejected — they will need to re-upload'}); } catch { res.status(500).json({error:'Failed'}); }
});

// ========== META ==========
app.get('/health', (_req, res) => { res.json({status:'ok',service:'vibelist-api',timestamp:new Date().toISOString()}); });
app.get('/meta/categories', (_req, res) => { res.json(CATEGORIES); });
app.get('/meta/cities', (_req, res) => { res.json(CITIES); });
app.get('/meta/founding-status', async (_req, res) => {
  try {
    const {rows} = await pool.query('SELECT COUNT(*) FROM users');
    const count = parseInt(rows[0].count);
    res.json({ current_members: count, founding_limit: FOUNDING_MEMBER_LIMIT, slots_remaining: Math.max(0, FOUNDING_MEMBER_LIMIT - count), founding_open: count < FOUNDING_MEMBER_LIMIT });
  } catch { res.status(500).json({error:'Failed'}); }
});

// Start
initDB().then(() => { app.listen(PORT, () => { console.log(`VibeList API running on port ${PORT}`); }); });