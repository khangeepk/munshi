import prisma from './src/lib/prisma';

async function main() {
  await prisma.auditLog.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Database cleared.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
