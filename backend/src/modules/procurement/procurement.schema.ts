import { z } from 'zod';

export const createProcurementSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'İşin adı (temin konusu) zorunludur.'),
    date: z.string().min(1, 'Tarih zorunludur.'),
    academicYear: z.string().optional(),
    procedureType: z.string().optional(),
    status: z.string().optional(),
    commissionMembers: z.array(z.any()).optional(),
    items: z.array(z.any()).optional(),
    offers: z.array(z.any()).optional(),
  })
});
