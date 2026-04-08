import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@uploadkit/ui', '@uploadkit/db', '@uploadkit/shared'],
};

export default nextConfig;
