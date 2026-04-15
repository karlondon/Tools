'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { removeToken, isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => { setAuthed(isAuthenticated()); }, []);

  const logout = () => { removeToken(); setAuthed(false); router.push('/'); };

  const navLinks = authed ? [
    { href: '/browse', label: 'Browse' },
    { href: '/messages', label: 'Messages' },
    { href: '/bookings', label: 'Bookings' },
    { href: '/profile/edit', label: 'My Profile' },
  ] : [];

  return (
    <nav className="bg-dark-800 border-b border-dark-600 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-gold-500 text-2xl">✦</span>
            <span className="font-serif text-xl font-bold text-white">Gilded <span className="text-gold-400">Companions</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => <Link key={l.href} href={l.href} className="text-gray-300 hover:text-gold-400 transition-colors text-sm">{l.label}</Link>)}
            {authed ? (
              <>
                <Link href="/upgrade" className="btn-gold text-sm py-2 px-4">Upgrade ₿</Link>
                <button onClick={logout} className="text-gray-400 hover:text-white text-sm">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/browse" className="text-gray-300 hover:text-gold-400 transition-colors text-sm">Browse</Link>
                <Link href="/auth/login" className="text-gray-300 hover:text-gold-400 transition-colors text-sm">Sign In</Link>
                <Link href="/auth/register" className="btn-gold text-sm py-2 px-4">Join Free</Link>
              </>
            )}
          </div>

          <button className="md:hidden text-gray-300 p-2" onClick={() => setOpen(!open)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 border-t border-dark-600 pt-3 flex flex-col gap-3">
            <Link href="/browse" className="text-gray-300 hover:text-gold-400">Browse</Link>
            {authed && <>
              <Link href="/messages" className="text-gray-300 hover:text-gold-400">Messages</Link>
              <Link href="/bookings" className="text-gray-300 hover:text-gold-400">Bookings</Link>
              <Link href="/profile/edit" className="text-gray-300 hover:text-gold-400">My Profile</Link>
              <Link href="/upgrade" className="btn-gold text-center">Upgrade ₿</Link>
              <button onClick={logout} className="text-gray-400 text-left text-sm">Sign Out</button>
            </>}
            {!authed && <>
              <Link href="/auth/login" className="text-gray-300">Sign In</Link>
              <Link href="/auth/register" className="btn-gold text-center">Join Free</Link>
            </>}
          </div>
        )}
      </div>
    </nav>
  );
}