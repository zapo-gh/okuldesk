import { Request, Response, NextFunction } from 'express';
import { generateTebligPdf, TebligData } from './tebligPdf.generator';
import prisma from '../shared/utils/prisma';
import fs from 'fs';
import path from 'path';

class TebligController {
  async generatePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as TebligData;
      if (!data.adiSoyadi || !data.adiSoyadi.trim()) {
        return res.status(400).json({ success: false, message: 'Adı Soyadı zorunludur.' });
      }

      const pdfBuffer = await generateTebligPdf(data);
      const safeName = data.adiSoyadi.replace(/[^\w\s]/g, '_').trim().replace(/\s+/g, '-');
      const fileName = `teblig-${safeName}-${Date.now()}.pdf`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'teblig');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);

      const staffId = req.body.staffId || null;

      await prisma.tebligDocument.create({
        data: {
          staffId: staffId,
          personnelName: data.adiSoyadi,
          documentSubject: data.tebligatinKonusu || null,
          documentDateNum: data.tebligTarihSayi || null,
          pdfPath: `/uploads/teblig/${fileName}`,
          academicYear: '2025-2026',
        }
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(pdfBuffer.length),
      });
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const docs = await prisma.tebligDocument.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: docs });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prisma.tebligDocument.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      res.json({ success: true, message: 'Belge silindi.' });
    } catch (err) {
      next(err);
    }
  }
}

export const tebligController = new TebligController();

