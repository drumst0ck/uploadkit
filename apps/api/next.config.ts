import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@uploadkitdev/ui',
    '@uploadkitdev/db',
    '@uploadkitdev/shared',
    '@uploadkitdev/mcp-core',
  ],
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;
