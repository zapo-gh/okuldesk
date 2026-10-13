import { Router } from 'express';
import { absenteeismController } from './absenteeism.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { pdfUpload } from './pdfUpload.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';
import { uploadLimiter } from '../shared/middleware/rateLimit.middleware';

const router = Router();

// Admin routes
router.get('/stats', authMiddleware, adminOnly, absenteeismController.getStats);
router.get('/', authMiddleware, adminOnly, absenteeismController.getAll);
router.get('/warning-count/:studentId', authMiddleware, adminOnly, absenteeismController.getWarningCount);
router.get('/:id', authMiddleware, adminOnly, absenteeismController.getById);
router.post(
  '/',
  authMiddleware,
  adminOnly,
  uploadLimiter,
  pdfUpload.single('pdf'),
  validateMagicBytes(['application/pdf', 'image/jpeg', 'image/png']),
  absenteeismController.create,
);
router.delete('/:id', authMiddleware, adminOnly, absenteeismController.delete);

// PDF serving routes (admin only)
router.get('/:id/pdf', authMiddleware, adminOnly, absenteeismController.servePdf);
router.get('/:id/pdf/download', authMiddleware, adminOnly, absenteeismController.downloadPdf);
router.post('/open-archive-folder', authMiddleware, adminOnly, absenteeismController.openArchiveFolder);
router.post('/:id/open', authMiddleware, adminOnly, absenteeismController.openPdfInSystem);
router.post('/:id/show-in-folder', authMiddleware, adminOnly, absenteeismController.showInFolder);

export default router;
