import prisma from '../../shared/utils/prisma';
import { dutyScheduleService } from '../dutySchedule.service';

export class CoverAssignmentService {
  // ── Absences ──

  async getAbsencesForDate(date: Date, academicYear: string) {
    // Timezone-safe: normalize both sides to UTC midnight
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
    // Force UTC midnight to avoid timezone shifting (e.g. TR +3 shifting date back by 1 day)
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
    return prisma.staffAbsence.delete({ where: { id } });
  }

  // ── Cover Assignments ──

  async getCoversForDate(date: Date, academicYear: string) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay   = new Date(`${dateStr}T23:59:59.999Z`);
    return prisma.coverAssignment.findMany({
      where: { date: { gte: startOfDay, lte: endOfDay }, academicYear },
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

  async suggestCovers(dateStr: string, academicYear: string) {
    // UTC midnight to avoid timezone shifts
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    const year = Number(dateStr.split('-')[0]);
    const month = Number(dateStr.split('-')[1]);

    // 1. Günün iş günü meta verilerini bul
    const workDays = dutyScheduleService._getWorkDays(year, month);
    const workDay = workDays.find(d => d.date.getTime() === targetDate.getTime());

    if (!workDay) {
      return { status: 'warning', message: 'Seçilen tarih bir iş günü (Pzt-Cum) değil.', suggestions: [] };
    }

    const { weekNum, dayOfWeek } = workDay;

    // 2. O günkü devamsızlıkları bul
    const absences = await this.getAbsencesForDate(targetDate, academicYear);
    if (absences.length === 0) {
      return { status: 'info', message: 'Bu tarihte devamsız öğretmen yok.', suggestions: [] };
    }

    // 3. O gün nöbetçi öğretmenleri bul
    const dutyAssignments = await prisma.dutyAssignment.findMany({
      where: { academicYear, year, month, weekNumber: weekNum, dayOfWeek },
      include: { staff: { select: { id: true, name: true } }, station: true }
    });

    if (dutyAssignments.length === 0) {
      return { status: 'warning', message: 'Bu tarihte nöbetçi öğretmen ataması bulunamadı.', suggestions: [] };
    }

    const onDutyStaffIds = dutyAssignments.map(d => d.staffId);

    // 4. Aktif timetable bul (pasif programlar sonuçlara karışmasın)
    const activeTimetable = await prisma.timetable.findFirst({
      where: { isActive: true },
      select: { id: true }
    });

    const timetableFilter = activeTimetable
      ? { timetableId: activeTimetable.id }
      : {};

    // 5. Nöbetçi öğretmenlerin ders programını TEK sorguda çek (N+1 optimizasyonu)
    const onDutyTimetable = await prisma.timetableEntry.findMany({
      where: { staffId: { in: onDutyStaffIds }, dayOfWeek, ...timetableFilter }
    });

    // 6. Tüm devamsız öğretmenlerin ders programını TEK sorguda çek (N+1 optimizasyonu)
    const absentStaffIds = absences.map(a => a.staffId);
    const allAbsentTimetable = await prisma.timetableEntry.findMany({
      where: { staffId: { in: absentStaffIds }, dayOfWeek, ...timetableFilter },
      orderBy: { period: 'asc' }
    });

    // 7. Bugün için mevcut cover sayılarını bul (eşit dağıtım)
    const existingCovers = await prisma.coverAssignment.groupBy({
      by: ['substituteStaffId'],
      where: { date: targetDate, substituteStaffId: { in: onDutyStaffIds } },
      _count: { id: true }
    });

    const coverCountMap = new Map<string, number>();
    existingCovers.forEach(c => coverCountMap.set(c.substituteStaffId, c._count.id));

    const suggestions: any[] = [];

    // 8. Her devamsız öğretmenin derslerini dolaş
    for (const absence of absences) {
      const absentTimetable = allAbsentTimetable.filter(e => e.staffId === absence.staffId);
      if (absentTimetable.length === 0) continue;

      for (const entry of absentTimetable) {
        const period = entry.period;

        const candidates = dutyAssignments.map(assignment => {
          const hasClass = onDutyTimetable.some(
            t => t.staffId === assignment.staffId && t.period === period
          );
          const coverCount = coverCountMap.get(assignment.staffId) || 0;
          return {
            staff: assignment.staff,
            station: assignment.station,
            isFree: !hasClass,
            coverCount
          };
        });

        const freeCandidates = candidates
          .filter(c => c.isFree)
          .sort((a, b) => a.coverCount - b.coverCount);

        const busyCandidates = candidates
          .filter(c => !c.isFree)
          .sort((a, b) => a.coverCount - b.coverCount);

        let selectedSubstitute: typeof candidates[0] | null = null;
        let isConflict = false;

        if (freeCandidates.length > 0) {
          selectedSubstitute = freeCandidates[0];
          coverCountMap.set(selectedSubstitute.staff.id, selectedSubstitute.coverCount + 1);
        } else if (busyCandidates.length > 0) {
          selectedSubstitute = busyCandidates[0];
          isConflict = true;
          coverCountMap.set(selectedSubstitute.staff.id, selectedSubstitute.coverCount + 1);
        }

        suggestions.push({
          absenceId: absence.id,
          absentStaff: absence.staff,
          period: entry.period,
          className: entry.className,
          subject: entry.subject,
          substituteStaffId: selectedSubstitute?.staff.id ?? null,
          availableDutyStaff: candidates.map(c => ({ ...c.staff, isFree: c.isFree, coverCount: c.coverCount })),
          suggestedSubstitute: selectedSubstitute
            ? { staff: selectedSubstitute.staff, station: selectedSubstitute.station, isConflict }
            : null
        });
      }
    }

    return { status: 'success', suggestions };
  }

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
    // UTC midnight — matches how absences and covers are stored
    const targetDate = new Date(`${data.date}T00:00:00.000Z`);

    const saved = [];
    for (const cover of data.covers) {
      if (!cover.substituteStaffId) continue; // Atama yapılmamışsa atla

      // Çift kayıt koruması: önce mevcut kaydı kontrol et
      const existing = await prisma.coverAssignment.findFirst({
        where: {
          date: targetDate,
          absentStaffId: cover.absentStaffId,
          period: cover.period
        }
      });

      let record;
      if (existing) {
        // Güncelle
        record = await prisma.coverAssignment.update({
          where: { id: existing.id },
          data: {
            substituteStaffId: cover.substituteStaffId,
            subject: cover.subject
          }
        });
      } else {
        // Yeni oluştur
        record = await prisma.coverAssignment.create({
          data: {
            absenceId: cover.absenceId || null,
            absentStaffId: cover.absentStaffId,
            substituteStaffId: cover.substituteStaffId,
            date: targetDate,
            period: cover.period,
            className: cover.className,
            subject: cover.subject,
            academicYear: data.academicYear
          }
        });
      }
      saved.push(record);
    }
    return saved;
  }
}

export const coverAssignmentService = new CoverAssignmentService();
