require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seed starting...');
  
  // Clean database first in dependency order
  await prisma.siteSettings.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.munshiAccount.deleteMany();
  await prisma.advocatePortal.deleteMany();
  await prisma.user.deleteMany();
  
  const superadminPassword = await bcrypt.hash('Admin@123', 10);
  const advocatePassword = await bcrypt.hash('Lawyer@123', 10);
  const clerkPassword = await bcrypt.hash('Clerk@123', 10);
  const userPassword = await bcrypt.hash('User@123', 10);

  // 1. SuperAdmin
  const superadmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@lawyersys.test',
      password: superadminPassword,
      role: 'SUPERADMIN',
      isActive: true,
    }
  });
  console.log('Created SuperAdmin');

  // 2. Advocate A (Active)
  const advocateA = await prisma.user.create({
    data: {
      name: 'Advocate Malik',
      email: 'advocate@malik-associates.test',
      password: advocatePassword,
      role: 'ADVOCATE',
      isActive: true,
    }
  });
  const portalA = await prisma.advocatePortal.create({
    data: {
      advocateId: advocateA.id,
      portalName: 'Malik & Associates',
      subscriptionStatus: 'ACTIVE',
      nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }
  });
  console.log('Created Active Advocate and Portal');

  // 3. Advocate B (Paused Subscription)
  const advocateB = await prisma.user.create({
    data: {
      name: 'Advocate Paused',
      email: 'advocate@paused-firm.test',
      password: advocatePassword,
      role: 'ADVOCATE',
      isActive: true,
    }
  });
  const portalB = await prisma.advocatePortal.create({
    data: {
      advocateId: advocateB.id,
      portalName: 'Paused Legal Services',
      subscriptionStatus: 'PAUSED',
      nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }
  });
  console.log('Created Paused Advocate and Portal');

  // 4. Munshi A (Linked to Active Advocate A, isActive = true)
  const munshiA = await prisma.user.create({
    data: {
      name: 'Munshi Active',
      email: 'munshi.active@malik-associates.test',
      password: clerkPassword,
      role: 'MUNSHI',
      isActive: true,
    }
  });
  await prisma.munshiAccount.create({
    data: {
      munshiId: munshiA.id,
      advocateId: advocateA.id,
      permissions: { viewClients: true, addClients: true },
      isActive: true,
    }
  });
  console.log('Created Munshi Active (under Active Advocate)');

  // 5. Munshi B (Linked to Paused Advocate B, isActive = true)
  const munshiB = await prisma.user.create({
    data: {
      name: 'Munshi Paused advocate',
      email: 'munshi.paused@paused-firm.test',
      password: clerkPassword,
      role: 'MUNSHI',
      isActive: true,
    }
  });
  await prisma.munshiAccount.create({
    data: {
      munshiId: munshiB.id,
      advocateId: advocateB.id,
      permissions: { viewClients: true },
      isActive: true,
    }
  });
  console.log('Created Munshi Paused advocate (under Paused Advocate)');

  // 6. Munshi C (Deactivated account, under Active Advocate A)
  const munshiC = await prisma.user.create({
    data: {
      name: 'Munshi Inactive clerk',
      email: 'munshi.inactive@malik-associates.test',
      password: clerkPassword,
      role: 'MUNSHI',
      isActive: true,
    }
  });
  await prisma.munshiAccount.create({
    data: {
      munshiId: munshiC.id,
      advocateId: advocateA.id,
      permissions: {},
      isActive: false,
    }
  });
  console.log('Created Inactive Munshi account');

  // 7. Inactive User (isActive = false)
  const inactiveUser = await prisma.user.create({
    data: {
      name: 'Inactive User',
      email: 'user.inactive@lawyersys.test',
      password: userPassword,
      role: 'ADVOCATE',
      isActive: false,
    }
  });
  console.log('Created Inactive user');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
