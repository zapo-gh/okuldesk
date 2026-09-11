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
  
  console.log('✅ SQLite PRAGMA ayarları uygulandı (WAL, FK=ON)');
}
