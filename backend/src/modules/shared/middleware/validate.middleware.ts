import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Zod şemasını alıp Express middleware olarak döndüren fonksiyon.
 * İstekten gelen (body, query, params) verilerini şemaya göre valide eder.
 * Doğrulama başarısız olursa 400 Bad Request döner.
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validasyon hatası',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      return res.status(500).json({ success: false, message: 'Bilinmeyen validasyon hatası' });
    }
  };
};
