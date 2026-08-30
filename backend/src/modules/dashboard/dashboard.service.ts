import prisma from '../shared/utils/prisma';

export class DashboardService {
  async getSummary() {
    const [
      totalStudents,
      totalStaff,
      absenteeismTotal,
      absenteeismSent,
      absenteeismNotSent,
      warningTotal,
      warningStudents,
      violationUploads,
      violationTotal,
      confirmedViolations,
      waConnectedParents,
      settings,
      fieldTripsCount,
      commissionsCount,
      dutyCount,
    ] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.staff.count({ where: { isActive: true, deletedAt: null } }),
      prisma.absenteeism.count({ where: { deletedAt: null } }),
      prisma.absenteeism.count({ where: { waSentAt: { not: null }, deletedAt: null } }),
      prisma.absenteeism.count({ where: { waSentAt: null, deletedAt: null } }),
      prisma.writtenWarning.count({ where: { deletedAt: null } }),
      // groupBy yerine COUNT DISTINCT — tüm satırları çekmek yerine yalnızca sayıyı döndürür
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT studentId) as count
        FROM WrittenWarning
        WHERE deletedAt IS NULL
      `,
      prisma.violationUpload.count(),
      prisma.dailyViolation.count({ where: { deletedAt: null } }),
      prisma.dailyViolation.count({ where: { isConfirmed: true, deletedAt: null } }),
      prisma.parent.count({ where: { contacts: { some: { waConsentStatus: 'ACCEPTED' } } } }),
      prisma.schoolSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.fieldTrip.count(),
      prisma.commission.count({ where: { status: 'AKTIF' } }),
      prisma.dutyStation.count({ where: { isActive: 1 } }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const isoDate = thirtyDaysAgo.toISOString();

    const violationsRaw = await prisma.$queryRaw<Array<{ dateStr: string; count: any }>>`
      SELECT substr(createdAt, 1, 10) as dateStr, COUNT(id) as count
      FROM DailyViolation
      WHERE createdAt >= ${isoDate} AND deletedAt IS NULL
      GROUP BY substr(createdAt, 1, 10)
    `;

    const absentsRaw = await prisma.$queryRaw<Array<{ dateStr: string; count: any }>>`
      SELECT substr(createdAt, 1, 10) as dateStr, COUNT(id) as count
      FROM Absenteeism
      WHERE createdAt >= ${isoDate} AND deletedAt IS NULL
      GROUP BY substr(createdAt, 1, 10)
    `;

    const dateMap: Record<string, { date: string; ihlal: number; devamsizlik: number }> = {};
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      // Format as DD.MM for nicer chart display
      const displayDate = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth()+1).toString().padStart(2, '0')}`;
      dateMap[dateStr] = { date: displayDate, ihlal: 0, devamsizlik: 0 };
    }

    violationsRaw.forEach(v => {
      if (v.dateStr && dateMap[v.dateStr]) {
        dateMap[v.dateStr].ihlal += Number(v.count);
      }
    });

    absentsRaw.forEach(a => {
      if (a.dateStr && dateMap[a.dateStr]) {
        dateMap[a.dateStr].devamsizlik += Number(a.count);
      }
    });

    return {
      totalStudents,
      totalStaff,
      absenteeism: {
        total: absenteeismTotal,
        sentCount: absenteeismSent,
        notSentCount: absenteeismNotSent,
      },
      warnings: {
        total: warningTotal,
        studentsWithWarnings: Number(warningStudents[0]?.count ?? 0),
      },
      violations: {
        totalUploads: violationUploads,
        totalViolations: violationTotal,
        confirmedViolations,
      },
      whatsapp: {
        consentedParents: waConnectedParents,
      },
      schoolName: settings?.schoolName ?? '',
      principalName: settings?.principalName ?? '',
      fieldTripsCount,
      commissionsCount,
      dutyCount,
      chartData: Object.values(dateMap),
    };
  }
}

export const dashboardService = new DashboardService();
