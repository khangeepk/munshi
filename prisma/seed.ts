import { PrismaClient, TenantStatus, UserRole, DocumentType, InvoiceStatus, PaymentStatus } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const commonPassword = hashPassword('Test@123456');

  // --- Tenants ---
  const tenantA = await prisma.tenant.upsert({
    where: { slug: 'alpha-law-firm' },
    update: { status: TenantStatus.ACTIVE },
    create: { name: 'Alpha Law Firm', slug: 'alpha-law-firm', email: 'contact@alpha.com', status: TenantStatus.ACTIVE },
  });

  const tenantB = await prisma.tenant.upsert({
    where: { slug: 'beta-legal' },
    update: { status: TenantStatus.ACTIVE },
    create: { name: 'Beta Legal Associates', slug: 'beta-legal', email: 'contact@beta.com', status: TenantStatus.ACTIVE },
  });

  const tenantC = await prisma.tenant.upsert({
    where: { slug: 'suspended-law' },
    update: { status: TenantStatus.SUSPENDED },
    create: { name: 'Suspended Law Office', slug: 'suspended-law', email: 'contact@suspended.com', status: TenantStatus.SUSPENDED },
  });

  // --- Users ---
  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: { password: commonPassword, role: UserRole.SUPER_ADMIN, tenantId: null },
    create: { email: 'admin@test.com', name: 'Super Admin', password: commonPassword, role: UserRole.SUPER_ADMIN },
  });

  // Tenant A Users
  const advocateA = await prisma.user.upsert({
    where: { email: 'advocate.a@test.com' },
    update: { password: commonPassword, role: UserRole.TENANT_ADMIN, tenantId: tenantA.id },
    create: { email: 'advocate.a@test.com', name: 'Advocate A', password: commonPassword, role: UserRole.TENANT_ADMIN, tenantId: tenantA.id },
  });

  const clientUserA = await prisma.user.upsert({
    where: { email: 'client.a@test.com' },
    update: { password: commonPassword, role: UserRole.CLIENT, tenantId: tenantA.id },
    create: { email: 'client.a@test.com', name: 'Client A', password: commonPassword, role: UserRole.CLIENT, tenantId: tenantA.id },
  });

  // Tenant B Users
  const advocateB = await prisma.user.upsert({
    where: { email: 'advocate.b@test.com' },
    update: { password: commonPassword, role: UserRole.TENANT_ADMIN, tenantId: tenantB.id },
    create: { email: 'advocate.b@test.com', name: 'Advocate B', password: commonPassword, role: UserRole.TENANT_ADMIN, tenantId: tenantB.id },
  });

  const clientUserB = await prisma.user.upsert({
    where: { email: 'client.b@test.com' },
    update: { password: commonPassword, role: UserRole.CLIENT, tenantId: tenantB.id },
    create: { email: 'client.b@test.com', name: 'Client B', password: commonPassword, role: UserRole.CLIENT, tenantId: tenantB.id },
  });

  // Tenant C Users
  const suspendedUser = await prisma.user.upsert({
    where: { email: 'suspended@test.com' },
    update: { password: commonPassword, role: UserRole.TENANT_ADMIN, tenantId: tenantC.id },
    create: { email: 'suspended@test.com', name: 'Suspended User', password: commonPassword, role: UserRole.TENANT_ADMIN, tenantId: tenantC.id },
  });

  // Delete previous test data for clean state
  await prisma.case.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
  await prisma.client.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });

  // --- Tenant A Data ---
  // Clients
  const clientProfileA1 = await prisma.client.create({
    data: { tenantId: tenantA.id, userId: clientUserA.id, name: 'Client A Profile', phone: '111222333', email: 'client.a@test.com' }
  });

  const clientProfileA2 = await prisma.client.create({ // regular client without user access
    data: { tenantId: tenantA.id, name: 'Client A Profile 2', phone: '444555666' }
  });

  // Cases for Tenant A
  const caseA1 = await prisma.case.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA1.id, caseTitle: 'Property Dispute A', caseNumber: 'C-A-001', courtName: 'High Court', caseType: 'Civil', oppositeParty: 'Mr. X' }
  });
  const caseA2 = await prisma.case.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA1.id, caseTitle: 'Tax Issue A', caseNumber: 'C-A-002', courtName: 'Tax Tribunal', caseType: 'Tax', oppositeParty: 'FBR' }
  });
  const caseA3 = await prisma.case.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA2.id, caseTitle: 'Divorce A', caseNumber: 'C-A-003', courtName: 'Family Court', caseType: 'Family', oppositeParty: 'Mrs. Y' }
  });

  // Hearings for Tenant A
  await prisma.hearing.create({
    data: { tenantId: tenantA.id, caseId: caseA1.id, hearingDate: new Date(), courtName: 'High Court', purpose: 'Evidence', createdById: advocateA.id }
  });
  await prisma.hearing.create({
    data: { tenantId: tenantA.id, caseId: caseA2.id, hearingDate: new Date(Date.now() + 86400000), courtName: 'Tax Tribunal', purpose: 'Arguments', createdById: advocateA.id }
  });

  // Documents for Tenant A (1 public, 1 private)
  await prisma.document.create({
    data: { tenantId: tenantA.id, caseId: caseA1.id, uploadedById: advocateA.id, title: 'Public Notice', fileUrl: 'https://example.com/doc1.pdf', type: DocumentType.OTHER, isPrivate: false }
  });
  await prisma.document.create({
    data: { tenantId: tenantA.id, caseId: caseA1.id, uploadedById: advocateA.id, title: 'Private Notes', fileUrl: 'https://example.com/doc2.pdf', type: DocumentType.OTHER, isPrivate: true }
  });

  // Invoice for Tenant A
  const invoiceA = await prisma.invoice.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA1.id, caseId: caseA1.id, invoiceNumber: 'INV-A-001', amount: 5000, totalAmount: 5000, status: InvoiceStatus.DRAFT }
  });

  // Payment for Tenant A
  await prisma.payment.create({
    data: { tenantId: tenantA.id, clientId: clientProfileA1.id, invoiceId: invoiceA.id, amount: 2000, method: 'Cash', status: PaymentStatus.COMPLETED }
  });

  // Message for Tenant A
  await prisma.message.create({
    data: { caseId: caseA1.id, clientId: clientProfileA1.id, senderId: advocateA.id, receiverId: clientUserA.id, content: 'Please review your case documents.' }
  });

  // --- Tenant B Data ---
  const clientProfileB = await prisma.client.create({
    data: { tenantId: tenantB.id, userId: clientUserB.id, name: 'Client B Profile', phone: '777888999', email: 'client.b@test.com' }
  });

  const caseB1 = await prisma.case.create({
    data: { tenantId: tenantB.id, clientId: clientProfileB.id, caseTitle: 'Corporate Dispute B', caseNumber: 'C-B-001', courtName: 'Civil Court', caseType: 'Corporate', oppositeParty: 'Tech Corp' }
  });

  await prisma.document.create({
    data: { tenantId: tenantB.id, caseId: caseB1.id, uploadedById: advocateB.id, title: 'Contract Agreement', fileUrl: 'https://example.com/doc3.pdf', type: DocumentType.CONTRACT, isPrivate: false }
  });

  await prisma.invoice.create({
    data: { tenantId: tenantB.id, clientId: clientProfileB.id, caseId: caseB1.id, invoiceNumber: 'INV-B-001', amount: 10000, totalAmount: 10000, status: InvoiceStatus.DRAFT }
  });

  console.log('✅ Fresh test data seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
