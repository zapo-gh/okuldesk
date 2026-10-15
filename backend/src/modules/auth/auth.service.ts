import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export class AuthService {
  async login(username: string, password: string, rememberMe = false) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, username, password, fullName, role, permissions, isActive, mustChangePassword FROM "User" WHERE username = ? LIMIT 1',
      username
    );

    const user = rows && rows[0];

    if (!user) {
      throw new AppError('Geçersiz kullanıcı adı veya şifre.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Geçersiz kullanıcı adı veya şifre.', 401);
    }

    if (user.role === 'PARENT') {
      throw new AppError('Veli girişi bu sistemde aktif değildir. Sistem yalnızca okul yönetimi içindir.', 403);
    }

    const isUserActive = user.isActive === 1 || user.isActive === true || user.isActive === null;
    if (!isUserActive) {
      throw new AppError('Hesabınız yönetici tarafından askıya alınmıştır. Lütfen okul idaresi ile iletişime geçin.', 403);
    }

    let permissions: string[] = [];
    if (user.role === 'ADMIN') {
      permissions = ['*'];
    } else {
      try {
        permissions = JSON.parse(user.permissions || '[]');
      } catch {
        permissions = [];
      }
    }

    const expiresIn = rememberMe ? '30d' : config.jwt.expiresIn;
    const token = jwt.sign(
      { userId: user.id, role: user.role, mustChangePassword: user.mustChangePassword === 1 || user.mustChangePassword === true, permissions },
      config.jwt.secret,
      { expiresIn } as jwt.SignOptions,
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        role: user.role,
        permissions,
        mustChangePassword: user.mustChangePassword === 1 || user.mustChangePassword === true,
      },
    };
  }

  async getProfile(userId: string) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, username, fullName, role, permissions, isActive, mustChangePassword, createdAt FROM "User" WHERE id = ? LIMIT 1',
      userId
    );

    const user = rows && rows[0];

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 404);
    }

    let parsedPermissions: string[] = [];
    if (user.role === 'ADMIN') {
      parsedPermissions = ['*'];
    } else {
      try {
        parsedPermissions = JSON.parse(user.permissions || '[]');
      } catch {
        parsedPermissions = [];
      }
    }

    return {
      ...user,
      fullName: user.fullName || user.username,
      isActive: user.isActive === 1 || user.isActive === true || user.isActive === null,
      mustChangePassword: user.mustChangePassword === 1 || user.mustChangePassword === true,
      permissions: parsedPermissions,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Mevcut şifre yanlış.', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    return { message: 'Şifre başarıyla güncellendi.' };
  }
}

export const authService = new AuthService();
