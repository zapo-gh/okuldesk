const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const entries = await prisma.timetableEntry.findMany({
    select: { className: true },
    distinct: ['className']
  });
  console.log(entries.map(e => e.className));
}
run();
