import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../shared/utils/prisma';
import { parentNotificationService } from './parentNotification.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';

class ParentNotificationController {
  /** POST /api/parent-notification/generate-pdf */
  async generatePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, absenceDay, meetingDate, absenceData, parentName, counselorName, viceDirectorName } = req.body as {
        studentId?: string;
        absenceDay?: number;
        meetingDate?: string;
        absenceData?: { excusedDays?: string; unexcusedDays?: string; totalDays?: string };
        parentName?: string;
        counselorName?: string;
        viceDirectorName?: string;
      };

      if (!studentId) throw new AppError('studentId zorunludur.', 400);

      const validDays = [5, 15, 25];
      if (!absenceDay || !validDays.includes(absenceDay)) {
        throw new AppError('absenceDay 5, 15 veya 25 olmalıdır.', 400);
      }

      const pdfPath = await parentNotificationService.generatePdf({
        studentId,
        absenceDay: absenceDay as 5 | 15 | 25,
        meetingDate: meetingDate ? new Date(meetingDate) : undefined,
        absenceData,
        overrideParentName: parentName,
        overrideCounselorName: counselorName,
        overrideViceDirectorName: viceDirectorName,
      });

      // DB Loglama: Eğer bu pdfPath ile kayıt yoksa, Absenteeism tablosuna ekle
      // Windows yolları yüzünden veritabanında arama yaparken karmaşıklık olmaması için sadece dosya adını kaydedelim.
      // Ya da config'e göre upload/parent-notifications/... diye kaydederiz.
      const warningNumberMap = { 5: 1, 15: 2, 25: 3 };
      
      const existingRecord = await prisma.absenteeism.findFirst({
        where: { studentId, pdfPath }
      });

      if (!existingRecord) {
        await prisma.absenteeism.create({
          data: {
            studentId,
            warningNumber: warningNumberMap[absenceDay as 5 | 15 | 25],
            pdfPath,
            excusedDays: parseFloat(absenceData?.excusedDays || '0'),
            unexcusedDays: parseFloat(absenceData?.unexcusedDays || '0'),
          }
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="veli-bildirim-tutanagi-${absenceDay}.pdf"`,
      );

      const stream = fs.createReadStream(pdfPath);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

export const parentNotificationController = new ParentNotificationController();

