import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setHolidaysRecurring() {
  // Tüm tatilleri "Her Yıl Tekrarlanır" (isRecurring = 1) olarak işaretleyelim
  const result = await prisma.holiday.updateMany({
    data: {
      extraData: JSON.stringify({ isRecurring: true })
    }
  });

  console.log(`${result.count} adet tatil "Her Yıl Tekrarlanır" olarak güncellendi.`);
}

setHolidaysRecurring().catch(console.error).finally(() => prisma.$disconnect());
