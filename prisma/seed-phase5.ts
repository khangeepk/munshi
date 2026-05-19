/**
 * Phase 5 Test Seed — Multi-Tenant Isolation Testing
 * Creates two tenants with full test data for manual QA.
 *
 * Run with: npx tsx prisma/seed-phase5.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Phase 5 Seed — Starting...\n');

  // ── 1. SUPER ADMIN (no tenant) ─────────────────────────────────────────────
  const superAdminPwd = hashPassword('Admin@123');
  await prisma.user.upsert({
    where: { email: 'superadmin@lawyersys.test' },
    create: {
      email: 'superadmin@lawyersys.test',
      name: 'Super Administrator',
      role: 'SUPER_ADMIN',
      password: superAdminPwd,
    },
    update: { password: superAdminPwd, role: 'SUPER_ADMIN' },
  });
  console.log('✅ SUPER_ADMIN   → superadmin@lawyersys.test / Admin@123');

  // Also keep master bypass working
  console.log('✅ MASTER BYPASS → admin / Khangee786786 (always works)');

  // ── 2. TENANT A — "Malik & Associates" ────────────────────────────────────
  const tenantA = await prisma.tenant.upsert({
    where: { slug: 'malik-associates' },
    create: {
      name: 'Malik & Associates',
      slug: 'malik-associates',
      email: 'info@malik-associates.test',
      phone: '+92-51-1234567',
      city: 'Islamabad',
      status: 'ACTIVE',
    },
    update: { status: 'ACTIVE', name: 'Malik & Associates' },
  });
  console.log(`\n🏢  Tenant A: Malik & Associates (id: ${tenantA.id})`);

  // Tenant A — TENANT_ADMIN
  const tenantAPwd = hashPassword('Advocate@123');
  const tenantAAdmin = await prisma.user.upsert({
    where: { email: 'admin@malik-associates.test' },
    create: {
      tenantId: tenantA.id,
      email: 'admin@malik-associates.test',
      name: 'Malik Khan (Admin)',
      role: 'TENANT_ADMIN',
      password: tenantAPwd,
      canCreate: true, canEdit: true, canDelete: true,
    },
    update: { password: tenantAPwd, tenantId: tenantA.id, role: 'TENANT_ADMIN' },
  });
  console.log('   ✅ TENANT_ADMIN  → admin@malik-associates.test / Advocate@123');

  // Tenant A — ADVOCATE
  const advocatePwd = hashPassword('Lawyer@123');
  const tenantAAdvocate = await prisma.user.upsert({
    where: { email: 'advocate@malik-associates.test' },
    create: {
      tenantId: tenantA.id,
      email: 'advocate@malik-associates.test',
      name: 'Sara Ahmed (Advocate)',
      role: 'ADVOCATE',
      password: advocatePwd,
      canCreate: true, canEdit: true, canDelete: false,
    },
    update: { password: advocatePwd, tenantId: tenantA.id },
  });
  console.log('   ✅ ADVOCATE     → advocate@malik-associates.test / Lawyer@123');

  // Tenant A — CLIENT user A1
  const clientUserPwd = hashPassword('Client@123');
  const clientUserA1 = await prisma.user.upsert({
    where: { email: 'client1@malik-associates.test' },
    create: {
      tenantId: tenantA.id,
      email: 'client1@malik-associates.test',
      name: 'Ahmed Raza (Client)',
      role: 'CLIENT',
      password: clientUserPwd,
    },
    update: { password: clientUserPwd, tenantId: tenantA.id, role: 'CLIENT' },
  });
  console.log('   ✅ CLIENT       → client1@malik-associates.test / Client@123');

  // Tenant A — CLIENT user A2 (for cross-client isolation test)
  const clientUserA2 = await prisma.user.upsert({
    where: { email: 'client2@malik-associates.test' },
    create: {
      tenantId: tenantA.id,
      email: 'client2@malik-associates.test',
      name: 'Fatima Malik (Client 2)',
      role: 'CLIENT',
      password: clientUserPwd,
    },
    update: { password: clientUserPwd, tenantId: tenantA.id, role: 'CLIENT' },
  });
  console.log('   ✅ CLIENT 2     → client2@malik-associates.test / Client@123');

  // Tenant A — Client profiles linked to users
  const clientProfileA1 = await prisma.client.upsert({
    where: { userId: clientUserA1.id },
    create: {
      tenantId: tenantA.id,
      userId: clientUserA1.id,
      name: 'Ahmed Raza',
      phone: '+92-300-1234567',
      whatsapp: '+92-300-1234567',
      email: 'client1@malik-associates.test',
      city: 'Islamabad',
      address: 'House 12, F-7/2, Islamabad',
      cnic: '61101-1234567-1',
      fatherName: 'Raza Khan',
    },
    update: { tenantId: tenantA.id, userId: clientUserA1.id },
  });

  const clientProfileA2 = await prisma.client.upsert({
    where: { userId: clientUserA2.id },
    create: {
      tenantId: tenantA.id,
      userId: clientUserA2.id,
      name: 'Fatima Malik',
      phone: '+92-300-9876543',
      email: 'client2@malik-associates.test',
      city: 'Rawalpindi',
      cnic: '37405-9876543-2',
    },
    update: { tenantId: tenantA.id, userId: clientUserA2.id },
  });
  console.log('   ✅ Client profiles linked');

  // Tenant A — Case for Client A1
  const caseA1 = await prisma.case.upsert({
    where: { tenantId_caseNumber: { tenantId: tenantA.id, caseNumber: 'CASE-A-001' } },
    create: {
      tenantId: tenantA.id,
      clientId: clientProfileA1.id,
      assignedToId: tenantAAdvocate.id,
      caseTitle: 'Ahmed Raza vs State — Property Dispute',
      caseNumber: 'CASE-A-001',
      courtName: 'Islamabad High Court',
      judgeName: 'Justice Ahmed Khan',
      caseType: 'CIVIL',
      status: 'ONGOING',
      priority: 'HIGH',
      filingDate: new Date('2025-01-15'),
      nextHearingDate: new Date(Date.now() + 5 * 86400000), // 5 days from now
      oppositeParty: 'State Government',
      oppositeCounsel: 'Ali Baig Advocate',
      description: 'Property dispute over 10 marla plot in F-7 sector, Islamabad.',
      internalNotes: 'INTERNAL: Client has strong case — do not share with client portal.',
      legalSections: 'Section 9, Transfer of Property Act',
    },
    update: {
      status: 'ONGOING',
      internalNotes: 'INTERNAL: Client has strong case — do not share with client portal.',
    },
  });

  // Tenant A — Case for Client A2 (cross-client isolation test)
  const caseA2 = await prisma.case.upsert({
    where: { tenantId_caseNumber: { tenantId: tenantA.id, caseNumber: 'CASE-A-002' } },
    create: {
      tenantId: tenantA.id,
      clientId: clientProfileA2.id,
      assignedToId: tenantAAdmin.id,
      caseTitle: 'Fatima Malik — Custody Matter',
      caseNumber: 'CASE-A-002',
      courtName: 'Family Court Rawalpindi',
      caseType: 'FAMILY',
      status: 'FILED',
      priority: 'URGENT',
      filingDate: new Date('2025-03-01'),
      nextHearingDate: new Date(Date.now() + 10 * 86400000),
      oppositeParty: 'Ali Hassan',
      description: 'Child custody matter under family court jurisdiction.',
      internalNotes: 'INTERNAL: Sensitive case — strictly confidential.',
    },
    update: { internalNotes: 'INTERNAL: Sensitive case — strictly confidential.' },
  });
  console.log('   ✅ Cases created (CASE-A-001, CASE-A-002)');

  // Tenant A — Hearings for Case A1
  const now = new Date();
  await prisma.hearing.upsert({
    where: { id: 'hearing-a1-1' },
    create: {
      id: 'hearing-a1-1',
      tenantId: tenantA.id,
      caseId: caseA1.id,
      hearingDate: new Date(now.getTime() - 30 * 86400000), // 30 days ago
      courtName: 'Islamabad High Court',
      purpose: 'Preliminary Arguments',
      status: 'HEARD',
      orderSummary: 'Court heard preliminary arguments. Next date fixed for final arguments.',
      createdById: tenantAAdvocate.id,
    },
    update: {},
  });
  await prisma.hearing.upsert({
    where: { id: 'hearing-a1-2' },
    create: {
      id: 'hearing-a1-2',
      tenantId: tenantA.id,
      caseId: caseA1.id,
      hearingDate: new Date(now.getTime() + 5 * 86400000), // 5 days from now
      courtName: 'Islamabad High Court',
      purpose: 'Final Arguments',
      status: 'SCHEDULED',
      createdById: tenantAAdvocate.id,
    },
    update: {},
  });
  console.log('   ✅ Hearings created');

  // Tenant A — Public document for Client A1 (visible in portal)
  await prisma.document.upsert({
    where: { id: 'doc-a1-public' },
    create: {
      id: 'doc-a1-public',
      tenantId: tenantA.id,
      caseId: caseA1.id,
      clientId: clientProfileA1.id,
      uploadedById: tenantAAdvocate.id,
      title: 'Property Documents — FIR Copy',
      type: 'EVIDENCE',
      fileUrl: 'https://storage.example.com/private/doc-a1-public.pdf',
      fileKey: 'private/doc-a1-public.pdf',
      mimeType: 'application/pdf',
      size: 245760,
      isPrivate: false, // VISIBLE in client portal
    },
    update: { isPrivate: false },
  });

  // Tenant A — Private document (must NOT be visible in portal)
  await prisma.document.upsert({
    where: { id: 'doc-a1-private' },
    create: {
      id: 'doc-a1-private',
      tenantId: tenantA.id,
      caseId: caseA1.id,
      clientId: clientProfileA1.id,
      uploadedById: tenantAAdvocate.id,
      title: 'Advocate Strategy Notes — PRIVATE',
      type: 'LEGAL_BRIEF',
      fileUrl: 'https://storage.example.com/private/strategy-notes.pdf',
      fileKey: 'private/strategy-notes.pdf',
      mimeType: 'application/pdf',
      size: 102400,
      isPrivate: true, // HIDDEN from client portal
    },
    update: { isPrivate: true },
  });
  console.log('   ✅ Documents created (1 public, 1 private)');

  // Tenant A — Invoice for Client A1
  const invoiceA1 = await prisma.invoice.upsert({
    where: { tenantId_invoiceNumber: { tenantId: tenantA.id, invoiceNumber: 'INV-A-001' } },
    create: {
      tenantId: tenantA.id,
      clientId: clientProfileA1.id,
      caseId: caseA1.id,
      invoiceNumber: 'INV-A-001',
      amount: 50000,
      discount: 0,
      tax: 0,
      totalAmount: 50000,
      paidAmount: 25000,
      status: 'PARTIAL',
      dueDate: new Date(Date.now() + 14 * 86400000), // 14 days from now
    },
    update: { paidAmount: 25000, status: 'PARTIAL' },
  });

  // Payment record
  await prisma.payment.upsert({
    where: { id: 'payment-a1-1' },
    create: {
      id: 'payment-a1-1',
      tenantId: tenantA.id,
      clientId: clientProfileA1.id,
      caseId: caseA1.id,
      invoiceId: invoiceA1.id,
      amount: 25000,
      method: 'Bank Transfer',
      reference: 'TXN-2025-0012',
      status: 'COMPLETED',
      paidAt: new Date(Date.now() - 7 * 86400000),
    },
    update: {},
  });
  console.log('   ✅ Invoice + payment created (INV-A-001, partial paid)');

  // ── 3. TENANT B — "Justice Chambers" (ACTIVE) ────────────────────────────
  const tenantB = await prisma.tenant.upsert({
    where: { slug: 'justice-chambers' },
    create: {
      name: 'Justice Chambers',
      slug: 'justice-chambers',
      email: 'info@justice-chambers.test',
      phone: '+92-42-9876543',
      city: 'Lahore',
      status: 'ACTIVE',
    },
    update: { status: 'ACTIVE', name: 'Justice Chambers' },
  });
  console.log(`\n🏢  Tenant B: Justice Chambers (id: ${tenantB.id})`);

  // Tenant B — TENANT_ADMIN
  const tenantBPwd = hashPassword('Justice@123');
  const tenantBAdmin = await prisma.user.upsert({
    where: { email: 'admin@justice-chambers.test' },
    create: {
      tenantId: tenantB.id,
      email: 'admin@justice-chambers.test',
      name: 'Justice Admin',
      role: 'TENANT_ADMIN',
      password: tenantBPwd,
      canCreate: true, canEdit: true, canDelete: true,
    },
    update: { password: tenantBPwd, tenantId: tenantB.id, role: 'TENANT_ADMIN' },
  });
  console.log('   ✅ TENANT_ADMIN  → admin@justice-chambers.test / Justice@123');

  // Tenant B — CLIENT user
  const tenantBClientPwd = hashPassword('BClient@123');
  const tenantBClientUser = await prisma.user.upsert({
    where: { email: 'client@justice-chambers.test' },
    create: {
      tenantId: tenantB.id,
      email: 'client@justice-chambers.test',
      name: 'Zara Hussain (Client)',
      role: 'CLIENT',
      password: tenantBClientPwd,
    },
    update: { password: tenantBClientPwd, tenantId: tenantB.id, role: 'CLIENT' },
  });
  console.log('   ✅ CLIENT       → client@justice-chambers.test / BClient@123');

  // Tenant B — Client profile
  const clientProfileB = await prisma.client.upsert({
    where: { userId: tenantBClientUser.id },
    create: {
      tenantId: tenantB.id,
      userId: tenantBClientUser.id,
      name: 'Zara Hussain',
      phone: '+92-321-9876543',
      email: 'client@justice-chambers.test',
      city: 'Lahore',
      cnic: '35202-9876543-8',
    },
    update: { tenantId: tenantB.id, userId: tenantBClientUser.id },
  });

  // Tenant B — Case
  const caseB = await prisma.case.upsert({
    where: { tenantId_caseNumber: { tenantId: tenantB.id, caseNumber: 'CASE-B-001' } },
    create: {
      tenantId: tenantB.id,
      clientId: clientProfileB.id,
      assignedToId: tenantBAdmin.id,
      caseTitle: 'Zara Hussain — Contract Dispute',
      caseNumber: 'CASE-B-001',
      courtName: 'Lahore High Court',
      caseType: 'COMMERCIAL',
      status: 'FILED',
      priority: 'MEDIUM',
      filingDate: new Date('2025-02-10'),
      nextHearingDate: new Date(Date.now() + 3 * 86400000),
      oppositeParty: 'XYZ Corporation',
      description: 'Breach of commercial contract — seeking damages of PKR 5,000,000.',
      internalNotes: 'INTERNAL: Tenant B internal note — must not cross to Tenant A.',
    },
    update: { internalNotes: 'INTERNAL: Tenant B internal note — must not cross to Tenant A.' },
  });

  // Tenant B — Invoice
  await prisma.invoice.upsert({
    where: { tenantId_invoiceNumber: { tenantId: tenantB.id, invoiceNumber: 'INV-B-001' } },
    create: {
      tenantId: tenantB.id,
      clientId: clientProfileB.id,
      caseId: caseB.id,
      invoiceNumber: 'INV-B-001',
      amount: 75000,
      discount: 5000,
      tax: 0,
      totalAmount: 70000,
      paidAmount: 0,
      status: 'SENT',
      dueDate: new Date(Date.now() + 7 * 86400000),
    },
    update: {},
  });
  console.log('   ✅ Case, documents, invoice created (Tenant B)');

  // ── 4. TENANT C — Suspended (for suspension test) ─────────────────────────
  const tenantSusp = await prisma.tenant.upsert({
    where: { slug: 'suspended-firm' },
    create: {
      name: 'Suspended Law Firm',
      slug: 'suspended-firm',
      email: 'info@suspended-firm.test',
      status: 'SUSPENDED',
    },
    update: { status: 'SUSPENDED' },
  });

  const suspPwd = hashPassword('Susp@123');
  await prisma.user.upsert({
    where: { email: 'user@suspended-firm.test' },
    create: {
      tenantId: tenantSusp.id,
      email: 'user@suspended-firm.test',
      name: 'Suspended User',
      role: 'ADVOCATE',
      password: suspPwd,
    },
    update: { password: suspPwd, tenantId: tenantSusp.id },
  });
  console.log(`\n🚫  Tenant C: Suspended Law Firm (status: SUSPENDED)`);
  console.log('   ✅ ADVOCATE (suspended) → user@suspended-firm.test / Susp@123');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║          PHASE 5 TEST CREDENTIALS — READY FOR QA                ║
╠══════════════════════════════════════════════════════════════════╣
║ SUPER ADMIN                                                      ║
║   Email:     superadmin@lawyersys.test                           ║
║   Password:  Admin@123                                           ║
║   Alt login: admin / Khangee786786 (master bypass)               ║
╠══════════════════════════════════════════════════════════════════╣
║ TENANT A — Malik & Associates (Islamabad) ACTIVE                 ║
║   Tenant Admin:  admin@malik-associates.test / Advocate@123      ║
║   Advocate:      advocate@malik-associates.test / Lawyer@123     ║
║   Client 1:      client1@malik-associates.test / Client@123      ║
║     └─ Case A-001: Property Dispute (ONGOING)                    ║
║     └─ Invoice: INV-A-001 — PKR 50,000 (PARTIAL, PKR 25k paid)  ║
║     └─ Document: 1 public (visible) + 1 private (hidden)         ║
║   Client 2:      client2@malik-associates.test / Client@123      ║
║     └─ Case A-002: Custody Matter (FILED) — isolation test       ║
╠══════════════════════════════════════════════════════════════════╣
║ TENANT B — Justice Chambers (Lahore) ACTIVE                      ║
║   Tenant Admin:  admin@justice-chambers.test / Justice@123       ║
║   Client:        client@justice-chambers.test / BClient@123      ║
║     └─ Case B-001: Contract Dispute (FILED)                      ║
║     └─ Invoice: INV-B-001 — PKR 70,000 (SENT, unpaid)           ║
╠══════════════════════════════════════════════════════════════════╣
║ SUSPENDED TENANT (for 403 test)                                  ║
║   Email:     user@suspended-firm.test / Susp@123                 ║
║   Expected:  403 Forbidden on any API/page access                ║
╚══════════════════════════════════════════════════════════════════╝
  `);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
