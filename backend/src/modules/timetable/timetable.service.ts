import prisma from '../shared/utils/prisma';

class TimetableService {
  async getActiveTimetable(academicYear: string) {
    return prisma.timetable.findFirst({
      where: { academicYear, isActive: true },
      include: { entries: true }
    });
  }

  async getTeacherTimetable(staffId: string, timetableId?: string) {
    // Aktif timetable içindeki entry'leri getir
    const activeTable = timetableId
      ? await prisma.timetable.findUnique({ where: { id: timetableId } })
      : await prisma.timetable.findFirst({ where: { isActive: true } });

    if (!activeTable) return [];

    return prisma.timetableEntry.findMany({
      where: { staffId, timetableId: activeTable.id },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }]
    });
  }

  async getClassTimetable(className: string, timetableId?: string) {
    const activeTable = timetableId
      ? await prisma.timetable.findUnique({ where: { id: timetableId } })
      : await prisma.timetable.findFirst({ where: { isActive: true } });

    if (!activeTable) return [];

    return prisma.timetableEntry.findMany({
      where: { className, timetableId: activeTable.id },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }]
    });
  }

  async getTimetableHistory(academicYear: string) {
    return prisma.timetable.findMany({
      where: { academicYear },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entries: true } }
      }
    });
  }

  async deleteTimetable(id: string) {
    return prisma.timetable.delete({ where: { id } });
  }

  async setActiveTimetable(id: string, academicYear: string) {
    return prisma.$transaction([
      prisma.timetable.updateMany({
        where: { academicYear, isActive: true },
        data: { isActive: false }
      }),
      prisma.timetable.update({
        where: { id },
        data: { isActive: true }
      })
    ]);
  }

  // Excel dosyasından yükleme işlemi — Tamamen atomik (transaction)
  async uploadTimetable(buffer: Buffer, academicYear: string, name: string) {
    const { parseTimetableExcel } = await import('./utils/timetableParser.util');
    const parsedData = parseTimetableExcel(buffer);

    // Tüm öğretmenleri veritabanından çek (eşleştirme için)
    const allStaff = await prisma.staff.findMany({ select: { id: true, name: true } });

    // Normalize (Türkçe harf küçültme + boşluk/nokta temizleme)
    const normalize = (str: string) => str.toLocaleLowerCase('tr-TR').replace(/[\s\.]/g, '');
    const staffMap = new Map<string, string>();
    allStaff.forEach(s => staffMap.set(normalize(s.name), s.id));

    const warnings: string[] = [];
    const entriesToCreate: any[] = [];
    let newTimetableId!: string;

    // Atomik transaction: eski pasife çek + yeni kayıt + entry'ler
    await prisma.$transaction(async (tx) => {
      // 1. Eski aktif programları pasife çek
      await tx.timetable.updateMany({
        where: { academicYear, isActive: true },
        data: { isActive: false }
      });

      // 2. Yeni timetable başlığı oluştur
      const newTimetable = await tx.timetable.create({
        data: { academicYear, name, isActive: true }
      });
      newTimetableId = newTimetable.id;

      // 3. Entryleri hazırla
      parsedData.forEach(schedule => {
        const normName = normalize(schedule.teacherName);
        const staffId = staffMap.get(normName);

        if (!staffId) {
          warnings.push(`Sistemde eşleşmeyen öğretmen: ${schedule.teacherName}. (Programı atlandı)`);
          return;
        }

        schedule.entries.forEach(entry => {
          entriesToCreate.push({
            timetableId: newTimetable.id,
            staffId,
            className: entry.className,
            dayOfWeek: entry.dayOfWeek,
            period: entry.period,
            subject: entry.subject ?? null
          });
        });
      });

      // 4. Entryleri chunk'lı olarak ekle
      const chunkSize = 500;
      for (let i = 0; i < entriesToCreate.length; i += chunkSize) {
        await tx.timetableEntry.createMany({
          data: entriesToCreate.slice(i, i + chunkSize)
        });
      }
    });

    return {
      message: 'Program başarıyla yüklendi.',
      timetableId: newTimetableId,
      totalTeachersFoundInExcel: parsedData.length,
      totalEntriesCreated: entriesToCreate.length,
      warnings
    };
  }
}

export const timetableService = new TimetableService();
