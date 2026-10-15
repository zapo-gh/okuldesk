import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'temp_uploads/' });

// GET /api/settings/backup - download SQLite database as backup
router.get('/backup', authMiddleware, requirePermission('settings'), settingsController.backup);

// POST /api/settings/restore - upload SQLite database to replace current DB
router.post('/restore', authMiddleware, requirePermission('settings'), upload.single('dbfile'), settingsController.restore);

// GET /api/settings - get school settings (herhangi bir oturum açmış personel okuyabilir)
router.get('/', authMiddleware, settingsController.get);

// PUT /api/settings - update school settings
router.put('/', authMiddleware, requirePermission('settings'), settingsController.update);

export default router;
