import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'temp_uploads/' });

// GET /api/settings/backup - download SQLite database as backup
router.get('/backup', authMiddleware, adminOnly, settingsController.backup);

// POST /api/settings/restore - upload SQLite database to replace current DB
router.post('/restore', authMiddleware, adminOnly, upload.single('dbfile'), settingsController.restore);

// GET /api/settings - get school settings
router.get('/', authMiddleware, adminOnly, settingsController.get);

// PUT /api/settings - update school settings
router.put('/', authMiddleware, adminOnly, settingsController.update);

export default router;
