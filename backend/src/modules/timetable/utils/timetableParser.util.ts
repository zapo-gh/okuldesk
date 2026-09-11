import * as XLSX from 'xlsx';

export interface ParsedTimetableEntry {
  dayOfWeek: number; // 1 = Pazartesi, ..., 5 = Cuma
  period: number;
  className: string;
  subject?: string;
}

export interface ParsedTeacherSchedule {
  teacherName: string;
  entries: ParsedTimetableEntry[];
}

const dayMapping: Record<string, number> = {
  'Pazartesi': 1,
  'Salı': 2,
  'Çarşamba': 3,
  'Perşembe': 4,
  'Cuma': 5
};

export const parseTimetableExcel = (buffer: Buffer): ParsedTeacherSchedule[] => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const teacherSchedules: ParsedTeacherSchedule[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: '',
      raw: false
    });

    const teacherBlocks = findTeacherBlocks(jsonData);

    teacherBlocks.forEach(block => {
      const teacherData = jsonData.slice(block.startRow, block.endRow);
      const entries = parseTeacherScheduleFromBlock(teacherData);
      
      if (entries.length > 0) {
        teacherSchedules.push({
          teacherName: block.name,
          entries
        });
      }
    });
  });

  return teacherSchedules;
};

function findTeacherBlocks(sheetData: any[][]): { name: string, startRow: number, endRow: number }[] {
  const blocks: { name: string, startRow: number, endRow: number }[] = [];

  for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
    const row = sheetData[rowIndex];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();
    if (/Adı\s*Soyadı/i.test(firstCell)) {
      const teacherName = findTeacherNameInColumn(row);
      
      if (teacherName && isValidTeacherName(teacherName)) {
        let endRow = rowIndex + 25; // Varsayılan bitiş

        for (let nextRowIndex = rowIndex + 1; nextRowIndex < sheetData.length; nextRowIndex++) {
          const nextRow = sheetData[nextRowIndex];
          if (!nextRow || nextRow.length === 0) continue;
          
          const nextFirstCell = String(nextRow[0] || '').trim();
          if (/Adı\s*Soyadı/i.test(nextFirstCell)) {
            endRow = nextRowIndex;
            break;
          }
        }

        blocks.push({ name: teacherName, startRow: rowIndex, endRow });
      }
    }
  }

  return blocks;
}

function findTeacherNameInColumn(row: any[]): string | null {
  if (row.length > 2) {
    let teacherName = String(row[2] || '').trim();
    teacherName = teacherName.replace(/^[:\s]+/, '').replace(/[:\s]+$/, '').trim();
    return teacherName;
  }
  return null;
}

function isValidTeacherName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 50) return false;
  
  const nonTeacherPatterns = [
    'GÜNLER', 'SAAT', 'DERS', 'PAZARTESI', 'SALI', 'CARSAMBA', 'PERSEMBE', 'CUMA',
    '...........', 'Table', 'Sheet', 'null', 'undefined'
  ];
  
  for (const pattern of nonTeacherPatterns) {
    if (name.toUpperCase().includes(pattern)) return false;
  }
  
  if (/^[0-9\s.-]+$/.test(name)) return false;
  if (!name.includes(' ')) return false;
  
  return true;
}

function parseTeacherScheduleFromBlock(teacherData: any[][]): ParsedTimetableEntry[] {
  const gunlerRowIndex = findGunlerRow(teacherData);
  if (gunlerRowIndex === -1) return [];

  const periodColumns = detectPeriodColumns(teacherData[gunlerRowIndex]);
  const entries: ParsedTimetableEntry[] = [];

  for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
    const rowIndex = gunlerRowIndex + dayOffset;
    if (rowIndex >= teacherData.length) continue;

    const dayRow = teacherData[rowIndex];
    if (!dayRow) continue;

    const dayName = String(dayRow[0] || '').trim();
    const dayOfWeek = dayMapping[dayName];
    
    if (!dayOfWeek) continue;

    Object.entries(periodColumns).forEach(([periodStr, colIndex]) => {
      const periodNum = parseInt(periodStr, 10);
      const col = Number(colIndex);
      
      if (col < dayRow.length) {
        const cellText = String(dayRow[col] || '').trim();
        if (!isEmptyOrFree(cellText)) {
          const parsed = extractClassAndSubjectFromCell(cellText);
          if (parsed) {
            entries.push({
              dayOfWeek,
              period: periodNum,
              className: parsed.className,
              subject: parsed.subject
            });
          }
        }
      }
    });
  }

  return entries;
}

function findGunlerRow(teacherData: any[][]): number {
  for (let i = 0; i < teacherData.length; i++) {
    const row = teacherData[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = String(row[0] || '').trim().toUpperCase();
    if (firstCell.includes('GÜNLER') || firstCell.includes('GUNLER')) {
      return i;
    }
  }
  return -1;
}

function detectPeriodColumns(headerRow: any[]): Record<number, number> {
  const mapping: Record<number, number> = {};
  if (!Array.isArray(headerRow)) return mapping;

  for (let col = 0; col < headerRow.length; col++) {
    const raw = headerRow[col];
    if (raw == null) continue;
    const text = String(raw).replace(/\n/g, ' ').trim();
    const m = text.match(/^\((\d{1,2})\)/);
    if (m) {
      const periodNum = parseInt(m[1], 10);
      if (periodNum >= 1 && periodNum <= 12 && mapping[periodNum] == null) {
        mapping[periodNum] = col;
      }
    }
  }
  
  if (Object.keys(mapping).length === 0) {
    // Fallback default format if "(1)" headers are missing
    return { 1: 2, 2: 6, 3: 12, 4: 14, 5: 15, 6: 18, 7: 20, 8: 22, 9: 24, 10: 25 };
  }
  return mapping;
}

function extractClassAndSubjectFromCell(cell: string): { className: string; subject?: string } | null {
  if (!cell) return null;
  const text = String(cell).replace(/\s+/g, ' ').trim();
  
  // Sınıf kodunu bul (ör: 9-A, 10 B, 11-C)
  const classMatch = text.match(/\b(\d{1,2})[-\s]?([A-ZÇĞİÖŞÜa-zçğışöü])\b/i);
  if (!classMatch) {
    // Sınıf kodu bulunamazsa ham metni kırparak döndür (özel durum)
    const trimmed = text.toUpperCase();
    return trimmed.length > 0 ? { className: trimmed.substring(0, 10) } : null;
  }

  const className = `${classMatch[1]}-${classMatch[2].toUpperCase()}`;

  // Sınıf kodundan önce gelen metni subject olarak al
  const classIndex = text.toUpperCase().indexOf(classMatch[0].toUpperCase());
  const subjectRaw = classIndex > 0
    ? text.substring(0, classIndex).replace(/[:\-,]+$/, '').trim()
    : '';

  const subject = subjectRaw.length > 1
    ? subjectRaw.toUpperCase().substring(0, 30)
    : undefined;

  return { className, subject };
}

function isEmptyOrFree(cellValue: string): boolean {
  if (cellValue === null || cellValue === undefined || cellValue === '') return true;
  const text = String(cellValue).trim().toUpperCase();
  if (text.length === 0) return true;
  if (['BOŞ', 'BOS', '-', 'SERBEST', 'FREE'].includes(text)) return true;
  return false;
}
