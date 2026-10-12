/**
 * Sınıf İsimleri Standartlaştırma ve Kademe Ayrıştırma Yardımcısı
 * 
 * Okul programlarından (aSc, e-Okul, Excel vb.) gelen dağınık sınıf adlarını
 * (örn: "10 MOT E.A", "12MUHASEBE", "AMP10C OTO", "ATP9A OTOM") standartlaştırır
 * ve kademelerine (9, 10, 11, 12, Özel Eğitim) göre gruplar.
 */

export interface ClassMeta {
  raw: string;
  grade: '9' | '10' | '11' | '12' | 'Özel' | 'Diğer';
  program: 'AMP' | 'ATP' | 'ÖZEL';
  displayName: string;
  sube?: string;
  branch?: string;
}

export function normalizeBranchName(br: string): string {
  if (!br) return '';
  const clean = br.toUpperCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

  if (clean === 'BİLİŞİM' || clean === 'BİL') return 'Bilişim';
  if (clean === 'OTOM' || clean === 'OTO') return 'Otomotiv';
  if (clean === 'MOTOR' || clean === 'MOT') return 'Motor';
  if (clean === 'MOT EA' || clean === 'MOT E A') return 'Motor (E.A)';
  if (clean === 'MOT EM' || clean === 'MOT E M') return 'Motor (E.M)';
  if (clean === 'MUHASEBE' || clean === 'MUHASEB' || clean === 'MUH') return 'Muhasebe';
  if (clean === 'PAZARLAMA' || clean === 'PAZARLA' || clean === 'PAZAR' || clean === 'PAZ') return 'Pazarlama';
  if (clean === 'GIDA' || clean === 'GID') return 'Gıda';

  return br.trim();
}

/**
 * Tek bir sınıf adını analiz eder ve standartlaştırılmış metayı döner.
 */
export function parseAndStandardizeClass(
  rawName: string,
  customMap?: Record<string, string>
): ClassMeta {
  const raw = (rawName || '').trim();

  // Kullanıcı özel isim tanımlamışsa öncelikli olarak onu kullan
  const customOverride = customMap?.[raw]?.trim();

  if (!raw) {
    return {
      raw: '',
      grade: 'Diğer',
      program: 'AMP',
      displayName: '—'
    };
  }

  // Özel Eğitim kontrolü
  if (/özel\s*eğ/i.test(raw)) {
    return {
      raw,
      grade: 'Özel',
      program: 'ÖZEL',
      displayName: customOverride || 'Özel Eğitim'
    };
  }

  // Program türü tespiti (ATP veya AMP)
  let program: 'AMP' | 'ATP' = 'AMP';
  let text = raw;

  if (/^ATP/i.test(text)) {
    program = 'ATP';
    text = text.substring(3).trim();
  } else if (/^AMP/i.test(text)) {
    program = 'AMP';
    text = text.substring(3).trim();
  }

  // Kademe tespiti: 9, 10, 11, 12
  const gradeMatch = text.match(/^(\d{1,2})/);
  let gradeStr: '9' | '10' | '11' | '12' | 'Diğer' = 'Diğer';
  let rest = text;

  if (gradeMatch) {
    const num = gradeMatch[1];
    if (num === '9') gradeStr = '9';
    else if (num === '10') gradeStr = '10';
    else if (num === '11') gradeStr = '11';
    else if (num === '12') gradeStr = '12';

    rest = text.substring(num.length).trim();
  }

  // rest başındaki / karakterini temizle (örn. /G MUH -> G MUH)
  rest = rest.replace(/^\//, '').trim();

  // Birleşik şube aralığı mı? (örn. 'A-E', 'B-E', 'G-I', 'F-G-I')
  const groupMatch = rest.match(/^([A-ZÇĞİÖŞÜ](?:-[A-ZÇĞİÖŞÜ])+)\s*(.*)$/i);
  // Alan kısaltması mı yoksa şube harfi mi?
  const isBranchPrefix = /^(MOT|MUH|GID|OTO|PAZ|BİL)/i.test(rest);
  const subeMatch = rest.match(/^([A-ZÇĞİÖŞÜ])\b\s*(.*)$/i);

  let sube = '';
  let branch = '';

  if (groupMatch) {
    sube = groupMatch[1].toUpperCase();
    branch = groupMatch[2];
  } else if (!isBranchPrefix && subeMatch) {
    sube = subeMatch[1].toUpperCase();
    branch = subeMatch[2];
  } else {
    branch = rest;
  }

  let formatted = `${program} ${gradeStr}`;
  if (sube) formatted += `-${sube}`;
  if (branch) {
    const cleanBr = normalizeBranchName(branch);
    formatted += ` ${cleanBr}`;
  }

  return {
    raw,
    grade: gradeStr,
    program,
    displayName: customOverride || formatted.trim(),
    sube,
    branch
  };
}

/**
 * Verilen sınıf listesini analiz edip kademelerine göre gruplanmış olarak döner.
 */
export function groupClassesByGrade(
  classNames: string[],
  customMap?: Record<string, string>
): {
  grade: '9' | '10' | '11' | '12' | 'Özel' | 'Diğer';
  label: string;
  classes: ClassMeta[];
}[] {
  const metaList = classNames.map(c => parseAndStandardizeClass(c, customMap));

  const gradeOrder: ('9' | '10' | '11' | '12' | 'Özel' | 'Diğer')[] = [
    '9',
    '10',
    '11',
    '12',
    'Özel',
    'Diğer'
  ];

  const gradeLabels: Record<string, string> = {
    '9': '9. Sınıflar',
    '10': '10. Sınıflar',
    '11': '11. Sınıflar',
    '12': '12. Sınıflar',
    'Özel': 'Özel Eğitim',
    'Diğer': 'Diğer Sınıflar'
  };

  const groups: {
    grade: '9' | '10' | '11' | '12' | 'Özel' | 'Diğer';
    label: string;
    classes: ClassMeta[];
  }[] = [];

  for (const grade of gradeOrder) {
    const matched = metaList.filter(m => m.grade === grade);
    if (matched.length > 0) {
      // Şube ve ada göre sırala
      matched.sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr-TR'));
      groups.push({
        grade,
        label: gradeLabels[grade] || grade,
        classes: matched
      });
    }
  }

  return groups;
}

/**
 * Tüm sınıflar için otomatik standartlaştırılmış isim eşleme tablosu üretir.
 */
export function generateAutoClassDisplayMap(classNames: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of classNames) {
    const meta = parseAndStandardizeClass(c);
    map[c] = meta.displayName;
  }
  return map;
}
