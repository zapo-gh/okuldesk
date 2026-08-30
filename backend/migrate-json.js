const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Veri taşıma başlatılıyor...');

  // 1. GradeReportStudent.failedSubjects -> GradeReportStudentSubject
  const reports = await prisma.gradeReportStudent.findMany();
  let migratedSubjects = 0;
  for (const report of reports) {
    if (report.failedSubjects) {
      try {
        const subjects = JSON.parse(report.failedSubjects);
        for (const sub of subjects) {
          // Check if already exists to prevent duplication on multiple runs
          const exists = await prisma.gradeReportStudentSubject.findFirst({
            where: {
              gradeReportStudentId: report.id,
              subject: sub.subject
            }
          });
          if (!exists) {
            await prisma.gradeReportStudentSubject.create({
              data: {
                gradeReportStudentId: report.id,
                subject: sub.subject,
                grade: parseFloat(sub.grade) || 0
              }
            });
            migratedSubjects++;
          }
        }
      } catch (e) {
        console.warn(`Hatalı JSON at GradeReportStudent ${report.id}`);
      }
    }
  }
  console.log(`✅ ${migratedSubjects} ders notu ilişkisel tabloya taşındı.`);

  // 2. OrderLetter.items -> OrderLetterItem
  const orders = await prisma.orderLetter.findMany();
  let migratedItems = 0;
  for (const order of orders) {
    if (order.items) {
      try {
        const items = JSON.parse(order.items);
        for (const item of items) {
          const exists = await prisma.orderLetterItem.findFirst({
            where: {
              orderId: order.id,
              name: item.name
            }
          });
          if (!exists) {
            await prisma.orderLetterItem.create({
              data: {
                orderId: order.id,
                name: item.name,
                quantity: parseInt(item.quantity) || 1,
                unit: item.unit || 'Adet',
                unitPrice: parseFloat(item.unitPrice) || 0,
                total: parseFloat(item.total) || 0
              }
            });
            migratedItems++;
          }
        }
      } catch (e) {
        console.warn(`Hatalı JSON at OrderLetter ${order.id}`);
      }
    }
  }
  console.log(`✅ ${migratedItems} sipariş kalemi ilişkisel tabloya taşındı.`);

  // 3. Procurement.commissionMembers -> ProcurementCommissionMember
  const procurements = await prisma.procurement.findMany();
  let migratedMembers = 0;
  for (const proc of procurements) {
    if (proc.commissionMembers) {
      try {
        let members = [];
        // Might be JSON string array or complex object depending on the implementation
        const parsed = JSON.parse(proc.commissionMembers);
        if (Array.isArray(parsed)) {
          members = parsed;
        }

        for (const member of members) {
          const name = typeof member === 'string' ? member : member.name || member.fullName;
          const role = typeof member === 'string' ? 'Üye' : member.role || 'Üye';
          
          if (name) {
            const exists = await prisma.procurementCommissionMember.findFirst({
              where: {
                procurementId: proc.id,
                fullName: name
              }
            });
            if (!exists) {
              await prisma.procurementCommissionMember.create({
                data: {
                  procurementId: proc.id,
                  fullName: name,
                  role: role
                }
              });
              migratedMembers++;
            }
          }
        }
      } catch (e) {
        console.warn(`Hatalı JSON at Procurement ${proc.id}`);
      }
    }
  }
  console.log(`✅ ${migratedMembers} komisyon üyesi ilişkisel tabloya taşındı.`);

  console.log('Veri taşıma tamamlandı.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
