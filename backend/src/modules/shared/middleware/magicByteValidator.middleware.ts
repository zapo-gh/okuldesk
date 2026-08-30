import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { AppError } from './errorHandler.middleware';

// file-type v16+ ESM-only pakettir. CommonJS (module: "commonjs") ortamında
// require() ile yüklenemez — sessizce undefined döner ve doğrulama devre dışı kalır.
// Çözüm: TypeScript'in CommonJS dönüşümünü atlayan Function trick ile dinamik ESM import.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const _esmImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;

export const validateMagicBytes = (allowedMimes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(); // Dosya yoksa doğrulamaya gerek yok
    }

    const filePath = req.file.path;

    const cleanupFile = () => {
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    };

    try {
      const fileTypeModule = await _esmImport('file-type');
      const { fromFile, fromBuffer } = fileTypeModule.default || fileTypeModule;

      let fileTypeResult;
      if (req.file.buffer) {
        fileTypeResult = await fromBuffer(req.file.buffer);
      } else if (filePath) {
        fileTypeResult = await fromFile(filePath);
      }

      if (!fileTypeResult) {
        cleanupFile();
        return next(new AppError('Geçersiz dosya içeriği veya tanınmayan format.', 400));
      }

      if (!allowedMimes.includes(fileTypeResult.mime)) {
        cleanupFile();
        return next(
          new AppError(
            `Geçersiz dosya türü tespit edildi (${fileTypeResult.mime}). Lütfen geçerli bir dosya yükleyin.`,
            400,
          ),
        );
      }

      next();
    } catch (error) {
      console.error('Magic Byte Validator Hatası:', error);
      cleanupFile();
      next(new AppError('Dosya doğrulama hatası.', 500));
    }
  };
};
