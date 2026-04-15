/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['gild3d.com', 'localhost'],
    remotePatterns: [
      { protocol: 'https', hostname: 'gild3d.com', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/uploads/**' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://backend:4000/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;