import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@uploadkitdev/ui', '@uploadkitdev/db', '@uploadkitdev/shared'],
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;
