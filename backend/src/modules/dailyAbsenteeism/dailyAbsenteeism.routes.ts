import { Router } from 'express';
import { dailyAbsenteeismController } from './dailyAbsenteeism.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, requirePermission('daily-absenteeism'));

router.post('/lookup-numbers', (req, res, next) => dailyAbsenteeismController.lookupNumbers(req, res, next));
router.get('/students-by-class', (req, res, next) => dailyAbsenteeismController.getStudentsByClass(req, res, next));
router.post('/check-duplicates', (req, res, next) => dailyAbsenteeismController.checkDuplicates(req, res, next));
router.get('/history', (req, res, next) => dailyAbsenteeismController.getHistory(req, res, next));
router.post('/send-single', (req, res, next) => dailyAbsenteeismController.sendSingle(req, res, next));
router.delete('/history/:id', (req, res, next) => dailyAbsenteeismController.deleteHistoryItem(req, res, next));

export default router;
