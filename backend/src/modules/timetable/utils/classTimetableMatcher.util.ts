import * as XLSX from 'xlsx';
import stringSimilarity from 'string-similarity';
// import { TimetableEntry } from '@prisma/client';
// Use any for now or define a custom type

export interface ClassScheduleEntry {
  dayOfWeek: number;
  period: number;
  subject: string;
  room?: string;
}

export interface AnonymousClassSchedule {
  blockIndex: number;
  className?: string;
  entries: ClassScheduleEntry[];
}

export interface MatchResult {
  className: string;
  score: number;
  updatedEntries: number;
}

const dayMap: Record<string, number> = {
  'Pazartesi': 1,
  'Salı': 2,
  'Çarşamba': 3,
  'Perşembe': 4,
  'Cuma': 5
};

export const parseClassTimetableExcel = (buffer: Buffer): AnonymousClassSchedule[] => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  const blocks: { className?: string, rows: any[][] }[] = [];
  let currentBlock: any[][] | null = null;
  let lastFoundClassName = '';

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Dersler\nGünler gördüysek, üst satırlara bakıp sınıf adını bulalım
    if (row[0] && typeof row[0] === 'string' && row[0].includes('Dersler\nGünler')) {
      lastFoundClassName = '';
      for (let j = 1; j <= 4; j++) {
        if (i - j >= 0) {
          const prevRow = data[i - j];
          const text = (prevRow[0] || prevRow[1] || '').toString().trim();
          // Eğer uzun bir metin değilse ve Okul ismi değilse sınıf adıdır
          if (text && text.length > 1 && text.length < 40 && !text.toLowerCase().includes('lisesi') && !text.toLowerCase().includes('okulu')) {
             lastFoundClassName = text.replace(/Sınıf\s*[:\-]?\s*/i, '').trim();
             break;
          }
        }
      }

      currentBlock = [row];
      blocks.push({ className: lastFoundClassName, rows: currentBlock });
    } else if (currentBlock) {
      if (row.length === 0 || row[0] === 'Sr') {
        currentBlock = null;
      } else {
        currentBlock.push(row);
      }
    }
  }

  const anonymousSchedules: AnonymousClassSchedule[] = [];

  blocks.forEach((blockObj, index) => {
    const block = blockObj.rows;
    const headerRow = block[0];
    const periodCols: Record<number, number> = {};

    for (let col = 0; col < headerRow.length; col++) {
      if (headerRow[col] && typeof headerRow[col] === 'string') {
        const match = headerRow[col].match(/^(\d+)\.Ders/);
        if (match) {
          periodCols[col] = parseInt(match[1], 10);
        }
      }
    }

    const entries: ClassScheduleEntry[] = [];

    for (let i = 1; i < block.length; i++) {
      const row = block[i];
      const dayName = row[0];
      const dayOfWeek = dayMap[dayName];
      if (!dayOfWeek) continue;

      for (let col = 1; col < row.length; col++) {
        const periodNum = periodCols[col];
        if (periodNum && row[col]) {
          const cellText = row[col];
          const parsed = parseClassScheduleCell(cellText);
          if (parsed && parsed.subject) {
            entries.push({
              dayOfWeek,
              period: periodNum,
              subject: parsed.subject,
              room: parsed.room
            });
          }
        }
      }
    }

    if (entries.length > 0) {
      anonymousSchedules.push({ blockIndex: index, className: blockObj.className, entries });
    }
  });

  return anonymousSchedules;
};

