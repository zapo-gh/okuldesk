import { Router } from 'express';
import { commissionController } from './commission.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, requirePermission('commission'));

router.get('/', commissionController.getAll);
router.post('/', commissionController.create);
router.put('/:id', commissionController.update);
router.delete('/:id', commissionController.delete);

// Roller
router.post('/roles', commissionController.addRole);
router.delete('/roles/:id', commissionController.deleteRole);

// Atamalar
router.post('/assign', commissionController.assign);
router.delete('/unassign/:roleId', commissionController.unassign);

export default router;
