import { Request, Response, NextFunction } from 'express';
import { invoiceService } from './invoice.service';
import { invoicePdfService } from './invoicePdf.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import fs from 'fs';

export class InvoiceController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const ay = (req.query.academicYear as string) || '2025-2026';
      const list = await invoiceService.getAll(ay);
      res.json({ success: true, data: list });
    } catch (e) {
      next(e);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.body.companyName || !req.body.type) {
        throw new AppError('Kurum Adı ve Fatura Türü zorunludur.', 400);
      }
      const data = await invoiceService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async parseInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('Dosya bulunamadı.', 400);
      const parsedData = await invoicePdfService.parseInvoice(req.file.path, req.file.originalname);
      res.json({ success: true, data: parsedData });
    } catch (e) {
      next(e);
    } finally {
      if (req.file && req.file.path) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await invoiceService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, mebbisNo, mysNo } = req.body;
      if (!status) throw new AppError('Durum alanı zorunludur.', 400);
      
      const data = await invoiceService.updateStatus(req.params.id, status, mebbisNo, mysNo);
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await invoiceService.delete(req.params.id);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  }
}

export const invoiceController = new InvoiceController();
