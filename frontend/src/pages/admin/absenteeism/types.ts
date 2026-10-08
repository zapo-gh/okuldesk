export interface Student {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
  parents: { id: string; fullName: string; phone: string }[];
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
  student: { fullName: string; className: string; schoolNumber: string };
}
