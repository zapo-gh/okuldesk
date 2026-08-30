/**
 * Frontend merkezi sabit değerler.
 * Backend constants.ts ile paralel; API yanıtlarındaki string değerlerle eşleşir.
 */

// ── İhlal Tipleri ──────────────────────────────────────────────────────────
export const VIOLATION_TYPES = [
  { value: 'KIYAFET',   label: 'Kıyafet / Makyaj Kontrolü', color: 'indigo' },
  { value: 'TOREN_GEC', label: 'Tören Geç Kalma',           color: 'orange' },
  { value: 'DIGER',     label: 'Diğer İhlal',               color: 'gray'   },
] as const;

export const VIOLATION_LABEL: Record<string, string> = {
  KIYAFET:   'Kıyafet / Makyaj Kontrolü',
  TOREN_GEC: 'Tören Geç Kalma',
  DIGER:     'Diğer İhlal',
};

// ── Öğrenci Durumu ─────────────────────────────────────────────────────────
export const STUDENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE:   'Aktif',
  INACTIVE: 'Pasif',
};

// ── WhatsApp Rıza Durumu ───────────────────────────────────────────────────
export const WA_CONSENT_LABELS: Record<string, string> = {
  PENDING:  'Bekliyor',
  ACCEPTED: 'Onayladı',
  DECLINED: 'Reddetti',
};

export const WA_CONSENT_COLORS: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100  text-green-800',
  DECLINED: 'bg-red-100    text-red-800',
};

// ── Personel Rolleri ───────────────────────────────────────────────────────
export const STAFF_ROLE_LABELS: Record<string, string> = {
  MUDUR_YARDIMCISI:      'Müdür Yardımcısı',
  REHBER_OGRETMEN:       'Rehber Öğretmen',
  SINIF_REHBER_OGRETMEN: 'Sınıf Rehber Öğretmeni',
};

// ── Pagination varsayılanları ───────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
