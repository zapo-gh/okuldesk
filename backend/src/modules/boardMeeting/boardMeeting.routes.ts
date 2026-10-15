import { Router, Request, Response, NextFunction } from 'express';
import { boardMeetingController } from './boardMeeting.controller';
import { authMiddleware, requirePermission } from '../shared/middleware/auth.middleware';

const router = Router();
import { generateBoardMeetingPdf } from './boardMeetingPdf.generator';

router.use(authMiddleware, requirePermission('commission'));

router.get('/', boardMeetingController.getAll);
router.get('/:id', boardMeetingController.getById);
router.post('/', boardMeetingController.create);
router.put('/:id', boardMeetingController.update);
router.delete('/:id', boardMeetingController.delete);

// Gündem maddeleri
router.post('/agenda', boardMeetingController.addAgendaItem);
router.put('/agenda/:id', boardMeetingController.updateAgendaItem);
router.delete('/agenda/:id', boardMeetingController.deleteAgendaItem);

router.post('/generate-pdf', async (req: Request, res: Response, next: NextFunction) => {
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
