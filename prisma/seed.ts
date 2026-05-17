import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const adminPwd = hashPassword('password123');
  const dataPwd  = hashPassword('user123');

  await prisma.profile.upsert({
    where:  { email: 'admin' },
    create: { email: 'admin', full_name: 'System Administrator', role: 'ADMIN', passwordHash: adminPwd },
    update: { full_name: 'System Administrator', role: 'ADMIN', passwordHash: adminPwd },
  });
  console.log('✅ Created: admin / password123');

  await prisma.profile.upsert({
    where:  { email: 'user' },
    create: { email: 'user', full_name: 'Data Entry User', role: 'DATA_ENTRY', passwordHash: dataPwd },
    update: { full_name: 'Data Entry User', role: 'DATA_ENTRY', passwordHash: dataPwd },
  });
  console.log('✅ Created: user / user123');

  // Also create convenient email-based logins
  await prisma.profile.upsert({
    where:  { email: 'admin@lawyersys.local' },
    create: { email: 'admin@lawyersys.local', full_name: 'Admin (email)', role: 'ADMIN', passwordHash: adminPwd },
    update: { passwordHash: adminPwd },
  });

  await prisma.profile.upsert({
    where:  { email: 'user@lawyersys.local' },
    create: { email: 'user@lawyersys.local', full_name: 'Data Entry (email)', role: 'DATA_ENTRY', passwordHash: dataPwd },
    update: { passwordHash: dataPwd },
  });

  console.log('\n🎉 Seed complete! Credentials:');
  console.log('   Login: admin       | Password: password123');
  console.log('   Login: user        | Password: user123');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seed failed:', e.message ?? e);
    prisma.$disconnect();
    process.exit(1);
  });
