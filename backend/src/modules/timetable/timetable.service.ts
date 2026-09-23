import prisma from '../shared/utils/prisma';

class TimetableService {
  /**
   * Aktif programı sadece metadata ile döner (entry'ler dahil değil).
   * Entry sayısını _count ile hesaplar — büyük yüklemelerde payload şişmez.
   */
  async getActiveTimetable(academicYear: string) {
    return prisma.timetable.findFirst({
      where: { academicYear, isActive: true },
      include: {
        _count: { select: { entries: true } }
      }
    });
  }

  /**
   * Aktif programdaki benzersiz sınıf isimlerini döner (Frontend listesi için).
   */
  async getActiveClassList(academicYear: string): Promise<string[]> {
    const activeTimetable = await prisma.timetable.findFirst({
      where: { academicYear, isActive: true },
      select: { id: true }
    });

    if (!activeTimetable) return [];

    const entries = await prisma.timetableEntry.findMany({
      where: { timetableId: activeTimetable.id, className: { not: null } },
      select: { className: true },
      distinct: ['className']
    });

    const classNames = entries
      .map(e => e.className?.replace(/\s+SEÇ\.?$/i, '').trim() || '')
      .filter(Boolean);

    // Benzersiz yap ve sırala
    return [...new Set<string>(classNames)].sort();
  }

