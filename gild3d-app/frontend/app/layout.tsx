import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Gilded Companions – Where Luxury Meets Connection',
  description: 'Gilded Companions connects successful, ambitious individuals with charming, sophisticated companions. Discover meaningful connections on gild3d.com.',
  keywords: 'gilded companions, luxury dating, elite connections, gild3d',
  openGraph: {
    title: 'Gilded Companions',
    description: 'Where Luxury Meets Connection',
    url: 'https://gild3d.com',
    siteName: 'Gilded Companions',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-dark-900 text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a1a', color: '#fff', border: '1px solid #f59e0b' },
          }}
        />
      </body>
    </html>
  );
}