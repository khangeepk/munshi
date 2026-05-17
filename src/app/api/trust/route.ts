export const dynamic = 'force-dynamic';

// Designed and Developed by SQ Tech

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser, isAdmin } from '@/lib/auth-server';
import { unauthorized, forbidden } from '@/lib/http-errors';

// GET /api/trust?client_id=xxx  — list accounts & transactions
export async function GET(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    const accounts = await prisma.trustAccount.findMany({
      where: clientId ? { client_id: clientId } : {},
      include: {
        client: { select: { name: true, phone: true } },
        transactions: { orderBy: { created_at: 'desc' } },
      },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('[GET /api/trust]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/trust  — create account or record transaction
export async function POST(request: Request) {
  try {
    const u = await getAuthenticatedUser();
    if (!u) return unauthorized();

    const body = await request.json();
    const { action, client_id, account_id, type, amount, description, reference_no } = body;

    if (action === 'create_account') {
      if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 });
      const existing = await prisma.trustAccount.findFirst({ where: { client_id } });
      if (existing) return NextResponse.json(existing, { status: 200 });
      const account = await prisma.trustAccount.create({ data: { client_id, balance: 0 } });
      return NextResponse.json(account, { status: 201 });
    }

    if (action === 'transact') {
      if (!account_id || !type || !amount) {
        return NextResponse.json({ error: 'account_id, type, and amount are required' }, { status: 400 });
      }
      if (!isAdmin(u.role) && u.role !== 'LAWYER') return forbidden();

      const account = await prisma.trustAccount.findUnique({ where: { id: account_id } });
      if (!account) return NextResponse.json({ error: 'Trust account not found' }, { status: 404 });

      const parsedAmount = parseFloat(amount);
      if (type === 'WITHDRAWAL' && account.balance < parsedAmount) {
        return NextResponse.json({ error: 'Insufficient trust balance' }, { status: 400 });
      }

      const delta = type === 'DEPOSIT' ? parsedAmount : -parsedAmount;

      const [tx] = await prisma.$transaction([
        prisma.trustTransaction.create({
          data: { trust_account_id: account_id, type, amount: parsedAmount, description, reference_no },
        }),
        prisma.trustAccount.update({
          where: { id: account_id },
          data: { balance: { increment: delta } },
        }),
      ]);

      return NextResponse.json(tx, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action. Use "create_account" or "transact".' }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/trust]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
