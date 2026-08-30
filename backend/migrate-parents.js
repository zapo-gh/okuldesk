import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating Parent data to ParentContact...');
  
  const parents = await prisma.parent.findMany();
  
  for (const parent of parents) {
    if (parent.phone) {
      // Check if contact already exists
      const existing = await prisma.parentContact.findFirst({
        where: { parentId: parent.id, phone: parent.phone }
      });
      
      if (!existing) {
        await prisma.parentContact.create({
          data: {
            parentId: parent.id,
            name: 'Veli (Otomatik)',
            phone: parent.phone,
            isPrimary: true,
            waConsentStatus: parent.waConsentStatus || 'PENDING',
            waConsentDate: parent.waConsentDate,
          }
        });
        console.log(`Migrated contact for parent ${parent.id} (${parent.phone})`);
      }
    }
  }
  
  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
