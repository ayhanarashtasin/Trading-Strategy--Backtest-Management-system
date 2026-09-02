import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Keep dynamic RSC payloads in the per-tab router cache briefly so returning
  // to a recently viewed private record does not repeat the server read.
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
