import type { NextConfig } from 'next';
import { securityHeaders } from './security-headers';

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env.NODE_ENV === 'development') }];
  },
  transpilePackages: ['@uploadkitdev/ui', '@uploadkitdev/react', '@uploadkitdev/core', '@uploadkitdev/shared'],
};

export default nextConfig;
