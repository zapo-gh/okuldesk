import { Router, Request, Response, NextFunction } from 'express';
import { studentClubService } from '../shared/services/moduleServices';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';

const clubSchema = z.object({
  name: z.string().min(1), description: z.string().optional(),
  assignedStaffId: z.string().optional(), meetingDay: z.string().optional(),
  meetingTime: z.string().optional(), maxMembers: z.number().optional(),
  academicYear: z.string().min(1),

  extraData: z.string().optional(),
});
const memberSchema = z.object({
  clubId: z.string().min(1), studentId: z.string().min(1), role: z.string().optional(),

  extraData: z.string().optional(),
});

const router = Router();

// Kulüpler
router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await studentClubService.getAll(ay) });
  } catch (e) { next(e); }
});

router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = clubSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await studentClubService.create(p.data) });
  } catch (e) { next(e); }
});

router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = clubSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    await studentClubService.update(req.params.id, p.data); 
    res.json({ success: true }); 
  }
  catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await studentClubService.delete(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

// Üyeler
router.get('/:id/members', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await studentClubService.getMembers(req.params.id) }); }
  catch (e) { next(e); }
});

router.post('/members', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = memberSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await studentClubService.addMember(p.data) });
  } catch (e) { next(e); }
});

router.delete('/members/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await studentClubService.removeMember(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

import multer from 'multer';
import { parseClubListPdf } from './utils/clubListParser';
import prisma from '../shared/utils/prisma';

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-pdf', authMiddleware, adminOnly, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) throw new AppError('Lütfen bir PDF dosyası seçin.', 400);

    const academicYear = req.body.academicYear || '2025-2026';
    
    // Parse the PDF
    const parsedEntries = await parseClubListPdf(file.buffer, academicYear);

    let createdCount = 0;
    let updatedCount = 0;

    // Group parsed entries by club name
    const groupedClubs = new Map<string, { staffIds: string[], staffNames: string[] }>();
    
    for (const entry of parsedEntries) {
      if (!groupedClubs.has(entry.clubName)) {
        groupedClubs.set(entry.clubName, { staffIds: [], staffNames: [] });
      }
      if (entry.matchedStaffId && entry.matchedStaffName) {
        const clubGroup = groupedClubs.get(entry.clubName)!;
        if (!clubGroup.staffIds.includes(entry.matchedStaffId)) {
          clubGroup.staffIds.push(entry.matchedStaffId);
          clubGroup.staffNames.push(entry.matchedStaffName);
        }
      }
    }

    for (const [clubName, data] of groupedClubs.entries()) {
      let club = await prisma.studentClub.findFirst({
        where: { name: clubName, academicYear }
      });

      const primaryStaffId = data.staffIds.length > 0 ? data.staffIds[0] : null;

      let extraDataStr: string | null = null;
      if (data.staffIds.length > 0) {
        let existingExtra: any = {};
        if (club?.extraData) {
          try { existingExtra = JSON.parse(club.extraData); } catch (e) {}
        }
        existingExtra.staffIds = data.staffIds;
        existingExtra.staffNames = data.staffNames;
        extraDataStr = JSON.stringify(existingExtra);
      } else if (club?.extraData) {
        extraDataStr = club.extraData;
      }

      if (!club) {
        await prisma.studentClub.create({
          data: {
            name: clubName,
            academicYear,
            assignedStaffId: primaryStaffId,
            extraData: extraDataStr,
            isActive: true,
            maxMembers: 30
          }
        });
        createdCount++;
      } else {
        await prisma.studentClub.update({
          where: { id: club.id },
          data: { 
            assignedStaffId: primaryStaffId,
            extraData: extraDataStr,
            deletedAt: null // Restore from soft delete
          }
        });
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `PDF başarıyla işlendi. ${createdCount} yeni kulüp eklendi, ${updatedCount} kulüp güncellendi.`
    });
  } catch (e) {
    next(e);
  }
});

export default router;
