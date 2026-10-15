import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authMiddleware } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/summary', dashboardController.getSummary);

export default router;
