import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/kospi-etf-analyzer',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
