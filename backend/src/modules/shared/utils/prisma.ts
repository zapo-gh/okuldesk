import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Bağlantı kopmalarında otomatik yeniden bağlan
const RECONNECT_ERRORS = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1017', // Server has closed the connection
]);

export async function withReconnect<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const code: string = err?.code ?? '';
      const isReconnectable =
        RECONNECT_ERRORS.has(code) ||
        err?.message?.includes('connection') ||
        err?.message?.includes('ECONNRESET') ||
        err?.message?.includes('socket');

      if (isReconnectable && attempt < retries) {
        console.warn(`[Prisma] Bağlantı hatası (${code}), yeniden deneniyor (${attempt}/${retries - 1})...`);
        await basePrisma.$disconnect();
        await new Promise((r) => setTimeout(r, 500 * attempt));
        await basePrisma.$connect();
        continue;
      }
      throw err;
    }
  }
  throw new Error('withReconnect: beklenmeyen durum');
}

// Prisma'nın model property'leri ($ ile başlayanlar hariç) için Proxy
// Bu sayede tüm model metotları (findMany, create, update, delete vb.)
// otomatik olarak withReconnect içinde çalışır.
const prisma = new Proxy(basePrisma, {
  get(target, prop: string | symbol) {
    const value = (target as any)[prop];

    // $ ile başlayan özel metotlar (queryRaw, executeRaw, connect, disconnect, transaction vb.)
    // doğrudan basePrisma'ya yönlendir
    if (typeof prop === 'string' && prop.startsWith('$')) {
      return typeof value === 'function' ? value.bind(target) : value;
    }

    // Symbol property'leri doğrudan aktar
    if (typeof prop === 'symbol') {
      return typeof value === 'function' ? value.bind(target) : value;
    }

    // Model delegate (ör: prisma.student, prisma.absenteeism vb.)
    // Her metodu withReconnect ile sar
    if (value && typeof value === 'object') {
      return new Proxy(value, {
        get(modelTarget, methodProp: string | symbol) {
          const method = (modelTarget as any)[methodProp];
          if (typeof method === 'function') {
            return (...args: any[]) => withReconnect(() => method.apply(modelTarget, args));
          }
          return method;
        },
      });
    }

    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as PrismaClient;

export default prisma;
