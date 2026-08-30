export interface Student {
  id: string;
  schoolNumber: string;
  fullName: string;
  className: string;
  status: string;
  parents: { id: string; fullName: string; phone: string; waConsentStatus: string }[];
  _count: { absenteeisms: number };
}

export interface ParsedStudent {
  schoolNumber: string;
  fullName: string;
  className: string;
}

export interface ImportResult {
  totalParsed: number;
  created: number;
  skipped: number;
  errors: string[];
  students: ParsedStudent[];
}

export interface ParentPreviewRow {
  schoolNumber: string;
  studentName: string;
  className: string;
  matched: boolean;
  parent1Name: string;
  parent1Phone: string;
  parent2Name: string;
  parent2Phone: string;
}

export interface ParentImportResult {
  totalParsed: number;
  matched: number;
  unmatched: number;
  parentsCreated: number;
  parentsUpdated: number;
  errors: string[];
  preview: ParentPreviewRow[];
}
