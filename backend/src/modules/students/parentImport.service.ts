import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../shared/utils/prisma';

interface ParsedParentRow {
  schoolNumber: string;
  studentName: string;
  className: string;
  parent1Name: string;
  parent1Phone: string;
  parent1Relation: string;
  parent2Name: string;
  parent2Phone: string;
}

export interface ParentImportPreview {
  schoolNumber: string;
  studentName: string;
  className: string;
  matched: boolean;
  parent1Name: string;
  parent1Phone: string;
  parent2Name: string;
  parent2Phone: string;
}

export interface ParentInitialCredential {
  phone: string;
  password: string;
}

export interface ParentImportResult {
  totalParsed: number;
  matched: number;
  unmatched: number;
  parentsCreated: number;
  parentsUpdated: number;
  errors: string[];
  preview: ParentImportPreview[];
  initialCredentials: ParentInitialCredential[];
}

export function parseParentExcel(buffer: Buffer): ParsedParentRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const results: ParsedParentRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;
      
      let schoolNumber = String(row[0] ?? '').trim();
      if (!schoolNumber || !/\d/.test(schoolNumber)) continue;

      const studentName = String(row[1] ?? '').trim();
      const className = String(row[2] ?? '').trim();
      
      const upperClass = className.toLocaleUpperCase('tr-TR');
      if (!schoolNumber.startsWith('A-') && (upperClass.includes('ATP') || upperClass.includes('ANADOLU TEKNİK'))) {
        schoolNumber = 'A-' + schoolNumber;
      }
      
      // Auto-detect Phone vs Name for Parent 1
      const p1Col1 = String(row[3] ?? '').trim();
      const p1Col2 = String(row[4] ?? '').trim();
      let parent1Phone = '';
      let parent1Name = '';
      if (normalizePhone(p1Col1).length >= 10) {
        parent1Phone = normalizePhone(p1Col1);
        parent1Name = p1Col2;
      } else if (normalizePhone(p1Col2).length >= 10) {
        parent1Phone = normalizePhone(p1Col2);
        parent1Name = p1Col1;
      } else if (p1Col1 || p1Col2) {
        // Fallback if neither is a valid phone, just assign
        parent1Phone = normalizePhone(p1Col1);
        parent1Name = p1Col2;
      }

      const parent1Relation = String(row[5] ?? '').trim();

      // Auto-detect Phone vs Name for Parent 2
      const p2Col1 = String(row[6] ?? '').trim();
      const p2Col2 = String(row[7] ?? '').trim();
      let parent2Phone = '';
      let parent2Name = '';
      if (normalizePhone(p2Col1).length >= 10) {
        parent2Phone = normalizePhone(p2Col1);
        parent2Name = p2Col2;
      } else if (normalizePhone(p2Col2).length >= 10) {
        parent2Phone = normalizePhone(p2Col2);
        parent2Name = p2Col1;
      }

      if (!parent1Name && !parent2Name) continue;

      results.push({ schoolNumber, studentName, className, parent1Name, parent1Phone, parent1Relation, parent2Name, parent2Phone });
    }
  }
  return results;
}

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+90')) cleaned = '0' + cleaned.slice(3);
  if (cleaned.startsWith('90') && cleaned.length === 12) cleaned = '0' + cleaned.slice(2);
  if (cleaned.length === 10 && cleaned.startsWith('5')) cleaned = '0' + cleaned;
  return cleaned;
}

export function generateTemporaryPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

