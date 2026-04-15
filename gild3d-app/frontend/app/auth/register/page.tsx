'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [userId, setUserId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.register(form.email, form.password, form.displayName);
      setUserId(res.data.userId);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.verifyEmail(userId, code);
      router.push('/auth/login?verified=1');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await authAPI.resendCode(userId);
      setError('');
      alert('A new code has been sent to your email.');
    } catch {
      setError('Failed to resend code.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{ color: '#c9a84c', fontSize: '36px', textShadow: '0 0 30px #c9a84c55' }}>✦</span>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff', marginTop: '8px', marginBottom: '4px' }}>
            Gilded <span style={{ color: '#c9a84c' }}>Companions</span>
          </h1>
          <p style={{ color: '#6b5e50', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {step === 'form' ? 'Request Access' : 'Verify Your Email'}
          </p>
        </div>

        <div style={{ background: '#13111c', border: '1px solid #2a2520', borderRadius: '2px', padding: '36px' }}>

          {step === 'form' ? (
            <>
              <p style={{ color: '#9c8c78', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6 }}>
                Submit your details to request access to the Gilded Companions network. All applications are reviewed by our team.
              </p>

              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#6b5e50', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.displayName}
                    onChange={e => setForm({ ...form, displayName: e.target.value })}
                    placeholder="How you will appear on the platform"
                    style={{ width: '100%', padding: '12px 14px', background: '#0d0d14', border: '1px solid #2a2520', borderRadius: '2px', color: '#e8d5b7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: '#6b5e50', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    style={{ width: '100%', padding: '12px 14px', background: '#0d0d14', border: '1px solid #2a2520', borderRadius: '2px', color: '#e8d5b7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'block', color: '#6b5e50', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    style={{ width: '100%', padding: '12px 14px', background: '#0d0d14', border: '1px solid #2a2520', borderRadius: '2px', color: '#e8d5b7', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {error && (
                  <div style={{ background: '#2a1515', border: '1px solid #8b3333', borderRadius: '2px', padding: '12px', marginBottom: '20px', color: '#e88', fontSize: '13px' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '14px', background: loading ? '#8a7030' : 'linear-gradient(135deg, #c9a84c, #e8cc7a)', color: '#0d0d14', fontWeight: 700, fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none', borderRadius: '2px', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Submitting...' : 'Request Access'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📧</div>
                <p style={{ color: '#9c8c78', fontSize: '14px', lineHeight: 1.7 }}>
                  A 6-digit verification code has been sent to<br />
                  <strong style={{ color: '#e8d5b7' }}>{form.email}</strong>
                </p>
                <p style={{ color: '#6b5e50', fontSize: '12px', marginTop: '8px' }}>Code expires in 15 minutes.</p>
              </div>

              <form onSubmit={handleVerify}>
                <div style={{ marginBottom: '28px' }}>
                  <label style={{ display: 'block', color: '#6b5e50', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    style={{ width: '100%', padding: '16px 14px', background: '#0d0d14', border: '1px solid #2a2520', borderRadius: '2px', color: '#e8d5b7', fontSize: '28px', letterSpacing: '0.4em', textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {error && (
                  <div style={{ background: '#2a1515', border: '1px solid #8b3333', borderRadius: '2px', padding: '12px', marginBottom: '20px', color: '#e88', fontSize: '13px' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '14px', background: loading ? '#8a7030' : 'linear-gradient(135deg, #c9a84c, #e8cc7a)', color: '#0d0d14', fontWeight: 700, fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none', borderRadius: '2px', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '12px' }}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#6b5e50', fontSize: '12px', letterSpacing: '0.1em', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Resend code
                </button>
              </form>
            </>
          )}

          <div style={{ marginTop: '28px', textAlign: 'center', borderTop: '1px solid #1e1b2a', paddingTop: '20px' }}>
            <p style={{ color: '#4a3f35', fontSize: '12px' }}>
              Already a member?{' '}
              <Link href="/auth/login" style={{ color: '#c9a84c', textDecoration: 'none' }}>Member Login</Link>
            </p>
          </div>
        </div>

        <p style={{ color: '#2a2520', fontSize: '11px', textAlign: 'center', marginTop: '20px', letterSpacing: '0.1em' }}>
          18+ · Private & Confidential
        </p>
      </div>
    </div>
  );
}