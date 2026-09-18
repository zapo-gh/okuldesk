export interface TimetableStaffRef {
  id: string;
  name: string;
}

export interface TimetableEntry {
  id?: string;
  timetableId?: string;
  staffId?: string | null;
  className?: string | null;
  dayOfWeek: number;
  period: number;
  subject?: string | null;
  room?: string | null;
  staff?: TimetableStaffRef | null;
}

export interface GroupedTimetableEntry extends TimetableEntry {
  staffNames: string[];
  staffIds: string[];
  classNames: string[];
}

export interface TimetableTeacherDetails {
  homeroomClass: string | null;
  clubs: string | null;
  duty: string | null;
}

export interface TimetableRecord {
  id: string;
  academicYear: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    entries: number;
  };
}

export interface TimetableStaffSummary {
  id: string;
  name: string;
  gorev?: string | null;
  brans?: string | null;
}

export interface TimetableLoadSummary {
  staffId: string | null;
  name: string;
  brans: string | null;
  count: number;
}

export interface TimetableUploadResult {
  message: string;
  timetableId: string;
  totalTeachersFoundInExcel: number;
  totalEntriesCreated: number;
  warnings: string[];
}