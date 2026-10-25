import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use the standard PostCSS pipeline; no compiler-specific CSS loader is needed.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