function parseClassScheduleCell(cell: string): { subject: string; room?: string } | null {
  if (!cell) return null;

  let cleanText = String(cell)
    .replace(/\b\d{2}:\d{2}-\d{2}:\d{2}\b/g, '') // Saati sil
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanText.length === 0) return null;

  const subject = cleanText.split(/[\s\n]+/)[0].toUpperCase();
  let room: string | undefined;

  // 1. Parantez içindeki dersliği bul
  const roomMatch = cell.match(/\(([^)]+)\)/g);
  if (roomMatch) {
    const lastParenContent = roomMatch[roomMatch.length - 1].replace(/[()]/g, '').trim();
    if (/^[A-Za-z0-9\s\-\.\/]+$/.test(lastParenContent) && lastParenContent.length <= 30) {
      room = lastParenContent;
    }
  }

  cleanText = cleanText.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();

  // 2. Parantez yoksa metnin son kelimesine bak
  if (!room) {
    const parts = cleanText.split(' ');
    const lastWord = parts[parts.length - 1].toUpperCase();
    const lastTwoWords = parts.length > 1 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}`.toUpperCase() : lastWord;

    if (
      lastWord.match(/^[A-Z]-\d{2}$/i) || 
      lastWord.match(/^Z-\d{2}$/i) ||
      lastWord.match(/^\d{3}$/) ||
      lastTwoWords.includes('LAB') ||
      lastTwoWords.includes('ATÖLYE') ||
      lastTwoWords.includes('DERSLİK') ||
      lastWord.includes('/')
    ) {
      room = lastTwoWords.includes('LAB') || lastTwoWords.includes('ATÖLYE') || lastTwoWords.includes('DERSLİK') 
        ? lastTwoWords 
        : lastWord;
    }
  }

  return { subject, room };
}

export const matchAndAssignRooms = (
  anonymousSchedules: AnonymousClassSchedule[],
  dbEntries: any[]
): Record<string, string> => {
  const dbClasses: Record<string, any[]> = {};
  dbEntries.forEach(entry => {
    if (!dbClasses[entry.className]) dbClasses[entry.className] = [];
    dbClasses[entry.className].push(entry);
  });

  const entryUpdates: Record<string, string> = {}; 

  anonymousSchedules.forEach(anon => {
    let bestMatchClass = '';
    
    // Önce doğrudan sınıf adı ile eşleştirmeyi dene (En güvenilir yöntem)
    if (anon.className) {
      const anonClassClean = anon.className.toUpperCase().replace(/\s+/g, '');
      let highestNameSim = 0;
      
      Object.keys(dbClasses).forEach(dbClassName => {
        const dbClassClean = dbClassName.toUpperCase().replace(/\s+/g, '');
        const sim = stringSimilarity.compareTwoStrings(anonClassClean, dbClassClean);
        if (sim > highestNameSim) {
          highestNameSim = sim;
          if (sim > 0.6 || dbClassClean.includes(anonClassClean) || anonClassClean.includes(dbClassClean)) {
            bestMatchClass = dbClassName;
          }
        }
      });
    }

    // Eğer sınıf adından eşleşemediyse ders programından tahmin et (Fallback)
    if (!bestMatchClass) {
      let bestScore = 0;
      Object.entries(dbClasses).forEach(([className, classEntries]) => {
        let matches = 0;
        let total = anon.entries.length;

        anon.entries.forEach(anonEntry => {
          const dbEntry = classEntries.find(e => 
            e.dayOfWeek === anonEntry.dayOfWeek && 
            e.period === anonEntry.period
          );
          
          if (dbEntry) {
            const dbSubj = (dbEntry.subject || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const anonSubj = anonEntry.subject.toUpperCase().replace(/[^A-Z0-9]/g, '');
            
            if (dbSubj && anonSubj) {
              const similarity = stringSimilarity.compareTwoStrings(dbSubj, anonSubj);
              if (similarity > 0.3 || dbSubj.includes(anonSubj) || anonSubj.includes(dbSubj)) {
                matches++;
              }
            }
          }
        });

        const score = total > 0 ? matches / total : 0;
        if (score > bestScore) {
          bestScore = score;
          bestMatchClass = className;
        }
      });
      
      if (bestScore < 0.3) {
        bestMatchClass = ''; // Çok düşük skorsa güvenme
      }
    }

    if (bestMatchClass) {
      const classEntries = dbClasses[bestMatchClass];
      
      anon.entries.forEach(anonEntry => {
        if (anonEntry.room) {
          const dbEntriesToUpdate = classEntries.filter(e => 
            e.dayOfWeek === anonEntry.dayOfWeek && 
            e.period === anonEntry.period
          );
          
          dbEntriesToUpdate.forEach(entry => {
            entryUpdates[entry.id] = anonEntry.room!;
          });
        }
      });
    }
  });

  return entryUpdates;
};
