import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  turbopack: {
    // Set the Turbopack root to this workspace to silence inferred root warnings
    root: __dirname,
  },
  // Suppress source map warnings for external libraries
  webpack: (config: { ignoreWarnings?: RegExp[] }, { dev }: { dev: boolean }) => {
    if (dev) {
      // Suppress source map warnings for external libraries
      config.ignoreWarnings = [
        /Failed to parse source map/,
        /Could not resolve source map/,
      ];
    }
    return config;
  },
} as unknown as NextConfig;

export default nextConfig;
