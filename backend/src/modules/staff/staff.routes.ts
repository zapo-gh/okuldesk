import { Router, Request, Response, NextFunction } from 'express';
import { staffController } from './staff.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();
import { generateGuidanceReportPdf } from './guidanceReportPdf.generator';
import { generateClassTeachersListPdf } from './classTeachersListPdf.generator';

router.use(authMiddleware);

// Okuma rotaları (öğretmen/personel listesi tüm ilgili modüllerce okunabilir)
router.get('/', staffController.getAll);
router.get('/deleted', requirePermission('staff'), staffController.getDeleted);
router.get('/class/:className', staffController.getByClass);

// Personel ekleme / güncelleme / silme rotaları
router.post('/bulk', requirePermission('staff'), staffController.bulkCreate);
router.post('/bulk-restore', requirePermission('staff'), staffController.bulkRestore);
router.post('/bulk-delete', requirePermission('staff'), staffController.bulkDelete);
router.post('/', requirePermission('staff'), staffController.create);
router.put('/:id', requirePermission('staff'), staffController.update);
router.put('/:id/restore', requirePermission('staff'), staffController.restore);
router.delete('/:id', requirePermission('staff'), staffController.delete);

// Rapor ve PDF rotaları
router.post('/generate-guidance-report-pdf', requirePermission(['staff', 'class-teachers']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdfBuffer = await generateGuidanceReportPdf(req.body);
    const safeName = (req.body.staffName || 'rapor').replace(/[^\w\s]/g, '_').trim().replace(/\s+/g, '-');
    const fileName = `rehberlik-raporu-${safeName}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.send(pdfBuffer);
  } catch (e) {
    next(e);
  }
});

router.post('/generate-class-teachers-list-pdf', requirePermission(['staff', 'class-teachers']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdfBuffer = await generateClassTeachersListPdf(req.body);
    const fileName = `sinif-rehber-ogretmenleri.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.send(pdfBuffer);
  } catch (e) {
    next(e);
  }
});

export default router;
