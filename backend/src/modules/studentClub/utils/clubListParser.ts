import stringSimilarity from 'string-similarity';
import prisma from '../../shared/utils/prisma';
const pdfParse = require('pdf-parse');

export interface ParsedClubEntry {
  rawName: string;
  matchedStaffId: string | null;
  matchedStaffName: string | null;
  clubName: string;
}

export async function parseClubListPdf(
  buffer: Buffer,
  academicYear: string
): Promise<ParsedClubEntry[]> {
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;

  const lines = text.split('\n');
  
  const branches = ['YDİL', 'FELS', 'BİLŞ', 'MATE', 'DİNK', 'MOTO', 'FİZK', 'ÖZEL', 'GRSL', 'GIDA', 'EDEB', 'MUHASEBE', 'TAR', 'KİMY', 'BİYO', 'COĞR', 'BEDN'];
  
  const knownClubs = [
    'AFETE HAZIRLIK KULÜBÜ',
    'BİLİŞİM VE İNTERNET KULÜBÜ',
    'ÇEVRE KORUMA KULÜBÜ',
    'DEĞERLER KULÜBÜ',
    'ENERJİ VERİMLİLİĞİ KULÜBÜ',
    'ENGELLİLERLE DAYANIŞMA KULÜBÜ',
    'GEZİ, TANITMA VE TURİZM KULÜBÜ',
    'GÖRSEL SANATLAR KULÜBÜ',
    'KIZILAY KULÜBÜ',
    'KÜLTÜR VE EDEBİYAT KULÜBÜ',
    'KÜTÜPHANECİLİK KULÜBÜ',
    'MEDENİYET VE DEĞERLER KULÜBÜ',
    'SAĞLIK, TEMİZLİK VE BESLENME KULÜBÜ',
    'SATRANÇ KULÜBÜ',
    'SİVİL SAVUNMA KULÜBÜ',
    'SPOR KULÜBÜ',
    'YEŞİLAY KULÜBÜ'
  ];

  const regexPattern = `^(\\d+)(.*?)(${branches.join('|')})(.*?)(${knownClubs.join('|')})$`;
  const lineRegex = new RegExp(regexPattern);

  const parsedEntries: { staffName: string; branchCode: string; clubName: string }[] = [];

  for (const line of lines) {
    const match = line.trim().match(lineRegex);
    if (match) {
      const name = match[2].trim();
      const branchCode = match[3].trim();
      const surname = match[4].trim();
      const clubName = match[5].trim();
      
      const staffName = `${name} ${surname}`;

      parsedEntries.push({ staffName, branchCode, clubName });
    }
  }

  // Fetch all staff for matching
  const allStaff = await prisma.staff.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  const staffNames = allStaff.map((s: any) => s.name.toUpperCase());
  const results: ParsedClubEntry[] = [];

  for (const entry of parsedEntries) {
    let matchedStaffId: string | null = null;
    let matchedStaffName: string | null = null;

    if (staffNames.length > 0) {
      const searchTarget = entry.staffName.toUpperCase();
      const bestMatch = stringSimilarity.findBestMatch(searchTarget, staffNames);
      if (bestMatch.bestMatch.rating > 0.6) { // 60% confidence
        const staffIndex = bestMatch.bestMatchIndex;
        matchedStaffId = allStaff[staffIndex].id;
        matchedStaffName = allStaff[staffIndex].name;
      }
    }

    results.push({
      rawName: entry.staffName,
      matchedStaffId,
      matchedStaffName,
      clubName: entry.clubName
    });
  }

  return results;
}
