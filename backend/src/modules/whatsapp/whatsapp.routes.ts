import { Router } from 'express';
import multer from 'multer';
import { whatsappController } from './whatsapp.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';
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

router.use(authMiddleware);

// WhatsApp genel durumu (tüm oturum açmış kullanıcılar görebilir)
router.get('/status', whatsappController.getStatus);

// WhatsApp oturum yönetimi ('whatsapp' yetkisi)
router.post('/connect', requirePermission('whatsapp'), whatsappController.connect);
router.post('/disconnect', requirePermission('whatsapp'), whatsappController.disconnect);

// Devamsızlık mektubu WhatsApp gönderimleri
router.post('/send/absenteeism/:id', requirePermission(['absenteeism', 'daily-absenteeism', 'whatsapp']), whatsappController.sendAbsenteeism);
router.post('/preview/absenteeism/:id', requirePermission(['absenteeism', 'daily-absenteeism', 'whatsapp']), whatsappController.previewAbsenteeism);
router.get('/full-image/absenteeism/:id', requirePermission(['absenteeism', 'daily-absenteeism', 'whatsapp']), whatsappController.fullImageAbsenteeism);

// Uyarı mektubu WhatsApp gönderimleri
router.post('/send/warning/:id', requirePermission(['warnings', 'whatsapp']), whatsappController.sendWarning);
router.post('/preview/warning/:id', requirePermission(['warnings', 'whatsapp']), whatsappController.previewWarning);
router.post('/send-consent', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.sendConsentRequestToParent);

// WhatsApp İletişim Onay Yönetimi (İstatistik, Excel Export ve Import)
router.get('/consents/stats', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.getConsentStats);
router.get('/consents/list', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.getConsentList);
router.post('/consents/manual', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.manualUpdateConsent);
router.get('/consents/pdf/contact/:contactId', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.downloadConsentPdf);
router.get('/consents/pdf/class/:className', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.downloadClassConsentPdf);
router.get('/consents/export', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.exportConsents);
router.post(
  '/consents/import',
  requirePermission(['whatsapp-consent', 'whatsapp']),
  uploadLimiter,
  excelUpload.single('file'),
  validateMagicBytes(excelMimes),
  whatsappController.importConsents
);

// Cloudflare Tünel Yönetimi
router.get('/tunnel/status', requirePermission(['whatsapp', 'settings']), whatsappController.getTunnelStatus);
router.post('/tunnel/start', requirePermission(['whatsapp', 'settings']), whatsappController.startTunnel);
router.post('/tunnel/stop', requirePermission(['whatsapp', 'settings']), whatsappController.stopTunnel);

// Firebase Bulut Senkronizasyonu
router.get('/firebase/status', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.getFirebaseStatus);
router.post('/firebase/sync', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.syncFirebaseConsents);
router.post('/firebase/upload', requirePermission(['whatsapp-consent', 'whatsapp']), whatsappController.uploadFirebaseConsents);

export default router;
