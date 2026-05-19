export const dynamic = 'force-dynamic';

// Designed and Developed by SQ Tech

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTenant } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

// GET /api/conflict?query=xxx  — conflict of interest search
export async function GET(request: Request) {
  try {
    let tenantId;
    try {
      const res = await withTenant();
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], message: 'Query too short' });
    }

    const clientWhere: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { cnic: { contains: query } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    };
    if (tenantId) clientWhere.tenantId = tenantId;

    // Search clients by name or CNIC
    const clients = await prisma.client.findMany({
      where: clientWhere,
      include: {
        cases: {
          select: {
            id: true,
            caseTitle: true,
            status: true,
            oppositeParty: true,
            client: { select: { name: true } },
            assignedTo: { select: { name: true } },
          },
        },
      },
    });

    const caseWhere: any = {
      OR: [
        { oppositeParty: { contains: query, mode: 'insensitive' } },
        { client: { name: { contains: query, mode: 'insensitive' } } },
        { caseTitle: { contains: query, mode: 'insensitive' } },
      ],
    };
    if (tenantId) caseWhere.tenantId = tenantId;

    // Also search cases where the query appears as opposing party
    const opposingCases = await prisma.case.findMany({
      where: caseWhere,
      include: {
        client: { select: { name: true, cnic: true } },
        assignedTo: { select: { name: true } },
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
