import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../shared/utils/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { AuditService } from '../shared/utils/audit.service';

export type ParentDbClient = typeof prisma | Prisma.TransactionClient;

/** Canonical Turkish mobile number representation: 05XXXXXXXXX. */
export function normalizeParentPhone(phone: string): string {
  const cleaned = String(phone ?? '').replace(/[^0-9+]/g, '');
  let normalized = cleaned;
  if (normalized.startsWith('+90')) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith('90') && normalized.length === 12) normalized = `0${normalized.slice(2)}`;
  else if (normalized.length === 10 && normalized.startsWith('5')) normalized = `0${normalized}`;
  if (!/^05\d{9}$/.test(normalized)) throw new AppError('Geçerli bir Türkiye cep telefonu numarası girilmelidir.', 400);
  return normalized;
}

export function generateParentTemporaryPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

export class ParentAccountService {
  async ensureParent(
    db: ParentDbClient,
    input: { fullName: string; phone: string },
  ): Promise<{ parent: { id: string; userId: string; fullName: string; phone: string }; temporaryPassword: string | null; isNewUser: boolean }> {
    const phone = normalizeParentPhone(input.phone);
    const fullName = input.fullName.trim();
    if (!fullName) throw new AppError('Veli adı ve soyadı gereklidir.', 400);

    const existingContact = await db.parentContact.findFirst({ where: { phone }, include: { parent: true } });
    if (existingContact) {
      const parent = await db.parent.update({
        where: { id: existingContact.parentId },
        data: { fullName },
        include: { contacts: { where: { isPrimary: true } } },
      });
      return { 
        parent: { id: parent.id, userId: parent.userId, fullName: parent.fullName, phone: parent.contacts[0]?.phone || phone },
        temporaryPassword: null, 
        isNewUser: false 
      };
    }

    let user = await db.user.findUnique({ where: { username: phone } });
    let temporaryPassword: string | null = null;
    let isNewUser = false;

    if (!user) {
      temporaryPassword = generateParentTemporaryPassword();
      const password = await bcrypt.hash(temporaryPassword, 12);
      user = await db.user.create({
        data: { username: phone, password, role: 'PARENT', mustChangePassword: true },
      });
      isNewUser = true;
    } else if (user.role !== 'PARENT') {
      throw new AppError('Bu telefon numarası başka bir kullanıcı hesabına ait.', 409);
    }

    const parentRaw = await db.parent.create({
      data: { 
        userId: user.id, 
        fullName,
        contacts: {
          create: [{ name: 'Veli', phone, isPrimary: true }]
        }
      },
      include: { contacts: { where: { isPrimary: true } } },
    });
    
    const parent = { id: parentRaw.id, userId: parentRaw.userId, fullName: parentRaw.fullName, phone: parentRaw.contacts[0]?.phone || phone };

    return { parent, temporaryPassword, isNewUser };
  }

  async updatePhone(parentId: string, phone: string) {
    const normalized = normalizeParentPhone(phone);
    const parent = await prisma.parent.findUnique({ where: { id: parentId }, include: { user: true, contacts: { where: { isPrimary: true } } } });
    if (!parent) throw new AppError('Veli bulunamadı.', 404);
    if (parent.user.role !== 'PARENT') throw new AppError('Bu hesap veli hesabı değil.', 400);

    const primaryContact = parent.contacts[0];
    if (!primaryContact) throw new AppError('Veli birincil iletişim bilgisi bulunamadı.', 404);

    const [phoneOwner, usernameOwner] = await Promise.all([
      prisma.parentContact.findFirst({ where: { phone: normalized, parentId: { not: parentId } } }),
      prisma.user.findUnique({ where: { username: normalized } }),
    ]);
    if (phoneOwner || (usernameOwner && usernameOwner.id !== parent.user.id)) {
      throw new AppError('Bu telefon numarası başka bir veli hesabında kullanılıyor.', 409);
    }

    return prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: parent.user.id }, data: { username: normalized } });
      await tx.parentContact.update({ where: { id: primaryContact.id }, data: { phone: normalized } });
      const updatedParent = await tx.parent.findUnique({ where: { id: parentId }, include: { contacts: { where: { isPrimary: true } } } });
      return { id: updatedParent!.id, fullName: updatedParent!.fullName, phone: updatedParent!.contacts[0].phone, waConsentStatus: updatedParent!.contacts[0].waConsentStatus };
    });
  }

  async resetPassword(parentId: string, actorUserId: string) {
    const parent = await prisma.parent.findUnique({ where: { id: parentId }, include: { user: true, contacts: { where: { isPrimary: true } } } });
    if (!parent) throw new AppError('Veli bulunamadı.', 404);
    if (parent.user.role !== 'PARENT') throw new AppError('Bu hesap veli hesabı değil.', 400);

    const primaryPhone = parent.contacts[0]?.phone || '';

    const temporaryPassword = generateParentTemporaryPassword();
    const password = await bcrypt.hash(temporaryPassword, 12);
    await prisma.user.update({ where: { id: parent.user.id }, data: { password, mustChangePassword: true } });

    await AuditService.log(actorUserId, 'RESET_PARENT_PASSWORD', 'Parent', parentId, { phone: primaryPhone });
    return { parentId, phone: primaryPhone, temporaryPassword, mustChangePassword: true };
  }

  async findByPhone(phone: string) {
    const normalized = normalizeParentPhone(phone);
    const contact = await prisma.parentContact.findFirst({ where: { phone: normalized }, include: { parent: { include: { user: true } } } });
    return contact ? contact.parent : null;
  }
}

export const parentAccountService = new ParentAccountService();
