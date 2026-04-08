import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@uploadkit/ui', '@uploadkit/db', '@uploadkit/shared'],
  images: {
    remotePatterns: [
      // Production CDN for file thumbnails (Pitfall 1 from research)
      { protocol: 'https', hostname: 'cdn.uploadkit.dev' },
      // Dev/staging: direct R2 access
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
};

export default nextConfig;
