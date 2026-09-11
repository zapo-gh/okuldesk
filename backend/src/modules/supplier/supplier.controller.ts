import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const emptyStringToNull = (val: any) => (val === '' ? null : val);

const supplierSchema = z.object({
  name:          z.string().min(2, 'Firma adı en az 2 karakter olmalıdır.').max(200),
  taxNumber:     z.preprocess(emptyStringToNull, z.string().max(20).optional().nullable()),
  taxOffice:     z.preprocess(emptyStringToNull, z.string().max(100).optional().nullable()),
  address:       z.preprocess(emptyStringToNull, z.string().max(500).optional().nullable()),
  phone:         z.preprocess(emptyStringToNull, z.string().max(30).optional().nullable()),
  email:         z.preprocess(emptyStringToNull, z.string().email('Geçersiz e-posta adresi.').max(200).optional().nullable()),
  iban:          z.preprocess(emptyStringToNull, z.string().max(50).optional().nullable()),
  contactPerson: z.preprocess(emptyStringToNull, z.string().max(200).optional().nullable()),
  isActive:      z.boolean().optional().default(true),
});

export const supplierController = {
  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: suppliers });
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const supplier = await prisma.supplier.findFirst({
        where: { id, deletedAt: null },
      });
      
      if (!supplier) {
        throw new AppError('Firma bulunamadı.', 404);
      }
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const p = supplierSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);

      const supplier = await prisma.supplier.create({
        data: p.data,
      });

      res.status(201).json({ success: true, message: 'Firma başarıyla eklendi.', data: { id: supplier.id } });
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new AppError('Firma bulunamadı.', 404);

      const p = supplierSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);

      await prisma.supplier.update({
        where: { id },
        data: p.data,
      });

      res.json({ success: true, message: 'Firma başarıyla güncellendi.' });
    } catch (error) {
      next(error);
    }
  },

  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new AppError('Firma bulunamadı.', 404);

      await prisma.supplier.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      
      res.json({ success: true, message: 'Firma silindi.' });
    } catch (error) {
      next(error);
    }
  },
};
