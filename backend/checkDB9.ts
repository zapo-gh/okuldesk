import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const assignments = await prisma.dutyAssignment.findMany({
    where: { year: 2026, month: 9 }
  });
  console.log('September assignments count:', assignments.length);
  if (assignments.length > 0) {
    console.log('Sample:', assignments[0]);
  }
}
main().finally(() => prisma.$disconnect());
