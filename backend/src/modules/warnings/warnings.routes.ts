import { Router } from 'express';
import { warningsController } from './warnings.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Okuma rotaları (uyarılar modülü veya öğrenci 360 detayları erişebilir)
router.get('/behaviors', requirePermission(['warnings', 'students']), warningsController.getBehaviors);
router.get('/stats', requirePermission('warnings'), warningsController.getStats);
router.get('/', requirePermission('warnings'), warningsController.getAll);
router.get('/warning-count/:studentId', requirePermission(['warnings', 'students', 'absenteeism']), warningsController.getWarningCount);
router.get('/:id', requirePermission(['warnings', 'students']), warningsController.getById);
router.get('/:id/pdf', requirePermission(['warnings', 'students']), warningsController.servePdf);
router.get('/:id/pdf/download', requirePermission(['warnings', 'students']), warningsController.downloadPdf);
router.get('/:id/whatsapp', requirePermission(['warnings', 'whatsapp']), warningsController.getWhatsAppLink);

// Ekleme ve silme rotaları
router.post('/', requirePermission('warnings'), warningsController.create);
router.delete('/:id', requirePermission('warnings'), warningsController.delete);

export default router;
