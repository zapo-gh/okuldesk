import prisma from '../../shared/utils/prisma';
import { dutyScheduleService } from '../dutySchedule.service';

/**
 * Nöbet yerinin veya dersliğin kat seviyesini tespit eder.
 * Zemin / A Katı = 0
 * 1. Kat / B Katı = 1
 * 2. Kat / C Katı = 2
 * 3. Kat / D Katı = 3
 * 4. Kat / E Katı = 4
 * Bodrum = -1
 * Bahçe / Açık Alan / İdareci = null
 */
export function getStationFloorLevel(text?: string | null): number | null {
  if (!text) return null;
  const name = text.toLocaleLowerCase('tr-TR').trim();

  // Bahçe, dış alan, atölye çevresi vb. kat değildir
  if (
    name.includes('bahçe') ||
    name.includes('bahce') ||
    name.includes('dış') ||
    name.includes('dis') ||
    name.includes('atölye çevresi') ||
    name.includes('atolye cevresi')
  ) {
    return null;
  }

  // İdareci nöbet yeri kat değildir
  if (name.includes('idare') || name.includes('müdür') || name.includes('mudur')) {
    return null;
  }

  // Bodrum
  if (name.includes('bodrum') || name.includes('-1')) {
    return -1;
  }

  // Zemin / Giriş kat
  if (name.includes('zemin') || name.includes('giriş') || name.includes('giris')) {
    return 0;
  }

  // Açıkça rakam içeren katlar: "1. kat", "2. kat", "3.kat", "kat 1", "kat 2", vb.
  const numMatch = name.match(/(\d+)\s*\.?\s*kat/i) || name.match(/kat\s*(\d+)/i);
  if (numMatch && numMatch[1]) {
    return parseInt(numMatch[1], 10);
  }

  // Harf bazlı blok/kat eşleşmesi:
  // "A- ZEMİN KAT", "A-01", "B - 1. KAT", "B-03", "C - 2. KAT", "C-02", "D - 3. KAT", "D-05"
  const letterMatch = name.match(/^([a-zğüşıöç])\s*[-–—]/i) || name.match(/^([a-zğüşıöç])\s+kat/i);
  if (letterMatch && letterMatch[1]) {
    const letter = letterMatch[1].toUpperCase();
    const letterMap: Record<string, number> = {
      'A': 0, // A - Zemin Kat
      'B': 1, // B - 1. Kat
      'C': 2, // C - 2. Kat
      'D': 3, // D - 3. Kat
      'E': 4, // E - 4. Kat
      'F': 5  // F - 5. Kat
    };
    if (letterMap[letter] !== undefined) {
      return letterMap[letter];
    }
  }

  return null;
}

export function isOutdoorStation(stationName?: string | null): boolean {
  if (!stationName) return false;
  const name = stationName.toLocaleLowerCase('tr-TR').trim();
  return (
    name.includes('bahçe') ||
    name.includes('bahce') ||
    name.includes('dış') ||
    name.includes('dis') ||
    name.includes('atölye çevresi') ||
    name.includes('atolye cevresi')
  );
}

export function isAdminStation(stationName?: string | null): boolean {
  if (!stationName) return false;
  const name = stationName.toLocaleLowerCase('tr-TR').trim();
  return (
    name.includes('idare') ||
    name.includes('müdür') ||
    name.includes('mudur') ||
    name.includes('yönetim')
  );
}

export function isVicePrincipal(title?: string | null): boolean {
  if (!title) return false;
  const norm = title.toLocaleLowerCase('tr-TR').replace(/[\s.]/g, '');
  return (
    norm.includes('müdüryardımcısı') ||
    norm.includes('müdüryrd') ||
    norm.includes('myrd') ||
    norm.includes('müdüryardımcı')
  );
}

export class CoverAssignmentService {
  // ── Absences ──

