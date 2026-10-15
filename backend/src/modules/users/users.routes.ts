import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();

// 'users' yetkisine (veya ADMIN rolüne) sahip kullanıcılar erişebilir
router.use(authMiddleware, requirePermission('users'));

router.get('/permissions-meta', usersController.getMeta);
router.get('/', usersController.list);
router.post('/', usersController.create);
router.get('/:id', usersController.getOne);
router.put('/:id', usersController.update);
router.post('/:id/reset-password', usersController.resetPassword);
router.delete('/:id', usersController.delete);

export default router;
