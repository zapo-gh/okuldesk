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
  
  // SchoolSettings tablosunda dutyRoomStationMap kolonu yoksa otomatik ekle
  const safeColumns = [
    'ALTER TABLE "SchoolSettings" ADD COLUMN "dutyRoomStationMap" TEXT DEFAULT \'{}\'',
    'ALTER TABLE "SchoolSettings" ADD COLUMN "publicBaseUrl" TEXT DEFAULT \'\'',
    'ALTER TABLE "SchoolSettings" ADD COLUMN "schoolAddress" TEXT DEFAULT \'\'',
    'ALTER TABLE "SchoolSettings" ADD COLUMN "schoolDistrictCity" TEXT DEFAULT \'\'',
    'ALTER TABLE "SchoolSettings" ADD COLUMN "schoolEmail" TEXT DEFAULT \'\'',
    'ALTER TABLE "SchoolSettings" ADD COLUMN "schoolPhone" TEXT DEFAULT \'\'',
    'ALTER TABLE "ParentContact" ADD COLUMN "photoConsentStatus" TEXT DEFAULT \'PENDING\'',
    'ALTER TABLE "ParentContact" ADD COLUMN "photoConsentDate" DATETIME',
    'ALTER TABLE "ParentContact" ADD COLUMN "consentSource" TEXT',
    'ALTER TABLE "ParentContact" ADD COLUMN "consentToken" TEXT',
    'ALTER TABLE "ParentContact" ADD COLUMN "consentTokenExpiresAt" DATETIME',
    'ALTER TABLE "ParentContact" ADD COLUMN "consentIp" TEXT',
    'ALTER TABLE "ParentContact" ADD COLUMN "consentUserAgent" TEXT',
    'ALTER TABLE "Student" ADD COLUMN "primaryParentId" TEXT',
    'ALTER TABLE "User" ADD COLUMN "fullName" TEXT DEFAULT \'\'',
    'ALTER TABLE "User" ADD COLUMN "permissions" TEXT DEFAULT \'[]\'',
    'ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN DEFAULT 1',
  ];

  for (const sql of safeColumns) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch {
      // Kolon zaten var, yok say
    }
  }

  console.log('✅ SQLite PRAGMA ayarları uygulandı (WAL, FK=ON)');
}
