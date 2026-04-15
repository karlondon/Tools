'use client';
import { useState, useEffect, useCallback } from 'react';
import { profileAPI } from '@/lib/api';
import Link from 'next/link';

type ViewMode = 'tile' | 'list';

export default function BrowsePage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('tile');
  const [filters, setFilters] = useState({
    location: '', minAge: '', maxAge: '', inCall: '', outCall: '',
    minRate: '', maxRate: '', sort: 'newest',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await profileAPI.getAll(params);
      setProfiles(res.data.profiles || []);
    } catch { setProfiles([]); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, []);

  const f = (k: string) => ({
    value: (filters as any)[k],
    onChange: (e: any) => setFilters(prev => ({ ...prev, [k]: e.target.value })),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-white">Browse <span className="text-gold-400">Companions</span></h1>
          <p className="text-gray-400 text-sm mt-1">{profiles.length} profiles available</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-2 bg-dark-700 rounded-lg p-1">
          <button onClick={() => setView('tile')} className={`px-3 py-1.5 rounded text-sm transition-colors ${view === 'tile' ? 'bg-gold-500 text-dark-900 font-medium' : 'text-gray-400 hover:text-white'}`}>
            ⊞ Tile
          </button>
          <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded text-sm transition-colors ${view === 'list' ? 'bg-gold-500 text-dark-900 font-medium' : 'text-gray-400 hover:text-white'}`}>
            ☰ List
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-dark mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <input className="input-dark text-sm" placeholder="Location / City" {...f('location')} />
          <input className="input-dark text-sm" type="number" placeholder="Min Age" min="18" {...f('minAge')} />
          <input className="input-dark text-sm" type="number" placeholder="Max Age" {...f('maxAge')} />
          <input className="input-dark text-sm" type="number" placeholder="Min Rate $" {...f('minRate')} />
          <input className="input-dark text-sm" type="number" placeholder="Max Rate $" {...f('maxRate')} />
          <select className="input-dark text-sm" {...f('sort')}>
            <option value="newest">Newest</option>
            <option value="rate_asc">Rate: Low → High</option>
            <option value="rate_desc">Rate: High → Low</option>
          </select>
          <button onClick={load} className="btn-gold text-sm py-2">Search</button>
        </div>
        <div className="flex gap-4 mt-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" className="accent-gold-500" checked={filters.inCall === '1'} onChange={e => setFilters(p => ({ ...p, inCall: e.target.checked ? '1' : '' }))} />
            🏠 InCall
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" className="accent-gold-500" checked={filters.outCall === '1'} onChange={e => setFilters(p => ({ ...p, outCall: e.target.checked ? '1' : '' }))} />
            🚗 OutCall
          </label>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading companions…</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No profiles found. Try adjusting your filters.</div>
      ) : view === 'tile' ? (
        /* Tile / Grid view */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {profiles.map((p: any) => {
            const photo = p.photos?.find((ph: any) => ph.isPrimary) || p.photos?.[0];
            return (
              <Link key={p.id} href={`/profile/${p.userId}`} className="block group">
                <div className="card-dark overflow-hidden hover:border-gold-500 transition-all duration-200 hover:-translate-y-1 p-0">
                  <div className="relative h-52 bg-dark-700 overflow-hidden">
                    {photo ? <img src={photo.url} alt={p.displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center text-5xl text-gray-600">👤</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-semibold text-sm">{p.displayName}{p.age ? `, ${p.age}` : ''}</p>
                      {p.location && <p className="text-gray-300 text-xs">📍 {p.location}</p>}
                    </div>
                    {p.isVip && <span className="absolute top-2 right-2 badge-gold">VIP</span>}
                  </div>
                  <div className="p-3">
                    <div className="flex justify-between items-center">
                      {p.hourlyRate ? <span className="text-gold-400 font-bold text-sm">${p.hourlyRate}/hr</span> : <span className="text-gray-500 text-xs">Rate on request</span>}
                      <div className="flex gap-1 text-xs">
                        {p.inCall && <span className="text-gray-400" title="InCall">🏠</span>}
                        {p.outCall && <span className="text-gray-400" title="OutCall">🚗</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-3">
          {profiles.map((p: any) => {
            const photo = p.photos?.find((ph: any) => ph.isPrimary) || p.photos?.[0];
            return (
              <Link key={p.id} href={`/profile/${p.userId}`} className="card-dark flex items-center gap-4 hover:border-gold-500 transition-colors group">
                <div className="w-20 h-20 rounded-lg bg-dark-700 overflow-hidden flex-shrink-0">
                  {photo ? <img src={photo.url} alt={p.displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-semibold">{p.displayName}{p.age ? `, ${p.age}` : ''}</h3>
                    {p.isVip && <span className="badge-gold text-xs">VIP</span>}
                  </div>
                  {p.location && <p className="text-gray-400 text-sm">📍 {p.location}</p>}
                  {p.headline && <p className="text-gray-300 text-sm line-clamp-1">{p.headline}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    {p.inCall && <span>🏠 InCall</span>}
                    {p.outCall && <span>🚗 OutCall</span>}
                    {p.privateMedia?.length > 0 && <span>🔒 Private gallery</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {p.hourlyRate ? <p className="text-gold-400 font-bold">${p.hourlyRate}<span className="text-gray-500 text-xs">/hr</span></p> : <p className="text-gray-500 text-sm">Rate on request</p>}
                  <p className="text-gold-500 text-xs mt-1">View Profile →</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}