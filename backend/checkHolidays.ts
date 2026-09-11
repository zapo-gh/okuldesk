import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const holidays = await prisma.holiday.findMany();
  console.log(holidays.map(h => ({ name: h.name, year: h.academicYear })));
}
run().finally(() => prisma.$disconnect());
