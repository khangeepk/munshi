export const dynamic = 'force-dynamic';

// Designed and Developed by SQ Tech

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

// GET /api/conflict?query=xxx  — conflict of interest search
export async function GET(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], message: 'Query too short' });
    }

    // Search clients by name or CNIC
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { cnic_number: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        cases: {
          select: {
            id: true,
            title: true,
            case_status: true,
            caseAgainst: true,
            caseFrom: true,
            lawyer: { select: { full_name: true } },
          },
        },
      },
    });

    // Also search cases where the query appears as opposing party
    const opposingCases = await prisma.case.findMany({
      where: {
        OR: [
          { caseAgainst: { contains: query, mode: 'insensitive' } },
          { caseFrom: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        client: { select: { name: true, cnic_number: true } },
        lawyer: { select: { full_name: true } },
      },
    });

    const hasConflict = clients.length > 0 || opposingCases.length > 0;

    return NextResponse.json({
      hasConflict,
      query,
      clientMatches: clients,
      caseMatches: opposingCases,
      summary: hasConflict
        ? `⚠ Potential conflict detected for "${query}": ${clients.length} client match(es), ${opposingCases.length} case match(es).`
        : `✓ No conflict of interest found for "${query}".`,
    });
  } catch (error) {
    console.error('[GET /api/conflict]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
