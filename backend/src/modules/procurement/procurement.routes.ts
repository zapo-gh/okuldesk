import { Router } from 'express';
import { procurementController } from './procurement.controller';
import { authMiddleware } from '../shared/middleware/auth.middleware';
import { validate } from '../shared/middleware/validate.middleware';
import { createProcurementSchema } from './procurement.schema';

const router = Router();

router.use(authMiddleware);

router.get('/', procurementController.getAll);
router.get('/:id', procurementController.getById);
router.post('/', validate(createProcurementSchema), procurementController.create);
router.put('/:id', validate(createProcurementSchema), procurementController.update);
router.delete('/:id', procurementController.delete);

export default router;
