import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://vibelist:password@localhost:5432/vibelist',
});

// Initialize database tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vibes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'general',
        emoji VARCHAR(10) DEFAULT '✨',
        upvotes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed with sample data if empty
    const { rows } = await pool.query('SELECT COUNT(*) FROM vibes');
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO vibes (title, description, category, emoji) VALUES
        ('Sunday Roast at The Ivy', 'Perfect roast with all the trimmings', 'food', '🍖'),
        ('Sunset at Primrose Hill', 'Best views of the London skyline', 'outdoors', '🌅'),
        ('Vinyl Night at Rough Trade', 'Live DJ sets and rare finds', 'music', '🎵'),
        ('Morning Yoga in Hyde Park', 'Free community sessions every Saturday', 'wellness', '🧘'),
        ('Street Art Walk in Shoreditch', 'Self-guided tour of amazing murals', 'culture', '🎨')
      `);
    }
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vibelist-api', timestamp: new Date().toISOString() });
});

// Get all vibes
app.get('/vibes', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vibes ORDER BY upvotes DESC, created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vibes' });
  }
});

// Get vibes by category
app.get('/vibes/category/:category', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vibes WHERE category = $1 ORDER BY upvotes DESC', [req.params.category]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vibes' });
  }
});

// Create a vibe
app.post('/vibes', async (req, res) => {
  try {
    const { title, description, category, emoji } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const { rows } = await pool.query(
      'INSERT INTO vibes (title, description, category, emoji) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description || '', category || 'general', emoji || '✨']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create vibe' });
  }
});

// Upvote a vibe
app.post('/vibes/:id/upvote', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE vibes SET upvotes = upvotes + 1 WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Vibe not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

// Delete a vibe
app.delete('/vibes/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM vibes WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Vibe not found' });
    res.json({ message: 'Vibe deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vibe' });
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`VibeList API running on port ${PORT}`);
  });
});