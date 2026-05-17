import prisma from './src/lib/prisma';

async function main() {
  await prisma.activity.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.profile.deleteMany({});
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
