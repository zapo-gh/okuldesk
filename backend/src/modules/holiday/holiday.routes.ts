import { Router } from 'express';
import { holidayController } from './holiday.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, requirePermission('holidays'));

router.get('/', holidayController.getAll);
router.post('/', holidayController.create);
router.put('/:id', holidayController.update);
router.delete('/:id', holidayController.delete);

export default router;
