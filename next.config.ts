import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-lib'],

  // Redirects for route consolidation
  async redirects() {
    return [
      // Locations → Components
      {
        source: '/locations',
        destination: '/components',
        permanent: true,
      },
      {
        source: '/locations/:id',
        destination: '/components/:id',
        permanent: true,
      },
      // Renovations routes
      {
        source: '/renovations',
        destination: '/',
        permanent: true,
      },
      {
        source: '/renovations/locations',
        destination: '/components',
        permanent: true,
      },
      {
        source: '/renovations/locations/:id',
        destination: '/components/:id',
        permanent: true,
      },
      {
        source: '/renovations/templates',
        destination: '/?tab=templates',
        permanent: true,
      },
      {
        source: '/renovations/blocking',
        destination: '/reports/blocking',
        permanent: true,
      },
      {
        source: '/renovations/draws',
        destination: '/?tab=draws',
        permanent: true,
      },
      {
        source: '/renovations/draws/:id',
        destination: '/?tab=draws&draw=:id',
        permanent: true,
      },
      // Draws routes
      {
        source: '/draws',
        destination: '/?tab=draws',
        permanent: true,
      },
      {
        source: '/draws/:id',
        destination: '/?tab=draws&draw=:id',
        permanent: true,
      },
      // Cash flow
      {
        source: '/cash-flow',
        destination: '/?tab=cash-position',
        permanent: true,
      },
      {
        source: '/cash-flow/:path*',
        destination: '/?tab=cash-position',
        permanent: true,
      },
    ];
  },

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
