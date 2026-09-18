import prisma from '../../shared/utils/prisma';
import { dutyScheduleService } from '../dutySchedule.service';

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
  }) {
    const startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    const endDate   = new Date(`${data.endDate}T00:00:00.000Z`);
    return prisma.staffAbsence.create({
      data: {
        staffId: data.staffId,
        academicYear: data.academicYear,
        startDate,
        endDate,
        reason: data.reason
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
    return prisma.coverAssignment.findMany({
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
  }

  async deleteCover(id: string) {
    return prisma.coverAssignment.delete({ where: { id } });
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

    // 1. İş günü kontrolü
    const workDays = dutyScheduleService._getWorkDays(year, month);
    const workDay  = workDays.find(d => d.date.getTime() === targetDateLocal.getTime());
    if (!workDay) {
      return { status: 'warning', message: 'Seçilen tarih bir iş günü (Pzt-Cum) değil.', suggestions: [] };
    }

    const { weekNum, dayOfWeek } = workDay;

    // 2. Devamsızlıklar
    const absences = await this.getAbsencesForDate(targetDateUTC, academicYear);
    if (absences.length === 0) {
      return { status: 'info', message: 'Bu tarihte devamsız öğretmen yok.', suggestions: [] };
    }

    // 3. Nöbetçi atamalar
    const dutyAssignments = await prisma.dutyAssignment.findMany({
      where: { academicYear, year, month, weekNumber: weekNum, dayOfWeek },
      include: { staff: { select: { id: true, name: true, title: true } }, station: true }
    });
    if (dutyAssignments.length === 0) {
      return { status: 'warning', message: 'Bu tarihte nöbetçi öğretmen ataması bulunamadı.', suggestions: [] };
    }

    const onDutyStaffIds = dutyAssignments.map(d => d.staffId);

    // A1: academicYear filtresi eklendi — yanlış öğretim yılının programından ders kontrolü yapılmasın
    const activeTimetable = await prisma.timetable.findFirst({
      where: { isActive: true, academicYear },
      select: { id: true }
    });

    if (!activeTimetable) {
      return { status: 'warning', message: 'Bu eğitim yılı için aktif ders programı bulunamadı.', suggestions: [] };
    }

    const timetableFilter = activeTimetable ? { timetableId: activeTimetable.id } : {};

    // 5. Nöbetçilerin ders programı (N+1 safe — tek sorgu)
    const onDutyTimetable = await prisma.timetableEntry.findMany({
      where: { staffId: { in: onDutyStaffIds }, dayOfWeek, ...timetableFilter }
    });

    // 6. Devamsız öğretmenlerin ders programı (N+1 safe — tek sorgu)
    const absentStaffIds = absences.map(a => a.staffId);
    const allAbsentTimetable = await prisma.timetableEntry.findMany({
      where: { staffId: { in: absentStaffIds }, dayOfWeek, ...timetableFilter },
      orderBy: { period: 'asc' }
    });

    // 7. Mevcut covers
    const existingCovers = await prisma.coverAssignment.findMany({
      where: { date: targetDateUTC, substituteStaffId: { in: onDutyStaffIds } },
      select: { id: true, substituteStaffId: true, period: true }
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
      coverCountMap.set(hc.substituteStaffId, hc._count.substituteStaffId);
    });

    const suggestions: any[] = [];

    for (const absence of absences) {
      const absentTimetable = allAbsentTimetable.filter(e => e.staffId === absence.staffId);
      if (absentTimetable.length === 0) continue;

      for (const entry of absentTimetable) {
        const period = entry.period;

        const candidates = dutyAssignments.map(assignment => {
          const staffId    = assignment.staffId;
          const hasClass   = onDutyTimetable.some(t => t.staffId === staffId && t.period === period);
          const coverCount = coverCountMap.get(staffId) || 0;

          let isEligible    = true;
          let conflictReason = '';

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

        const freeTeachers  = teacherCandidates.filter(c =>  c.isFree).sort((a, b) => a.coverCount - b.coverCount);
        const freeVPs       = vpCandidates.filter(c =>       c.isFree).sort((a, b) => a.coverCount - b.coverCount);
        const busyTeachers  = teacherCandidates.filter(c => !c.isFree).sort((a, b) => a.coverCount - b.coverCount);
        const busyVPs       = vpCandidates.filter(c =>      !c.isFree).sort((a, b) => a.coverCount - b.coverCount);

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
          period:           entry.period,
          className:        entry.className,
          subject:          entry.subject,
          substituteStaffId: selectedSubstitute?.staff.id ?? null,
          availableDutyStaff: candidates.map(c => ({
            ...c.staff,
            isFree: c.isFree,
            coverCount: c.coverCount,
            isEligible: c.isEligible,
            conflictReason: c.conflictReason
          })),
          suggestedSubstitute: selectedSubstitute
            ? { staff: selectedSubstitute.staff, station: selectedSubstitute.station, isConflict }
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
      substituteStaffId: string;
      period: number;
      className: string;
      subject?: string;
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
    const toUpdate: { id: string; substituteStaffId: string; subject?: string }[] = [];

    for (const cover of data.covers) {
      if (!cover.substituteStaffId) continue;

      const key = `${cover.absentStaffId}|${cover.period}`;
      const existingId = existingMap.get(key);

      if (existingId) {
        toUpdate.push({ id: existingId, substituteStaffId: cover.substituteStaffId, subject: cover.subject });
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
          data: { substituteStaffId: u.substituteStaffId, subject: u.subject }
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
            academicYear:      data.academicYear
          }))
        });
      }
    });

    return { updated: toUpdate.length, created: toCreate.length };
  }
}

export const coverAssignmentService = new CoverAssignmentService();
