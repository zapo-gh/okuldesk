const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const academicYear = '2024-2025';
    const clubs = await prisma.$queryRawUnsafe(
      `SELECT sc.*, s."name" as "assignedStaffName"
       FROM "StudentClub" sc LEFT JOIN "Staff" s ON s."id"=sc."assignedStaffId"
       WHERE sc."academicYear"=? ORDER BY sc."name" ASC`, academicYear
    );
    for (const c of clubs) {
      const countRes = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as c FROM "StudentClubMember" WHERE "clubId"=?`, c.id
      );
      c.memberCount = countRes[0]?.c || 0;
    }
    console.log(clubs);
  } catch (e) {
    console.error('Error fetching clubs:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
