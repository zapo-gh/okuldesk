import prisma from './prisma';

/**
 * Veritabanı başlangıç ayarları.
 * Tüm tablo oluşturma işlemleri schema.prisma ve Prisma CLI'ye (db push/migrate) devredilmiştir.
 */
export async function initializeDatabase(): Promise<void> {
  // Performans ve veri bütünlüğü için SQLite PRAGMA'larını aktif et
  await prisma.$queryRawUnsafe(`PRAGMA journal_mode=WAL`);
  await prisma.$queryRawUnsafe(`PRAGMA foreign_keys=ON`);
  
  // Veritabanı bütünlük kontrolü (integrity_check)
  const integrity = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check');
  if (integrity && integrity[0] && integrity[0].integrity_check !== 'ok') {
    console.error('🚨 Veritabanı bütünlük kontrolü başarsız oldu! Dosya bozulmuş olabilir:', integrity);
  } else {
    console.log('✅ SQLite bütünlük kontrolü başarılı (ok)');
  }
  
  // Tablo ve kolonlarını kontrol eden yardımcı fonksiyon
  const getTableColumns = async (tableName: string): Promise<Set<string> | null> => {
    try {
      const tableCheck = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
      );
      if (!tableCheck || tableCheck.length === 0) {
        return null; // Tablo henüz mevcut değil
      }
      const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${tableName}")`);
      return new Set((rows || []).map(r => r.name.toLowerCase()));
    } catch {
      return null;
    }
  };

  const columnsToAdd: Array<{ table: string; col: string; sql: string }> = [
    { table: 'SchoolSettings', col: 'dutyRoomStationMap', sql: 'ALTER TABLE "SchoolSettings" ADD COLUMN "dutyRoomStationMap" TEXT DEFAULT \'{}\'' },
    { table: 'SchoolSettings', col: 'publicBaseUrl', sql: 'ALTER TABLE "SchoolSettings" ADD COLUMN "publicBaseUrl" TEXT DEFAULT \'\'' },
    { table: 'SchoolSettings', col: 'schoolAddress', sql: 'ALTER TABLE "SchoolSettings" ADD COLUMN "schoolAddress" TEXT DEFAULT \'\'' },
    { table: 'SchoolSettings', col: 'schoolDistrictCity', sql: 'ALTER TABLE "SchoolSettings" ADD COLUMN "schoolDistrictCity" TEXT DEFAULT \'\'' },
    { table: 'SchoolSettings', col: 'schoolEmail', sql: 'ALTER TABLE "SchoolSettings" ADD COLUMN "schoolEmail" TEXT DEFAULT \'\'' },
    { table: 'SchoolSettings', col: 'schoolPhone', sql: 'ALTER TABLE "SchoolSettings" ADD COLUMN "schoolPhone" TEXT DEFAULT \'\'' },
    { table: 'ParentContact', col: 'photoConsentStatus', sql: 'ALTER TABLE "ParentContact" ADD COLUMN "photoConsentStatus" TEXT DEFAULT \'PENDING\'' },
    { table: 'ParentContact', col: 'photoConsentDate', sql: 'ALTER TABLE "ParentContact" ADD COLUMN "photoConsentDate" DATETIME' },
    { table: 'ParentContact', col: 'consentSource', sql: 'ALTER TABLE "ParentContact" ADD COLUMN "consentSource" TEXT' },
    { table: 'ParentContact', col: 'consentToken', sql: 'ALTER TABLE "ParentContact" ADD COLUMN "consentToken" TEXT' },
    { table: 'ParentContact', col: 'consentTokenExpiresAt', sql: 'ALTER TABLE "ParentContact" ADD COLUMN "consentTokenExpiresAt" DATETIME' },
    { table: 'ParentContact', col: 'consentIp', sql: 'ALTER TABLE "ParentContact" ADD COLUMN "consentIp" TEXT' },
    { table: 'ParentContact', col: 'consentUserAgent', sql: 'ALTER TABLE "ParentContact" ADD COLUMN "consentUserAgent" TEXT' },
    { table: 'ParentContact', col: 'lastConsentSentAt', sql: 'ALTER TABLE "ParentContact" ADD COLUMN "lastConsentSentAt" DATETIME' },
    { table: 'Student', col: 'primaryParentId', sql: 'ALTER TABLE "Student" ADD COLUMN "primaryParentId" TEXT' },
    { table: 'User', col: 'fullName', sql: 'ALTER TABLE "User" ADD COLUMN "fullName" TEXT DEFAULT \'\'' },
    { table: 'User', col: 'permissions', sql: 'ALTER TABLE "User" ADD COLUMN "permissions" TEXT DEFAULT \'[]\'' },
    { table: 'User', col: 'isActive', sql: 'ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN DEFAULT 1' },
  ];

  // Tabloların mevcut kolonlarını bir kez çek
  const cache: Record<string, Set<string> | null> = {};
  for (const item of columnsToAdd) {
    if (cache[item.table] === undefined) {
      cache[item.table] = await getTableColumns(item.table);
    }
    const cols = cache[item.table];
    if (cols && !cols.has(item.col.toLowerCase())) {
      try {
        await prisma.$executeRawUnsafe(item.sql);
        cols.add(item.col.toLowerCase());
      } catch (err: any) {
        console.warn(`[initDb] Kolon eklenemedi (${item.table}.${item.col}):`, err.message);
      }
    }
  }

  // Tüm kullanıcıların şifre zorunluluğunu kaldır (kullanıcı isterse kendisi değiştirebilir)
  try {
    await prisma.$executeRawUnsafe('UPDATE "User" SET mustChangePassword = 0 WHERE mustChangePassword = 1');
  } catch {}

  console.log('✅ SQLite PRAGMA ayarları uygulandı (WAL, FK=ON)');
}
