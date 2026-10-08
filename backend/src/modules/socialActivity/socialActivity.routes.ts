import { Router, Request, Response, NextFunction } from 'express';
import { socialActivityService } from '../shared/services/moduleServices';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';
import { generateSingleActivityPdf, generateAllActivitiesPdf } from './socialActivityPdf.generator';

const createSchema = z.object({
  name: z.string().min(1), type: z.string().optional(), description: z.string().optional(),
  plannedDate: z.string().optional(), academicYear: z.string().min(1),
  assignedStaffId: z.string().optional(), status: z.string().optional(), notes: z.string().optional(),

  extraData: z.string().optional(),
});

const router = Router();

router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await socialActivityService.getAll(ay) });
  } catch (e) { next(e); }
});

router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await socialActivityService.create(p.data) });
  } catch (e) { next(e); }
});

router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    await socialActivityService.update(req.params.id, p.data); 
    res.json({ success: true }); 
  }
  catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await socialActivityService.delete(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

router.post('/generate-single-pdf', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdfBuffer = await generateSingleActivityPdf(req.body);
    const fileName = `etkinlik-onay.pdf`;
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

router.post('/generate-all-pdf', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdfBuffer = await generateAllActivitiesPdf(req.body);
    const fileName = `ek7a-plani.pdf`;
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
