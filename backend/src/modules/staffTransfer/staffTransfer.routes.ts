import { Router, Request, Response, NextFunction } from 'express';
import { staffTransferService } from '../shared/services/moduleServices';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';
import { generateStaffTransferPdf } from './staffTransferPdf.generator';

const createSchema = z.object({
  staffName: z.string().min(1), staffTitle: z.string().optional(),
  tcKimlikNo: z.string().optional(), sicilNo: z.string().optional(),
  currentSchool: z.string().optional(), newSchool: z.string().optional(),
  transferDate: z.string().min(1), transferReason: z.string().optional(),
  academicYear: z.string().min(1), notes: z.string().optional(),
  extraData: z.string().optional(),
});

const router = Router();

router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await staffTransferService.getAll(ay) });
  } catch (e) { next(e); }
});

router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await staffTransferService.create(p.data) });
  } catch (e) { next(e); }
});

router.post('/generate-pdf', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    if (!data || !data.staffName) {
      throw new AppError('Personel adı zorunludur.', 400);
    }
    const pdfBuffer = await generateStaffTransferPdf(data);
    const safeName = data.staffName.replace(/[^\w\s]/g, '_').trim().replace(/\s+/g, '-');
    const fileName = `nakil-bildirimi-${safeName}.pdf`;

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

router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    await staffTransferService.update(req.params.id, p.data); 
    res.json({ success: true }); 
  }
  catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await staffTransferService.delete(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

export default router;
