import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseTimetableExcel } from './timetableParser.util';

function workbookBuffer(sheetRows: any[][], sheetName = 'Program'): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function buildTeacherBlock(teacherName: string, nameColumn = 2, headerRow?: any[], dayRows?: Record<string, Record<number, string>>) {
  const teacherRow = ['Adı Soyadı'];
  teacherRow[nameColumn] = teacherName;

  const header = headerRow ?? ['GÜNLER', '', '1. Ders', '', '2. Ders'];
  const rows = [teacherRow, [], header];
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

  for (const day of days) {
    const row: any[] = [day];
    const cells = dayRows?.[day] ?? {};
    for (const [column, value] of Object.entries(cells)) {
      row[Number(column)] = value;
    }
    rows.push(row);
  }

  return rows;
}

describe('timetableParser', () => {
  it('parses a standard teacher block with subject and room', () => {
    const buffer = workbookBuffer(
      buildTeacherBlock('Ayşe Yılmaz', 2, ['GÜNLER', '', '1. Ders', '', '2. Ders'], {
        Pazartesi: { 2: '10-A MAT (101)', 4: '10-B FIZ' },
        Salı: { 2: '10-C KIM (LAB-1)' },
      }),
    );

    const schedules = parseTimetableExcel(buffer);

    expect(schedules).toHaveLength(1);
    expect(schedules[0]).toMatchObject({ teacherName: 'Ayşe Yılmaz' });
    expect(schedules[0].entries).toEqual([
      { dayOfWeek: 1, period: 1, className: '10-A', subject: 'MAT', room: '101' },
      { dayOfWeek: 1, period: 2, className: '10-B', subject: 'FIZ', room: undefined },
      { dayOfWeek: 2, period: 1, className: '10-C', subject: 'KIM', room: 'LAB-1' },
    ]);
  });

  it('parses multiple teacher blocks from the same sheet', () => {
    const rows = [
      ...buildTeacherBlock('Ayşe Yılmaz', 2, ['GÜNLER', '', '1. Ders'], {
        Pazartesi: { 2: '10-A MAT' },
      }),
      [],
      ...buildTeacherBlock('Mehmet Demir', 2, ['GÜNLER', '', '1. Ders'], {
        Salı: { 2: '11-A BIO' },
      }),
    ];

    const schedules = parseTimetableExcel(workbookBuffer(rows));

    expect(schedules).toHaveLength(2);
    expect(schedules.map((schedule) => schedule.teacherName)).toEqual(['Ayşe Yılmaz', 'Mehmet Demir']);
  });

  it('accepts teacher names from alternate columns and single-word names', () => {
    const buffer = workbookBuffer(
      buildTeacherBlock('Zeynep', 3, ['GÜNLER', '', '1. Ders'], {
        Çarşamba: { 2: '9-A TAR' },
      }),
    );

    const schedules = parseTimetableExcel(buffer);

    expect(schedules).toHaveLength(1);
    expect(schedules[0].teacherName).toBe('Zeynep');
    expect(schedules[0].entries[0]).toMatchObject({ dayOfWeek: 3, period: 1, className: '9-A', subject: 'TAR' });
  });

  it('ignores empty and free cells', () => {
    const buffer = workbookBuffer(
      buildTeacherBlock('Fatma Kaya', 2, ['GÜNLER', '', '1. Ders', '', '2. Ders', '', '3. Ders'], {
        Pazartesi: { 2: 'BOŞ', 4: '-', 6: 'SERBEST' },
        Salı: { 2: '10-A MAT' },
      }),
    );

    const schedules = parseTimetableExcel(buffer);

    expect(schedules[0].entries).toEqual([
      { dayOfWeek: 2, period: 1, className: '10-A', subject: 'MAT', room: undefined },
    ]);
  });

  it('falls back to the default Yabil column mapping when headers are not detectable', () => {
    const header = ['GÜNLER', '', 'A', '', '', '', 'B'];
    const buffer = workbookBuffer(
      buildTeacherBlock('Ahmet Can', 2, header, {
        Pazartesi: { 2: '12-A GEO', 6: '12-B FEL (202)' },
      }),
    );

    const schedules = parseTimetableExcel(buffer);

    expect(schedules[0].entries).toEqual([
      { dayOfWeek: 1, period: 1, className: '12-A', subject: 'GEO', room: undefined },
      { dayOfWeek: 1, period: 2, className: '12-B', subject: 'FEL', room: '202' },
    ]);
  });

  it('throws a clear error when no teacher schedules can be parsed', () => {
    const buffer = workbookBuffer([
      ['Rastgele Başlık'],
      ['Veri Yok'],
    ]);

    expect(() => parseTimetableExcel(buffer)).toThrow(/hiçbir öğretmen ders programı okunamadı/i);
  });
});