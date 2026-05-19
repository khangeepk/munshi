import { PrismaClient, Role, DocumentType, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const commonPassword = hashPassword('Test@123456');
  const superAdminPassword = hashPassword('Khangee786786');

  // --- Seed the permanent Super Admin ---
  console.log('Seeding permanent Super Admin...');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'sami@samikhan.store' },
    update: {
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      tenantId: null,
      status: 'Active',
    },
    create: {
      email: 'sami@samikhan.store',
      name: 'Sami Khan',
      password: superAdminPassword,
      role: Role.SUPER_ADMIN,
      status: 'Active',
    },
  });
  console.log(`Super Admin initialized: ${superAdmin.email}`);

  // --- Seed Tenants ---
  console.log('Seeding default tenants...');
  const tenantA = await prisma.tenant.upsert({
    where: { slug: 'alpha-law-firm' },
    update: { status: 'Active' },
    create: { name: 'Alpha Law Firm', slug: 'alpha-law-firm', email: 'contact@alpha.com', status: 'Active' },
  });

  const tenantB = await prisma.tenant.upsert({
    where: { slug: 'beta-legal' },
    update: { status: 'Active' },
    create: { name: 'Beta Legal Associates', slug: 'beta-legal', email: 'contact@beta.com', status: 'Active' },
  });

  // --- Users ---
  // Tenant A Users
  const advocateA = await prisma.user.upsert({
    where: { email: 'advocate.a@test.com' },
    update: { password: commonPassword, role: Role.TENANT_ADMIN, tenantId: tenantA.id, status: 'Active' },
    create: { email: 'advocate.a@test.com', name: 'Advocate A', password: commonPassword, role: Role.TENANT_ADMIN, tenantId: tenantA.id, status: 'Active' },
  });

  const clientUserA = await prisma.user.upsert({
    where: { email: 'client.a@test.com' },
    update: { password: commonPassword, role: Role.CLIENT, tenantId: tenantA.id, status: 'Active' },
    create: { email: 'client.a@test.com', name: 'Client A', password: commonPassword, role: Role.CLIENT, tenantId: tenantA.id, status: 'Active' },
  });

  // Tenant B Users
  const advocateB = await prisma.user.upsert({
    where: { email: 'advocate.b@test.com' },
    update: { password: commonPassword, role: Role.TENANT_ADMIN, tenantId: tenantB.id, status: 'Active' },
    create: { email: 'advocate.b@test.com', name: 'Advocate B', password: commonPassword, role: Role.TENANT_ADMIN, tenantId: tenantB.id, status: 'Active' },
  });

  // Delete previous test data for clean state in order of dependencies
  await prisma.message.deleteMany({ where: { case: { tenantId: { in: [tenantA.id, tenantB.id] } } } });
  await prisma.payment.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.invoice.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.document.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.hearing.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.case.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.client.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });

  // --- Tenant A Data ---
  // Clients
  const clientProfileA1 = await prisma.client.create({
    data: { tenantId: tenantA.id, userId: clientUserA.id, name: 'Client A Profile', phone: '111222333', email: 'client.a@test.com' }
  });

  const clientProfileA2 = await prisma.client.create({
    data: { tenantId: tenantA.id, name: 'Client A Profile 2', phone: '444555666' }
  });

  // Cases for Tenant A
  const caseA1 = await prisma.case.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA1.id, caseTitle: 'Property Dispute A', caseNumber: 'C-A-001', courtName: 'High Court', caseType: 'Civil', oppositeParty: 'Mr. X' }
  });
  const caseA2 = await prisma.case.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA1.id, caseTitle: 'Tax Issue A', caseNumber: 'C-A-002', courtName: 'Tax Tribunal', caseType: 'Tax', oppositeParty: 'FBR' }
  });

  // Hearings for Tenant A
  await prisma.hearing.create({
    data: { tenantId: tenantA.id, caseId: caseA1.id, hearingDate: new Date(), courtName: 'High Court', purpose: 'Evidence', createdById: advocateA.id }
  });

  // Documents for Tenant A
  await prisma.document.create({
    data: { tenantId: tenantA.id, caseId: caseA1.id, uploadedById: advocateA.id, title: 'Public Notice', fileUrl: 'https://example.com/doc1.pdf', type: DocumentType.OTHER, isPrivate: false }
  });

  // Invoice for Tenant A
  const invoiceA = await prisma.invoice.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA1.id, caseId: caseA1.id, invoiceNumber: 'INV-A-001', amount: 5000, totalAmount: 5000, status: InvoiceStatus.DRAFT }
  });

  // Payment for Tenant A
  await prisma.payment.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA1.id, invoiceId: invoiceA.id, amount: 2000, method: 'Cash', status: PaymentStatus.COMPLETED }
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
