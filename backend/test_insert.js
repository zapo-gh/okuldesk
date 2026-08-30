const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function run() {
  try {
    const id = uuidv4();
    const d = {
      name: 'Test Club',
      academicYear: '2024-2025'
    };
    const maxMembers = d.maxMembers ?? 30;
    console.log('Inserting with maxMembers = ', maxMembers);
    
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StudentClub" ("id","name","description","assignedStaffId","meetingDay","meetingTime","maxMembers","academicYear") VALUES (?,?,?,?,?,?,?,?)`,
      id, d.name.trim(), d.description || null, d.assignedStaffId || null, d.meetingDay || null, d.meetingTime || null, maxMembers, d.academicYear
    );
    console.log('Success');
  } catch (e) {
    console.error('Error inserting:', e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
