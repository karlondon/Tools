'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-900 text-yellow-300',
  CONFIRMED: 'bg-green-900 text-green-300',
  COMPLETED: 'bg-blue-900 text-blue-300',
  CANCELLED: 'bg-red-900 text-red-400',
  NO_SHOW: 'bg-gray-700 text-gray-400',
};

// Currencies accepted via Coinbase Commerce checkout
const ACCEPTED = [
  { symbol: '₿', label: 'BTC' },
  { symbol: 'Ł', label: 'LTC' },
  { symbol: '$', label: 'USDC' },
  { symbol: 'Ξ', label: 'ETH' },
  { symbol: '◈', label: 'DAI' },
];

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const successRef = params?.get('ref');

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return; }
    api.get('/bookings').then(r => { setBookings(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handlePay = async (bookingId: string) => {
    setPayingId(bookingId);
    try {
      const res = await api.post(`/bookings/${bookingId}/payment`);
      window.location.href = res.data.checkoutUrl;
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create payment. Please try again.');
      setPayingId(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    await api.patch(`/bookings/${bookingId}/cancel`);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-bold text-white mb-2">My <span className="text-gold-400">Bookings</span></h1>
      <p className="text-gray-400 mb-8">Manage your upcoming and past appointments</p>

      {successRef && (
        <div className="bg-green-900 border border-green-500 text-green-300 rounded-lg p-4 mb-6">
          ✓ Payment confirmed! Booking reference: <strong>#{successRef.slice(-8).toUpperCase()}</strong>. Check your email for details.
        </div>
      )}

      {loading ? <p className="text-gray-400">Loading…</p> : bookings.length === 0 ? (
        <div className="card-dark text-center py-12">
          <p className="text-gray-400 mb-4">No bookings yet</p>
          <Link href="/browse" className="btn-gold">Browse Companions</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: any) => {
            const photo = b.profile?.photos?.[0];
            const dateStr = new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <div key={b.id} className="card-dark">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-dark-700 overflow-hidden flex-shrink-0">
                    {photo ? <img src={photo.url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="text-white font-semibold">{b.profile?.displayName || 'Companion'}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || 'bg-gray-700 text-gray-400'}`}>{b.status.replace('_', ' ')}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 text-gray-300">{b.type}</span>
                    </div>
                    <p className="text-gray-300 text-sm">📅 {dateStr} · ⏰ {b.startTime} · {b.hours}hr</p>
                    {b.hotelName && <p className="text-gray-400 text-sm">🏨 {b.hotelName}{b.hotelCity ? `, ${b.hotelCity}` : ''}</p>}
                    <p className="text-gold-400 text-sm font-semibold mt-1">${b.totalAmount?.toFixed(2)} USD · Ref: #{b.ref?.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {b.status === 'PENDING_PAYMENT' && (
                      <>
                        <button
                          onClick={() => handlePay(b.id)}
                          disabled={payingId === b.id}
                          className="btn-gold text-sm py-2 px-3 disabled:opacity-60">
                          {payingId === b.id ? 'Redirecting…' : 'Pay Now'}
                        </button>
                        <div className="flex gap-1">
                          {ACCEPTED.map(c => (
                            <span key={c.label} title={c.label}
                              className="text-xs px-1.5 py-0.5 rounded bg-dark-700 text-gray-400 font-mono">
                              {c.symbol}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {['PENDING_PAYMENT', 'CONFIRMED'].includes(b.status) && (
                      <button onClick={() => handleCancel(b.id)} className="btn-outline text-sm py-2 px-3 text-red-400 border-red-800">Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}