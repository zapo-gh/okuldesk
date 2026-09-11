import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const assignments = await prisma.dutyAssignment.findMany();
  console.log('Total assignments count:', assignments.length);
  if (assignments.length > 0) {
    console.log('Sample years and months:');
    const grouped = assignments.reduce((acc, curr) => {
      const key = `${curr.year}-${curr.month}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(grouped);
  }
}
main().finally(() => prisma.$disconnect());
