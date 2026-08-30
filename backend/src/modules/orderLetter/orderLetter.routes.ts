import { Router, Request, Response } from 'express';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import prisma from '../shared/utils/prisma';

const router = Router();

// Tüm sipariş mektuplarını getir
router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { academicYear } = req.query;
    const letters = await prisma.orderLetter.findMany({
      where: academicYear ? { academicYear: String(academicYear) } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { orderItems: true }
    });
    
    // items alanını frontend'in beklediği formata (diziye) eşle
    const mapped = letters.map(l => ({
      ...l,
      items: l.orderItems
    }));
    
    res.json({ success: true, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Yeni sipariş mektubu ekle
router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { subject, supplierName, supplierAddress, date, deliveryDate, academicYear, items, notes, extraData } = req.body;
    const letter = await prisma.orderLetter.create({
      data: {
        subject,
        supplierName,
        supplierAddress,
        date,
        deliveryDate,
        academicYear,
        notes,
        extraData,
        orderItems: {
          create: Array.isArray(items) ? items.map((i: any) => ({
            name: i.name,
            quantity: Number(i.quantity) || 1,
            unit: i.unit || 'Adet',
            unitPrice: Number(i.unitPrice) || 0,
            total: Number(i.total) || 0
          })) : []
        }
      }
    });
    res.json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sipariş mektubu güncelle
router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, supplierName, supplierAddress, date, deliveryDate, academicYear, items, notes, extraData } = req.body;
    const letter = await prisma.orderLetter.update({
      where: { id },
      data: {
        subject,
        supplierName,
        supplierAddress,
        date,
        deliveryDate,
        academicYear,
        notes,
        extraData,
        orderItems: {
          deleteMany: {},
          create: Array.isArray(items) ? items.map((i: any) => ({
            name: i.name,
            quantity: Number(i.quantity) || 1,
            unit: i.unit || 'Adet',
            unitPrice: Number(i.unitPrice) || 0,
            total: Number(i.total) || 0
          })) : []
        }
      }
    });
    res.json({ success: true, data: letter });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sipariş mektubu sil
router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.orderLetter.delete({ where: { id } });
    res.json({ success: true, message: 'Silindi' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
