import { Router } from 'express';
import { parentNotificationController } from './parentNotification.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, requirePermission('parent-notification'));

router.post('/generate-pdf', parentNotificationController.generatePdf);

export default router;
