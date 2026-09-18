import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';
import { AuditService } from '../shared/utils/audit.service';
import prisma from '../shared/utils/prisma';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const updateSchema = z.object({
  schoolName: z.string().max(200).optional(),
  principalName: z.string().max(100).optional(),
  academicYear: z.string().max(50).optional(),
  lessonPeriodsJson: z.string().optional(),
  waTemplate1: z.string().optional(),
  waTemplate2: z.string().optional(),
  waTemplate3: z.string().optional(),
  dutyRotationFreq: z.string().optional(),
  dutyRotationDates: z.string().optional(),
  dutyStartDate: z.string().nullable().optional(),
  lastRotationDate: z.string().nullable().optional(),
});

export class SettingsController {
  async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await settingsService.get();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateSchema.parse(req.body);
      const result = await settingsService.update(data);
      
      const userId = (req as any).user.userId;
      await AuditService.log(userId, 'UPDATE_SETTINGS', 'SchoolSettings', 'singleton', data);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async backup(req: Request, res: Response, next: NextFunction) {
    try {
      const dbUrl: string = process.env.DATABASE_URL || '';
      // SQLite URL: "file:/path/to/database.db" or "file:./relative"
      const dbPath = dbUrl.replace(/^["']?file:["']?/, '');
      const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

      if (!resolvedPath.endsWith('.db') && !resolvedPath.endsWith('.sqlite')) {
        res.status(400).json({ success: false, message: 'Yedekleme yalnızca SQLite veritabanı için desteklenmektedir.' });
        return;
      }

      if (!fs.existsSync(resolvedPath)) {
        res.status(404).json({ success: false, message: 'Veritabanı dosyası bulunamadı.' });
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const filename = `okuldesk-yedek-${date}.db`;
      const tempBackupPath = path.resolve(process.cwd(), `temp_${Date.now()}.db`);

      // Bağlantı koparsa bile temp dosyayı temizle
      const cleanup = () => {
        try { fs.rmSync(tempBackupPath, { force: true }); } catch {}
      };

      try {
        await prisma.$executeRawUnsafe(`VACUUM INTO '${tempBackupPath}'`);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        const fileStream = fs.createReadStream(tempBackupPath);
        fileStream.pipe(res);
        
        // Her senaryoda (normal bitiş, hata, bağlantı kopması) temp dosyayı temizle
        res.on('finish', cleanup);
        res.on('close', cleanup);
        res.on('error', cleanup);

        // Audit Log
        const userId = (req as any).user.userId;
        await AuditService.log(userId, 'CREATE_BACKUP', 'Database', 'all', { filename });
        
      } catch (err) {
        cleanup();
        throw err;
      }
    } catch (error) {
      next(error);
    }
  }

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Yedek dosyası bulunamadı.' });
        return;
      }

      const uploadedPath = req.file.path;
      const dbUrl: string = process.env.DATABASE_URL || '';
      const dbPath = dbUrl.replace(/^["']?file:["']?/, '');
      const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

      if (!resolvedDbPath.endsWith('.db') && !resolvedDbPath.endsWith('.sqlite')) {
        res.status(400).json({ success: false, message: 'Geri yükleme yalnızca SQLite veritabanı için desteklenmektedir.' });
        return;
      }

      // Magic-byte doğrulaması (SQLite veritabanı dosyaları "SQLite format 3\0" ile başlar)
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(uploadedPath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);
      
      const header = buffer.toString('utf8');
      if (header !== 'SQLite format 3\0') {
        fs.rmSync(uploadedPath, { force: true });
        res.status(400).json({ success: false, message: 'Geçersiz dosya formatı. Yüklenen dosya geçerli bir SQLite veritabanı değil.' });
        return;
      }

      // Mevcut veritabanının yedeğini al (güvenlik için)
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyBackupPath = path.resolve(process.cwd(), `backup_before_restore_${date}.db`);
      if (fs.existsSync(resolvedDbPath)) {
        fs.copyFileSync(resolvedDbPath, safetyBackupPath);
      }

      // Prisma bağlantısını kes ve veritabanını değiştir
      await prisma.$disconnect();
      
      try {
        fs.copyFileSync(uploadedPath, resolvedDbPath);
      } catch (err) {
        // Hata olursa güvenlik yedeğinden geri dön
        if (fs.existsSync(safetyBackupPath)) {
          fs.copyFileSync(safetyBackupPath, resolvedDbPath);
        }
        throw new Error('Veritabanı dosyası kopyalanamadı.');
      }

      // Geçici yüklenen dosyayı temizle
      fs.rmSync(uploadedPath, { force: true });

      // Yeniden bağlanmayı deneriz ama Tauri'de en garantisi yeniden başlatmaktır.
      await prisma.$connect();

      const userId = (req as any).user.userId;
      await AuditService.log(userId, 'RESTORE_BACKUP', 'Database', 'all', { safetyBackup: `backup_before_restore_${date}.db` });

      res.json({ success: true, message: 'Geri yükleme başarılı. Lütfen değişikliklerin uygulanması için uygulamayı yeniden başlatın.' });
    } catch (error) {
      if (req.file) {
        fs.rmSync(req.file.path, { force: true });
      }
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
