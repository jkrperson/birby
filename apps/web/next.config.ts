import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@birby/core", "@birby/sprites"],
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
