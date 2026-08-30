/**
 * Violations modulu paylasilan tip tanimlari.
 * ViolationsPage ve alt bilesenleri tarafindan kullanilir.
 */

export interface MatchedStudent {
  id: string;
  studentId: string;
  student: { fullName: string; className: string; schoolNumber: string };
  matchedText: string;
  matchedBy: string;
  confidence: number;
  previousViolations: number;
  suggestWarning: boolean;
  requiresDiscipline?: boolean;
  isConfirmed?: boolean;
}

export interface UnmatchedLine {
  text: string;
  reason: string;
}

export interface UploadResult {
  uploadId: string;
  ocrRawText: string;
  ocrLines: string[];
  type: string;
  typeLabel: string;
  violationDate: string;
  matched: MatchedStudent[];
  unmatched: UnmatchedLine[];
  summary: {
    totalLines: number;
    matchedCount: number;
    unmatchedCount: number;
    repeatOffenders: number;
    disciplineRequired?: number;
  };
}

export interface UploadRecord {
  id: string;
  type: string;
  description: string | null;
  uploadedBy: string;
  violationDate: string;
  createdAt: string;
  studentCount: number;
  records?: {
    id: string;
    studentId: string;
    type: string;
    matchedBy: string;
    isConfirmed: boolean;
    student: { fullName: string; className: string; schoolNumber: string };
    previousViolations?: number;
    suggestWarning?: boolean;
    hasWarning?: boolean;
    requiresDiscipline?: boolean;
  }[];
}

export interface StudentOption {
  id: string;
  fullName: string;
  className: string;
  schoolNumber: string;
}

export interface ViolationStats {
  totalUploads: number;
  totalViolations: number;
  confirmedViolations: number;
  todayCount: number;
  weekCount: number;
}

export interface StudentViolation {
  id: string;
  type: string;
  isConfirmed: boolean;
  upload: { type: string; description: string | null; violationDate: string; createdAt: string };
}

export interface WarningSuggestion {
  type: string;
  confirmedCount: number;
  behaviorCode: string;
  hasWarning: boolean;
}

export interface ExistingWarning {
  id: string;
  behaviorCode: string;
  issuedAt: string;
  warningNumber: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  className?: string | null;
}

export const VIOLATION_TYPES = [
  { value: "KIYAFET",   label: "Kıyafet / Makyaj Kontrolü", color: "indigo" },
  { value: "TOREN_GEC", label: "Tören Geç Kalma",           color: "orange" },
  { value: "DIGER",     label: "Diğer İhlal",               color: "gray"   },
] as const;

export const BEHAVIOR_MAP: Record<string, string> = {
  KIYAFET:   "M164_1_C",
  TOREN_GEC: "M164_1_F",
  DIGER:     "M164_1_B",
};

export function getTypeLabel(t: string) {
  return VIOLATION_TYPES.find((v) => v.value === t)?.label || t;
}

export function getTypeColor(t: string) {
  return VIOLATION_TYPES.find((v) => v.value === t)?.color || "gray";
}

export function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, "0")}.${(dt.getMonth() + 1).toString().padStart(2, "0")}.${dt.getFullYear()}`;
}
