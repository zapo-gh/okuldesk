import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { PERMISSION_CATEGORIES, ROLE_PRESETS } from './permissions';

export class UsersController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await usersService.listUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  async getMeta(_req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        categories: PERMISSION_CATEGORIES,
        presets: ROLE_PRESETS,
      },
    });
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getUser(req.params.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.createUser(req.body);
      res.status(201).json({
        success: true,
        data: result.user,
        plainPassword: result.plainPassword,
        message: 'Kullanıcı başarıyla oluşturuldu.',
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const currentAdminId = req.user!.userId;
      const updated = await usersService.updateUser(req.params.id, req.body, currentAdminId);
      res.json({
        success: true,
        data: updated,
        message: 'Kullanıcı ve yetkileri güncellendi.',
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.resetPassword(req.params.id, req.body?.newPassword);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const currentAdminId = req.user!.userId;
      const result = await usersService.deleteUser(req.params.id, currentAdminId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
