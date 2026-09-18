import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/utils/prisma', () => ({
  default: {
    staffAbsence: {
      findMany: vi.fn(),
    },
    dutyAssignment: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    timetable: {
      findFirst: vi.fn(),
    },
    timetableEntry: {
      findMany: vi.fn(),
    },
    coverAssignment: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../dutySchedule.service', () => ({
  dutyScheduleService: {
    _getWorkDays: vi.fn(),
  },
}));

import prisma from '../../shared/utils/prisma';
import { dutyScheduleService } from '../dutySchedule.service';
import { coverAssignmentService } from './coverAssignment.service';

describe('coverAssignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a warning and stops when no active timetable exists for the academic year', async () => {
    (dutyScheduleService._getWorkDays as any).mockReturnValue([
      { date: new Date(2026, 8, 18), weekNum: 1, dayOfWeek: 5 },
    ]);
    (prisma.staffAbsence.findMany as any).mockResolvedValue([
      { id: 'absence-1', staffId: 'staff-1', staff: { id: 'staff-1', name: 'Ayşe Yılmaz' } },
    ]);
    (prisma.dutyAssignment.findMany as any).mockResolvedValue([
      {
        id: 'duty-1',
        staffId: 'staff-2',
        staff: { id: 'staff-2', name: 'Mehmet Demir', title: 'Öğretmen' },
        station: { id: 'station-1', name: 'Nöbet Noktası' },
      },
    ]);
    (prisma.timetable.findFirst as any).mockResolvedValue(null);

    const result = await coverAssignmentService.suggestCovers('2026-09-18', '2025-2026');

    expect(result).toEqual({
      status: 'warning',
      message: 'Bu eğitim yılı için aktif ders programı bulunamadı.',
      suggestions: [],
    });
    expect(prisma.timetableEntry.findMany).not.toHaveBeenCalled();
    expect(prisma.coverAssignment.findMany).not.toHaveBeenCalled();
    expect(prisma.coverAssignment.groupBy).not.toHaveBeenCalled();
  });
});