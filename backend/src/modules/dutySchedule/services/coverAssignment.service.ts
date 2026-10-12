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

        const allAbsentTimetable = await prisma.timetableEntry.findMany({
          where: { staffId: { in: absentStaffIds }, dayOfWeek, ...timetableFilter }
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
           
           const entry = allAbsentTimetable.find(e => e.staffId === cover.absentStaffId && e.period === cover.period);
           
           const coTeachers = allAbsentTimetable.filter(
             e => e.className === cover.className && 
                  e.period === cover.period && 
                  e.staffId !== cover.absentStaffId &&
                  e.staffId !== null &&
                  isStaffAbsentForPeriod(e.staffId, e.period)
           );
           
           const currentCoTeachers = coTeachers.map(c => 
             absences.find(a => a.staffId === c.staffId)?.staff
           ).filter(Boolean);
           
           return {
             ...cover,
             coAbsentStaffs: currentCoTeachers,
             room: entry?.room || null
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

    // A1: academicYear filtresi eklendi — yanlış öğretim yılının programından ders kontrolü yapılmasın
    const activeTimetable = await prisma.timetable.findFirst({
      where: { isActive: true, academicYear },
      select: { id: true }
    });

    const timetableFilter = activeTimetable ? { timetableId: activeTimetable.id } : {};

    // 5. Nöbetçilerin ders programı (N+1 safe — tek sorgu)
    const onDutyTimetable = await prisma.timetableEntry.findMany({
      where: { staffId: { in: onDutyStaffIds }, dayOfWeek, ...timetableFilter }
    });

    // 6. Devamsız öğretmenlerin ders programı (N+1 safe — tek sorgu)
    const absentStaffIds = absences.map(a => a.staffId);
    
    // A2: Eş öğretmen (co-teaching) kontrolü için tüm okulun bugünkü ders programını çek
    const allTimetableToday = await prisma.timetableEntry.findMany({
      where: { dayOfWeek, ...timetableFilter },
      orderBy: { period: 'asc' }
    });
    
    const allAbsentTimetable = allTimetableToday.filter(e => e.staffId && absentStaffIds.includes(e.staffId));

    // 7. Mevcut covers (bugüne ait tüm covers'ları çekiyoruz, iptal edilenler dahil)
    const existingCovers = await prisma.coverAssignment.findMany({
      where: { date: targetDateUTC },
      select: { id: true, substituteStaffId: true, period: true, absentStaffId: true, isCancelled: true }
    });

    // A4: coverCountMap — gerçek adil dağıtım için tüm dönemin verisini çek
    const coverCountMap = new Map<string, number>();
    onDutyStaffIds.forEach(id => coverCountMap.set(id, 0));

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
        coverCountMap.set(hc.substituteStaffId, hc._count.substituteStaffId);
      }
    });

    // Kayıtlı Derslik - Nöbet Yeri Haritasını ve Nöbet Yerlerini çek
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

    const suggestions: any[] = [];
    const coveredClasses = new Set<string>(); // className_subject_period

    for (const absence of absences) {
      let absentTimetable = allAbsentTimetable.filter(e => e.staffId === absence.staffId);
      
      // Filter based on absenceTime (1-5 Sabah, 6+ Öğleden Sonra)
      if ((absence as any).absenceTime === 'SABAH') {
        absentTimetable = absentTimetable.filter(e => e.period <= 5);
      } else if ((absence as any).absenceTime === 'OGLEDEN_SONRA') {
        absentTimetable = absentTimetable.filter(e => e.period > 5);
      }

      if (absentTimetable.length === 0) continue;

      for (const entry of absentTimetable) {
        const period = entry.period;

        // İptal (Boş Bırak) kontrolü
        const isEntryCancelled = existingCovers.some(
          c => c.absentStaffId === absence.staffId && c.period === period && c.isCancelled
        );
        if (isEntryCancelled) {
          // Bu saat iptal edilmiş/öğrenciler eve gönderilmiş, nöbetçi atanmayacak
          continue;
        }

        // Zaten nöbetçi atanmış mı kontrolü (kendisi de devamsız olmayan ve iptal edilmemiş bir atama)
        const isAlreadyCovered = existingCovers.some(
          c => c.absentStaffId === absence.staffId && c.period === period && !c.isCancelled && c.substituteStaffId
        );
        if (isAlreadyCovered) {
          // Zaten bir nöbetçi atanmış ve DB'ye kaydedilmişse bunu yeni öneri olarak getirme
        }

        let currentCoTeachers: any[] = [];
        // Eş öğretmen (Co-teaching) kontrolü
        if (entry.className) {
          const classKey = `${entry.className}_${entry.subject}_${period}`;
          
          if (coveredClasses.has(classKey)) {
            continue; // Bu sınıfa bu saatte zaten nöbetçi atandı
          }

          const coTeachers = allTimetableToday.filter(
            e => e.className === entry.className && e.subject === entry.subject && e.period === period
          );

          const presentTeachers = coTeachers.filter(
            c => c.staffId && !isStaffAbsentForPeriod(c.staffId, period)
          );

          if (presentTeachers.length > 0) {
            continue; // Derse girebilecek en az bir öğretmen var, nöbetçiye gerek yok
          }

          const absentCoTeachers = coTeachers.filter(
            c => c.staffId && c.staffId !== absence.staffId && isStaffAbsentForPeriod(c.staffId, period)
          );
          currentCoTeachers = absentCoTeachers.map(c => absences.find(a => a.staffId === c.staffId)?.staff).filter(Boolean);

          coveredClasses.add(classKey);
        }

        // Eğer öğretmenin kendi kaydında oda bilgisi yoksa, eş öğretmenlerin kayıtlarına (veya aynı sınıf/saat diğer kayıtlara) bak
        let finalRoom = entry.room;
        if (!finalRoom && entry.className) {
          const roomSource = allTimetableToday.find(
            e => e.className === entry.className && e.period === period && e.room
          );
          if (roomSource) {
            finalRoom = roomSource.room;
          }
        }

        // 🎯 Hedef Nöbet Yerini Belirleme (Derslik -> Nöbet Yeri Haritası)
        let targetStationId: string | null = null;
        if (finalRoom) {
          const cleanRoom = finalRoom.trim();
          const upperRoom = cleanRoom.toUpperCase();

          if (roomStationMap[cleanRoom]) {
            targetStationId = roomStationMap[cleanRoom];
          } else if (roomStationMap[upperRoom]) {
            targetStationId = roomStationMap[upperRoom];
          } else {
            // Çoklu oda desteği (örn. "A-02/D-01" ise parçalarına bak)
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
        const isTargetOutdoor = isOutdoorStation(targetStation?.name) || (finalRoom ? isOutdoorStation(finalRoom) : false);

        // Hedef kat seviyesi (önce eşleşen nöbet yerinden, yoksa derslik adından örn. "C-02" -> C -> 2)
        let targetFloor: number | null = getStationFloorLevel(targetStation?.name);
        if (targetFloor === null && finalRoom && !isTargetOutdoor) {
          targetFloor = getStationFloorLevel(finalRoom);
        }

        const candidates = dutyAssignments.map(assignment => {
          const staffId    = assignment.staffId;
          const hasClass   = onDutyTimetable.some(t => t.staffId === staffId && t.period === period);
          const coverCount = coverCountMap.get(staffId) || 0;
          const station    = assignment.station;

          const candidateFloor = getStationFloorLevel(station?.name);
          const isCandidateOutdoor = isOutdoorStation(station?.name);

          // 🎯 Kat/Nöbet Yeri Uyumu & Fiziksel Yakınlık Önceliği:
          // matchTier: 1 = Kat Nöbetçisi (Doğrudan aynı kat / nöbet yeri, mesafe 0) -> KESİN 1. ÖNCELİK!
          //            2 = En Yakın Kat (Komşu katlar: +1 veya -1 kat mesafe, örn. C Katı için B veya D Katı) -> 2. ÖNCELİK!
          //            3 = 2 Kat Mesafe (örn. C Katı için A Katı) -> 3. ÖNCELİK!
          //            4 = 3+ Kat Mesafe
          //            5 = Diğer Bina İçi Nöbet Yeri
          //            10 = Bahçe / Dış Alan Nöbetçisi (En son tercih)
          let matchTier = 5;
          let floorDistance: number | null = null;
          let isStationMatch = false;
          let proximityType: 'EXACT_FLOOR' | 'ADJACENT_FLOOR' | 'DISTANCE_2' | 'DISTANCE_FAR' | 'INDOOR_OTHER' | 'OUTDOOR' = 'INDOOR_OTHER';
          let proximityLabel = 'Bina İçi';

          if (targetStationId && assignment.stationId === targetStationId) {
            matchTier = 1;
            floorDistance = 0;
            isStationMatch = true;
            proximityType = 'EXACT_FLOOR';
            proximityLabel = '🎯 Kat Nöbetçisi';
          } else if (isTargetOutdoor) {
            if (isCandidateOutdoor) {
              matchTier = 1;
              floorDistance = 0;
              isStationMatch = true;
              proximityType = 'EXACT_FLOOR';
              proximityLabel = '🎯 Bahçe Nöbetçisi';
            } else {
              matchTier = 2;
              floorDistance = 1;
              proximityType = 'INDOOR_OTHER';
              proximityLabel = 'Bina İçi';
            }
          } else if (targetFloor !== null && candidateFloor !== null) {
            const diff = Math.abs(targetFloor - candidateFloor);
            floorDistance = diff;
            if (diff === 0) {
              matchTier = 1;
              isStationMatch = true;
              proximityType = 'EXACT_FLOOR';
              proximityLabel = '🎯 Kat Nöbetçisi';
            } else if (diff === 1) {
              // 📍 En Yakın Komşu Kat (örn. C katı için B veya D katı!)
              matchTier = 2;
              proximityType = 'ADJACENT_FLOOR';
              proximityLabel = '📍 En Yakın Kat (Komşu)';
            } else if (diff === 2) {
              matchTier = 3;
              proximityType = 'DISTANCE_2';
              proximityLabel = '2 Kat Mesafe';
            } else {
              matchTier = 4;
              proximityType = 'DISTANCE_FAR';
              proximityLabel = `${diff} Kat Mesafe`;
            }
          } else if (isCandidateOutdoor) {
            matchTier = 10;
            floorDistance = 99;
            proximityType = 'OUTDOOR';
            proximityLabel = '🌳 Bahçe Nöbetçisi';
          } else {
            matchTier = 5;
            floorDistance = 10;
            proximityType = 'INDOOR_OTHER';
            proximityLabel = 'Bina İçi';
          }

          let proximityBonus = 0;
          if (matchTier === 1) proximityBonus = 200;
          else if (matchTier === 2) proximityBonus = 100;
          else if (matchTier === 3) proximityBonus = 50;

          let isEligible    = true;
          let conflictReason = '';

          // Nöbetçi öğretmen de devamsız mı? Devamsızlık zamanı ile ders saatini karşılaştır
          const dutyAbsence = absences.find(a => a.staffId === staffId);
          if (dutyAbsence) {
            const absTime = (dutyAbsence as any).absenceTime || 'TAM_GUN';
            if (absTime === 'TAM_GUN') {
              isEligible     = false;
              conflictReason = 'Kendisi de izinli (Tam Gün)';
            } else if (absTime === 'SABAH' && period <= 5) {
              isEligible     = false;
              conflictReason = 'Kendisi de izinli (Sabah)';
            } else if (absTime === 'OGLEDEN_SONRA' && period > 5) {
              isEligible     = false;
              conflictReason = 'Kendisi de izinli (Öğleden Sonra)';
            }
          }

          if (rules?.maxCoversPerDay && coverCount >= rules.maxCoversPerDay) {
            isEligible     = false;
            conflictReason = 'Günlük max limit';
          }

          if (rules?.preventConsecutive && isEligible) {
            const hasCoverPrev = existingCovers.some(c => c.substituteStaffId === staffId && c.period === period - 1)
              || suggestions.some(s => s.substituteStaffId === staffId && s.period === period - 1);
            const hasCoverNext = existingCovers.some(c => c.substituteStaffId === staffId && c.period === period + 1)
              || suggestions.some(s => s.substituteStaffId === staffId && s.period === period + 1);
            if (hasCoverPrev || hasCoverNext) {
              isEligible     = false;
              conflictReason = 'Ardışık görev';
            }
          }

          const hasCoverThisPeriod =
            existingCovers.some(c => c.substituteStaffId === staffId && c.period === period)
            || suggestions.some(s => s.substituteStaffId === staffId && s.period === period);
          if (hasCoverThisPeriod) {
            isEligible     = false;
            conflictReason = 'Bu saatte dolu';
          }

          return {
            staff: assignment.staff,
            station: assignment.station,
            isFree: !hasClass,
            coverCount,
            matchTier,
            floorDistance,
            proximityType,
            proximityLabel,
            isStationMatch,
            effectiveScore: coverCount - proximityBonus,
            isEligible,
            conflictReason
          };
        });

        const eligibleCandidates = candidates.filter(c => c.isEligible);

        // A3: isVicePrincipal güçlendirildi — kısaltma varyantlarını da yakalar
        const isVicePrincipal = (title: string | null): boolean => {
          if (!title) return false;
          const norm = title.toLocaleLowerCase('tr-TR').replace(/[\s.]/g, '');
          return norm.includes('müdüryardımcısı')
            || norm.includes('müdüryrd')
            || norm.includes('myrd')
            || norm.includes('müdüryardımcı');
        };

        const teacherCandidates = eligibleCandidates.filter(c => !isVicePrincipal(c.staff.title));
        const vpCandidates      = eligibleCandidates.filter(c =>  isVicePrincipal(c.staff.title));

        // 🎯 Kademeli sıralama:
        // 1. matchTier (1 = Aynı Kat > 2 = En Yakın Komşu Kat [B/D] > 3 = 2 Kat Mesafe [A] > 4 = 3+ Kat > 5 = Bina İçi > 10 = Bahçe)
        // 2. coverCount (Aynı kademedeki nöbetçiler arasında daha az görev almış olan önce gelir - Adil Dağıtım)
        // 3. station sortOrder (Eşitlik durumunda stabilite)
        const sortCandidates = (a: any, b: any) => {
          if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
          if (a.coverCount !== b.coverCount) return a.coverCount - b.coverCount;
          return (a.station?.sortOrder || 0) - (b.station?.sortOrder || 0);
        };

        const freeTeachers  = teacherCandidates.filter(c =>  c.isFree).sort(sortCandidates);
        const freeVPs       = vpCandidates.filter(c =>       c.isFree).sort(sortCandidates);
        const busyTeachers  = teacherCandidates.filter(c => !c.isFree).sort(sortCandidates);
        const busyVPs       = vpCandidates.filter(c =>      !c.isFree).sort(sortCandidates);

        let selectedSubstitute: typeof candidates[0] | null = null;
        let isConflict = false;

        if      (freeTeachers.length > 0) { selectedSubstitute = freeTeachers[0]; }
        else if (freeVPs.length > 0)      { selectedSubstitute = freeVPs[0]; }
        else if (busyTeachers.length > 0) { selectedSubstitute = busyTeachers[0]; isConflict = true; }
        else if (busyVPs.length > 0)      { selectedSubstitute = busyVPs[0];      isConflict = true; }

        if (selectedSubstitute) {
          coverCountMap.set(selectedSubstitute.staff.id, selectedSubstitute.coverCount + 1);
        }

        suggestions.push({
          absenceId:        absence.id,
          absentStaff:      absence.staff,
          coAbsentStaffs:   currentCoTeachers,
          period:           entry.period,
          className:        entry.className,
          subject:          entry.subject,
          room:             finalRoom,
          isStationMatch:   selectedSubstitute?.isStationMatch || false,
          matchTier:        selectedSubstitute?.matchTier ?? null,
          floorDistance:    selectedSubstitute?.floorDistance ?? null,
          proximityType:    selectedSubstitute?.proximityType ?? null,
          proximityLabel:   selectedSubstitute?.proximityLabel ?? null,
          substituteStaffId: selectedSubstitute?.staff.id ?? null,
          availableDutyStaff: candidates.map(c => ({
            ...c.staff,
            isFree: c.isFree,
            coverCount: c.coverCount,
            isEligible: c.isEligible,
            conflictReason: c.conflictReason,
            matchTier: c.matchTier,
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
                isStationMatch: selectedSubstitute.isStationMatch || false,
                matchTier: selectedSubstitute.matchTier,
                floorDistance: selectedSubstitute.floorDistance,
                proximityType: selectedSubstitute.proximityType,
                proximityLabel: selectedSubstitute.proximityLabel,
              }
            : null
        });
      }
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
      if (!cover.substituteStaffId && !cover.isCancelled) continue;

      const key = `${cover.absentStaffId}|${cover.period}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        toUpdate.push({ id: existingId, substituteStaffId: cover.substituteStaffId, subject: cover.subject, room: cover.room, isCancelled: cover.isCancelled });
      } else {
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
