import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle pdf-lib and other Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
  // Suppress punycode deprecation warnings from dependencies
  env: {
    NODE_OPTIONS: '--no-deprecation',
  },
};

export default nextConfig;
