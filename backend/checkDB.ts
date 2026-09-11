import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const assignments = await prisma.dutyAssignment.findMany({
    where: { year: 2026, month: 10 }
  });
  console.log('October assignments count:', assignments.length);
}
main().finally(() => prisma.$disconnect());
