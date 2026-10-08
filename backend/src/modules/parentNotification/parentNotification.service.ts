import path from 'path';
import fs from 'fs';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { generateParentNotificationPdf, ParentNotificationData } from './parentNotificationPdf.generator';

class ParentNotificationService {
  async generatePdf(params: {
    studentId: string;
    absenceDay: 5 | 15 | 25;
    meetingDate?: Date;
    absenceData?: { excusedDays?: string; unexcusedDays?: string; totalDays?: string };
    overrideParentName?: string;
    overrideCounselorName?: string;
    overrideViceDirectorName?: string;
  }): Promise<string> {
    // Öğrenci bilgilerini çek (velilerle birlikte)
    const student = await prisma.student.findUnique({
      where: { id: params.studentId },
      include: { parents: { select: { fullName: true } } },
    });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);

    const parentName = params.overrideParentName !== undefined
      ? params.overrideParentName
      : (student.parents[0]?.fullName || '');

    // Okul ayarlarını çek
    const settings = await prisma.schoolSettings.findUnique({
      where: { id: 'singleton' },
    });
    const schoolName = settings?.schoolName || 'OKUL ADI';

    // Personeli çek
    const [classTeacherRow, counselorRow, viceDirectorRow] = await Promise.all([
      prisma.staff.findFirst({
        where: { title: 'SINIF_REHBER_OGRETMEN', className: student.className, isActive: true },
      }),
      !params.overrideCounselorName ? prisma.staff.findFirst({
        where: { title: 'REHBER_OGRETMEN', isActive: true },
      }) : Promise.resolve(null),
      !params.overrideViceDirectorName ? prisma.staff.findFirst({
        where: { title: 'MUDUR_YARDIMCISI', isActive: true },
        orderBy: { createdAt: 'asc' },
      }) : Promise.resolve(null),
    ]);

    const data: ParentNotificationData = {
      schoolName,
      date: params.meetingDate || new Date(),
      student: {
        fullName:     student.fullName,
        className:    student.className,
        schoolNumber: student.schoolNumber,
        parentName,
      },
      absenceDay: params.absenceDay,
      absenceData: params.absenceData,
      staff: {
        classTeacher:    classTeacherRow?.name,
        schoolCounselor: params.overrideCounselorName || counselorRow?.name,
        viceDirector:    params.overrideViceDirectorName || viceDirectorRow?.name,
      },
    };

    const crypto = require('crypto');
    const hashData = JSON.stringify({ ...data, date: data.date.toISOString().slice(0, 10) });
    const hash = crypto.createHash('md5').update(hashData).digest('hex');

    const outputDir = path.join(config.upload.dir, 'parent-notifications');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `notification_${params.studentId}_${hash}.pdf`);

    if (fs.existsSync(outputPath)) {
      return outputPath;
    }

    await generateParentNotificationPdf(data, outputPath);
    return outputPath;
  }
}

export const parentNotificationService = new ParentNotificationService();
