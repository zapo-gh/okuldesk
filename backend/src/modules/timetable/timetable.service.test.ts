import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../shared/utils/prisma', () => ({
  default: {
    timetable: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    timetableEntry: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    staff: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (input: unknown) => {
      if (typeof input === 'function') {
        return input({
          timetable: {
            updateMany: vi.fn(),
            create: vi.fn(),
          },
          timetableEntry: {
            createMany: vi.fn(),
          },
          staff: {
            create: vi.fn(),
          },
        });
      }
      return Promise.all(input as Promise<unknown>[]);
    }),
  },
}));

vi.mock('./utils/timetableParser.util', () => ({
  parseTimetableExcel: vi.fn(),
}));

import prisma from '../shared/utils/prisma';
import { timetableService } from './timetable.service';
import { parseTimetableExcel } from './utils/timetableParser.util';

describe('timetableService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTeacherTimetables', () => {
    it('returns a staffId keyed map with empty arrays for teachers without entries', async () => {
      (prisma.timetable.findFirst as any).mockResolvedValue({ id: 'tt-active' });
      (prisma.timetableEntry.findMany as any).mockResolvedValue([
        {
          id: 'entry-1',
          timetableId: 'tt-active',
          staffId: 'staff-1',
          className: '10-A',
          dayOfWeek: 1,
          period: 1,
          subject: 'MAT',
          room: '101',
          staff: { id: 'staff-1', name: 'Ayşe Yılmaz' },
        },
      ]);

      const result = await timetableService.getTeacherTimetables(['staff-1', 'staff-2'], '2025-2026');

      expect(prisma.timetable.findFirst).toHaveBeenCalledWith({ where: { isActive: true, academicYear: '2025-2026' } });
      expect(prisma.timetableEntry.findMany).toHaveBeenCalledWith({
        where: { timetableId: 'tt-active', staffId: { in: ['staff-1', 'staff-2'] } },
        include: { staff: true },
        orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
      });
      expect(result).toEqual({
        'staff-1': [
          {
            id: 'entry-1',
            timetableId: 'tt-active',
            staffId: 'staff-1',
            className: '10-A',
            dayOfWeek: 1,
            period: 1,
            subject: 'MAT',
            room: '101',
            staff: { id: 'staff-1', name: 'Ayşe Yılmaz' },
          },
        ],
        'staff-2': [],
      });
    });
  });

  describe('setActiveTimetable', () => {
    it('rejects activation when the timetable does not exist', async () => {
      (prisma.timetable.findUnique as any).mockResolvedValue(null);

      await expect(timetableService.setActiveTimetable('missing', '2025-2026')).rejects.toThrow(/bulunamadı/i);
    });

    it('rejects activation when the timetable academic year does not match', async () => {
      (prisma.timetable.findUnique as any).mockResolvedValue({ id: 'tt-1', academicYear: '2024-2025' });

      await expect(timetableService.setActiveTimetable('tt-1', '2025-2026')).rejects.toThrow(/eğitim yılına ait değil/i);
    });

    it('deactivates the current year and activates the selected timetable on match', async () => {
      (prisma.timetable.findUnique as any).mockResolvedValue({ id: 'tt-1', academicYear: '2025-2026' });
      (prisma.timetable.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.timetable.update as any).mockResolvedValue({ id: 'tt-1', isActive: true });

      await timetableService.setActiveTimetable('tt-1', '2025-2026');

      expect(prisma.timetable.updateMany).toHaveBeenCalledWith({
        where: { academicYear: '2025-2026', isActive: true },
        data: { isActive: false },
      });
      expect(prisma.timetable.update).toHaveBeenCalledWith({
        where: { id: 'tt-1' },
        data: { isActive: true },
      });
    });
  });

  describe('uploadTimetable', () => {
    it('creates warnings and placeholder staff records for unmatched teachers', async () => {
      (parseTimetableExcel as any).mockReturnValue([
        {
          teacherName: 'Ayşe Yılmaz',
          entries: [{ dayOfWeek: 1, period: 1, className: '10-A', subject: 'MAT', room: '101' }],
        },
        {
          teacherName: 'Yeni Öğretmen',
          entries: [{ dayOfWeek: 2, period: 3, className: '11-B', subject: 'FIZ', room: null }],
        },
      ]);

      (prisma.staff.findMany as any).mockResolvedValue([{ id: 'staff-1', name: 'Ayşe Yılmaz' }]);

      const tx = {
        timetable: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          create: vi.fn().mockResolvedValue({ id: 'tt-new' }),
        },
        timetableEntry: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        staff: {
          create: vi.fn().mockResolvedValue({ id: 'staff-new' }),
        },
      };

      (prisma.$transaction as any).mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));

      const result = await timetableService.uploadTimetable(Buffer.from('test'), '2025-2026', '2025-2026 Ders Programı');

      expect(tx.timetable.updateMany).toHaveBeenCalledWith({
        where: { academicYear: '2025-2026', isActive: true },
        data: { isActive: false },
      });
      expect(tx.timetable.create).toHaveBeenCalledWith({
        data: { academicYear: '2025-2026', name: '2025-2026 Ders Programı', isActive: true },
      });
      expect(tx.staff.create).toHaveBeenCalledWith({
        data: {
          name: 'Yeni Öğretmen',
          title: 'Öğretmen',
          gorev: 'Görevlendirme Öğretmen',
        },
      });
      expect(tx.timetableEntry.createMany).toHaveBeenCalledWith({
        data: [
          {
            timetableId: 'tt-new',
            staffId: 'staff-1',
            className: '10-A',
            dayOfWeek: 1,
            period: 1,
            subject: 'MAT',
            room: '101',
          },
          {
            timetableId: 'tt-new',
            staffId: 'staff-new',
            className: '11-B',
            dayOfWeek: 2,
            period: 3,
            subject: 'FIZ',
            room: null,
          },
        ],
      });
      expect(result).toMatchObject({
        timetableId: 'tt-new',
        totalTeachersFoundInExcel: 2,
        totalEntriesCreated: 2,
      });
      expect(result.warnings).toEqual([
        expect.stringMatching(/sistemde eşleşmeyen öğretmen: yeni öğretmen/i),
      ]);
    });
  });
});