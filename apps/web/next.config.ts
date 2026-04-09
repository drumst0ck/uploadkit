import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@uploadkitdev/ui', '@uploadkitdev/react', '@uploadkitdev/core', '@uploadkitdev/shared'],
};

export default nextConfig;
