'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '', memberType: params.get('type') || 'SUCCESSFUL' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      setToken(res.data.token);
      toast.success('Welcome to Gilded Companions!');
      router.push('/profile/edit');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-gold-500 text-4xl">✦</span>
          <h1 className="font-serif text-3xl font-bold text-white mt-2">Join Gilded Companions</h1>
          <p className="text-gray-400 mt-1">Create your exclusive profile</p>
        </div>
        <div className="card-dark">
          {/* Member type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-dark-500 mb-6">
            {['SUCCESSFUL','COMPANION'].map(t => (
              <button key={t} type="button" onClick={() => setForm({...form, memberType: t})}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${form.memberType===t ? 'bg-gold-500 text-dark-900' : 'text-gray-400 hover:text-white'}`}>
                {t === 'SUCCESSFUL' ? '💎 I am Successful' : '✨ I am a Companion'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input-dark" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input-dark" placeholder="Min 8 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} minLength={8} required />
            </div>
            <p className="text-gray-500 text-xs">By joining you confirm you are 18+ and agree to our Terms of Service and Privacy Policy.</p>
            <button type="submit" disabled={loading} className="btn-gold w-full disabled:opacity-50">
              {loading ? 'Creating account…' : 'Join Free'}
            </button>
          </form>
          <p className="text-center text-gray-400 mt-6 text-sm">
            Already a member?{' '}<Link href="/auth/login" className="text-gold-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}