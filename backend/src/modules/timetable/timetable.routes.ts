import { Router } from 'express';
import multer from 'multer';
import { timetableController } from './timetable.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { uploadLimiter } from '../shared/middleware/rateLimit.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';

const router = Router();

const excelMimes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

// Güvenlik limitleri: max 10 MB, sadece xlsx/xls
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
      return cb(new AppError('Sadece Excel (.xlsx, .xls) dosyaları kabul edilir.', 400) as any);
    }
    cb(null, true);
  }
});

router.use(authMiddleware, adminOnly);

router.get('/active',             (req, res, next) => timetableController.getActiveTimetable(req, res, next));
router.get('/classes',            (req, res, next) => timetableController.getActiveClassList(req, res, next));
router.get('/history',            (req, res, next) => timetableController.getTimetableHistory(req, res, next));
router.get('/load-summary',       (req, res, next) => timetableController.getLoadSummary(req, res, next));
router.get('/teachers',           (req, res, next) => timetableController.getTeacherTimetables(req, res, next));
router.get('/teacher/:staffId',   (req, res, next) => timetableController.getTeacherTimetable(req, res, next));
router.get('/class/:className',   (req, res, next) => timetableController.getClassTimetable(req, res, next));
router.post('/upload',            uploadLimiter, upload.single('file'), validateMagicBytes(excelMimes), (req, res, next) => timetableController.uploadTimetable(req, res, next));
router.delete('/:id',             (req, res, next) => timetableController.deleteTimetable(req, res, next));
router.put('/:id/activate',       (req, res, next) => timetableController.setActiveTimetable(req, res, next));

export default router;
