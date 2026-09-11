import prisma from '../shared/utils/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export class InvoiceService {
  async getAll(academicYear: string) {
    return prisma.invoice.findMany({
      where: { academicYear, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: any) {
    if (data.invoiceNumber) {
      const existing = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: data.invoiceNumber,
          companyName: data.companyName,
          academicYear: data.academicYear,
          deletedAt: null
        }
      });
      if (existing) {
        throw new AppError('Bu fatura numarasına sahip bir kayıt zaten mevcut.', 400);
      }
    }

    try {
      return await prisma.invoice.create({
        data: {
          companyName: data.companyName,
          type: data.type,
          invoiceNumber: data.invoiceNumber,
          amount: parseFloat(data.amount) || 0,
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          academicYear: data.academicYear,
          notes: data.notes
        }
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new AppError('Bu fatura numarasına sahip bir kayıt zaten mevcut.', 400);
      }
      throw e;
    }
  }

  async update(id: string, data: any) {
    const inv = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!inv) throw new AppError('Fatura bulunamadı', 404);

    return prisma.invoice.update({
      where: { id },
      data: {
        companyName: data.companyName,
        type: data.type,
        invoiceNumber: data.invoiceNumber,
        amount: parseFloat(data.amount) || 0,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes
      }
    });
  }

  async updateStatus(id: string, status: string, mebbisNo?: string, mysNo?: string) {
    const inv = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!inv) throw new AppError('Fatura bulunamadı', 404);

    const updateData: any = { status };
    if (mebbisNo !== undefined) updateData.mebbisNo = mebbisNo;
    if (mysNo !== undefined) updateData.mysNo = mysNo;

    return prisma.invoice.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string) {
    const inv = await prisma.invoice.findFirst({ where: { id, deletedAt: null } });
    if (!inv) throw new AppError('Fatura bulunamadı', 404);
    
    await prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}

export const invoiceService = new InvoiceService();
