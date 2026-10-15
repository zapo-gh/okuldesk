import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { ALL_PERMISSION_KEYS } from './permissions';

export interface CreateUserData {
  username: string;
  fullName?: string;
  password?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface UpdateUserData {
  fullName?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
}

class UsersService {
  /**
   * Tüm sistem kullanıcılarını listeler (şifreler hariç)
   */
  async listUsers() {
    const users = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, username, fullName, role, permissions, isActive, mustChangePassword, createdAt FROM "User" WHERE role != "PARENT" ORDER BY createdAt ASC'
    );

    return (users || []).map(u => {
      let perms: string[] = [];
      if (u.role === 'ADMIN') {
        perms = ['*'];
      } else {
        try {
          perms = JSON.parse(u.permissions || '[]');
        } catch {
          perms = [];
        }
      }

      return {
        id: u.id,
        username: u.username,
        fullName: u.fullName || u.username,
        role: u.role,
        permissions: perms,
        isActive: u.isActive === 1 || u.isActive === true || u.isActive === null,
        mustChangePassword: u.mustChangePassword === 1 || u.mustChangePassword === true,
        createdAt: u.createdAt,
      };
    });
  }

  /**
   * Belirli bir kullanıcının detayını döner
   */
  async getUser(id: string) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, username, fullName, role, permissions, isActive, mustChangePassword, createdAt FROM "User" WHERE id = ? LIMIT 1',
      id
    );

    const user = rows && rows[0];
    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 404);
    }

    let perms: string[] = [];
    if (user.role === 'ADMIN') {
      perms = ['*'];
    } else {
      try {
        perms = JSON.parse(user.permissions || '[]');
      } catch {
        perms = [];
      }
    }

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.username,
      role: user.role,
      permissions: perms,
      isActive: user.isActive === 1 || user.isActive === true || user.isActive === null,
      mustChangePassword: user.mustChangePassword === 1 || user.mustChangePassword === true,
      createdAt: user.createdAt,
    };
  }

  /**
   * Yeni kullanıcı oluşturur
   */
  async createUser(data: CreateUserData) {
    const username = data.username.trim().toLowerCase();
    if (!username || username.length < 3) {
      throw new AppError('Kullanıcı adı en az 3 karakter olmalıdır.', 400);
    }

    // Kullanıcı adı benzersizlik kontrolü
    const existing = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id FROM "User" WHERE username = ? LIMIT 1',
      username
    );
    if (existing && existing.length > 0) {
      throw new AppError(`'${username}' kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.`, 400);
    }

    // Şifre belirlenmemişse otomatik 8 haneli güvenli ilk şifre üret
    const initialPassword = data.password && data.password.trim().length >= 6
      ? data.password.trim()
      : `okul${crypto.randomInt(1000, 9999)}`;

    const hashedPassword = await bcrypt.hash(initialPassword, 12);
    const role = data.role === 'ADMIN' ? 'ADMIN' : 'USER';
    const fullName = data.fullName?.trim() || username;
    const isActive = data.isActive !== false ? 1 : 0;
    const newId = crypto.randomUUID();

    let permissionsJson = '[]';
    if (role === 'ADMIN') {
      permissionsJson = '["*"]';
    } else if (Array.isArray(data.permissions)) {
      const validKeys = data.permissions.filter(k => k === '*' || ALL_PERMISSION_KEYS.includes(k));
      permissionsJson = JSON.stringify(validKeys);
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO "User" (id, username, password, fullName, role, permissions, isActive, mustChangePassword, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
      newId,
      username,
      hashedPassword,
      fullName,
      role,
      permissionsJson,
      isActive
    );

    const created = await this.getUser(newId);

    return {
      user: created,
      plainPassword: initialPassword,
    };
  }

  /**
   * Kullanıcı bilgilerini ve yetkilerini günceller
   */
  async updateUser(id: string, data: UpdateUserData, currentAdminId: string) {
    const existing = await this.getUser(id);

    // Kendi hesabını pasife alamaz veya adminliğini kaldıramaz
    if (id === currentAdminId) {
      if (data.isActive === false) {
        throw new AppError('Kendi hesabınızı askıya alamazsınız.', 400);
      }
      if (data.role && data.role !== 'ADMIN') {
        throw new AppError('Kendi yönetici (ADMIN) rolünüzü kaldıramazsınız.', 400);
      }
    }

    // Son kalan aktif admini pasife almayı veya rolünü değiştirmeyi engelle
    if (existing.role === 'ADMIN' && (data.isActive === false || (data.role && data.role !== 'ADMIN'))) {
      const activeAdminRows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT count(*) as count FROM "User" WHERE role = "ADMIN" AND (isActive = 1 OR isActive IS NULL)'
      );
      const activeAdminCount = Number(activeAdminRows?.[0]?.count || 0);
      if (activeAdminCount <= 1) {
        throw new AppError('Sistemde en az bir aktif yönetici (ADMIN) hesabı bulunmalıdır.', 400);
      }
    }

    const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : existing.fullName;
    const role = data.role ? (data.role === 'ADMIN' ? 'ADMIN' : 'USER') : existing.role;
    const isActive = typeof data.isActive === 'boolean' ? (data.isActive ? 1 : 0) : (existing.isActive ? 1 : 0);

    let permissionsJson = existing.role === 'ADMIN' ? '["*"]' : JSON.stringify(existing.permissions);
    if (role === 'ADMIN') {
      permissionsJson = '["*"]';
    } else if (Array.isArray(data.permissions)) {
      const validKeys = data.permissions.filter(k => k === '*' || ALL_PERMISSION_KEYS.includes(k));
      permissionsJson = JSON.stringify(validKeys);
    }

    await prisma.$executeRawUnsafe(
      'UPDATE "User" SET fullName = ?, role = ?, permissions = ?, isActive = ? WHERE id = ?',
      fullName,
      role,
      permissionsJson,
      isActive,
      id
    );

    return await this.getUser(id);
  }

  /**
   * Kullanıcının şifresini sıfırlar
   */
  async resetPassword(id: string, customPassword?: string) {
    const user = await this.getUser(id);

    const newPlainPassword = customPassword && customPassword.trim().length >= 6
      ? customPassword.trim()
      : `okul${crypto.randomInt(1000, 9999)}`;

    const hashedPassword = await bcrypt.hash(newPlainPassword, 12);

    await prisma.$executeRawUnsafe(
      'UPDATE "User" SET password = ?, mustChangePassword = 0 WHERE id = ?',
      hashedPassword,
      id
    );

    return {
      success: true,
      username: user.username,
      plainPassword: newPlainPassword,
      message: `${user.username} kullanıcısının şifresi sıfırlandı.`,
    };
  }

  /**
   * Kullanıcıyı siler
   */
  async deleteUser(id: string, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new AppError('Kendi hesabınızı silemezsiniz.', 400);
    }

    const user = await this.getUser(id);

    if (user.role === 'ADMIN') {
      const adminRows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT count(*) as count FROM "User" WHERE role = "ADMIN"'
      );
      const adminCount = Number(adminRows?.[0]?.count || 0);
      if (adminCount <= 1) {
        throw new AppError('Son kalan yönetici hesabı silinemez.', 400);
      }
    }

    await prisma.$executeRawUnsafe('DELETE FROM "User" WHERE id = ?', id);
    return { success: true, message: `'${user.username}' kullanıcısı başarıyla silindi.` };
  }
}

export const usersService = new UsersService();
