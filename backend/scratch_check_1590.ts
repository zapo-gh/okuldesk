import prisma from './src/modules/shared/utils/prisma';

async function main() {
  const s1 = await prisma.student.findMany({
    where: {
      schoolNumber: { contains: '1590' }
    }
  });
  console.log("Students with 1590:", s1);
}

main().catch(console.error).finally(() => prisma.$disconnect());
