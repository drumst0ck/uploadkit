import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';
import { securityHeaders } from './security-headers';

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env.NODE_ENV === 'development') }];
  },
};

const withMDX = createMDX({});

export default withMDX(config);
