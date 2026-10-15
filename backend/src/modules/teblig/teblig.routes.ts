import { Router } from 'express';
import { tebligController } from './teblig.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, requirePermission('teblig'));
router.post('/generate-pdf', tebligController.generatePdf);
router.get('/', tebligController.getAll);
router.get('/:id/pdf', tebligController.getPdf);
router.delete('/:id', tebligController.delete);

export default router;
