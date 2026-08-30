const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const roles = await prisma.staff.findMany({ distinct: ['role'], select: { role: true, unvan: true }});
  console.log('Roles:', roles);
  await prisma.$disconnect();
}
run();
