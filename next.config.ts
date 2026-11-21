import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql"],
  // Member photos are uploaded through a form, so allow a little more than the 1 MB default.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
