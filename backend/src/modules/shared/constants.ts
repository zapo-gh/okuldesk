/**
 * Merkezi sabit değerler.
 * String literal'ler yerine bu sabitleri kullanın — tip güvenliği sağlar,
 * yazım hatalarını önler ve IDE otomatik tamamlama desteği sunar.
 */

// ── Kullanıcı Rolleri ──────────────────────────────────────────────────────
export const USER_ROLE = {
  ADMIN:  'ADMIN',
  PARENT: 'PARENT',
} as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// ── Öğrenci Durumu ─────────────────────────────────────────────────────────
export const STUDENT_STATUS = {
  ACTIVE:   'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type StudentStatus = (typeof STUDENT_STATUS)[keyof typeof STUDENT_STATUS];

// ── WhatsApp Rıza Durumu ───────────────────────────────────────────────────
export const WA_CONSENT = {
  PENDING:  'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
} as const;
export type WaConsent = (typeof WA_CONSENT)[keyof typeof WA_CONSENT];

// ── İhlal Tipleri ──────────────────────────────────────────────────────────
export const VIOLATION_TYPE = {
  KIYAFET:   'KIYAFET',
  TOREN_GEC: 'TOREN_GEC',
  DIGER:     'DIGER',
} as const;
export type ViolationType = (typeof VIOLATION_TYPE)[keyof typeof VIOLATION_TYPE];

// ── İhlal Etiketleri (UI) ──────────────────────────────────────────────────
export const VIOLATION_LABELS: Record<string, string> = {
  [VIOLATION_TYPE.KIYAFET]:   'Kıyafet / Makyaj Kontrolü',
  [VIOLATION_TYPE.TOREN_GEC]: 'Tören Geç Kalma',
  [VIOLATION_TYPE.DIGER]:     'Diğer İhlal',
};

// ── İhlal → Davranış Kodu Eşleşmesi ───────────────────────────────────────
export const VIOLATION_TO_BEHAVIOR: Record<string, string> = {
  [VIOLATION_TYPE.KIYAFET]:   'M164_1_C',
  [VIOLATION_TYPE.TOREN_GEC]: 'M164_1_F',
  [VIOLATION_TYPE.DIGER]:     'M164_1_B',
};

// ── Personel Rolleri ───────────────────────────────────────────────────────
export const STAFF_ROLE = {
  MUDUR_YARDIMCISI:       'MUDUR_YARDIMCISI',
  REHBER_OGRETMEN:        'REHBER_OGRETMEN',
  SINIF_REHBER_OGRETMEN:  'SINIF_REHBER_OGRETMEN',
} as const;
export type StaffRole = (typeof STAFF_ROLE)[keyof typeof STAFF_ROLE];

// ── Personel Rolleri Etiketleri ────────────────────────────────────────────
export const STAFF_ROLE_LABELS: Record<string, string> = {
  [STAFF_ROLE.MUDUR_YARDIMCISI]:      'Müdür Yardımcısı',
  [STAFF_ROLE.REHBER_OGRETMEN]:       'Rehber Öğretmen',
  [STAFF_ROLE.SINIF_REHBER_OGRETMEN]: 'Sınıf Rehber Öğretmeni',
};

// ── Komisyon Durumu ────────────────────────────────────────────────────────
export const COMMISSION_STATUS = {
  AKTIF:  'AKTIF',
  PASIF:  'PASIF',
  BEKLEM: 'BEKLEMEDE',
} as const;
