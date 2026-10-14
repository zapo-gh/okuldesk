export interface ParentInfo {
  id: string;
  contactId?: string;
  fullName: string;
  relation?: string;
  phone: string;
  waConsentStatus?: 'ACCEPTED' | 'DECLINED' | 'PENDING';
  waConsentDate?: string | Date | null;
  photoConsentStatus?: 'ACCEPTED' | 'DECLINED' | 'PENDING';
  isPrimary?: boolean;
}

export interface Student {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
  parents: ParentInfo[];
}

export interface AbsenteeismRecord {
  id: string;
  studentId: string;
  warningNumber: number;
  isBep: boolean;
  viewedByParent: boolean;
  waSentAt?: string | null;
  createdAt: string;
  excusedDays?: number | null;
  unexcusedDays?: number | null;
  student: {
    id?: string;
    fullName: string;
    className: string;
    schoolNumber: string;
    parents?: ParentInfo[];
  };
}
