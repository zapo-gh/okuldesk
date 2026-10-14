import { Router } from 'express';
import multer from 'multer';
import { whatsappController } from './whatsapp.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';
import { uploadLimiter } from '../shared/middleware/rateLimit.middleware';
import { config } from '../shared/config';

const router = Router();

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) cb(null, true);
    else cb(new Error('Sadece Excel (.xlsx, .xls) dosyaları yüklenebilir.'));
  },
});

const excelMimes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/CDFV2',
  'application/zip',
  'application/x-cfb',
];

router.get('/status', authMiddleware, adminOnly, whatsappController.getStatus);
router.post('/connect', authMiddleware, adminOnly, whatsappController.connect);
router.post('/disconnect', authMiddleware, adminOnly, whatsappController.disconnect);
router.post('/send/absenteeism/:id', authMiddleware, adminOnly, whatsappController.sendAbsenteeism);
router.post('/preview/absenteeism/:id', authMiddleware, adminOnly, whatsappController.previewAbsenteeism);
router.get('/full-image/absenteeism/:id', authMiddleware, adminOnly, whatsappController.fullImageAbsenteeism);
router.post('/send/warning/:id', authMiddleware, adminOnly, whatsappController.sendWarning);
router.post('/preview/warning/:id', authMiddleware, adminOnly, whatsappController.previewWarning);
router.post('/send-consent', authMiddleware, adminOnly, whatsappController.sendConsentRequestToParent);

// WhatsApp İletişim Onay Yönetimi (İstatistik, Excel Export ve Import)
router.get('/consents/stats', authMiddleware, adminOnly, whatsappController.getConsentStats);
router.get('/consents/list', authMiddleware, adminOnly, whatsappController.getConsentList);
router.post('/consents/manual', authMiddleware, adminOnly, whatsappController.manualUpdateConsent);
router.get('/consents/pdf/contact/:contactId', authMiddleware, adminOnly, whatsappController.downloadConsentPdf);
router.get('/consents/pdf/class/:className', authMiddleware, adminOnly, whatsappController.downloadClassConsentPdf);
router.get('/consents/export', authMiddleware, adminOnly, whatsappController.exportConsents);
router.post(
  '/consents/import',
  authMiddleware,
  adminOnly,
  uploadLimiter,
  excelUpload.single('file'),
  validateMagicBytes(excelMimes),
  whatsappController.importConsents
);

// Cloudflare Tünel Yönetimi
router.get('/tunnel/status', authMiddleware, adminOnly, whatsappController.getTunnelStatus);
router.post('/tunnel/start', authMiddleware, adminOnly, whatsappController.startTunnel);
router.post('/tunnel/stop', authMiddleware, adminOnly, whatsappController.stopTunnel);

// Firebase Bulut Senkronizasyonu
router.get('/firebase/status', authMiddleware, adminOnly, whatsappController.getFirebaseStatus);
router.post('/firebase/sync', authMiddleware, adminOnly, whatsappController.syncFirebaseConsents);
router.post('/firebase/upload', authMiddleware, adminOnly, whatsappController.uploadFirebaseConsents);

export default router;
