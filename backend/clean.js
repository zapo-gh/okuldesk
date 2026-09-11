const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const allInvoices = await prisma.invoice.findMany();
  const seen = new Set();
  
  for (const inv of allInvoices) {
    if (!inv.invoiceNumber) continue;
    
    const key = `${inv.invoiceNumber}-${inv.companyName}-${inv.academicYear}`;
    if (seen.has(key)) {
      console.log('Deleting duplicate:', key, inv.id);
      await prisma.invoice.delete({ where: { id: inv.id }});
    } else {
      seen.add(key);
    }
  }
}

clean().then(() => console.log('Done')).catch(console.error);
