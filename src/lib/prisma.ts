import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Use env variable — fallback to Supabase pooler URL for production
const dbUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres.plnjsgqqtenhdqusnzhw:Khangee786786@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: dbUrl,
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

