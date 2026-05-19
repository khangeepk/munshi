export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { withTenant, isAdmin } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';
import { writeAuditLog } from '@/lib/audit';

export async function GET() {
  let user, tenantId;
  try {
    const res = await withTenant();
    user = res.user;
    tenantId = res.tenantId;
  } catch (e) {
    return unauthorized();
  }
  
  if (!isAdmin(user.role)) return forbidden();

  const whereClause: any = {};
  if (tenantId) whereClause.tenantId = tenantId;

  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id:        true,
      email:     true,
      name:      true,
      role:      true,
      canAdd:    true,
      canEdit:   true,
      canDelete: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Map to legacy shape expected by the UI
  const mapped = users.map((usr: any) => ({ 
    ...usr, 
    can_create_cases: usr.canAdd,
    can_edit_cases: usr.canEdit,
    can_delete_cases: usr.canDelete
  }));
  return NextResponse.json(mapped, { status: 200 });
}

export async function POST(request: Request) {
  try {
    let currentUser, tenantId;
    try {
      const res = await withTenant();
      currentUser = res.user;
      tenantId = res.tenantId;
    } catch (e) {
      return unauthorized();
    }
    
    if (!isAdmin(currentUser.role)) return forbidden();

    const body = await request.json();
    const email    = typeof body.email    === 'string' ? body.email.trim()    : '';
    const name     = typeof body.name     === 'string' ? body.name.trim()     : '';
    const password = typeof body.password === 'string' ? body.password        : '';
    const role     = typeof body.role     === 'string' ? body.role.trim()     : 'JUNIOR_LAWYER';
    
    const canCreate = !!body.can_create_cases;
    const canEdit   = !!body.can_edit_cases;
    const canDelete = !!body.can_delete_cases;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const created = await prisma.user.create({
      data: {
        tenantId: tenantId!,
        email,
        name:         name,
        role:         role as any,
        password:     hashPassword(password),
        canAdd:       canCreate,
        canEdit,
        canDelete,
      },
      select: { id: true, email: true, name: true, role: true, canAdd: true, canEdit: true, canDelete: true, createdAt: true },
    });

    await writeAuditLog({
      tenantId: tenantId!,
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: created.id,
      newValues: { email, name, role },
    });

    return NextResponse.json({ 
      ...created, 
      can_create_cases: created.canAdd,
      can_edit_cases: created.canEdit,
      can_delete_cases: created.canDelete
    }, { status: 201 });
  } catch (e: unknown) {
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
    if (code === 'P2002') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    console.error('[POST /api/users]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
