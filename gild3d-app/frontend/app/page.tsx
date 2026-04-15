import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-dark-800 to-dark-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 50% 50%, #f59e0b 0%, transparent 70%)'}} />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="text-gold-500 text-5xl mb-4">✦</div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Where Luxury<br /><span className="text-gold-400">Meets Connection</span>
          </h1>
          <p className="text-gray-300 text-xl md:text-2xl mb-10 max-w-2xl mx-auto">
            Gilded Companions connects ambitious, successful individuals with charming, sophisticated companions in an exclusive, private environment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register?type=SUCCESSFUL" className="btn-gold text-lg px-10 py-4">I am Successful</Link>
            <Link href="/auth/register?type=COMPANION" className="btn-outline text-lg px-10 py-4">I am a Companion</Link>
          </div>
          <p className="text-gray-500 text-sm mt-6">18+ only · Private & discreet · Verified members</p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-dark-800 py-12 border-y border-dark-600">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[['10,000+','Active Members'],['95%','Verified Profiles'],['24/7','Private Messaging'],['₿','Bitcoin Payments']].map(([n,l]) => (
            <div key={l}>
              <div className="text-3xl font-bold text-gold-400 mb-1">{n}</div>
              <div className="text-gray-400 text-sm">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <h2 className="font-serif text-4xl text-center text-white mb-4">The <span className="text-gold-400">Gilded</span> Experience</h2>
        <p className="text-gray-400 text-center mb-12">Everything you need for meaningful, discreet connections</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon:'🔒', title:'Total Privacy', desc:'Your identity is protected. Blur photos, control who sees your profile, and block anyone instantly.' },
            { icon:'✓', title:'Verified Members', desc:'Our team reviews every profile to ensure authenticity, seriousness, and quality connections.' },
            { icon:'₿', title:'Bitcoin Payments', desc:'Pay for premium membership anonymously using Bitcoin via BTCPay Server. No credit card traces.' },
            { icon:'💬', title:'Private Messaging', desc:'Encrypted conversations between members. Premium members get unlimited messaging.' },
            { icon:'🌍', title:'Global Network', desc:'Members across the US and worldwide. Filter by location, age, interests, and more.' },
            { icon:'⭐', title:'Elite Tiers', desc:'Silver, Gold and Platinum memberships unlock exclusive features and priority visibility.' },
          ].map(f => (
            <div key={f.title} className="card-dark text-center hover:border-gold-500 transition-colors">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-dark-800 to-dark-700 border-y border-dark-600 py-16 text-center px-4">
        <h2 className="font-serif text-4xl text-white mb-4">Ready to Find Your <span className="text-gold-400">Gilded Connection?</span></h2>
        <p className="text-gray-400 mb-8">Join thousands of members already enjoying the Gilded experience</p>
        <Link href="/auth/register" className="btn-gold text-lg px-12 py-4">Join Free Today</Link>
      </section>
    </div>
  );
}