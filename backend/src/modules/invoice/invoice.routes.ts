import { Router } from 'express';
import { invoiceController } from './invoice.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';
import multer from 'multer';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const upload = multer({ 
  dest: 'uploads/temp/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const isPdfOrXml = file.mimetype === 'application/pdf' || file.mimetype === 'text/xml' || file.originalname.toLowerCase().endsWith('.xml') || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdfOrXml) {
      return cb(new AppError('Sadece PDF veya XML dosyaları yüklenebilir.', 400));
    }
    cb(null, true);
  }
});

const router = Router();

router.use(authMiddleware, requirePermission('invoice-tracking'));

router.get('/', invoiceController.getAll);
router.post('/', invoiceController.create);
router.post('/parse-pdf', upload.single('file'), invoiceController.parseInvoice);
router.put('/:id', invoiceController.update);
router.put('/:id/status', invoiceController.updateStatus);
router.delete('/:id', invoiceController.delete);

export default router;