  async getAbsencesForDate(date: Date, academicYear: string) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay   = new Date(`${dateStr}T23:59:59.999Z`);
    return prisma.staffAbsence.findMany({
      where: {
        academicYear,
        startDate: { lte: endOfDay },
        endDate:   { gte: startOfDay }
      },
      include: { staff: { select: { id: true, name: true, gorev: true } } },
      orderBy: { createdAt: 'asc' }
    });
  }

  async saveAbsence(data: {
    staffId: string;
    academicYear: string;
    startDate: string;
    endDate: string;
    reason?: string;
    absenceTime?: string;
  }) {
    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    const endDate   = new Date(`${data.endDate}T00:00:00.000Z`);
    return prisma.staffAbsence.create({
      data: {
        staffId: data.staffId,
        academicYear: data.academicYear,
        startDate,
        endDate,
        reason: data.reason,
        absenceTime: data.absenceTime || 'TAM_GUN'
      },
      include: { staff: { select: { id: true, name: true } } }
    });
  }

  async deleteAbsence(id: string) {
    await prisma.coverAssignment.deleteMany({ where: { absenceId: id } });
    return prisma.staffAbsence.delete({ where: { id } });
  }

  // ── Cover Assignments ──

  async getCoversForDate(date: Date, academicYear: string) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay   = new Date(`${dateStr}T23:59:59.999Z`);
    const covers = await prisma.coverAssignment.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        academicYear,
        absenceId: { not: null }
      },
      include: {
        absentStaff: { select: { id: true, name: true } },
        substituteStaff: { select: { id: true, name: true } },
        absence: { select: { id: true, reason: true } }
      },
      orderBy: [{ period: 'asc' }]
    });

    if (covers.length === 0) return covers;

    try {
      const targetDateUTC = new Date(`${dateStr}T00:00:00.000Z`);
      const absences = await this.getAbsencesForDate(targetDateUTC, academicYear);
      const absentStaffIds = absences.map(a => a.staffId);
      
      if (absentStaffIds.length > 0) {
        let dayOfWeek = targetDateUTC.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7;

        const activeTimetable = await prisma.timetable.findFirst({
          where: { isActive: true, academicYear },
          select: { id: true }
        });
        const timetableFilter = activeTimetable ? { timetableId: activeTimetable.id } : {};

        const allTimetableToday = await prisma.timetableEntry.findMany({
          where: { dayOfWeek, ...timetableFilter },
          include: { staff: { select: { id: true, name: true, gorev: true, title: true } } }
        });

        const isStaffAbsentForPeriod = (staffId: string, period: number) => {
          const abs = absences.find(a => a.staffId === staffId);
          if (!abs) return false;
          const aTime = (abs as any).absenceTime || 'TAM_GUN';
          if (aTime === 'TAM_GUN') return true;
          if (aTime === 'SABAH' && period <= 5) return true;
          if (aTime === 'OGLEDEN_SONRA' && period > 5) return true;
          return false;
        };

        return covers.map(cover => {
          if (!cover.className) return cover;

          const entry = allTimetableToday.find(e => e.staffId === cover.absentStaffId && e.period === cover.period);

          const coTeachers = allTimetableToday.filter(
            e => e.className === cover.className &&
                 e.period === cover.period &&
                 e.staffId !== cover.absentStaffId &&
                 e.staffId !== null
          );

          const presentCoTeachers = coTeachers.filter(c => c.staffId && !isStaffAbsentForPeriod(c.staffId, cover.period));
          const absentCoTeachers = coTeachers.filter(c => c.staffId && isStaffAbsentForPeriod(c.staffId, cover.period));

          const isMergedWithCoTeacher = presentCoTeachers.some(c => c.staffId === cover.substituteStaffId);
          const mergedWithStaff = isMergedWithCoTeacher
            ? presentCoTeachers.find(c => c.staffId === cover.substituteStaffId)?.staff
            : (presentCoTeachers.length > 0 ? presentCoTeachers[0].staff : null);

          return {
            ...cover,
            isCoTeaching: coTeachers.length > 0,
            hasPresentCoTeacher: presentCoTeachers.length > 0,
            presentCoTeachers: presentCoTeachers.map(c => c.staff).filter(Boolean),
            coAbsentStaffs: absentCoTeachers.map(c => absences.find(a => a.staffId === c.staffId)?.staff || c.staff).filter(Boolean),
            isMerged: isMergedWithCoTeacher,
            isCombined: isMergedWithCoTeacher,
            mergedWithStaff: isMergedWithCoTeacher ? mergedWithStaff : null,
            room: entry?.room || cover.room || null
          };
        });
      }
    } catch (e) {
      console.error("Error enriching coAbsentStaffs in getCoversForDate:", e);
    }

    return covers;
  }

  async deleteCover(id: string) {
    return prisma.coverAssignment.delete({ where: { id } });
  }

  async clearCoversForDate(dateStr: string) {
    const targetDateUTC = new Date(`${dateStr}T00:00:00.000Z`);
    return prisma.coverAssignment.deleteMany({
      where: { date: targetDateUTC }
    });
  }

  async suggestCovers(
    dateStr: string,
    academicYear: string,
    rules?: { preventConsecutive: boolean; maxCoversPerHour: number; maxCoversPerDay: number }
  ) {
    const parts = dateStr.split('-');
    const year  = Number(parts[0]);
    const month = Number(parts[1]);
    const day   = Number(parts[2]);
    const targetDateLocal = new Date(year, month - 1, day);
    const targetDateUTC   = new Date(`${dateStr}T00:00:00.000Z`);

    // 1. İş günü kontrolü (Hafta sınırları ayları aşabildiği için önceki ve sonraki ayları da tarayalım)
    const prevMonthDate = new Date(year, month - 2, 1);
    const nextMonthDate = new Date(year, month, 1);
    const workDays = [
      ...dutyScheduleService._getWorkDays(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1).map(d => ({ ...d, assignedYear: prevMonthDate.getFullYear(), assignedMonth: prevMonthDate.getMonth() + 1 })),
      ...dutyScheduleService._getWorkDays(year, month).map(d => ({ ...d, assignedYear: year, assignedMonth: month })),
      ...dutyScheduleService._getWorkDays(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1).map(d => ({ ...d, assignedYear: nextMonthDate.getFullYear(), assignedMonth: nextMonthDate.getMonth() + 1 })),
    ];
    
    const workDay  = workDays.find(d => d.date.getTime() === targetDateLocal.getTime());
    if (!workDay) {
      return { status: 'warning', message: 'Seçilen tarih bir iş günü (Pzt-Cum) değil.', suggestions: [] };
    }

    const { weekNum, dayOfWeek, assignedYear, assignedMonth } = workDay;

    // 2. Devamsızlıklar
    const absences = await this.getAbsencesForDate(targetDateUTC, academicYear);
    if (absences.length === 0) {
      return { status: 'info', message: 'Bu tarihte devamsız öğretmen yok.', suggestions: [] };
    }

    // 3. Okul ayarlarından aktif nöbet modunu çek
    const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });
    const dutyRotationFreq = settings?.dutyRotationFreq || 'weekly';

    // 4. Sadece aktif moda ait nöbet atamalarını getir
    const dutyAssignmentsRaw = await prisma.dutyAssignment.findMany({
      where: { 
        academicYear, 
        dayOfWeek,
        ...(dutyRotationFreq === 'weekly' || dutyRotationFreq === 'none'
          ? { month: 0, weekNumber: 0 }
          : { year: assignedYear, month: assignedMonth, weekNumber: weekNum }
        )
      },
      include: { staff: { select: { id: true, name: true, title: true } }, station: true }
    });

    const dutyAssignmentsMap = new Map();
    for (const d of dutyAssignmentsRaw) {
      dutyAssignmentsMap.set(d.staffId, d);
    }
    const dutyAssignments = Array.from(dutyAssignmentsMap.values());
    if (dutyAssignments.length === 0) {
      return { status: 'warning', message: 'Bu tarihte aktif nöbet programına göre atanmış nöbetçi öğretmen bulunamadı.', suggestions: [] };
    }

    const onDutyStaffIds = dutyAssignments.map(d => d.staffId);

    // Aktif ders programı
    const activeTimetable = await prisma.timetable.findFirst({
      where: { isActive: true, academicYear },
      select: { id: true }
    });
    const timetableFilter = activeTimetable ? { timetableId: activeTimetable.id } : {};

    // 5. Nöbetçilerin ders programı (tek sorgu)
    const onDutyTimetable = await prisma.timetableEntry.findMany({
      where: { staffId: { in: onDutyStaffIds }, dayOfWeek, ...timetableFilter }
    });

    // 6. Bugünkü tüm ders programı
    const allTimetableToday = await prisma.timetableEntry.findMany({
      where: { dayOfWeek, ...timetableFilter },
      include: { staff: { select: { id: true, name: true, gorev: true, title: true } } },
      orderBy: { period: 'asc' }
    });

    // Sınıfların varsayılan derslik haritası (tüm haftalık programdan frekansa göre çıkarılır)
    const allActiveTimetableEntries = await prisma.timetableEntry.findMany({
      where: { ...timetableFilter },
      select: { className: true, room: true }
    });
    const classRoomFrequency = new Map<string, Map<string, number>>();
    for (const e of allActiveTimetableEntries) {
      if (!e.className || !e.room) continue;
      if (!classRoomFrequency.has(e.className)) classRoomFrequency.set(e.className, new Map());
      const rf = classRoomFrequency.get(e.className)!;
      rf.set(e.room, (rf.get(e.room) || 0) + 1);
    }
    const classDefaultRoomMap = new Map<string, string>();
    for (const [cls, counts] of classRoomFrequency.entries()) {
      let topRoom = '';
      let topCount = 0;
      for (const [rm, cnt] of counts.entries()) {
        if (cnt > topCount) { topCount = cnt; topRoom = rm; }
      }
      classDefaultRoomMap.set(cls, topRoom);
    }

    // 7. Mevcut covers (bugüne ait tüm covers'lar)
    const existingCovers = await prisma.coverAssignment.findMany({
      where: { date: targetDateUTC },
      select: { id: true, substituteStaffId: true, period: true, absentStaffId: true, isCancelled: true }
    });

    // Görev sayaçları
    const coverCountTotalMap = new Map<string, number>();
    const coverCountTodayMap = new Map<string, number>();
    onDutyStaffIds.forEach(id => {
      coverCountTotalMap.set(id, 0);
      coverCountTodayMap.set(id, 0);
    });

    const historicalCovers = await prisma.coverAssignment.groupBy({
      by: ['substituteStaffId'],
      where: {
        academicYear,
        substituteStaffId: { in: onDutyStaffIds }
      },
      _count: { substituteStaffId: true }
    });

    historicalCovers.forEach(hc => {
      if (hc.substituteStaffId) {
        coverCountTotalMap.set(hc.substituteStaffId, hc._count.substituteStaffId);
      }
    });

    // Derslik -> Nöbet Yeri Haritası ve Nöbet Yerleri
    const [schoolSettings, allDutyStations] = await Promise.all([
      prisma.schoolSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.dutyStation.findMany({ where: { isActive: true } })
    ]);
    let roomStationMap: Record<string, string> = {};
    try {
      roomStationMap = JSON.parse((schoolSettings as any)?.dutyRoomStationMap || '{}');
    } catch {
      roomStationMap = {};
    }

    const isStaffAbsentForPeriod = (staffId: string, period: number) => {
      const abs = absences.find(a => a.staffId === staffId);
      if (!abs) return false;
      const absTime = (abs as any).absenceTime || 'TAM_GUN';
      if (absTime === 'TAM_GUN') return true;
      if (absTime === 'SABAH' && period <= 5) return true;
      if (absTime === 'OGLEDEN_SONRA' && period > 5) return true;
      return false;
    };

    // 8. Tüm boş dersleri topla (sınıf ve saat bazında eş-öğretmen birleştirmesi yapılarak)
    interface EmptySlot {
      absence: any;
      entry: any;
      period: number;
      className: string | null;
      subject: string | null;
      room: string | null;
      isCoTeaching: boolean;
      hasPresentCoTeacher: boolean;
      presentCoTeachers: any[];
      coAbsentStaffs: any[];
      isMerged: boolean;
      mergedWithStaff: any | null;
    }

    const emptySlots: EmptySlot[] = [];
    const processedClassPeriods = new Set<string>();

    for (const absence of absences) {
      let absentTimetable = allTimetableToday.filter(e => e.staffId === absence.staffId);
      if ((absence as any).absenceTime === 'SABAH') {
        absentTimetable = absentTimetable.filter(e => e.period <= 5);
      } else if ((absence as any).absenceTime === 'OGLEDEN_SONRA') {
        absentTimetable = absentTimetable.filter(e => e.period > 5);
      }

      for (const entry of absentTimetable) {
        const period = entry.period;

        // İptal (Boş Bırak) kontrolü
        const isEntryCancelled = existingCovers.some(
          c => c.absentStaffId === absence.staffId && c.period === period && c.isCancelled
        );
        if (isEntryCancelled) continue;

        const classKey = `${entry.className || 'NOCLASS'}_${period}`;
        if (entry.className && processedClassPeriods.has(classKey)) {
          continue;
        }

        let isCoTeaching = false;
        let hasPresentCoTeacher = false;
        let isMerged = false;
        let mergedWithStaff: any = null;
        let presentCoTeachers: any[] = [];
        let coAbsentStaffs: any[] = [];

        if (entry.className) {
          const coTeachers = allTimetableToday.filter(
            e => e.className === entry.className &&
                 e.period === period &&
                 e.staffId !== absence.staffId &&
                 e.staffId !== null
          );

          if (coTeachers.length > 0) {
            isCoTeaching = true;
            const presentEntries = coTeachers.filter(
              c => c.staffId && !isStaffAbsentForPeriod(c.staffId, period)
            );
            const absentEntries = coTeachers.filter(
              c => c.staffId && isStaffAbsentForPeriod(c.staffId, period)
            );

            presentCoTeachers = presentEntries.map(c => c.staff).filter(Boolean);
            coAbsentStaffs = absentEntries.map(c => absences.find(a => a.staffId === c.staffId)?.staff || c.staff).filter(Boolean);

            if (presentCoTeachers.length > 0) {
              hasPresentCoTeacher = true;
              isMerged = true;
              mergedWithStaff = presentCoTeachers[0];
            } else {
              hasPresentCoTeacher = false;
              isMerged = false;
            }
          }
          processedClassPeriods.add(classKey);
        }

        // Derslik tespiti (kendi kaydından, bugünkü diğer kayıtlardan veya sınıfın varsayılan dersliğinden)
        let finalRoom = entry.room;
        if (!finalRoom && entry.className) {
          const todaySource = allTimetableToday.find(
            e => e.className === entry.className && e.period === period && e.room
          ) || allTimetableToday.find(
            e => e.className === entry.className && e.room
          );
          if (todaySource) {
            finalRoom = todaySource.room;
          } else if (classDefaultRoomMap.has(entry.className)) {
            finalRoom = classDefaultRoomMap.get(entry.className) || null;
          }
        }

        emptySlots.push({
          absence,
          entry,
          period,
          className: entry.className,
          subject: entry.subject,
          room: finalRoom,
          isCoTeaching,
          hasPresentCoTeacher,
          presentCoTeachers,
          coAbsentStaffs,
          isMerged,
          mergedWithStaff
        });
      }
    }

    // Kronolojik saate göre sırala (Ders saatleri sırayla dağıtılsın: 1, 2, 3...)
    emptySlots.sort((a, b) => a.period - b.period || (a.className || '').localeCompare(b.className || ''));

    // Öğretmenlerin atandığı ders saatlerini takip eden harita (çakışma ve ardışık saat kontrolü için)
    const assignedSlotsByStaff = new Map<string, Set<number>>();
    onDutyStaffIds.forEach(id => assignedSlotsByStaff.set(id, new Set()));

    const suggestions: any[] = [];

    // 9. Sırayla her boş ders için nöbetçi görevlendir
    for (const slot of emptySlots) {
      if (slot.isMerged && slot.mergedWithStaff) {
        suggestions.push({
          absenceId: slot.absence.id,
          absentStaff: slot.absence.staff,
          coAbsentStaffs: slot.coAbsentStaffs,
          presentCoTeachers: slot.presentCoTeachers,
          isCoTeaching: slot.isCoTeaching,
          hasPresentCoTeacher: slot.hasPresentCoTeacher,
          isMerged: true,
          isCombined: true,
          mergedWithStaff: slot.mergedWithStaff,
          period: slot.period,
          className: slot.className,
          subject: slot.subject,
          room: slot.room,
          isStationMatch: false,
          matchTier: null,
          floorDistance: null,
          proximityType: null,
          proximityLabel: null,
          substituteStaffId: slot.mergedWithStaff.id,
          availableDutyStaff: [],
          suggestedSubstitute: {
            staff: slot.mergedWithStaff,
            station: null,
            isConflict: false,
            isCoTeacher: true,
            isMerged: true
          }
        });
        continue;
      }

      // 🎯 Hedef Nöbet Yeri ve Kat Seviyesi Tespiti
      let targetStationId: string | null = null;
      if (slot.room) {
        const cleanRoom = slot.room.trim();
        const upperRoom = cleanRoom.toUpperCase();

        if (roomStationMap[cleanRoom]) {
          targetStationId = roomStationMap[cleanRoom];
        } else if (roomStationMap[upperRoom]) {
          targetStationId = roomStationMap[upperRoom];
        } else {
          const parts = upperRoom.split(/[\/,]/).map(p => p.trim());
          for (const part of parts) {
            if (roomStationMap[part]) {
              targetStationId = roomStationMap[part];
              break;
            }
          }
        }
      }

      const targetStation = targetStationId ? allDutyStations.find(s => s.id === targetStationId) : null;
      const isTargetOutdoor = isOutdoorStation(targetStation?.name) || (slot.room ? isOutdoorStation(slot.room) : false);

      let targetFloor: number | null = getStationFloorLevel(targetStation?.name);
      if (targetFloor === null && slot.room && !isTargetOutdoor) {
        targetFloor = getStationFloorLevel(slot.room);
      }

      // Adayları değerlendir
      const candidates = dutyAssignments.map(assignment => {
        const staffId = assignment.staffId;
        const hasClass = onDutyTimetable.some(t => t.staffId === staffId && t.period === slot.period);
        const isFree = !hasClass;
        const coverCountTotal = coverCountTotalMap.get(staffId) || 0;
        const coverCountToday = coverCountTodayMap.get(staffId) || 0;
        const station = assignment.station;

        const candidateFloor = getStationFloorLevel(station?.name);
        const isCandidateOutdoor = isOutdoorStation(station?.name);
        const isCandidateAdmin = isAdminStation(station?.name) || isVicePrincipal(assignment.staff.title);

        // 🎯 Mesafe (distance) hesaplama:
        // 0: Aynı yer / kat
        // 1: Komşu (en yakın) kat
        // 2: 2 kat mesafe
        // 10: Açık alan / bahçe
        // 50: İdareci
        let distance = 999;
        if (targetStationId && assignment.stationId === targetStationId) {
          distance = 0;
        } else if (isTargetOutdoor && isCandidateOutdoor) {
          distance = 0;
        } else if (targetFloor !== null && candidateFloor !== null) {
          distance = Math.abs(targetFloor - candidateFloor);
        } else if (isCandidateOutdoor || isTargetOutdoor) {
          distance = 10;
        } else if (isCandidateAdmin) {
          distance = 50;
        } else {
          distance = 20;
        }

        // 🎯 Öncelik Kademesi (Tier):
        // Tier 1: 1. KESİN ÖNCELİK -> Aynı yerdeki/kattaki boş dersi olan nöbetçi (distance === 0, isFree === true)
        // Tier 2: 2. ÖNCELİK -> En yakın yerdeki/kattaki boş dersi olan nöbetçi (komşu katlar: distance 1, 2, 3...)
        // Tier 3: 3. ÖNCELİK -> Bahçe/dış alandaki boş dersi olan nöbetçi
        // Tier 4: Dersi olan nöbetçi öğretmen (çakışma)
        // Tier 5: İdareci / Nöbetçi İdareci (son çare)
        let tier = 5;
        if (!isCandidateAdmin) {
          if (isFree) {
            if (distance === 0) tier = 1;
            else if (distance < 10) tier = 2;
            else tier = 3;
          } else {
            tier = 4;
          }
        } else {
          tier = 5;
        }

        let proximityType: 'EXACT_FLOOR' | 'ADJACENT_FLOOR' | 'DISTANCE_2' | 'DISTANCE_FAR' | 'INDOOR_OTHER' | 'OUTDOOR' | 'ADMIN' = 'INDOOR_OTHER';
        let proximityLabel = 'Bina İçi';
        if (isCandidateAdmin) {
          proximityType = 'ADMIN';
          proximityLabel = '🏢 İdareci';
        } else if (distance === 0) {
          proximityType = 'EXACT_FLOOR';
          proximityLabel = isCandidateOutdoor ? '🎯 Bahçe Nöbetçisi' : '🎯 Kat Nöbetçisi (Aynı Kat)';
        } else if (distance === 1) {
          proximityType = 'ADJACENT_FLOOR';
          proximityLabel = '📍 En Yakın Kat (Komşu)';
        } else if (distance === 2) {
          proximityType = 'DISTANCE_2';
          proximityLabel = '2 Kat Mesafe';
        } else if (distance < 10) {
          proximityType = 'DISTANCE_FAR';
          proximityLabel = `${distance} Kat Mesafe`;
        } else if (isCandidateOutdoor) {
          proximityType = 'OUTDOOR';
          proximityLabel = '🌳 Bahçe Nöbetçisi';
        }

        // Ardışık saat kontrolü & ceza puanı
        const assignedPeriods = assignedSlotsByStaff.get(staffId) || new Set<number>();
        const hasConsecutive = assignedPeriods.has(slot.period - 1) || assignedPeriods.has(slot.period + 1);
        const consecutivePenalty = hasConsecutive ? 50 : 0;

        let isEligible = true;
        let conflictReason = '';

        if (isStaffAbsentForPeriod(staffId, slot.period)) {
          isEligible = false;
          conflictReason = 'Kendisi de izinli';
        }

        if (assignedPeriods.has(slot.period)) {
          isEligible = false;
          conflictReason = 'Bu saatte dolu';
        }

        if (rules?.maxCoversPerDay && coverCountToday >= rules.maxCoversPerDay && isEligible) {
          isEligible = false;
          conflictReason = 'Günlük max limit';
        }

        if (rules?.preventConsecutive && hasConsecutive && isEligible) {
          isEligible = false;
          conflictReason = 'Ardışık görev';
        }

        return {
          staff: assignment.staff,
          station: assignment.station,
          staffId,
          isFree,
          coverCount: coverCountToday,
          coverCountToday,
          coverCountTotal,
          tier,
          distance,
          candidateFloor,
          isCandidateAdmin,
          isStationMatch: distance === 0,
          floorDistance: distance < 50 ? distance : null,
          proximityType,
          proximityLabel,
          consecutivePenalty,
          isEligible,
          conflictReason
        };
      });

      // 🎯 Sıralama Algoritması:
      // 1. Tier (1: Aynı Kat Boş > 2: En Yakın Kat Boş > 3: Bahçe Boş > 4: Dersi Olan > 5: İdareci)
      // 2. Mesafe (Tier 2 içinde: 1 kat mesafe > 2 kat mesafe > 3 kat mesafe)
      // 3. Günlük Görev Sayısı (Bugün daha az görev almış olan)
      // 4. Dönemlik Görev Sayısı (Eşitlik durumunda dönem boyunca daha az görev almış olan)
      // 5. Ardışık saat tercihi
      // 6. Belirleyici stabil sıra (nöbet yeri sırası ve isim)
      const compareCandidates = (a: any, b: any) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.coverCountToday !== b.coverCountToday) return a.coverCountToday - b.coverCountToday;
        if (a.coverCountTotal !== b.coverCountTotal) return a.coverCountTotal - b.coverCountTotal;
        if (a.consecutivePenalty !== b.consecutivePenalty) return a.consecutivePenalty - b.consecutivePenalty;
        const orderA = a.station?.sortOrder ?? 99;
        const orderB = b.station?.sortOrder ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.staff.name.localeCompare(b.staff.name, 'tr-TR');
      };

      const sortedAllCandidates = [...candidates].sort((a, b) => {
        if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
        return compareCandidates(a, b);
      });

      const eligibleCandidates = candidates.filter(c => c.isEligible).sort(compareCandidates);
      const selectedSubstitute = eligibleCandidates[0] || null;

      let isConflict = false;
      if (selectedSubstitute) {
        coverCountTodayMap.set(selectedSubstitute.staffId, selectedSubstitute.coverCountToday + 1);
        coverCountTotalMap.set(selectedSubstitute.staffId, selectedSubstitute.coverCountTotal + 1);
        assignedSlotsByStaff.get(selectedSubstitute.staffId)!.add(slot.period);
        isConflict = !selectedSubstitute.isFree || selectedSubstitute.isCandidateAdmin;
      }

      suggestions.push({
        absenceId: slot.absence.id,
        absentStaff: slot.absence.staff,
        coAbsentStaffs: slot.coAbsentStaffs,
        presentCoTeachers: slot.presentCoTeachers,
        isCoTeaching: slot.isCoTeaching,
        hasPresentCoTeacher: slot.hasPresentCoTeacher,
        isMerged: false,
        isCombined: false,
        mergedWithStaff: null,
        period: slot.period,
        className: slot.className,
        subject: slot.subject,
        room: slot.room,
        isStationMatch: selectedSubstitute?.isStationMatch || false,
        matchTier: selectedSubstitute?.tier ?? null,
        floorDistance: selectedSubstitute?.floorDistance ?? null,
        proximityType: selectedSubstitute?.proximityType ?? null,
        proximityLabel: selectedSubstitute?.proximityLabel ?? null,
        substituteStaffId: selectedSubstitute?.staff.id ?? null,
        availableDutyStaff: sortedAllCandidates.map(c => ({
          ...c.staff,
          isFree: c.isFree,
          coverCount: c.coverCountToday,
          coverCountToday: c.coverCountToday,
          coverCountTotal: c.coverCountTotal,
          isEligible: c.isEligible,
          conflictReason: c.conflictReason,
          matchTier: c.tier,
          floorDistance: c.floorDistance,
          proximityType: c.proximityType,
          proximityLabel: c.proximityLabel,
          isStationMatch: c.isStationMatch,
          station: c.station
        })),
        suggestedSubstitute: selectedSubstitute
          ? {
              staff: selectedSubstitute.staff,
              station: selectedSubstitute.station,
              isConflict,
              isStationMatch: selectedSubstitute.isStationMatch,
              matchTier: selectedSubstitute.tier,
              floorDistance: selectedSubstitute.floorDistance,
              proximityType: selectedSubstitute.proximityType,
              proximityLabel: selectedSubstitute.proximityLabel
            }
          : null
      });
    }

    return { status: 'success', suggestions };
  }

  // A2: saveCovers — N+1 sorgu → upsert ile iyileştirildi (10 atama için artık 2 DB sorgusu)
  async saveCovers(data: {
    date: string;
    academicYear: string;
    covers: {
      absenceId?: string;
      absentStaffId: string;
      substituteStaffId: string | null;
      period: number;
      className: string;
      subject?: string;
      room?: string;
      isCancelled?: boolean;
    }[];
  }) {
    const targetDate = new Date(`${data.date}T00:00:00.000Z`);

    // Önce o tarihe ait mevcut tüm cover'ları tek sorguda al
    const existingCovers = await prisma.coverAssignment.findMany({
      where: {
        date: targetDate,
        absentStaffId: { in: data.covers.map(c => c.absentStaffId) }
      },
      select: { id: true, absentStaffId: true, period: true }
    });

    // Hızlı lookup için map oluştur: "absentStaffId|period" → id
    const existingMap = new Map<string, string>();
    existingCovers.forEach(e => existingMap.set(`${e.absentStaffId}|${e.period}`, e.id));

    const toCreate: typeof data.covers = [];
    const toUpdate: { id: string; substituteStaffId: string | null; subject?: string; room?: string; isCancelled?: boolean }[] = [];

    for (const cover of data.covers) {
      const key = `${cover.absentStaffId}|${cover.period}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        toUpdate.push({ id: existingId, substituteStaffId: cover.substituteStaffId || null, subject: cover.subject, room: cover.room, isCancelled: cover.isCancelled });
      } else if (cover.substituteStaffId || cover.isCancelled) {
        toCreate.push(cover);
      }
    }

    // Transaction: güncellemeler ve yeni kayıtlar ayrı bloklarda
    await prisma.$transaction(async (tx) => {
      // Güncellemeler
      for (const u of toUpdate) {
        await tx.coverAssignment.update({
          where: { id: u.id },
          data: { substituteStaffId: u.substituteStaffId, subject: u.subject, room: (u as any).room, isCancelled: u.isCancelled || false }
        });
      }
      // Yeni kayıtlar toplu
      if (toCreate.length > 0) {
        await tx.coverAssignment.createMany({
          data: toCreate.map(cover => ({
            absenceId:         cover.absenceId || null,
            absentStaffId:     cover.absentStaffId,
            substituteStaffId: cover.substituteStaffId,
            date:              targetDate,
            period:            cover.period,
            className:         cover.className,
            subject:           cover.subject,
            room:              cover.room,
            academicYear:      data.academicYear,
            isCancelled:       cover.isCancelled || false
          }))
        });
      }
    });

    return { updated: toUpdate.length, created: toCreate.length };
  }
}

export const coverAssignmentService = new CoverAssignmentService();
