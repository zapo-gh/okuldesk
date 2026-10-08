import prisma from './src/modules/shared/utils/prisma';

async function main() {
  const students = await prisma.student.findMany({
    where: {
      fullName: { contains: 'HASEKMEK' }
    }
  });
  console.log("Students with HASEKMEK:", students);
  
  const student1590 = await prisma.student.findMany({
    where: {
      schoolNumber: { contains: '1590' }
    }
  });
  console.log("Students with 1590:", student1590);
}

main().catch(console.error).finally(() => prisma.$disconnect());
