import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@uploadkit/ui', '@uploadkit/react', '@uploadkit/core', '@uploadkit/shared'],
};

export default nextConfig;
