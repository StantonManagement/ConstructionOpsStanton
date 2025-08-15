import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-lib'],

  // Use webpack configuration only when Turbopack is NOT used
  ...(process.env.TURBOPACK ? {} : {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          crypto: false,
        };
      }
      return config;
    },
  }),

  // Stable Turbopack config
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
