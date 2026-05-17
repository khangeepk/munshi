import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['whatsapp-web.js', '@prisma/client', '@prisma/adapter-pg', 'pg'],
  generateEtags: false,
  poweredByHeader: false,
};

export default nextConfig;
