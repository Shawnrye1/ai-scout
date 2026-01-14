import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
    clientSegmentCache: true
  }
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project
  org: "aiscout",
  project: "javascript-nextjs",

  // Suppress source map upload logs during build
  silent: !process.env.CI,

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Source map configuration
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
