export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withTenant } from '@/lib/auth-server';
import { unauthorized } from '@/lib/http-errors';

export async function GET() {
  try {
    let tenantId;
    try {
      const res = await withTenant();
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }

    const whereClause: any = {};
    if (tenantId) whereClause.tenantId = tenantId;

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        case: {
          select: {
            caseTitle: true,
            assignedTo: {
              select: { role: true }
            }
          }
        }
      }
    });

    const mapped = documents.map((d: any) => ({
      ...d,
      upload_date: d.createdAt,
      case: d.case ? {
        title: d.case.caseTitle,
        lawyer: d.case.assignedTo ? { role: d.case.assignedTo.role } : null
      } : null
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('[GET /api/documents]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
