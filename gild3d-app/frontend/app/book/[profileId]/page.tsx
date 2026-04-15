'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { profileAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { isAuthenticated } from '@/lib/auth';
import Link from 'next/link';

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const STEP_LABELS = ['Type', 'Date', 'Time & Duration', 'Location', 'Payment'];

export default function BookingWizard({ params }: { params: { profileId: string } }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [bookingType, setBookingType] = useState<'INCALL' | 'OUTCALL'>('INCALL');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [hours, setHours] = useState(1);
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [hotelCity, setHotelCity] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingId, setBookingId] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return; }
    profileAPI.getOne(params.profileId).then((r: any) => setProfile(r.data));
  }, [params.profileId]);

  const totalPrice = profile?.hourlyRate ? (profile.hourlyRate * hours).toFixed(2) : '0.00';

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return !!date;
    if (step === 3) return hours >= 1;
    if (step === 4) return bookingType === 'INCALL' || !!hotelCity;
    return false;
  };

  const handleCreateBooking = async () => {
    setLoading(true);
    try {
      const res = await api.post('/bookings', {
        profileId: params.profileId,
        type: bookingType,
        date,
        startTime,
        hours,
        hotelName: bookingType === 'OUTCALL' ? hotelName : undefined,
        hotelAddress: bookingType === 'OUTCALL' ? hotelAddress : undefined,
        hotelCity: bookingType === 'OUTCALL' ? hotelCity : undefined,
        notes,
      });
      setBookingId(res.data.bookingId);
      setStep(5);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create booking');
    }
    setLoading(false);
  };

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/bookings/${bookingId}/payment`);
      window.location.href = res.data.checkoutUrl;
    } catch {
      toast.error('Failed to create payment invoice');
    }
    setLoading(false);
  };

  if (!profile) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-bold text-white mb-1">Book <span className="text-gold-400">{profile.displayName}</span></h1>
        {profile.hourlyRate && <p className="text-gray-400">${profile.hourlyRate}/hour · Total: <span className="text-gold-400 font-bold">${totalPrice}</span></p>}
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          return (
            <div key={label} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${step > n ? 'bg-gold-500 text-dark-900' : step === n ? 'bg-gold-500 text-dark-900 ring-2 ring-gold-300' : 'bg-dark-600 text-gray-400'}`}>
                {step > n ? '✓' : n}
              </div>
              <span className={`text-xs hidden sm:block ${step === n ? 'text-gold-400' : 'text-gray-500'}`}>{label}</span>
            </div>
          );
        })}
      </div>

      <div className="card-dark">
        {/* Step 1 — Type */}
        {step === 1 && (
          <div>
            <h2 className="text-white font-semibold text-xl mb-4">Choose Appointment Type</h2>
            <div className="grid grid-cols-2 gap-4">
              {(['INCALL', 'OUTCALL'] as const).map(t => (
                <button key={t} onClick={() => setBookingType(t)}
                  className={`p-6 rounded-xl border-2 text-center transition-all ${bookingType === t ? 'border-gold-500 bg-dark-700' : 'border-dark-500 hover:border-dark-400'} ${t === 'INCALL' && !profile.inCall ? 'opacity-40 cursor-not-allowed' : ''} ${t === 'OUTCALL' && !profile.outCall ? 'opacity-40 cursor-not-allowed' : ''}`}
                  disabled={(t === 'INCALL' && !profile.inCall) || (t === 'OUTCALL' && !profile.outCall)}>
                  <div className="text-3xl mb-2">{t === 'INCALL' ? '🏠' : '🚗'}</div>
                  <div className="text-white font-semibold">{t === 'INCALL' ? 'InCall' : 'OutCall'}</div>
                  <div className="text-gray-400 text-sm mt-1">{t === 'INCALL' ? 'You travel to companion' : 'Companion travels to you'}</div>
                  {((t === 'INCALL' && !profile.inCall) || (t === 'OUTCALL' && !profile.outCall)) && <div className="text-red-400 text-xs mt-1">Not available</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Date */}
        {step === 2 && (
          <div>
            <h2 className="text-white font-semibold text-xl mb-4">Select Date</h2>
            <label className="label">Date of Appointment</label>
            <input type="date" className="input-dark text-lg" min={today} value={date} onChange={e => setDate(e.target.value)} />
            {date && <p className="text-gold-400 mt-2 text-sm">📅 {new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>}
          </div>
        )}

        {/* Step 3 — Time & Duration */}
        {step === 3 && (
          <div>
            <h2 className="text-white font-semibold text-xl mb-4">Time & Duration</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Start Time (24hr)</label>
                <select className="input-dark" value={startTime} onChange={e => setStartTime(e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Duration (hours)</label>
                <input type="number" className="input-dark" min={profile.minBookingHours || 1} max={12} value={hours} onChange={e => setHours(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
            </div>
            <div className="bg-dark-700 rounded-lg p-4 border border-gold-500/30">
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Start:</span><span className="text-white">{startTime}</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">End approx:</span><span className="text-white">{`${String((parseInt(startTime) + hours) % 24).padStart(2,'0')}:00`}</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Duration:</span><span className="text-white">{hours} hour{hours > 1 ? 's' : ''}</span></div>
              <div className="flex justify-between font-bold mt-2"><span className="text-gray-300">Total:</span><span className="text-gold-400 text-lg">${totalPrice}</span></div>
            </div>
          </div>
        )}

        {/* Step 4 — Location (OutCall) or Notes (InCall) */}
        {step === 4 && (
          <div>
            <h2 className="text-white font-semibold text-xl mb-4">{bookingType === 'OUTCALL' ? 'Location Details' : 'Additional Notes'}</h2>
            {bookingType === 'OUTCALL' && (
              <div className="space-y-4 mb-4">
                <div><label className="label">Hotel Name</label><input className="input-dark" placeholder="e.g. The Ritz London" value={hotelName} onChange={e => setHotelName(e.target.value)} /></div>
                <div><label className="label">Address / Area</label><input className="input-dark" placeholder="Street address or area" value={hotelAddress} onChange={e => setHotelAddress(e.target.value)} /></div>
                <div><label className="label">City *</label><input className="input-dark" placeholder="City" value={hotelCity} onChange={e => setHotelCity(e.target.value)} required /></div>
                <p className="text-gray-500 text-xs">🔒 Room number will be confirmed on the day of your appointment.</p>
              </div>
            )}
            <div><label className="label">Notes for companion (optional)</label><textarea className="input-dark h-24 resize-none" placeholder="Any special requests or information…" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
        )}

        {/* Step 5 — Payment */}
        {step === 5 && (
          <div className="text-center">
            <div className="text-5xl mb-4">₿</div>
            <h2 className="text-white font-semibold text-xl mb-2">Complete Payment</h2>
            <p className="text-gray-400 mb-4">Your booking is reserved. Complete payment via Bitcoin to confirm.</p>
            <div className="bg-dark-700 rounded-lg p-4 text-left mb-6 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Type:</span><span className="text-white">{bookingType}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Date:</span><span className="text-white">{new Date(date + 'T12:00:00').toLocaleDateString('en-GB')}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Time:</span><span className="text-white">{startTime} · {hours}hr</span></div>
              {bookingType === 'OUTCALL' && hotelCity && <div className="flex justify-between text-sm"><span className="text-gray-400">Location:</span><span className="text-white">{[hotelName, hotelCity].filter(Boolean).join(', ')}</span></div>}
              <div className="flex justify-between font-bold text-base mt-2"><span className="text-gray-300">Total:</span><span className="text-gold-400">${totalPrice} USD</span></div>
            </div>
            <button onClick={handlePay} disabled={loading} className="btn-gold w-full text-lg disabled:opacity-50">
              {loading ? 'Creating Invoice…' : 'Pay with Bitcoin ₿'}
            </button>
            <p className="text-gray-500 text-xs mt-3">Powered by BTCPay Server · Private & secure · Email confirmation sent after payment</p>
          </div>
        )}

        {/* Navigation */}
        {step < 5 && (
          <div className="flex gap-3 mt-6">
            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="btn-outline flex-1">← Back</button>}
            {step < 4 && <button disabled={!canNext()} onClick={() => setStep(s => s + 1)} className="btn-gold flex-1 disabled:opacity-50">Next →</button>}
            {step === 4 && <button disabled={!canNext() || loading} onClick={handleCreateBooking} className="btn-gold flex-1 disabled:opacity-50">{loading ? 'Creating booking…' : 'Review & Pay →'}</button>}
          </div>
        )}
      </div>

      <p className="text-center text-gray-500 text-xs mt-4">
        <Link href={`/profile/${params.profileId}`} className="hover:text-gold-400">← Back to profile</Link>
      </p>
    </div>
  );
}