import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // UploadKit's React + Next SDK packages are published as ESM + CJS.
  // Transpiling them keeps Next 16 happy across bundlers.
  transpilePackages: [
    '@uploadkitdev/react',
    '@uploadkitdev/next',
    '@uploadkitdev/core',
  ],
};

export default nextConfig;
