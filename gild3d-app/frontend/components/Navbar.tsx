'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { removeToken, isAuthenticated, isSuperAdmin } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [brandWord, setBrandWord] = useState('Gilded');
  const [brandFading, setBrandFading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setAuthed(isAuthenticated());
    setIsAdmin(isSuperAdmin());
  }, [pathname]);

  useEffect(() => {
    const words = ['Gilded', 'Gild3d'];
    let idx = 0;
    const interval = setInterval(() => {
      setBrandFading(true);
      setTimeout(() => {
        idx = (idx + 1) % words.length;
        setBrandWord(words[idx]);
        setBrandFading(false);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => { removeToken(); setAuthed(false); setIsAdmin(false); router.push('/'); };

  const navLinks = authed
    ? [
        { href: '/browse', label: 'Browse' },
        { href: '/messages', label: 'Messages' },
        { href: '/bookings', label: 'Bookings' },
        { href: '/profile/edit', label: 'My Profile' },
      ]
    : [];

  return (
    <nav style={{ background: '#0d0d14ee', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e1b2a', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>

          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ color: '#c9a84c', fontSize: '22px', textShadow: '0 0 20px #c9a84c55' }}>✦</span>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>
              <span style={{ display: 'inline-block', minWidth: '52px', opacity: brandFading ? 0 : 1, transition: 'opacity 0.4s ease' }}>{brandWord}</span>
              {' '}<span style={{ color: '#c9a84c' }}>Companions</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '24px' }}>
            {navLinks.map(l => (
              <Link key={l.href} href={l.href} style={{ color: '#9c8c78', fontSize: '13px', textDecoration: 'none', letterSpacing: '0.05em' }}>
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" style={{ color: '#c9a84c', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', padding: '6px 14px', border: '1px solid #c9a84c55', borderRadius: '2px' }}>
                ⚙ Admin
              </Link>
            )}
            {authed ? (
              <button onClick={logout} style={{ color: '#6b5e50', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Sign Out
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Link href="/auth/login" style={{ color: '#c9a84c', fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '8px 20px', border: '1px solid #c9a84c55', borderRadius: '2px' }}>
                  Member Login
                </Link>
                <Link href="/auth/register" style={{ color: '#0d0d14', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '8px 20px', background: 'linear-gradient(135deg, #c9a84c, #e8cc7a)', borderRadius: '2px' }}>
                  Request Access
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', color: '#9c8c78', cursor: 'pointer', padding: '8px' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div style={{ borderTop: '1px solid #1e1b2a', paddingTop: '16px', paddingBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href="/browse" style={{ color: '#9c8c78', fontSize: '14px', textDecoration: 'none' }}>Browse</Link>
            {authed && (
              <>
                <Link href="/messages" style={{ color: '#9c8c78', fontSize: '14px', textDecoration: 'none' }}>Messages</Link>
                <Link href="/bookings" style={{ color: '#9c8c78', fontSize: '14px', textDecoration: 'none' }}>Bookings</Link>
                <Link href="/profile/edit" style={{ color: '#9c8c78', fontSize: '14px', textDecoration: 'none' }}>My Profile</Link>
                {isAdmin && (
                  <Link href="/admin" style={{ color: '#c9a84c', fontSize: '13px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚙ Admin Dashboard</Link>
                )}
                <button onClick={logout} style={{ color: '#6b5e50', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sign Out</button>
              </>
            )}
            {!authed && (
              <>
                <Link href="/auth/login" style={{ color: '#c9a84c', fontSize: '13px', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Member Login</Link>
                <Link href="/auth/register" style={{ color: '#0d0d14', fontSize: '13px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', background: 'linear-gradient(135deg, #c9a84c, #e8cc7a)', borderRadius: '2px', textAlign: 'center' }}>Request Access</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}