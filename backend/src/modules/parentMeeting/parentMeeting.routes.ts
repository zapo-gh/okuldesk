import { Router } from 'express';
import { parentMeetingController } from './parentMeeting.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, requirePermission('parent-meeting'));

router.get('/classes', parentMeetingController.getClasses);
router.post('/data', parentMeetingController.getData);
router.post('/generate-pdf', parentMeetingController.generatePdf);

export default router;
