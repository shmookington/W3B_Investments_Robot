import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include the Prisma SQLite database in serverless function bundles
  outputFileTracingIncludes: {
    '/api/**': ['./prisma/dev.db'],
  },
};

export default nextConfig;
