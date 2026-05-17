export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, string> = {
    DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'missing',
    DIRECT_URL: process.env.DIRECT_URL ? 'set' : 'missing',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
  };

  const isConfigured =
    !!process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('[YOUR-SUPABASE-PROJECT-REF]') &&
    !process.env.DATABASE_URL.includes('your_anon_key_here');

  return NextResponse.json({
    ok: isConfigured,
    checks,
    timestamp: new Date().toISOString(),
  });
}
