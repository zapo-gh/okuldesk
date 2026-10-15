import { Router } from 'express';
import { auditController } from './audit.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

// 'audit-logs' yetkisine (veya ADMIN rolüne) sahip kullanıcılar erişebilir
router.use(authMiddleware, requirePermission('audit-logs'));

router.get('/logs', auditController.getLogs);

export default router;
