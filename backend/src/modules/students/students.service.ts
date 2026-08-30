import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { parentAccountService, normalizeParentPhone } from './parentAccount.service';
import { AuditService } from '../shared/utils/audit.service';

export class StudentsService {
  private static turkishTitleCase(s: string): string {
    return s.replace(/\S+/g, (word) => word[0].toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR'));
  }

  private static mapStudentParents(student: any) {
    if (!student) return student;
    return {
      ...student,
      parents: student.parents?.map((p: any) => ({
        id: p.id,
        fullName: p.fullName,
        phone: p.contacts?.[0]?.phone || '',
        waConsentStatus: p.contacts?.[0]?.waConsentStatus || 'PENDING'
      })) || []
    };
  }

  async getAll(page = 1, limit = 20, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      const sLower = search.toLocaleLowerCase('tr-TR');
      const sUpper = search.toLocaleUpperCase('tr-TR');
      const sTitle = StudentsService.turkishTitleCase(search);
      where.OR = [
        { fullName: { contains: search } }, { fullName: { contains: sLower } },
        { fullName: { contains: sUpper } }, { fullName: { contains: sTitle } },
        { schoolNumber: { contains: search } }, { className: { contains: search } },
        { className: { contains: sLower } }, { className: { contains: sUpper } }, { className: { contains: sTitle } },
      ];
    }
    if (status !== 'ALL') where.status = status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const allStudents = await prisma.student.findMany({
      where,
      include: {
        parents: { include: { contacts: { where: { isPrimary: true } } } },
        _count: { select: { absenteeisms: { where: { deletedAt: null } } } },
      },
    });

    const collator = new Intl.Collator('tr-TR', { numeric: true, sensitivity: 'base' });
    allStudents.sort((a, b) => {
      const cmp = collator.compare(a.className, b.className);
      if (cmp !== 0) return cmp;
      return collator.compare(a.schoolNumber, b.schoolNumber);
    });

    const total = allStudents.length;
    const paginatedStudents = allStudents.slice(skip, skip + limit);

    return { 
      students: paginatedStudents.map(StudentsService.mapStudentParents), 
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } 
    };
  }

  async getById(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        parents: { include: { contacts: { where: { isPrimary: true } } } },
        absenteeisms: { orderBy: { createdAt: 'desc' }, select: { id: true, warningNumber: true, createdAt: true, viewedByParent: true } },
      },
    });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);
    return StudentsService.mapStudentParents(student);
  }

  async create(data: { schoolNumber: string; fullName: string; className: string; parents?: { fullName: string; phone: string }[] }) {
    const existing = await prisma.student.findUnique({ where: { schoolNumber: data.schoolNumber } });
    if (existing) throw new AppError('Bu okul numarası zaten kayıtlı.', 409);
    const { parents, ...studentData } = data;

    return prisma.$transaction(async (tx) => {
      const student = await tx.student.create({ data: studentData });
      for (const input of parents ?? []) {
        if (!input.fullName?.trim() || !input.phone?.trim()) continue;
        const account = await parentAccountService.ensureParent(tx, input);
        await tx.student.update({ where: { id: student.id }, data: { parents: { connect: { id: account.parent.id } } } });
      }
      const newStudent = await tx.student.findUnique({ where: { id: student.id }, include: { parents: { include: { contacts: { where: { isPrimary: true } } } } } });
      return StudentsService.mapStudentParents(newStudent);
    });
  }

  async update(id: string, data: { fullName?: string; className?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);
    return prisma.student.update({ where: { id }, data });
  }

  async delete(id: string, userId: string) {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);
    await prisma.student.update({ where: { id }, data: { status: 'INACTIVE' } });
    await AuditService.log(userId, 'SOFT_DELETE_STUDENT', 'Student', id, { schoolNumber: student.schoolNumber, fullName: student.fullName });
    return { message: 'Öğrenci başarıyla pasife alındı.' };
  }

  async bulkDelete(ids: string[], userId: string) {
    if (!ids || ids.length === 0) throw new AppError('Pasife alınacak öğrenci seçilmedi.', 400);
    const result = await prisma.student.updateMany({ where: { id: { in: ids } }, data: { status: 'INACTIVE' } });
    await AuditService.log(userId, 'BULK_SOFT_DELETE_STUDENT', 'Student', 'Multiple', { ids });
    return { message: `${result.count} öğrenci başarıyla pasife alındı.`, deletedCount: result.count };
  }

  async assignParent(studentId: string, parentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);
    const parent = await prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError('Veli bulunamadı.', 404);
    const updated = await prisma.student.update({ where: { id: studentId }, data: { parents: { connect: { id: parentId } } }, include: { parents: { include: { contacts: { where: { isPrimary: true } } } } } });
    return StudentsService.mapStudentParents(updated);
  }

  async updateParent(parentId: string, data: { fullName?: string; phone?: string }) {
    const parent = await prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError('Veli bulunamadı.', 404);
    if (data.phone !== undefined) {
      const updated = await parentAccountService.updatePhone(parentId, data.phone);
      if (data.fullName !== undefined) {
        await prisma.parent.update({ where: { id: parentId }, data: { fullName: data.fullName.trim() } });
        return { ...updated, fullName: data.fullName.trim() };
      }
      return updated;
    }
    const updated = await prisma.parent.update({ where: { id: parentId }, data: { fullName: data.fullName?.trim() }, include: { contacts: { where: { isPrimary: true } } } });
    return { id: updated.id, fullName: updated.fullName, phone: updated.contacts[0]?.phone || '', waConsentStatus: updated.contacts[0]?.waConsentStatus || 'PENDING' };
  }

  async resetParentPassword(parentId: string, actorUserId: string) {
    return parentAccountService.resetPassword(parentId, actorUserId);
  }

  async addParentToStudent(studentId: string, data: { fullName: string; phone: string }) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);

    return prisma.$transaction(async (tx) => {
      const account = await parentAccountService.ensureParent(tx, data);
      await tx.student.update({ where: { id: studentId }, data: { parents: { connect: { id: account.parent.id } } } });
      const updatedStudent = await tx.student.findUnique({ where: { id: studentId }, include: { parents: true } });
      return {
        ...updatedStudent,
        generatedPassword: account.temporaryPassword,
        isExistingUser: !account.isNewUser,
      };
    });
  }

  async removeParentFromStudent(studentId: string, parentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { parents: { where: { id: parentId } } } });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);
    if (student.parents.length === 0) throw new AppError('Bu veli öğrenciye bağlı değil.', 400);
    const updated = await prisma.student.update({ where: { id: studentId }, data: { parents: { disconnect: { id: parentId } } }, include: { parents: { include: { contacts: { where: { isPrimary: true } } } } } });
    return StudentsService.mapStudentParents(updated);
  }
}

export const studentsService = new StudentsService();
