import { Request, Response, NextFunction } from 'express';
import { dailyAbsenteeismService } from './dailyAbsenteeism.service';

export class DailyAbsenteeismController {
  async lookupNumbers(req: Request, res: Response, next: NextFunction) {
    try {
      let rawNumbers = req.body.numbers;
      if (typeof rawNumbers === 'string') {
        // Virgül, boşluk, noktalı virgül veya yeni satıra göre parçala
        rawNumbers = rawNumbers.split(/[\s,;\n\r]+/).filter(Boolean);
      }
      if (!Array.isArray(rawNumbers)) {
        rawNumbers = [];
      }
      const result = await dailyAbsenteeismService.lookupStudentsByNumbers(rawNumbers);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getStudentsByClass(req: Request, res: Response, next: NextFunction) {
    try {
      const className = String(req.query.className || '').trim();
      const students = await dailyAbsenteeismService.getStudentsByClass(className);
      res.json({ students });
    } catch (err) {
      next(err);
    }
  }

  async checkDuplicates(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, sessionType, studentIds } = req.body;
      const duplicates = await dailyAbsenteeismService.checkDuplicates(date, sessionType, studentIds);
      res.json({ duplicates });
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const date = req.query.date ? String(req.query.date) : undefined;
      const history = await dailyAbsenteeismService.getHistory(date);
      res.json({ history });
    } catch (err) {
      next(err);
    }
  }

  async sendSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, date, sessionType, parentName, parentPhone, message } = req.body;
      const result = await dailyAbsenteeismService.sendSingleNotification({
        studentId,
        date,
        sessionType,
        parentName,
        parentPhone,
        message,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteHistoryItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await dailyAbsenteeismService.deleteHistoryItem(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const dailyAbsenteeismController = new DailyAbsenteeismController();
