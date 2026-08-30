import * as http from 'http';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import app from './app';
import { config } from './modules/shared/config';
import prisma from './modules/shared/utils/prisma';
import { initializeDatabase } from './modules/shared/utils/initDb';
import * as whatsappService from './modules/whatsapp/whatsapp.service';
import bcrypt from 'bcryptjs';
import { BackupService } from './modules/shared/utils/backup.service';

let httpServer: http.Server | null = null;

async function seedAdmin(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (existing) {
    return;
  }

  // Varsayılan ilk şifreyi basit bir şey yapıyoruz (admin123)
  // mustChangePassword: true olduğu için kullanıcı ilk girişte bunu değiştirmek ZORUNDA kalacak.
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
  const adminPassword = await bcrypt.hash(initialPassword, 12);

  await prisma.user.create({
    data: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });

  console.log(`✅ İlk yönetici hesabı oluşturuldu. Kullanıcı adı: admin`);
  console.log(`⚠️  Lütfen ilk girişten sonra şifrenizi değiştirin (Ayarlar sayfası).`);

  // Şifreyi konsola yazmak yerine dosyaya yaz — log sızıntısını önler.
  try {
    const credDir = path.join(process.env.APPDATA || process.env.HOME || '.', 'OkulDesk');
    const credPath = path.join(credDir, 'initial-admin-credentials.txt');
    fs.mkdirSync(credDir, { recursive: true });
    fs.writeFileSync(
      credPath,
      [
        'OkulDesk — İlk Yönetici Giriş Bilgileri',
        '==========================================',
        `Kullanıcı adı : admin`,
        `Şifre         : ${initialPassword}`,
        '',
        'Bu dosyayı ilk girişten sonra güvenli şekilde silin.',
        `Oluşturulma   : ${new Date().toLocaleString('tr-TR')}`,
      ].join('\n'),
      { mode: 0o600 }, // Yalnızca dosya sahibi okuyabilir
    );
    console.log(`📄 İlk giriş bilgileri: ${credPath}`);
  } catch {
    // Dosya yazılamazsa (izin sorunu vb.) sadece uyar, crash etme
    console.warn(`⚠️  İlk giriş bilgileri dosyaya yazılamadı. Şifreyi manuel ayarlayın: INITIAL_ADMIN_PASSWORD env değişkeni`);
  }
}

export async function startServer(): Promise<void> {
  try {
    console.log('🔄 Veritabanı migration kontrol ediliyor...');
    const execFileAsync = promisify(execFile);
    const prismaCli = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
    await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: path.join(__dirname, '..'),
    });
    console.log('✅ Veritabanı migration başarıyla tamamlandı.');
  } catch (err) {
    console.error('❌ Veritabanı migration hatası:', err);
    // Migration hatası kritik olabilir — loglayıp devam ediyoruz
    // Prisma db push daha önce çalıştırıldıysa schema zaten günceldir
  }

  await initializeDatabase();
  console.log('✅ Veritabanı şeması hazır');

  await seedAdmin();

  await prisma.$connect();
  console.log('✅ Database connected successfully');

  await BackupService.runDailyBackup().catch((err: unknown) => {
    console.error('⚠️ Otomatik yedekleme başarısız oldu:', err);
  });

  await new Promise<void>((resolve, reject) => {
    httpServer = app.listen(config.port, '127.0.0.1', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📋 Environment: ${config.nodeEnv}`);
      resolve();
    });
    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${config.port} kullanımda. Lütfen önceki örneği kapatın.`);
      }
      reject(err);
    });
  });
}

async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} alındı, kapatılıyor...`);

  await new Promise<void>((resolve) => {
    if (httpServer) {
      httpServer.close(() => resolve());
    } else {
      resolve();
    }
  });

  await whatsappService.disconnect().catch(() => {});
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Sunucuyu başlat
startServer().catch((err) => {
  console.error('Sunucu başlatılırken kritik hata:', err);
  process.exit(1);
});
