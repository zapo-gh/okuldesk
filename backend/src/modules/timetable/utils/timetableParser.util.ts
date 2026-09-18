import * as XLSX from 'xlsx';

export interface ParsedTimetableEntry {
  dayOfWeek: number; // 1 = Pazartesi, ..., 5 = Cuma
  period: number;
  className: string;
  subject?: string;
  room?: string;
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

  if (teacherSchedules.length === 0) {
    throw new Error(
      'Excel dosyasından hiçbir öğretmen ders programı okunamadı. ' +
      'Dosyanın Yabil çıktı formatında (.xlsx) olduğundan ve "Adı Soyadı" ' +
      'başlıklarını içerdiğinden emin olun.'
    );
  }

  return teacherSchedules;
};

function findTeacherBlocks(sheetData: any[][]): { name: string, startRow: number, endRow: number }[] {
  const blocks: { name: string, startRow: number, endRow: number }[] = [];

  for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
    const row = sheetData[rowIndex];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();
    if (/Adı\s*Soyadı/i.test(firstCell)) {
      const teacherName = findTeacherNameInRow(row);
      
      if (teacherName && isValidTeacherName(teacherName)) {
        // endRow: bir sonraki "Adı Soyadı" satırına kadar veya dosya sonu
        let endRow = sheetData.length; // Dinamik: varsayılan dosya sonu

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

/**
 * Öğretmen adını satırın birden fazla sütununda arar.
 * Önce index 2 (standart Yabil formatı), bulamazsa 3 ve 4'e bakar.
 */
function findTeacherNameInRow(row: any[]): string | null {
  const candidateIndices = [2, 3, 4, 1];

  for (const idx of candidateIndices) {
    if (idx < row.length) {
      let candidate = String(row[idx] || '').trim();
      candidate = candidate.replace(/^[:\s]+/, '').replace(/[:\s]+$/, '').trim();
      if (candidate && candidate.length >= 2) {
        return candidate;
      }
    }
  }
  return null;
}

function isValidTeacherName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 60) return false;
  
  const nonTeacherPatterns = [
    'GÜNLER', 'SAAT', 'DERS', 'PAZARTESI', 'SALI', 'CARSAMBA', 'PERSEMBE', 'CUMA',
    '...........', 'Table', 'Sheet', 'null', 'undefined'
  ];
  
  for (const pattern of nonTeacherPatterns) {
    if (name.toUpperCase().includes(pattern.toUpperCase())) return false;
  }
  
  // Sadece rakam, boşluk ve nokta içeriyorsa isim değildir
  if (/^[0-9\s.-]+$/.test(name)) return false;
  
  // NOT: Tek kelimeli isimler (örn. "Zeynep") artık geçerlidir — boşluk zorunluluğu kaldırıldı
  
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
          const parsed = extractClassSubjectAndRoomFromCell(cellText);
          if (parsed) {
            entries.push({
              dayOfWeek,
              period: periodNum,
              className: parsed.className,
              subject: parsed.subject,
              room: parsed.room
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
    
    // Desteklenen formatlar: "(1)", "1.Ders", "1. Ders", "1.DERS"
    const m = text.match(/^(?:\()?(\d{1,2})(?:\)|\.Ders|\. Ders)/i);
    if (m) {
      const periodNum = parseInt(m[1], 10);
      if (periodNum >= 1 && periodNum <= 12 && mapping[periodNum] == null) {
        mapping[periodNum] = col;
      }
    }
  }
  
  if (Object.keys(mapping).length === 0) {
    // Fallback: Standart Yabil sütun haritası
    return { 1: 2, 2: 6, 3: 12, 4: 14, 5: 15, 6: 18, 7: 20, 8: 22, 9: 24, 10: 25 };
  }
  return mapping;
}

/**
 * Hücre metninden sınıf, ders ve oda bilgilerini çıkarır.
 * Format: "SINIF DERSKODU" veya "SINIF DERSKODU (ODA)"
 */
function extractClassSubjectAndRoomFromCell(cell: string): { className: string; subject?: string; room?: string } | null {
  if (!cell) return null;

  // Oda bilgisini parantez içinden çıkar: örn. "ATP10A FELSEFE (101)"
  let room: string | undefined;
  const roomMatch = cell.match(/\(([^)]+)\)/g);
  if (roomMatch) {
    // Son parantezli ifadeyi oda olarak kabul et; oda gibi görünüyorsa (kısa, rakam/harf karışımı)
    const lastParenContent = roomMatch[roomMatch.length - 1].replace(/[()]/g, '').trim();
    if (/^[A-Za-z0-9\s\-\.]+$/.test(lastParenContent) && lastParenContent.length <= 20) {
      room = lastParenContent;
    }
  }

  // Parantez içlerini ve saat aralıklarını temizle
  let cleanText = String(cell)
    .replace(/\([^)]+\)/g, '')
    .replace(/\b\d{2}:\d{2}-\d{2}:\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanText.length === 0) return null;

  const parts = cleanText.split(' ');
  
  if (parts.length === 1) {
    return { className: parts[0].toUpperCase(), room };
  }

  // Son parçayı subject (ders kodu), geri kalanları sınıf olarak kabul et
  const subject = parts.pop()?.toUpperCase() || '';
  const className = parts.join(' ').toUpperCase();

  return { className, subject, room };
}

function isEmptyOrFree(cellValue: string): boolean {
  if (cellValue === null || cellValue === undefined || cellValue === '') return true;
  const text = String(cellValue).trim().toUpperCase();
  if (text.length === 0) return true;
  if (['BOŞ', 'BOS', '-', 'SERBEST', 'FREE', '---'].includes(text)) return true;
  return false;
}
