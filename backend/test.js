const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe('SELECT id, name, startDate, endDate FROM CommemorativeDay').then(res => {
  console.log(res);
}).catch(console.error).finally(() => prisma.$disconnect());
