import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { forbidden, unauthorized } from '@/lib/http-errors';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();
    if (user.role !== 'SUPER_ADMIN') return forbidden();

    const body = await request.json();
    const { name, email, password, slug } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing name, email, or password' }, { status: 400 });
    }

    // Generate slug from name if not provided
    const tenantSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-+$)/g, '');

    // 1. Create the Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: tenantSlug,
        email,
        status: 'Active',
      },
    });

    // 2. Create the Tenant Admin user
    const tenantAdmin = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        password: hashPassword(password),
        role: 'TENANT_ADMIN',
        status: 'Active',
      },
    });

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      tenantName: tenant.name,
      adminId: tenantAdmin.id,
      adminEmail: tenantAdmin.email,
    }, { status: 201 });
  } catch (error: any) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'P2002') {
      return NextResponse.json({ error: 'Email or slug already registered' }, { status: 409 });
    }
    console.error('[POST /api/superadmin/tenants/create]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
