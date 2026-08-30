import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const supplierSchema = z.object({
  name:          z.string().min(2, 'Firma adı en az 2 karakter olmalıdır.').max(200),
  taxNumber:     z.string().max(20).optional().nullable(),
  taxOffice:     z.string().max(100).optional().nullable(),
  address:       z.string().max(500).optional().nullable(),
  phone:         z.string().max(30).optional().nullable(),
  email:         z.string().email('Geçersiz e-posta adresi.').max(200).optional().nullable(),
  iban:          z.string().max(50).optional().nullable(),
  contactPerson: z.string().max(200).optional().nullable(),
  isActive:      z.boolean().optional().default(true),
});

export const supplierController = {
  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const suppliers = await prisma.$queryRaw`SELECT * FROM "Supplier" ORDER BY "name" ASC`;
      res.json({ success: true, data: suppliers });
    } catch (error) {
      next(error);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const supplier: any = await prisma.$queryRaw`SELECT * FROM "Supplier" WHERE "id" = ${id}`;
      if (!supplier || supplier.length === 0) {
        throw new AppError('Firma bulunamadı.', 404);
      }
      res.json({ success: true, data: supplier[0] });
    } catch (error) {
      next(error);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const p = supplierSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);

      const { name, taxNumber, taxOffice, address, phone, email, iban, contactPerson, isActive } = p.data;
      const id = uuidv4();

      await prisma.$executeRaw`
        INSERT INTO "Supplier" ("id", "name", "taxNumber", "taxOffice", "address", "phone", "email", "iban", "contactPerson", "isActive")
        VALUES (${id}, ${name}, ${taxNumber}, ${taxOffice}, ${address}, ${phone}, ${email}, ${iban}, ${contactPerson}, ${isActive})
      `;

      res.status(201).json({ success: true, message: 'Firma başarıyla eklendi.', data: { id } });
    } catch (error) {
      next(error);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const p = supplierSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);

      const { name, taxNumber, taxOffice, address, phone, email, iban, contactPerson, isActive } = p.data;

      await prisma.$executeRaw`
        UPDATE "Supplier"
        SET "name" = ${name}, "taxNumber" = ${taxNumber}, "taxOffice" = ${taxOffice},
            "address" = ${address}, "phone" = ${phone}, "email" = ${email},
            "iban" = ${iban}, "contactPerson" = ${contactPerson}, "isActive" = ${isActive}
        WHERE "id" = ${id}
      `;

      res.json({ success: true, message: 'Firma başarıyla güncellendi.' });
    } catch (error) {
      next(error);
    }
  },

  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.$executeRaw`DELETE FROM "Supplier" WHERE "id" = ${id}`;
      res.json({ success: true, message: 'Firma silindi.' });
    } catch (error) {
      next(error);
    }
  },
};


