import { Router, Request, Response, NextFunction } from 'express';
import { staffController } from './staff.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();
import { generateGuidanceReportPdf } from './guidanceReportPdf.generator';
import { generateClassTeachersListPdf } from './classTeachersListPdf.generator';

router.get('/', authMiddleware, adminOnly, staffController.getAll);
router.get('/deleted', authMiddleware, adminOnly, staffController.getDeleted);
router.get('/class/:className', authMiddleware, adminOnly, staffController.getByClass);
router.post('/bulk', authMiddleware, adminOnly, staffController.bulkCreate);
router.post('/bulk-restore', authMiddleware, adminOnly, staffController.bulkRestore);
router.post('/bulk-delete', authMiddleware, adminOnly, staffController.bulkDelete);
router.post('/', authMiddleware, adminOnly, staffController.create);
router.put('/:id', authMiddleware, adminOnly, staffController.update);
router.put('/:id/restore', authMiddleware, adminOnly, staffController.restore);
router.delete('/:id', authMiddleware, adminOnly, staffController.delete);

router.post('/generate-guidance-report-pdf', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/generate-class-teachers-list-pdf', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
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
