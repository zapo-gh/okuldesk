import { Request, Response, NextFunction } from 'express';
import { dutyScheduleService } from './dutySchedule.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export class DutyScheduleController {
  // ── Stations ──
  async getStations(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await dutyScheduleService.getStations() });
    } catch (e) { next(e); }
  }

  async createStation(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, sortOrder, shift, capacity } = req.body;
      if (!name) throw new AppError('Nöbet yeri adı zorunludur.', 400);
      res.status(201).json({ success: true, data: await dutyScheduleService.createStation({ name, sortOrder, shift, capacity: Number(capacity) || 1 }) });
    } catch (e) { next(e); }
  }

  async updateStation(req: Request, res: Response, next: NextFunction) {
    try {
      await dutyScheduleService.updateStation(req.params.id, req.body);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  async deleteStation(req: Request, res: Response, next: NextFunction) {
    try {
      await dutyScheduleService.deleteStation(req.params.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  // ── Assignments ──
  async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const academicYear = req.query.academicYear as string | undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month !== undefined ? parseInt(req.query.month as string) : undefined;
      res.json({ success: true, data: await dutyScheduleService.getAssignments({ academicYear, year, month }) });
    } catch (e) { next(e); }
  }

  async bulkSaveAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYear, year, month, assignments } = req.body;
      if (!academicYear) throw new AppError('academicYear zorunludur.', 400);
      if (!Array.isArray(assignments)) throw new AppError('Atamalar dizisi zorunludur.', 400);
      await dutyScheduleService.bulkSaveAssignments({
        academicYear,
        year: year ?? 0,
        month: month ?? 0,
        assignments
      });
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  // ── Staff Config ──
  async getStaffConfigs(req: Request, res: Response, next: NextFunction) {
    try {
      const academicYear = req.query.academicYear as string;
      if (!academicYear) throw new AppError('academicYear zorunludur.', 400);
      res.json({ success: true, data: await dutyScheduleService.getStaffConfigs(academicYear) });
    } catch (e) { next(e); }
  }

  async bulkSaveStaffConfigs(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYear, configs } = req.body;
      if (!academicYear || !Array.isArray(configs)) throw new AppError('academicYear ve configs dizisi zorunludur.', 400);
      await dutyScheduleService.bulkSaveStaffConfigs(academicYear, configs);
      res.json({ success: true });
    } catch (e) { next(e); }
  }

  // ── Stats ──
  async getMonthlyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const year = parseInt(req.query.year as string);
      const month = parseInt(req.query.month as string);
      const academicYear = req.query.academicYear as string;
      if (!year || !month || !academicYear) throw new AppError('year, month ve academicYear zorunludur.', 400);
      res.json({ success: true, data: await dutyScheduleService.getMonthlyStats(year, month, academicYear) });
    } catch (e) { next(e); }
  }

  // ── Auto Distribute ──
  async autoDistribute(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month, academicYear, overwriteExisting, targetWeekNum } = req.body;
      if (!year || !month || !academicYear) throw new AppError('year, month ve academicYear zorunludur.', 400);
      const result = await dutyScheduleService.autoDistribute({ year, month, academicYear, overwriteExisting: !!overwriteExisting, targetWeekNum });
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  }
}

export const dutyScheduleController = new DutyScheduleController();
