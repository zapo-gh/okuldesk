import rateLimit from 'express-rate-limit';

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

export const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
  },
});

export const generalLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 3000,
  skip: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || '';
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.includes('127.0.0.1') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('::ffff:192.168.') ||
      ip.startsWith('::ffff:10.') ||
      ip.startsWith('::ffff:127.0.0.1')
    );
  },
  message: {
    success: false,
    message: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.',
  },
});

// Pahalı/yoğun işlemler için ayrı limitler. Bunlar ilgili route'larda açıkça
// kullanılmalıdır; global limiter'ın yerine geçmezler.
export const uploadLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Çok fazla dosya yükleme isteği. Lütfen daha sonra tekrar deneyin.',
  },
});

export const expensiveOperationLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Bu işlem için istek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
  },
});
