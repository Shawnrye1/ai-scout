import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  // This site lives inside a larger repo; keep tracing scoped to itself.
  outputFileTracingRoot: process.cwd(),
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
