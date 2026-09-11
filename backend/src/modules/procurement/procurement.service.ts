import prisma from '../shared/utils/prisma';
import { v4 as uuidv4 } from 'uuid';

export class ProcurementService {
  async getAll() {
    return prisma.procurement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { items: true, offers: true }
        }
      }
    });
  }

  async getById(id: string) {
    return prisma.procurement.findUnique({
      where: { id, deletedAt: null },
      include: {
        commissionMembersList: true,
        items: true,
        offers: {
          include: {
            supplier: {
              select: { name: true, taxNumber: true }
            }
          }
        }
      }
    });
  }

  async create(data: any) {
    const procurementId = uuidv4();
    const { title, date, academicYear, procedureType, status, commissionMembers, items, offers } = data;

    let estimatedCost = 0;
    if (items && Array.isArray(items)) {
      estimatedCost = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.estimatedUnitPrice || 0)), 0);
    }

    return prisma.$transaction(async (tx) => {
      const proc = await tx.procurement.create({
        data: {
          id: procurementId,
          title,
          date,
          procedureType: procedureType || '22/d',
          status: status || 'ONAY_BEKLIYOR',
          academicYear,
          estimatedCost,
          commissionMembersList: {
            create: Array.isArray(commissionMembers) ? commissionMembers.map((m: any) => ({
              fullName: typeof m === 'string' ? m : (m.name || m.fullName),
              role: typeof m === 'string' ? 'Üye' : (m.role || 'Üye')
            })) : []
          }
        }
      });

      const itemMap = new Map<string, string>();
      if (items && items.length > 0) {
        for (const item of items) {
          const realItemId = uuidv4();
          itemMap.set(item.id || item.tempId, realItemId);
          await tx.procurementItem.create({
            data: {
              id: realItemId,
              procurementId,
              name: item.name,
              quantity: Number(item.quantity),
              unit: item.unit || 'Adet',
              estimatedUnitPrice: Number(item.estimatedUnitPrice || 0)
            }
          });
        }
      }

      if (offers && offers.length > 0) {
        for (const offer of offers) {
          const mappedItemId = itemMap.get(offer.itemId || offer.tempItemId) || offer.itemId;
          if (mappedItemId) {
            await tx.procurementOffer.create({
              data: {
                id: uuidv4(),
                procurementId,
                itemId: mappedItemId,
                supplierId: offer.supplierId,
                offeredPrice: Number(offer.offeredPrice),
                isWinner: Boolean(offer.isWinner)
              }
            });
          }
        }
      }

      return proc;
    });
  }

  async update(id: string, data: any) {
    const { title, date, procedureType, status, academicYear, commissionMembers, items, offers } = data;

    let estimatedCost = 0;
    if (items && Array.isArray(items)) {
      estimatedCost = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.estimatedUnitPrice || 0)), 0);
    }

    return prisma.$transaction(async (tx) => {
      await tx.procurement.update({
        where: { id },
        data: {
          title,
          date,
          procedureType: procedureType || '22/d',
          status: status || 'ONAY_BEKLIYOR',
          academicYear,
          estimatedCost,
          commissionMembersList: {
            deleteMany: {},
            create: Array.isArray(commissionMembers) ? commissionMembers.map((m: any) => ({
              fullName: typeof m === 'string' ? m : (m.name || m.fullName),
              role: typeof m === 'string' ? 'Üye' : (m.role || 'Üye')
            })) : []
          }
        }
      });

      // Eski Item ve Offer'ları sil
      await tx.procurementOffer.deleteMany({ where: { procurementId: id } });
      await tx.procurementItem.deleteMany({ where: { procurementId: id } });

      const itemMap = new Map<string, string>();
      if (items && items.length > 0) {
        for (const item of items) {
          const realItemId = uuidv4();
          itemMap.set(item.id || item.tempId, realItemId);
          await tx.procurementItem.create({
            data: {
              id: realItemId,
              procurementId: id,
              name: item.name,
              quantity: Number(item.quantity),
              unit: item.unit || 'Adet',
              estimatedUnitPrice: Number(item.estimatedUnitPrice || 0)
            }
          });
        }
      }

      if (offers && offers.length > 0) {
        for (const offer of offers) {
          const mappedItemId = itemMap.get(offer.itemId || offer.tempItemId) || offer.itemId;
          if (mappedItemId) {
            await tx.procurementOffer.create({
              data: {
                id: uuidv4(),
                procurementId: id,
                itemId: mappedItemId,
                supplierId: offer.supplierId,
                offeredPrice: Number(offer.offeredPrice),
                isWinner: Boolean(offer.isWinner)
              }
            });
          }
        }
      }

      return { success: true };
    });
  }

  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.procurement.update({ where: { id }, data: { deletedAt: new Date() } });
      return { success: true };
    });
  }
}

export const procurementService = new ProcurementService();
