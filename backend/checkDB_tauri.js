const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/Users/AlizMTAL/Desktop/Programlar/okulDesk v2/src-tauri/target/debug/_up_/backend/prisma/database.db'
    }
  }
});
async function main() {
  const assignments = await prisma.dutyAssignment.findMany();
  console.log('Tauri target DB Total assignments count:', assignments.length);
}
main().finally(() => prisma.$disconnect());
