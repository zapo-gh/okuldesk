import { Router } from 'express';
import multer from 'multer';
import { studentsController } from './students.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';
import { uploadLimiter } from '../shared/middleware/rateLimit.middleware';
import { config } from '../shared/config';

const router = Router();

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) cb(null, true);
    else cb(new Error('Sadece Excel (.xlsx, .xls) dosyaları yüklenebilir.'));
  },
});

router.use(authMiddleware);

const excelMimes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/CDFV2',
  'application/zip',
  'application/x-cfb',
];

// Okuma rotaları (tüm oturum açmış kullanıcılar sınıfları ve öğrenci listesini görebilir)
router.get('/classes', studentsController.getClasses);
router.get('/360/:id', studentsController.get360);
router.get('/', studentsController.getAll);
router.get('/:id', studentsController.getById);

// Düzenleme / Değişiklik rotaları ('students' yetkisi gerektirir)
router.post('/import-excel', requirePermission('students'), uploadLimiter, excelUpload.single('file'), validateMagicBytes(excelMimes), studentsController.importExcel);
router.post('/import-parents', requirePermission('students'), uploadLimiter, excelUpload.single('file'), validateMagicBytes(excelMimes), studentsController.importParents);
router.post('/', requirePermission('students'), studentsController.create);
router.put('/:id', requirePermission('students'), studentsController.update);
router.post('/bulk-delete', requirePermission('students'), studentsController.bulkDelete);
router.delete('/bulk/delete-all', requirePermission('students'), studentsController.deleteAll);
router.delete('/:id', requirePermission('students'), studentsController.delete);
router.post('/:id/parents', requirePermission('students'), studentsController.addParent);
router.post('/:id/assign-parent', requirePermission('students'), studentsController.assignParent);
router.post('/parents/:parentId/reset-password', requirePermission('students'), studentsController.resetParentPassword);
router.put('/parents/:parentId', requirePermission('students'), studentsController.updateParent);
router.delete('/:id/parents/:parentId', requirePermission('students'), studentsController.removeParent);

export default router;
