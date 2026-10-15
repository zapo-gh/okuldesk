import { Request, Response, NextFunction } from 'express';
import { dailyAbsenteeismService } from './dailyAbsenteeism.service';
import { generateDailyAbsenteeismReportPdf } from './dailyAbsenteeismPdf.generator';
import prisma from '../shared/utils/prisma';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

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

  async downloadReportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const date = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
      const sessionType = req.query.sessionType ? String(req.query.sessionType) : 'ALL';
      const className = req.query.className ? String(req.query.className) : 'ALL';

      let history = await dailyAbsenteeismService.getHistory(date);

      if (sessionType !== 'ALL') {
        history = history.filter((h: any) => h.sessionType === sessionType);
      }
      if (className !== 'ALL') {
        history = history.filter((h: any) => h.className === className);
      }

      const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });

      const pdfBuffer = await generateDailyAbsenteeismReportPdf({
        schoolName: settings?.schoolName || 'Okul Müdürlüğü',
        principalName: settings?.principalName || '',
        date,
        items: history,
      });

      const filename = `Gunluk_Devamsizlik_Raporu_${date.replace(/-/g, '_')}.pdf`;
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(pdfBuffer.length),
      });
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  async openReportPdfInSystem(req: Request, res: Response, next: NextFunction) {
    try {
      const date = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
      const sessionType = req.query.sessionType ? String(req.query.sessionType) : 'ALL';
      const className = req.query.className ? String(req.query.className) : 'ALL';

      let history = await dailyAbsenteeismService.getHistory(date);

      if (sessionType !== 'ALL') {
        history = history.filter((h: any) => h.sessionType === sessionType);
      }
      if (className !== 'ALL') {
        history = history.filter((h: any) => h.className === className);
      }

      const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });

      const pdfBuffer = await generateDailyAbsenteeismReportPdf({
        schoolName: settings?.schoolName || 'Okul Müdürlüğü',
        principalName: settings?.principalName || '',
        date,
        items: history,
      });

      const tempDir = path.join(os.tmpdir(), 'okuldesk');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const filename = `Gunluk_Devamsizlik_Raporu_${date.replace(/-/g, '_')}.pdf`;
      const tempPath = path.join(tempDir, filename);
      fs.writeFileSync(tempPath, pdfBuffer);

      if (process.platform === 'win32') {
        exec(`start "" "${tempPath}"`);
      } else if (process.platform === 'darwin') {
        exec(`open "${tempPath}"`);
      } else {
        exec(`xdg-open "${tempPath}"`);
      }

      res.json({ success: true, message: 'PDF raporu varsayılan sistem programında açıldı.', data: { filePath: tempPath } });
    } catch (err) {
      next(err);
    }
  }
}

export const dailyAbsenteeismController = new DailyAbsenteeismController();
