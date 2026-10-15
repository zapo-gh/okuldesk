import { Router, Request, Response, NextFunction } from 'express';
import { commemorativeDaysService } from '../shared/services/moduleServices';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1), startDate: z.string().min(1), endDate: z.string().min(1),
  academicYear: z.string().min(1), description: z.string().optional(),
  assignedStaffId: z.string().optional(), status: z.string().optional(),

  extraData: z.string().optional(),
});

const router = Router();

router.use(authMiddleware, requirePermission('commemorative-days'));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await commemorativeDaysService.getAll(ay) });
  } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await commemorativeDaysService.create(p.data) });
  } catch (e) { next(e); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    await commemorativeDaysService.update(req.params.id, p.data); 
    res.json({ success: true }); 
  }
  catch (e) { next(e); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try { await commemorativeDaysService.delete(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

export default router;
