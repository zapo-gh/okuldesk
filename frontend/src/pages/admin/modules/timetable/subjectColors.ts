/**
 * Ders adları için zengin degrade renkler ve standart MEB ders kısaltmaları
 */

export const SUBJECT_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', // Indigo
  'linear-gradient(135deg, #059669 0%, #10b981 100%)', // Emerald
  'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', // Sky
  'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', // Amber
  'linear-gradient(135deg, #db2777 0%, #ec4899 100%)', // Pink
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', // Violet
  'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', // Orange
  'linear-gradient(135deg, #0891b2 0%, #14b8a6 100%)', // Cyan
  'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', // Blue
  'linear-gradient(135deg, #475569 0%, #64748b 100%)', // Slate
];

export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', // Indigo - Violet
  'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', // Sky - Blue
  'linear-gradient(135deg, #059669 0%, #0d9488 100%)', // Emerald - Teal
  'linear-gradient(135deg, #d97706 0%, #ea580c 100%)', // Amber - Orange
  'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)', // Pink - Purple
  'linear-gradient(135deg, #0891b2 0%, #0284c7 100%)', // Cyan - Blue
  'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', // Rose
  'linear-gradient(135deg, #0d9488 0%, #059669 100%)', // Teal - Emerald
];

/**
 * Ders adını kısaltır (TÜRK DİLİ VE EDEBİYATI -> TDE, MATEMATİK -> MAT vb.)
 */
export function shortenSubjectName(subject: string): string {
  if (!subject) return '';
  const mappings: Record<string, string> = {
    'TÜRK DİLİ VE EDEBİYATI': 'TDE',
    'TÜRK DİLİ VE EDEBİYAT': 'TDE',
    'MESLEKİ GELİŞİM ATÖLYESİ': 'MGA',
    'MESLEKİ GELİŞİM': 'MG',
    'TARİH': 'TRH',
    'T.C. İNKILAP TARİHİ VE ATATÜRKÇÜLÜK': 'İNK',
    'İNKILAP TARİHİ': 'İNK',
    'KİMYA': 'KMY',
    'COĞRAFYA': 'COĞ',
    'BİYOLOJİ': 'BİY',
    'MATEMATİK': 'MAT',
    'FİZİK': 'FİZ',
    'İNGİLİZCE': 'İNG',
    'BİRİNCİ YABANCI DİL': 'İNG',
    'İKİNCİ YABANCI DİL': 'ALM',
    'ALMANCA': 'ALM',
    'BEDEN EĞİTİMİ VE SPOR': 'BES',
    'BEDEN EĞİTİMİ': 'BES',
    'DİN KÜLTÜRÜ VE AHLAK BİLGİSİ': 'DKAB',
    'DİN KÜLTÜRÜ': 'DKAB',
    'FELSEFE': 'FEL',
    'GÖRSEL SANATLAR': 'GS',
    'MÜZİK': 'MÜZ',
    'REHBERLİK VE YÖNLENDİRME': 'REH',
    'REHBERLİK': 'REH',
    'SAĞLIK BİLGİSİ VE TRAFİK KÜLTÜRÜ': 'SBTK',
    'SAĞLIK BİLGİSİ': 'SB',
    'TRAFİK KÜLTÜRÜ': 'TK',
    'BİLİŞİM TEKNOLOJİLERİNİN TEMELLERİ': 'BTT',
    'PROGRAMLAMA TEMELLERİ': 'PT',
    'BİLGİSAYARLI TASARIM UYGULAMALARI': 'BTU',
    'AĞ İŞLETMENLİĞİ VE SİBER GÜVENLİK': 'AİSG',
    'VERİTABANI': 'VT',
    'WEB TABANLI UYGULAMA GELİŞTİRME': 'WTUG',
    'MOBİL UYGULAMALAR': 'MOBİL',
    'GRAFİK VE CANLANDIRMA': 'GC',
    'ELEKTRİK ELEKTRONİK ESASLARI': 'EEE',
    'TEMEL İMALAT İŞLEMLERİ': 'Tİİ',
    'TEKNİK RESİM': 'TR',
    'SEÇMELİ': 'S.',
  };

  const upperSubject = subject.toLocaleUpperCase('tr-TR').trim();

  for (const [key, value] of Object.entries(mappings)) {
    if (upperSubject.includes(key) && key !== 'SEÇMELİ') {
      if (upperSubject.includes('SEÇMELİ') || upperSubject.startsWith('S.')) {
        return 'S.' + value;
      }
      return value;
    }
  }

  // Birden fazla kelimeden oluşuyorsa baş harflerini al
  const words = subject.split(/[\s-]+/).filter((w: string) => w.toLowerCase() !== 've' && w.length > 0);
  if (words.length > 1) {
    return words.map((w: string) => w.charAt(0).toLocaleUpperCase('tr-TR')).join('');
  } else {
    if (subject.length <= 4) return subject.toLocaleUpperCase('tr-TR');
    return subject.substring(0, 4).toLocaleUpperCase('tr-TR');
  }
}

/**
 * Ders adına göre tutarlı renk gradyanı döner
 */
export function getSubjectGradient(subject: string): string {
  if (!subject) return SUBJECT_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = (hash << 5) - hash + subject.charCodeAt(i);
    hash |= 0;
  }
  return SUBJECT_GRADIENTS[Math.abs(hash) % SUBJECT_GRADIENTS.length];
}

/**
 * Öğretmen adına göre tutarlı avatar rengi döner
 */
export function getTeacherAvatarGradient(name: string): string {
  if (!name) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/**
 * Öğretmen baş harflerini döner (Ahmet Yılmaz -> AY)
 */
export function getTeacherInitials(name: string = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] || '').slice(0, 2).toLocaleUpperCase('tr-TR');
  const first = parts[0] || '';
  const last = parts[parts.length - 1] || '';
  return ((first[0] || '') + (last[0] || '')).toLocaleUpperCase('tr-TR');
}

/**
 * Kademeye göre gradyan rengi
 */
export function getGradeBadgeColor(grade: string): string {
  if (grade === '9') return 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)';
  if (grade === '10') return 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)';
  if (grade === '11') return 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)';
  if (grade === '12') return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';
  return 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
}
