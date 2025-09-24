import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-lib'],

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-select', '@radix-ui/react-dialog'],
  },

  // Bundle analysis and optimization
  productionBrowserSourceMaps: false,
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

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
        
        // Bundle optimization
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
              },
              supabase: {
                test: /[\\/]node_modules[\\/]@supabase[\\/]/,
                name: 'supabase',
                chunks: 'all',
              },
              radix: {
                test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
                name: 'radix',
                chunks: 'all',
              },
            },
          },
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

export default withBundleAnalyzer(nextConfig);
