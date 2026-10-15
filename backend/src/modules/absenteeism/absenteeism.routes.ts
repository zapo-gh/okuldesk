import { Router } from 'express';
import { absenteeismController } from './absenteeism.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';
import { pdfUpload } from './pdfUpload.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';
import { uploadLimiter } from '../shared/middleware/rateLimit.middleware';

const router = Router();

router.use(authMiddleware);

// Okuma rotaları
router.get('/stats', requirePermission('absenteeism'), absenteeismController.getStats);
router.get('/', requirePermission('absenteeism'), absenteeismController.getAll);
router.get('/warning-count/:studentId', requirePermission(['absenteeism', 'students', 'warnings']), absenteeismController.getWarningCount);
router.get('/:id', requirePermission('absenteeism'), absenteeismController.getById);

// Mektup oluşturma ve silme
router.post(
  '/',
  requirePermission('absenteeism'),
  uploadLimiter,
  pdfUpload.single('pdf'),
  validateMagicBytes(['application/pdf', 'image/jpeg', 'image/png']),
  absenteeismController.create,
);
router.delete('/:id', requirePermission('absenteeism'), absenteeismController.delete);

// PDF servis rotaları
router.get('/:id/pdf', requirePermission('absenteeism'), absenteeismController.servePdf);
router.get('/:id/pdf/download', requirePermission('absenteeism'), absenteeismController.downloadPdf);
router.post('/open-archive-folder', requirePermission('absenteeism'), absenteeismController.openArchiveFolder);
router.post('/:id/open', requirePermission('absenteeism'), absenteeismController.openPdfInSystem);
router.post('/:id/show-in-folder', requirePermission('absenteeism'), absenteeismController.showInFolder);

export default router;