  /**
   * Öğretmenin aktif programa ait ders programını getirir.
   * academicYear filtresi eklenerek yanlış yıl eşleşmesi önlendi.
   */
  async getTeacherTimetable(staffId: string, academicYear: string, timetableId?: string) {
    const activeTable = timetableId
      ? await prisma.timetable.findUnique({ where: { id: timetableId } })
      : await prisma.timetable.findFirst({ where: { isActive: true, academicYear } });

    const entries = activeTable ? await prisma.timetableEntry.findMany({
      where: { staffId, timetableId: activeTable.id },
      include: { staff: true },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }]
    }) : [];

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        studentClubs: { where: { academicYear, isActive: true }, select: { name: true } },
        dutyConfigs: { where: { academicYear }, select: { fixedDayOfWeek: true } },
        dutyAssignments: { where: { academicYear }, include: { station: true } }
      }
    });

    let dutyInfo = null;
    if (staff?.dutyAssignments && staff.dutyAssignments.length > 0) {
      const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const uniqueDuties = Array.from(new Set(staff.dutyAssignments.map(d => `${days[d.dayOfWeek]} (${d.station.name})`)));
      dutyInfo = uniqueDuties.join(', ');
    } else if (staff?.dutyConfigs?.[0]?.fixedDayOfWeek) {
      const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      dutyInfo = `${days[staff.dutyConfigs[0].fixedDayOfWeek]} (Sabit)`;
    }

    const details = {
      homeroomClass: staff?.className || null,
      clubs: staff?.studentClubs?.map(c => c.name).join(', ') || null,
      duty: dutyInfo
    };

    return { entries, details };
  }

  /**
   * Sınıfın aktif programa ait ders programını getirir.
   * academicYear filtresi eklenerek yanlış yıl eşleşmesi önlendi.
   */
  async getClassTimetable(className: string, academicYear: string, timetableId?: string) {
    const activeTable = timetableId
      ? await prisma.timetable.findUnique({ where: { id: timetableId } })
      : await prisma.timetable.findFirst({ where: { isActive: true, academicYear } });

    if (!activeTable) return [];

    return prisma.timetableEntry.findMany({
      where: {
        timetableId: activeTable.id,
        OR: [
          { className: className },
          { className: className + ' SEÇ.' },
          { className: className + ' SEÇ' },
          { className: className + ' SEÇMELİ' }
        ]
      },
      include: { staff: true },
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

  /**
   * Aktif programdaki öğretmenlerin haftalık ders yük özetini döner.
   * Frontend'deki "Genel Bakış" paneli için kullanılır.
   */
  async getLoadSummary(academicYear: string) {
    const active = await prisma.timetable.findFirst({ where: { isActive: true, academicYear } });
    if (!active) return [];

    const grouped = await prisma.timetableEntry.groupBy({
      by: ['staffId'],
      where: { timetableId: active.id, staffId: { not: null } },
      _count: { id: true },
    });

    const staffIds = grouped.map(e => e.staffId).filter(Boolean) as string[];
    const staffList = await prisma.staff.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, name: true, brans: true }
    });
    const staffMap = new Map(staffList.map(s => [s.id, s]));

    return grouped
      .map(e => ({
        staffId: e.staffId,
        name: staffMap.get(e.staffId!)?.name ?? 'Bilinmiyor',
        brans: staffMap.get(e.staffId!)?.brans ?? null,
        count: e._count.id,
      }))
      .sort((a, b) => b.count - a.count);
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
      for (const schedule of parsedData) {
        const normName = normalize(schedule.teacherName);
        let staffId = staffMap.get(normName);

        if (!staffId) {
          // Öğretmen sistemde yoksa, görevlendirme olarak oluştur
          warnings.push(`Sistemde eşleşmeyen öğretmen: ${schedule.teacherName}. (Sisteme 'Görevlendirme Öğretmen' olarak eklendi)`);
          
          const newStaff = await tx.staff.create({
            data: {
              name: schedule.teacherName,
              title: 'Öğretmen',
              gorev: 'Görevlendirme Öğretmen'
            }
          });
          
          staffId = newStaff.id;
          staffMap.set(normName, staffId); // Aynı Excel'de tekrar geçerse yeniden oluşturmamak için map'e ekle
        }

        schedule.entries.forEach(entry => {
          entriesToCreate.push({
            timetableId: newTimetable.id,
            staffId,
            className: entry.className,
            dayOfWeek: entry.dayOfWeek,
            period: entry.period,
            subject: entry.subject ?? null,
            subjectName: entry.subjectName ?? null,
            room: entry.room ?? null
          });
        });
      }

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
  // Sınıf El Programı (SinifElProgrami.xlsx) dosyasından derslik eşleştirme
  async syncRoomsFromClassTimetable(timetableId: string, buffer: Buffer) {
    const { parseClassTimetableExcel, matchAndAssignRooms } = await import('./utils/classTimetableMatcher.util');
    
    // 1. Dosyayı parse et
    const anonymousSchedules = parseClassTimetableExcel(buffer);
    if (anonymousSchedules.length === 0) {
      throw new Error('Sınıf el programında geçerli bir veri bulunamadı.');
    }

    // 2. Veritabanındaki aktif program kayıtlarını getir
    const dbEntries = await prisma.timetableEntry.findMany({
      where: { timetableId }
    });

    if (dbEntries.length === 0) {
      throw new Error('Eşleştirilecek ders programı kaydı bulunamadı (Program boş).');
    }

    // 3. Eşleştirme algoritmasını çalıştır
    const entryUpdates = matchAndAssignRooms(anonymousSchedules, dbEntries);
    const updatesArray = Object.entries(entryUpdates);
    
    if (updatesArray.length === 0) {
      return { message: 'Hiçbir derslik eşleştirilemedi (Kayıtlar uyuşmuyor veya derslik bilgisi yok).', count: 0 };
    }

    // 4. Veritabanını güncelle (Performans için transaction ile chunk'lı)
    await prisma.$transaction(async (tx) => {
      const chunkSize = 200;
      for (let i = 0; i < updatesArray.length; i += chunkSize) {
        const chunk = updatesArray.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(([id, room]) =>
            tx.timetableEntry.update({
              where: { id },
              data: { room }
            })
          )
        );
      }
    });

    return {
      message: 'Sınıf el programından derslik bilgileri başarıyla eşleştirildi.',
      count: updatesArray.length
    };
  }
}

export const timetableService = new TimetableService();
