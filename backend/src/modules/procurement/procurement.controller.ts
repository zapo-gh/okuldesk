import { Request, Response } from 'express';
import { procurementService } from './procurement.service';
import { asyncHandler } from '../shared/middleware/asyncHandler';

export const procurementController = {
  // Liste Getir
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const list = await procurementService.getAll();
    // Frontend itemCount ve supplierCount alanlarını bekliyor.
    // _count nesnesini flat hale getirelim.
    const formattedList = list.map(item => ({
      ...item,
      itemCount: item._count?.items || 0,
      supplierCount: item._count?.offers || 0 // Not: Gerçekte supplier distinct count'u istiyor olabilir, frontend basit bir rakam için bunu yeterli bulabilir.
    }));
    res.json({ success: true, data: formattedList });
  }),

  // Tekil Detay Getir (Item'lar ve Offer'lar dahil)
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const procurement = await procurementService.getById(id);
    
    if (!procurement) {
      return res.status(404).json({ success: false, message: 'Bulunamadı' });
    }

    // Frontend, flat bir obje içinde arrayleri bekliyor.
    res.json({ 
      success: true, 
      data: {
        ...procurement,
        commissionMembers: procurement.commissionMembersList,
        items: procurement.items,
        offers: procurement.offers.map(o => ({
          ...o,
          supplierName: o.supplier?.name,
          taxNumber: o.supplier?.taxNumber
        }))
      }
    });
  }),

  // Yeni Doğrudan Temin
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await procurementService.create(req.body);
    res.json({ success: true, message: 'Doğrudan Temin başarıyla oluşturuldu.', data: { id: result.id } });
  }),

  // Güncelleme
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await procurementService.update(id, req.body);
    res.json({ success: true, message: 'Doğrudan Temin başarıyla güncellendi.' });
  }),

  // Silme
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await procurementService.delete(id);
    res.json({ success: true, message: 'Silindi' });
  })
};
