export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const envUrl = process.env.DATABASE_URL || 'NOT SET';
  const directUrl = process.env.DIRECT_URL || 'NOT SET';

  const maskedEnvUrl = envUrl !== 'NOT SET' 
    ? envUrl.replace(/:([^:@]+)@/, ':****@') 
    : 'NOT SET';
    
  const maskedDirectUrl = directUrl !== 'NOT SET'
    ? directUrl.replace(/:([^:@]+)@/, ':****@')
    : 'NOT SET';

  let dbConnectionSuccess = false;
  let connectionError = null;
  let firstUser = null;

  try {
    firstUser = await prisma.user.findFirst({
      select: { id: true, email: true, role: true }
    });
    dbConnectionSuccess = true;
  } catch (error: any) {
    connectionError = error?.message || String(error);
  }

  return NextResponse.json({
    dbConnectionSuccess,
    maskedEnvUrl,
    maskedDirectUrl,
    connectionError,
    firstUser,
  });
}
