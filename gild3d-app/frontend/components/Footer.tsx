import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-dark-600 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gold-500 text-xl">✦</span>
            <span className="font-serif text-lg font-bold">Gilded <span className="text-gold-400">Companions</span></span>
          </div>
          <p className="text-gray-400 text-sm">Where luxury meets connection. Join the most exclusive companion platform.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Discover</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/browse" className="hover:text-gold-400">Browse Members</Link></li>
            <li><Link href="/upgrade" className="hover:text-gold-400">Membership Plans</Link></li>
            <li><Link href="/auth/register" className="hover:text-gold-400">Join Free</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/about" className="hover:text-gold-400">About Us</Link></li>
            <li><Link href="/safety" className="hover:text-gold-400">Safety</Link></li>
            <li><Link href="/contact" className="hover:text-gold-400">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/terms" className="hover:text-gold-400">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-gold-400">Privacy Policy</Link></li>
            <li><Link href="/cookies" className="hover:text-gold-400">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-dark-600 py-4 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} Gilded Companions (gild3d.com). All rights reserved. 18+ only.
      </div>
    </footer>
  );
}