import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { withTenant, isAdmin } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';
import { writeAuditLog } from '@/lib/audit';

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

    // Only Admin (Tenant Admin / Super Admin) can create sub-users
    if (!isAdmin(currentUser.role)) return forbidden();

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = typeof body.role === 'string' ? body.role.trim() : 'TENANT_USER';

    const canAdd = typeof body.canAdd === 'boolean' ? body.canAdd : false;
    const canEdit = typeof body.canEdit === 'boolean' ? body.canEdit : false;
    const canDelete = typeof body.canDelete === 'boolean' ? body.canDelete : false;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Verify role is permitted to be created by Advocate
    const allowedRoles = ['TENANT_ADMIN', 'TENANT_USER'];
    if (currentUser.role !== 'SUPER_ADMIN' && !allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role assignment' }, { status: 400 });
    }

    const created = await prisma.user.create({
      data: {
        tenantId: tenantId!,
        email,
        name,
        role: role as any,
        password: hashPassword(password),
        canAdd,
        canEdit,
        canDelete,
        status: 'Active',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      tenantId: tenantId!,
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: created.id,
      newValues: { email, name, role, canAdd, canEdit, canDelete },
    });

    return NextResponse.json({ success: true, user: created }, { status: 201 });
  } catch (error: any) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'P2002') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    console.error('[POST /api/tenant/users/create]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
