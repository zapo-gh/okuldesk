import { Request, Response, NextFunction } from 'express';
import { timetableService } from './timetable.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';

class TimetableController {
  async getActiveTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const academicYear = (req.query.academicYear as string) || '2025-2026';
      const timetable = await timetableService.getActiveTimetable(academicYear);
      res.json({ status: 'success', data: timetable });
    } catch (error) {
      next(error);
    }
  }

  async getTimetableHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const academicYear = (req.query.academicYear as string) || '2025-2026';
      const history = await timetableService.getTimetableHistory(academicYear);
      res.json({ status: 'success', data: history });
    } catch (error) {
      next(error);
    }
  }

  async getTeacherTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { staffId } = req.params;
      if (!staffId) throw new AppError('Personel ID gereklidir', 400);
      const timetableId = req.query.timetableId as string | undefined;
      const entries = await timetableService.getTeacherTimetable(staffId, timetableId);
      res.json({ status: 'success', data: entries });
    } catch (error) {
      next(error);
    }
  }

  async getClassTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { className } = req.params;
      if (!className) throw new AppError('Sınıf adı gereklidir', 400);
      const timetableId = req.query.timetableId as string | undefined;
      const entries = await timetableService.getClassTimetable(className, timetableId);
      res.json({ status: 'success', data: entries });
    } catch (error) {
      next(error);
    }
  }

  async uploadTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('Lütfen bir Excel dosyası yükleyin.', 400);
      const academicYear = req.body.academicYear || '2025-2026';
      const name = req.body.name || 'Yeni Ders Programı';
      const result = await timetableService.uploadTimetable(req.file.buffer, academicYear, name);
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) throw new AppError('Program ID gereklidir', 400);
      await timetableService.deleteTimetable(id);
      res.json({ status: 'success', message: 'Program silindi.' });
    } catch (error) {
      next(error);
    }
  }

  async setActiveTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const academicYear = req.body.academicYear || '2025-2026';
      if (!id) throw new AppError('Program ID gereklidir', 400);
      await timetableService.setActiveTimetable(id, academicYear);
      res.json({ status: 'success', message: 'Program aktif olarak ayarlandı.' });
    } catch (error) {
      next(error);
    }
  }
}

export const timetableController = new TimetableController();
