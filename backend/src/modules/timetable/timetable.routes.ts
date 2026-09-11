import { Router } from 'express';
import multer from 'multer';
import { timetableController } from './timetable.controller';
import { authMiddleware } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const router = Router();

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

router.use(authMiddleware);

router.get('/active',             (req, res, next) => timetableController.getActiveTimetable(req, res, next));
router.get('/history',            (req, res, next) => timetableController.getTimetableHistory(req, res, next));
router.get('/teacher/:staffId',   (req, res, next) => timetableController.getTeacherTimetable(req, res, next));
router.get('/class/:className',   (req, res, next) => timetableController.getClassTimetable(req, res, next));
router.post('/upload',            upload.single('file'), (req, res, next) => timetableController.uploadTimetable(req, res, next));
router.delete('/:id',             (req, res, next) => timetableController.deleteTimetable(req, res, next));
router.put('/:id/activate',       (req, res, next) => timetableController.setActiveTimetable(req, res, next));

export default router;
