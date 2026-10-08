import { Router } from 'express';
import { procurementController } from './procurement.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { validate } from '../shared/middleware/validate.middleware';
import { createProcurementSchema } from './procurement.schema';

const router = Router();

router.get('/', authMiddleware, adminOnly, procurementController.getAll);
router.get('/:id', authMiddleware, adminOnly, procurementController.getById);
router.post('/', authMiddleware, adminOnly, validate(createProcurementSchema), procurementController.create);
router.put('/:id', authMiddleware, adminOnly, validate(createProcurementSchema), procurementController.update);
router.delete('/:id', authMiddleware, adminOnly, procurementController.delete);

export default router;
