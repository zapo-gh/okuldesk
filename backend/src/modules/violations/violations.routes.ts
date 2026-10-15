import { Router } from 'express';
import { violationsController } from './violations.controller';
import { getViolationSource } from './violation-source.controller';
import { violationImageUpload } from './imageUpload.middleware';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';
import { compressImage } from '../shared/middleware/imageCompressor.middleware';
import { uploadLimiter, expensiveOperationLimiter } from '../shared/middleware/rateLimit.middleware';

const router = Router();

router.use(authMiddleware);

// Okuma rotaları
router.get('/stats', requirePermission('violations'), violationsController.getStats);
router.get('/student/:studentId', requirePermission(['violations', 'students']), violationsController.getStudentHistory.bind(violationsController));
router.get('/student/record/:violationId/source', requirePermission(['violations', 'students']), getViolationSource);
router.get('/uploads', requirePermission('violations'), violationsController.getUploads);
router.get('/uploads/:uploadId', requirePermission('violations'), violationsController.getUploadDetail);

router.post(
  '/upload',
  requirePermission('violations'),
  uploadLimiter,
  violationImageUpload.single('image'),
  validateMagicBytes(['image/jpeg', 'image/png']),
  compressImage,
  violationsController.upload,
);

router.post('/process-text', requirePermission('violations'), expensiveOperationLimiter, violationsController.processText);

router.post('/:uploadId/confirm', requirePermission('violations'), violationsController.confirmViolations);
router.post('/:uploadId/manual', requirePermission('violations'), violationsController.addManual);

router.delete('/record/:violationId', requirePermission('violations'), violationsController.removeViolation);
router.delete('/uploads/:uploadId', requirePermission('violations'), violationsController.deleteUpload);

export default router;
