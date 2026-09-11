import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateHolidays() {
  const holidays = await prisma.holiday.findMany();
  let updatedCount = 0;

  for (const holiday of holidays) {
    if (!holiday.startDate) continue;
    
    const start = new Date(holiday.startDate);
    const end = holiday.endDate ? new Date(holiday.endDate) : new Date(holiday.startDate);

    const today = new Date('2026-08-31T00:00:00.000Z');
    
    if (start < today) {
      start.setFullYear(start.getFullYear() + 1);
      end.setFullYear(end.getFullYear() + 1);
      
      await prisma.holiday.update({
        where: { id: holiday.id },
        data: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} holidays.`);
}

updateHolidays().catch(console.error).finally(() => prisma.$disconnect());
