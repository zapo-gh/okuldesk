import { Router, Request, Response, NextFunction } from 'express';
import { boardMeetingController } from './boardMeeting.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();
import { generateBoardMeetingPdf } from './boardMeetingPdf.generator';

router.get('/', authMiddleware, adminOnly, boardMeetingController.getAll);
router.get('/:id', authMiddleware, adminOnly, boardMeetingController.getById);
router.post('/', authMiddleware, adminOnly, boardMeetingController.create);
router.put('/:id', authMiddleware, adminOnly, boardMeetingController.update);
router.delete('/:id', authMiddleware, adminOnly, boardMeetingController.delete);

// Gündem maddeleri
router.post('/agenda', authMiddleware, adminOnly, boardMeetingController.addAgendaItem);
router.put('/agenda/:id', authMiddleware, adminOnly, boardMeetingController.updateAgendaItem);
router.delete('/agenda/:id', authMiddleware, adminOnly, boardMeetingController.deleteAgendaItem);

router.post('/generate-pdf', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pdfBuffer = await generateBoardMeetingPdf(req.body);
    const fileName = `kurul-toplantisi.pdf`;

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
