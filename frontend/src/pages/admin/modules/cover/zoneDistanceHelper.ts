// Kat ve nöbet yeri mesafe hesaplayıcı (nobetci-assigner algoritması)

export function getZoneFloor(zoneName?: string): number | null {
  if (!zoneName || typeof zoneName !== 'string') return null;
  const upper = zoneName.trim().toLocaleUpperCase('tr-TR');

  // Bodrum
  if (
    upper.includes('BODRUM') ||
    upper.includes('BOD.') ||
    /(?:^|\s)-1\s*\.?\s*KAT/i.test(upper) ||
    upper === '-1' ||
    upper === '-1. KAT'
  ) {
    return -1;
  }

  // Zemin / Giriş / Bahçe
  if (
    upper.includes('ZEMİN') ||
    upper.includes('ZEMIN') ||
    upper.includes('GİRİŞ') ||
    upper.includes('GIRIS') ||
    upper.includes('BAHÇE') ||
    upper.includes('BAHCE')
  ) {
    return 0;
  }

  // Sayısal kat: "1. KAT", "2. KAT", "3. KAT", "4. KAT"
  const m = upper.match(/(\d+)\s*\.?\s*KAT/);
  if (m) {
    return parseInt(m[1], 10);
  }

  // Sınıf veya Blok / Kat harfi:
  // A-01, A- -> 0 (Zemin)
  // B-02, B- -> 1 (1. Kat)
  // C-03, C- -> 2 (2. Kat)
  // D-04, D- -> 3 (3. Kat)
  if (/^A[\s\-_]/.test(upper) || upper === 'A') return 0;
  if (/^B[\s\-_]/.test(upper) || upper === 'B') return 1;
  if (/^C[\s\-_]/.test(upper) || upper === 'C') return 2;
  if (/^D[\s\-_]/.test(upper) || upper === 'D') return 3;

  return null;
}

export function getZoneDistance(requiredZone?: string, teacherZone?: string): number {
  if (!requiredZone || !teacherZone) return 999;

  const normReq = String(requiredZone).trim().toLocaleUpperCase('tr-TR');
  const normTeach = String(teacherZone).trim().toLocaleUpperCase('tr-TR');

  if (normReq === normTeach) return 0;

  const floorReq = getZoneFloor(requiredZone);
  const floorTeach = getZoneFloor(teacherZone);

  if (floorReq !== null && floorTeach !== null) {
    return Math.abs(floorReq - floorTeach);
  }

  return 999;
}

export function getProximityBadge(distance: number): { label: string; color: string } | null {
  if (distance === 0) {
    return { label: 'Aynı Kat', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (distance === 1) {
    return { label: '1 Kat Fark', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (distance === 2) {
    return { label: '2 Kat Fark', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  if (distance < 999) {
    return { label: `${distance} Kat Fark`, color: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
  return null;
}
