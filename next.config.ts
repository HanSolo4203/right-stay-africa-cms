import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  turbopack: {
    // Set the Turbopack root to this workspace to silence inferred root warnings
    root: __dirname,
  },
} as unknown as NextConfig;

export default nextConfig;
