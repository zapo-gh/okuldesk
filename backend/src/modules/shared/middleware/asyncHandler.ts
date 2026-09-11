import { Request, Response, NextFunction } from 'express';

/**
 * Express route'larındaki asenkron (async) hataları yakalayıp 
 * global error handler'a (next) aktarmayı sağlayan sarmalayıcı (wrapper) fonksiyondur.
 * try/catch tekrarlarını önler.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
