import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VibeList.uk - Discover the Best Vibes',
  description: 'Discover and share the best experiences, places, and vibes in your city',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#0a0a0a', color: '#ededed' }}>
        {children}
      </body>
    </html>
  );
}