'use client';
import { useState, useEffect } from 'react';

interface Vibe {
  id: number;
  title: string;
  description: string;
  category: string;
  emoji: string;
  upvotes: number;
  created_at: string;
}

const CATEGORIES = ['all', 'food', 'outdoors', 'music', 'wellness', 'culture', 'nightlife', 'general'];
const API = '/api';

export default function Home() {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general', emoji: '✨' });
  const [loading, setLoading] = useState(true);

  const fetchVibes = async () => {
    try {
      const url = filter === 'all' ? `${API}/vibes` : `${API}/vibes/category/${filter}`;
      const res = await fetch(url);
      if (res.ok) setVibes(await res.json());
    } catch (e) {
      console.error('Failed to fetch vibes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVibes(); }, [filter]);

  const upvote = async (id: number) => {
    await fetch(`${API}/vibes/${id}/upvote`, { method: 'POST' });
    fetchVibes();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API}/vibes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ title: '', description: '', category: 'general', emoji: '✨' });
    setShowForm(false);
    fetchVibes();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      <header style={{ textAlign: 'center', padding: '40px 0 20px' }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>✨ VibeList</h1>
        <p style={{ color: '#888', fontSize: '1.2rem' }}>Discover & share the best vibes in your city</p>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', margin: '20px 0' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: filter === c ? '#6366f1' : '#222', color: filter === c ? '#fff' : '#aaa',
              fontSize: '0.9rem', textTransform: 'capitalize'
            }}>
            {c}
          </button>
        ))}
      </div>

      <button onClick={() => setShowForm(!showForm)}
        style={{
          display: 'block', width: '100%', padding: '14px', marginBottom: 20,
          background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12,
          fontSize: '1rem', cursor: 'pointer'
        }}>
        {showForm ? '✕ Cancel' : '+ Add a Vibe'}
      </button>

      {showForm && (
        <form onSubmit={submit} style={{ background: '#1a1a1a', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <input placeholder="What's the vibe?" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} required
            style={{ width: '100%', padding: 12, marginBottom: 10, background: '#222', color: '#fff', border: '1px solid #333', borderRadius: 8, boxSizing: 'border-box' }} />
          <input placeholder="Tell us more..." value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            style={{ width: '100%', padding: 12, marginBottom: 10, background: '#222', color: '#fff', border: '1px solid #333', borderRadius: 8, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              style={{ flex: 1, padding: 12, background: '#222', color: '#fff', border: '1px solid #333', borderRadius: 8 }}>
              {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Emoji" value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })}
              style={{ width: 60, padding: 12, background: '#222', color: '#fff', border: '1px solid #333', borderRadius: 8, textAlign: 'center' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: 12, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}>
            Submit Vibe
          </button>
        </form>
      )}

      {loading ? <p style={{ textAlign: 'center', color: '#666' }}>Loading vibes...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {vibes.map(v => (
            <div key={v.id} style={{ background: '#1a1a1a', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: '2rem' }}>{v.emoji}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px' }}>{v.title}</h3>
                <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>{v.description}</p>
                <span style={{ fontSize: '0.75rem', color: '#6366f1', textTransform: 'capitalize' }}>{v.category}</span>
              </div>
              <button onClick={() => upvote(v.id)}
                style={{ background: '#222', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>▲</span>
                <span style={{ fontSize: '0.9rem' }}>{v.upvotes}</span>
              </button>
            </div>
          ))}
          {vibes.length === 0 && <p style={{ textAlign: 'center', color: '#666' }}>No vibes yet. Be the first!</p>}
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>
        <p>VibeList.uk © 2025</p>
      </footer>
    </div>
  );
}