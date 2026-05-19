export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireClient, handleClientError } from '@/lib/client-auth';

export async function GET() {
  try {
    const { tenantId, client } = await requireClient();

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(now.getDate() + 7);

    // Run all queries in parallel for performance
    const [activeCases, upcomingHearings, sharedDocs, pendingInvoices, recentCases] =
      await Promise.all([
        // Active cases count
        prisma.case.count({
          where: {
            tenantId,
            clientId: client.id,
            deletedAt: null,
            status: { notIn: ['CLOSED', 'DISPOSED'] },
          },
        }),

        // Upcoming hearings in next 7 days
        prisma.hearing.findMany({
          where: {
            tenantId,
            hearingDate: { gte: now, lte: in7Days },
            deletedAt: null,
            case: { clientId: client.id },
          },
          select: {
            id: true,
            hearingDate: true,
            courtName: true,
            purpose: true,
            status: true,
            case: { select: { caseTitle: true, caseNumber: true } },
          },
          orderBy: { hearingDate: 'asc' },
          take: 5,
        }),

        // Shared documents count
        prisma.document.count({
          where: {
            tenantId,
            isPrivate: false,
            deletedAt: null,
            OR: [{ clientId: client.id }, { case: { clientId: client.id } }],
          },
        }),

        // Pending invoices total
        prisma.invoice.findMany({
          where: {
            tenantId,
            clientId: client.id,
            deletedAt: null,
            status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
          },
          select: { id: true, totalAmount: true, paidAmount: true, status: true, dueDate: true },
        }),

        // Recent cases (last 3)
        prisma.case.findMany({
          where: { tenantId, clientId: client.id, deletedAt: null },
          select: {
            id: true,
            caseTitle: true,
            caseNumber: true,
            status: true,
            courtName: true,
            nextHearingDate: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 3,
        }),
      ]);

    const pendingAmount = pendingInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
      0,
    );

    return NextResponse.json({
      stats: {
        activeCases,
        upcomingHearings: upcomingHearings.length,
        sharedDocuments: sharedDocs,
        pendingAmount: Math.round(pendingAmount),
      },
      upcomingHearings,
      pendingInvoices,
      recentCases,
    });
  } catch (e) {
    return handleClientError(e);
  }
}