export async function importParents(rows: ParsedParentRow[], mode: 'preview' | 'import'): Promise<ParentImportResult> {
  const result: ParentImportResult = {
    totalParsed: rows.length,
    matched: 0,
    unmatched: 0,
    parentsCreated: 0,
    parentsUpdated: 0,
    errors: [],
    preview: [],
    initialCredentials: [],
  };

  const normalizeSchoolNo = (no: string) => no.replace(/^A-0+/, 'A-').replace(/^0+/, '').trim();

  const allStudents = await prisma.student.findMany({ select: { id: true, schoolNumber: true, fullName: true } });
  const studentByNumber = new Map(allStudents.map((s) => [normalizeSchoolNo(s.schoolNumber), s]));

  const normalizeName = (name: string) => name.toLocaleUpperCase('tr-TR').replace(/\s+/g, '');

  const findMatchingStudent = (rawSchoolNumber: string, studentName: string) => {
    const schoolNumber = normalizeSchoolNo(rawSchoolNumber);
    let student = studentByNumber.get(schoolNumber);
    if (!student) {
      if (schoolNumber.startsWith('A-')) {
        student = studentByNumber.get(schoolNumber.substring(2));
      } else {
        student = studentByNumber.get('A-' + schoolNumber);
      }
    }
    return student;
  };

  for (const row of rows) {
    const student = findMatchingStudent(row.schoolNumber, row.studentName);
    const matched = !!student;
    result.preview.push({ schoolNumber: row.schoolNumber, studentName: row.studentName, className: row.className, matched, parent1Name: row.parent1Name, parent1Phone: row.parent1Phone, parent2Name: row.parent2Name, parent2Phone: row.parent2Phone });
    if (matched) result.matched++;
    else result.unmatched++;
  }

  if (mode === 'preview') return result;

  const parentEntries: { studentId: string; fullName: string; phone: string; rowNum: string }[] = [];
  for (const row of rows) {
    const student = findMatchingStudent(row.schoolNumber, row.studentName);
    if (!student) continue;
    if (row.parent1Name && row.parent1Phone) parentEntries.push({ studentId: student.id, fullName: row.parent1Name, phone: row.parent1Phone, rowNum: row.schoolNumber });
    if (row.parent2Name && row.parent2Phone) parentEntries.push({ studentId: student.id, fullName: row.parent2Name, phone: row.parent2Phone, rowNum: row.schoolNumber });
  }

  const uniquePhones = [...new Set(parentEntries.map((e) => e.phone))];
  const existingContacts = await prisma.parentContact.findMany({ where: { phone: { in: uniquePhones } }, include: { parent: { include: { students: { select: { id: true } } } } } });
  const parentByPhone = new Map(existingContacts.map((c) => [c.phone, c.parent]));

  const newParentPhones = new Set<string>();
  const newEntries: typeof parentEntries = [];
  const existingEntries: typeof parentEntries = [];
  for (const entry of parentEntries) {
    if (parentByPhone.has(entry.phone)) existingEntries.push(entry);
    else { newEntries.push(entry); newParentPhones.add(entry.phone); }
  }

  const existingUsers = await prisma.user.findMany({ where: { username: { in: uniquePhones } }, include: { parent: { include: { students: { select: { id: true } } } } } });
  const userByPhone = new Map(existingUsers.map((u) => [u.username, u]));
  const newUserPhones = [...newParentPhones].filter((phone) => !userByPhone.has(phone));
  const generatedPasswordByPhone = new Map<string, string>();
  const hashByPhone = new Map<string, string>();

  for (let i = 0; i < newUserPhones.length; i += 50) {
    const chunk = newUserPhones.slice(i, i + 50);
    await Promise.all(chunk.map(async (phone) => {
      const rawPassword = generateTemporaryPassword();
      generatedPasswordByPhone.set(phone, rawPassword);
      hashByPhone.set(phone, await bcrypt.hash(rawPassword, 6));
    }));
  }

  const createdParentByPhone = new Map<string, { id: string; students: { id: string }[] }>();

  for (const entry of existingEntries) {
    try {
      const existing = parentByPhone.get(entry.phone)!;
      const alreadyLinked = existing.students.some((s: any) => s.id === entry.studentId);
      await prisma.parent.update({ where: { id: existing.id }, data: { fullName: entry.fullName, ...(!alreadyLinked ? { students: { connect: { id: entry.studentId } } } : {}) } });
      if (!alreadyLinked) existing.students.push({ id: entry.studentId });
      result.parentsUpdated++;
    } catch (err: any) { result.errors.push(`${entry.rowNum} Veli: ${err.message}`); }
  }

  for (const entry of newEntries) {
    try {
      const alreadyCreated = createdParentByPhone.get(entry.phone);
      if (alreadyCreated) {
        const alreadyLinked = alreadyCreated.students.some((s) => s.id === entry.studentId);
        if (!alreadyLinked) {
          await prisma.parent.update({ where: { id: alreadyCreated.id }, data: { students: { connect: { id: entry.studentId } } } });
          alreadyCreated.students.push({ id: entry.studentId });
        }
        result.parentsUpdated++;
        continue;
      }

      const existingUser = userByPhone.get(entry.phone);
      let userId: string;
      if (existingUser) {
        userId = existingUser.id;
        if (existingUser.parent) {
          const alreadyLinked = existingUser.parent.students.some((s) => s.id === entry.studentId);
          const updatedParent = await prisma.parent.update({ where: { id: existingUser.parent.id }, data: { fullName: entry.fullName, ...(!alreadyLinked ? { students: { connect: { id: entry.studentId } } } : {}) } });
          createdParentByPhone.set(entry.phone, { id: updatedParent.id, students: [...existingUser.parent.students, ...(!alreadyLinked ? [{ id: entry.studentId }] : [])] });
          result.parentsUpdated++;
          continue;
        }
      } else {
        const rawPassword = generatedPasswordByPhone.get(entry.phone);
        const passwordHash = hashByPhone.get(entry.phone);
        if (!rawPassword || !passwordHash) throw new Error('Geçici veli şifresi oluşturulamadı.');
        const user = await prisma.user.create({ data: { username: entry.phone, password: passwordHash, role: 'PARENT', mustChangePassword: true } });
        userId = user.id;
        result.initialCredentials.push({ phone: entry.phone, password: rawPassword });
      }

      const newParent = await prisma.parent.create({ data: { userId, fullName: entry.fullName, contacts: { create: [{ name: 'Veli (İçe Aktarıldı)', phone: entry.phone, isPrimary: true }] }, students: { connect: { id: entry.studentId } } } });
      createdParentByPhone.set(entry.phone, { id: newParent.id, students: [{ id: entry.studentId }] });
      result.parentsCreated++;
    } catch (err: any) { result.errors.push(`${entry.rowNum} Veli: ${err.message}`); }
  }

  return result;
}
