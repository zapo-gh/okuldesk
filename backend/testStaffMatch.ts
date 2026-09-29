import fs from 'fs';
import path from 'path';
import prisma from './src/modules/shared/utils/prisma';
import { parseClubListPdf } from './src/modules/studentClub/utils/clubListParser';

async function run() {
  const staff = await prisma.staff.findMany({ select: { name: true } });
  console.log('Total Staff in DB:', staff.length);
  console.log('Sample Staff:', staff.slice(0, 5).map(s => s.name));
  
  const filePath = path.join(__dirname, '../KulupListesi.pdf');
  const buffer = fs.readFileSync(filePath);
  
  const results = await parseClubListPdf(buffer, '2025-2026');
  
  let matchCount = 0;
  for (const r of results) {
    if (r.matchedStaffId) matchCount++;
    console.log(`${r.rawName} -> ${r.matchedStaffName || 'NOT MATCHED'} (Club: ${r.clubName})`);
  }
  console.log(`\nMatched ${matchCount} out of ${results.length}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
