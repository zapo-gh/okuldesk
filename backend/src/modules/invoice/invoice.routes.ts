import { Router } from 'express';
import { invoiceController } from './invoice.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
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

router.get('/', authMiddleware, adminOnly, invoiceController.getAll);
router.post('/', authMiddleware, adminOnly, invoiceController.create);
router.post('/parse-pdf', authMiddleware, adminOnly, upload.single('file'), invoiceController.parseInvoice);
router.put('/:id', authMiddleware, adminOnly, invoiceController.update);
router.put('/:id/status', authMiddleware, adminOnly, invoiceController.updateStatus);
router.delete('/:id', authMiddleware, adminOnly, invoiceController.delete);

export default router;
