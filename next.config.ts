import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-expect-error Turbopack options may not be in NextConfig types yet
  turbopack: {
    // Set the Turbopack root to this workspace to silence inferred root warnings
    root: __dirname,
  },
};

export default nextConfig;
