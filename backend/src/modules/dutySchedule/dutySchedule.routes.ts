import { Router } from 'express';
import { dutyScheduleController } from './dutySchedule.controller';
import { authMiddleware } from '../shared/middleware/auth.middleware';

import multer from 'multer';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
      return cb(new Error('Sadece Excel (.xlsx, .xls) dosyaları kabul edilir.') as any);
    }
    cb(null, true);
  }
});

router.use(authMiddleware);

// Stations
router.get('/stations', (req, res, next) => dutyScheduleController.getStations(req, res, next));
router.post('/stations', (req, res, next) => dutyScheduleController.createStation(req, res, next));
router.put('/stations/:id', (req, res, next) => dutyScheduleController.updateStation(req, res, next));
router.delete('/stations/:id', (req, res, next) => dutyScheduleController.deleteStation(req, res, next));

// Upload Excel
router.post('/upload-excel', upload.single('file'), (req, res, next) => dutyScheduleController.uploadExcel(req, res, next));

// Assignments
router.get('/assignments', (req, res, next) => dutyScheduleController.getAssignments(req, res, next));
router.post('/assignments', (req, res, next) => dutyScheduleController.bulkSaveAssignments(req, res, next));

// Staff Config
router.get('/staff-config', (req, res, next) => dutyScheduleController.getStaffConfigs(req, res, next));
router.post('/staff-config', (req, res, next) => dutyScheduleController.bulkSaveStaffConfigs(req, res, next));

// Stats
router.get('/stats', (req, res, next) => dutyScheduleController.getMonthlyStats(req, res, next));

// Auto Distribute
router.post('/auto-distribute', (req, res, next) => dutyScheduleController.autoDistribute(req, res, next));
router.post('/auto-distribute-range', (req, res, next) => dutyScheduleController.autoDistributeRange(req, res, next));

// Cover Assignments
router.get('/absences',            (req, res, next) => dutyScheduleController.getAbsencesForDate(req, res, next));

router.post('/absences',           (req, res, next) => dutyScheduleController.saveAbsence(req, res, next));
router.delete('/absences/:id',     (req, res, next) => dutyScheduleController.deleteAbsence(req, res, next));
router.get('/covers/suggest',      (req, res, next) => dutyScheduleController.suggestCovers(req, res, next));
router.get('/covers',              (req, res, next) => dutyScheduleController.getCoversForDate(req, res, next));
router.post('/covers',             (req, res, next) => dutyScheduleController.saveCovers(req, res, next));
router.delete('/covers/:id',       (req, res, next) => dutyScheduleController.deleteCover(req, res, next));

export default router;
