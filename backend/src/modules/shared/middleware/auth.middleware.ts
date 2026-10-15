import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { config } from '../config';
import { AppError } from './errorHandler.middleware';
import { requestContext } from '../utils/asyncLocalStorage';

export interface JwtPayload {
  userId: string;
  role: string;
  mustChangePassword?: boolean;
  fullName?: string;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Yetkilendirme başarısız. Token bulunamadı.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const rows = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, role, mustChangePassword, fullName, permissions, isActive FROM "User" WHERE id = ? LIMIT 1',
      decoded.userId
    );
    const user = rows && rows[0];

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 401);
    }

    const isUserActive = user.isActive === 1 || user.isActive === true || user.isActive === null;
    if (!isUserActive) {
      throw new AppError('Hesabınız yönetici tarafından askıya alınmıştır.', 403);
    }

    if (user.mustChangePassword) {
      const allowedPaths = ['/auth/change-password', '/auth/profile', '/auth/logout'];
      const isAllowed = allowedPaths.some((p) => req.originalUrl.includes(p));
      if (!isAllowed) {
        throw new AppError('Lütfen devam etmeden önce varsayılan şifrenizi değiştirin.', 403);
      }
    }

    let parsedPermissions: string[] = [];
    if (user.role === 'ADMIN') {
      parsedPermissions = ['*'];
    } else {
      try {
        parsedPermissions = JSON.parse((user as any).permissions || '[]');
      } catch {
        parsedPermissions = [];
      }
    }

    req.user = {
      userId: decoded.userId,
      role: user.role as JwtPayload['role'],
      mustChangePassword: user.mustChangePassword,
      fullName: (user as any).fullName || '',
      permissions: parsedPermissions,
    };

    requestContext.run({ userId: decoded.userId, role: user.role }, () => {
      next();
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Geçersiz veya süresi dolmuş token.', 401));
  }
};

export const adminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Bu işlem için yönetici yetkisi gereklidir.', 403));
  }
  next();
};

export const requirePermission = (permissionKey: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Yetkilendirme gerekli.', 401));
    }
    if (req.user.role === 'ADMIN') {
      return next();
    }
    const perms = req.user.permissions || [];
    if (perms.includes('*') || perms.includes(permissionKey)) {
      return next();
    }
    return next(new AppError(`Bu işlem için '${permissionKey}' yetkisi gereklidir.`, 403));
  };
};
