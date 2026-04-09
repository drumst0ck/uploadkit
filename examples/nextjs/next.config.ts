import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@uploadkit/react', '@uploadkit/next', '@uploadkit/core'],
};

export default config;
