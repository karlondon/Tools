'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const sampleProfiles = [
  {
    id: 'sample-1',
    name: 'Isabelle',
    age: 26,
    location: 'New York, NY',
    tagline: 'Cultured, well-travelled & effortlessly charming',
    tags: ['Art & Culture', 'Fine Dining', 'Travel'],
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop&crop=face',
  },
  {
    id: 'sample-2',
    name: 'Sofia',
    age: 28,
    location: 'Miami, FL',
    tagline: 'Sophisticated conversationalist with a passion for the finer things',
    tags: ['Fashion', 'Yachting', 'Music'],
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop&crop=face',
  },
  {
    id: 'sample-3',
    name: 'Valentina',
    age: 25,
    location: 'Los Angeles, CA',
    tagline: 'Warm, intelligent and always impeccably dressed',
    tags: ['Wellness', 'Film & Theatre', 'Fine Wine'],
    avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop&crop=face',
  },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="bg-[#0d0d14]">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* background gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d14] via-[#12101a] to-[#0d0d14]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #c9a84c55 0%, transparent 70%)',
          }}
        />
        {/* decorative grid lines */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(#c9a84c 1px, transparent 1px), linear-gradient(90deg, #c9a84c 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto flex flex-col items-center">
          {/* monogram icon */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <span
              className="font-serif text-[#c9a84c] text-7xl leading-none select-none"
              style={{ textShadow: '0 0 60px #c9a84c55' }}
            >
              ✦
            </span>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-bold text-white mb-5 leading-tight tracking-tight">
            Gilded{' '}
            <span
              className="text-[#c9a84c]"
              style={{ textShadow: '0 0 40px #c9a84c66' }}
            >
              Companions
            </span>
          </h1>

          <p className="text-[#9c8c78] text-lg md:text-xl mb-3 max-w-xl mx-auto font-light tracking-wide">
            An exclusive, private network connecting successful individuals
            with sophisticated companions.
          </p>
          <p className="text-[#6b5e50] text-sm mb-12 tracking-widest uppercase">
            By invitation · Discreet · Verified
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm mx-auto">
            <Link
              href="/auth/register"
              className="flex-1 text-center py-4 px-8 font-semibold text-sm tracking-widest uppercase transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #e8cc7a, #c9a84c)',
                color: '#0d0d14',
                borderRadius: '2px',
                boxShadow: '0 0 30px #c9a84c33',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 50px #c9a84c66')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 30px #c9a84c33')}
            >
              Request Access
            </Link>
            <Link
              href="/auth/login"
              className="flex-1 text-center py-4 px-8 font-semibold text-sm tracking-widest uppercase border transition-all duration-300"
              style={{
                border: '1px solid #c9a84c66',
                color: '#c9a84c',
                borderRadius: '2px',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#c9a84c11';
                e.currentTarget.style.borderColor = '#c9a84c';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#c9a84c66';
              }}
            >
              Member Login
            </Link>
          </div>

          <p className="text-[#4a3f35] text-xs mt-8 tracking-widest uppercase">
            18+ · Private & Confidential
          </p>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="h-8 w-px bg-gradient-to-b from-[#c9a84c] to-transparent" />
          <span className="text-[#c9a84c] text-xs tracking-widest uppercase">Scroll</span>
        </div>
      </section>

      {/* ── FEATURED PROFILES ────────────────────────────────── */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#c9a84c] text-xs tracking-widest uppercase mb-3">Featured Companions</p>
          <h2 className="font-serif text-4xl md:text-5xl text-white font-bold mb-4">
            Meet Our <span className="text-[#c9a84c]">Members</span>
          </h2>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sampleProfiles.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden cursor-pointer"
              style={{
                borderRadius: '2px',
                border: '1px solid #2a2520',
                background: '#13111c',
              }}
            >
              {/* photo */}
              <div className="relative h-80 overflow-hidden">
                <img
                  src={p.avatar}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#13111c] via-transparent to-transparent" />
                {/* verified badge */}
                <div
                  className="absolute top-4 right-4 px-2 py-1 text-xs font-semibold tracking-widest uppercase"
                  style={{
                    background: '#c9a84c22',
                    border: '1px solid #c9a84c55',
                    color: '#c9a84c',
                    borderRadius: '2px',
                  }}
                >
                  ✓ Verified
                </div>
              </div>

              {/* info */}
              <div className="p-5">
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-white font-serif text-xl font-bold">{p.name}</h3>
                  <span className="text-[#6b5e50] text-sm">{p.age}</span>
                </div>
                <p className="text-[#c9a84c] text-xs tracking-wider mb-2">📍 {p.location}</p>
                <p className="text-[#9c8c78] text-sm mb-4 font-light">{p.tagline}</p>
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-1"
                      style={{
                        background: '#1e1b2a',
                        color: '#9c8c78',
                        border: '1px solid #2a2520',
                        borderRadius: '2px',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* hover overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                style={{ background: '#0d0d14cc' }}
              >
                <Link
                  href="/auth/register"
                  className="py-3 px-8 font-semibold text-sm tracking-widest uppercase"
                  style={{
                    background: 'linear-gradient(135deg, #c9a84c, #e8cc7a)',
                    color: '#0d0d14',
                    borderRadius: '2px',
                  }}
                >
                  Request Access
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-[#6b5e50] text-sm mb-6">
            Access to full profiles is available to verified members only.
          </p>
          <Link
            href="/auth/register"
            className="inline-block py-3 px-10 text-sm font-semibold tracking-widest uppercase"
            style={{
              border: '1px solid #c9a84c66',
              color: '#c9a84c',
              borderRadius: '2px',
            }}
          >
            Apply for Membership
          </Link>
        </div>
      </section>

      {/* ── WHY GILDED ───────────────────────────────────────── */}
      <section
        className="py-24 px-6"
        style={{ borderTop: '1px solid #1e1b2a', borderBottom: '1px solid #1e1b2a' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#c9a84c] text-xs tracking-widest uppercase mb-3">Why Choose Us</p>
            <h2 className="font-serif text-4xl text-white font-bold">
              The <span className="text-[#c9a84c]">Gilded</span> Difference
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-[#1e1b2a]">
            {[
              {
                icon: '🔒',
                title: 'Absolute Privacy',
                desc: 'Your identity is fully protected. Discreet billing, blurred photos, and strict member confidentiality.',
              },
              {
                icon: '✦',
                title: 'Curated Membership',
                desc: 'Every member is individually reviewed. We maintain the highest standards for quality and authenticity.',
              },
              {
                icon: '💬',
                title: 'Private Messaging',
                desc: 'Secure, encrypted conversations. No third parties. No data sold. Ever.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-10 text-center"
                style={{ background: '#0d0d14' }}
              >
                <div className="text-4xl mb-5">{f.icon}</div>
                <h3
                  className="font-serif text-xl text-white font-semibold mb-3"
                  style={{ letterSpacing: '0.05em' }}
                >
                  {f.title}
                </h3>
                <div className="h-px w-10 mx-auto bg-[#c9a84c] mb-4 opacity-50" />
                <p className="text-[#6b5e50] text-sm font-light leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 80% at 50% 50%, #c9a84c55 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="text-[#c9a84c] text-5xl">✦</span>
          <h2 className="font-serif text-4xl md:text-5xl text-white font-bold mt-4 mb-4">
            Begin Your<br />
            <span className="text-[#c9a84c]">Gilded Journey</span>
          </h2>
          <p className="text-[#6b5e50] mb-10 text-sm tracking-widest uppercase">
            Exclusive · Discreet · Extraordinary
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-sm mx-auto">
            <Link
              href="/auth/register"
              className="flex-1 text-center py-4 px-8 font-semibold text-sm tracking-widest uppercase transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #e8cc7a, #c9a84c)',
                color: '#0d0d14',
                borderRadius: '2px',
                boxShadow: '0 0 30px #c9a84c33',
              }}
            >
              Request Access
            </Link>
            <Link
              href="/auth/login"
              className="flex-1 text-center py-4 px-8 font-semibold text-sm tracking-widest uppercase border transition-all duration-300"
              style={{
                border: '1px solid #c9a84c44',
                color: '#c9a84c',
                borderRadius: '2px',
              }}
            >
              Member Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}