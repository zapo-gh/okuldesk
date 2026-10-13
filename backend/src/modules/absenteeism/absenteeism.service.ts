import path from 'path';
import fs from 'fs';
import os from 'os';
import { Prisma } from '@prisma/client';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { generateAbsenteeismPreview, deletePreviewFile, extractAbsenceDays } from './pdfPreview.service';

export class AbsenteeismService {
  getArchiveFolderPath(): string {
    const archiveDir = path.join(os.homedir(), 'Documents', 'OkulDesk', 'Devamsızlık Mektupları');
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    return archiveDir;
  }

  ensureArchiveFile(record: any): string {
    if (!record || !record.pdfPath) return '';
    const archiveDir = this.getArchiveFolderPath();
    const student = record.student;
    const safeStudentName = (student?.fullName || 'Ogrenci').replace(/[\\/:*?"<>|]/g, '').trim();
    const safeClassName = (student?.className || 'Sinif').replace(/[\\/:*?"<>|]/g, '-').trim();
    const ext = path.extname(record.pdfPath) || '.pdf';
    const readableFileName = `${safeClassName}_${student?.schoolNumber || ''}_${safeStudentName}_${record.warningNumber}.Uyari${ext}`;
    const archiveFilePath = path.join(archiveDir, readableFileName);

    if (fs.existsSync(record.pdfPath) && !fs.existsSync(archiveFilePath)) {
      try {
        fs.copyFileSync(record.pdfPath, archiveFilePath);
      } catch (err) {
        console.error('Failed to copy to archive:', err);
      }
    }

    return fs.existsSync(archiveFilePath) ? archiveFilePath : record.pdfPath;
  }

  async syncAllToArchive() {
    const archiveDir = this.getArchiveFolderPath();
    const records = await prisma.absenteeism.findMany({
      where: { deletedAt: null },
      include: { student: { select: { fullName: true, className: true, schoolNumber: true } } },
    });
    for (const r of records) {
      this.ensureArchiveFile(r);
    }
    return { folderPath: archiveDir, count: records.length };
  }
  private static turkishTitleCase(s: string): string {
    return s.replace(/\S+/g, (word) =>
      word[0].toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR')
    );
  }

  async getAll(page = 1, limit = 20, studentId?: string, search?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.AbsenteeismWhereInput = { deletedAt: null };
    if (studentId) where.studentId = studentId;
    if (search) {
      const q     = search.trim();
      // SQLite LIKE operatörü ASCII için case-insensitive çalışır.
      // Türkçe İ/i farkı için orijinal + küçük harf versiyonu yeterli.
      const qNorm = q.toLocaleLowerCase('tr-TR');
      where.student = {
        OR: [
          { fullName:     { contains: q } },
          { fullName:     { contains: qNorm } },
          { schoolNumber: { contains: q } },
          { className:    { contains: q } },
        ],
      };
    }

    const [records, total] = await Promise.all([
      prisma.absenteeism.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { student: { className: 'asc' } },
          { student: { schoolNumber: 'asc' } },
        ],
        include: {
          student: {
            select: { fullName: true, className: true, schoolNumber: true },
          },
        },
      }),
      prisma.absenteeism.count({ where }),
    ]);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const record = await prisma.absenteeism.findUnique({
      where: { id, deletedAt: null },
      include: {
        student: {
          select: {
            fullName: true,
            className: true,
            schoolNumber: true,
            parents: { 
              include: { 
                contacts: { where: { isPrimary: true } }
              } 
            },
          },
        },

      },
    });

    if (!record) {
      throw new AppError('Devamsızlık kaydı bulunamadı.', 404);
    }

    // Geriye dönük uyumluluk için map et
    return {
      ...record,
      student: {
        ...record.student,
        parents: record.student.parents.map((p: any) => ({
          id: p.id,
          fullName: p.fullName,
          phone: p.contacts?.[0]?.phone || '',
          waConsentStatus: p.contacts?.[0]?.waConsentStatus || 'PENDING'
        }))
      }
    };
  }

  async create(data: { studentId: string; warningNumber: number; pdfPath: string; isBep?: boolean }) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });
    if (!student) {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    // PDF → JPG önizleme üret (üst %50 kırpılmış) + özürlü/özürsüz gün çıkar
    const [previewPath, absenceDays] = await Promise.all([
      generateAbsenteeismPreview(data.pdfPath),
      extractAbsenceDays(data.pdfPath),
    ]);

    const created = await prisma.absenteeism.create({
      data: {
        ...data,
        isBep: data.isBep ?? false,
        previewPath: previewPath ?? undefined,
        excusedDays: absenceDays.excusedDays ?? undefined,
        unexcusedDays: absenceDays.unexcusedDays ?? undefined,
      },
      include: {
        student: { select: { fullName: true, className: true, schoolNumber: true } },
      },
    });

    this.ensureArchiveFile(created);

    return created;
  }

  async getWarningCount(studentId: string): Promise<number> {
    // Soft-delete gözetilerek yalnızca aktif kayıtlar sayılır.
    // deletedAt: null olmadan silinmiş kayıtlar da sayılır ve
    // öğrenciye yanlış (fazla) uyarı numarası atanır.
    const count = await prisma.absenteeism.count({
      where: { studentId, deletedAt: null },
    });
    return count;
  }

  async servePdf(absenteeismId: string): Promise<string> {
    const record = await prisma.absenteeism.findUnique({
      where: { id: absenteeismId },
      include: {
        student: { select: { fullName: true, className: true, schoolNumber: true } },
      },
    });

    if (!record) {
      throw new AppError('Devamsızlık kaydı bulunamadı.', 404);
    }

    const archivePath = this.ensureArchiveFile(record);

    const uploadBase = path.resolve(config.upload.dir);
    const archiveBase = path.resolve(this.getArchiveFolderPath());
    const fullPath = path.resolve(record.pdfPath);

    const isAllowedDir =
      fullPath.startsWith(uploadBase + path.sep) ||
      fullPath.startsWith(uploadBase + '/') ||
      fullPath.startsWith(archiveBase + path.sep) ||
      fullPath.startsWith(archiveBase + '/');

    if (!isAllowedDir) {
      if (archivePath && fs.existsSync(archivePath)) {
        return archivePath;
      }
      throw new AppError('Geçersiz dosya yolu.', 403);
    }

    if (!fs.existsSync(fullPath)) {
      if (archivePath && fs.existsSync(archivePath)) {
        return archivePath;
      }
      throw new AppError('Dosya bulunamadı.', 404);
    }

    return fullPath;
  }

  async getStats() {
    const [total, sentCount, notSentCount] = await Promise.all([
      prisma.absenteeism.count({ where: { deletedAt: null } }),
      prisma.absenteeism.count({ where: { deletedAt: null, waSentAt: { not: null } } }),
      prisma.absenteeism.count({ where: { deletedAt: null, waSentAt: null } }),
    ]);
    return { total, sentCount, notSentCount };
  }

  async delete(id: string) {
    const record = await prisma.absenteeism.findUnique({ where: { id, deletedAt: null } });
    if (!record) {
      throw new AppError('Devamsızlık kaydı bulunamadı.', 404);
    }

    // Soft delete
    await prisma.absenteeism.update({ where: { id }, data: { deletedAt: new Date() } });

    return { message: 'Devamsızlık kaydı başarıyla silindi (çöp kutusuna taşındı).' };
  }
}

export const absenteeismService = new AbsenteeismService();
