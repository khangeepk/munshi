export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const documents = await prisma.document.findMany({
      orderBy: { upload_date: 'desc' },
      include: {
        case: {
          select: {
            title: true,
            lawyer: {
              select: { role: true }
            }
          }
        }
      }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('[GET /api/documents]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
