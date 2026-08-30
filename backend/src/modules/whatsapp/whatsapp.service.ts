import fs from 'fs';
import path from 'path';
import { webcrypto } from 'crypto';
import prisma from '../shared/utils/prisma';

// TypeScript module:commonjs, import() → require() dönüşümünü engellemek için Function trick
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const _dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;

let Baileys: any = null;
let QRCode: any = null;

export type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'reconnecting' | 'connected';

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  error: string | null;
}

let socket: any | null = null;
let state: WAState = { status: 'disconnected', qrBase64: null, error: null };
let authDir: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
let shuttingDown = false;
let consecutiveFailures = 0;

function getAuthDir(): string {
  if (authDir) return authDir;
  if (process.env.WHATSAPP_AUTH_DIR) return process.env.WHATSAPP_AUTH_DIR;
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  return path.join(path.dirname(uploadDir), 'whatsapp-auth');
}

export function setAuthDir(dir: string) {
  authDir = dir;
}

// Windows EPERM / EBUSY hataları için retry mekanizması
async function clearAuthDirWithRetry(dir: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (err: any) {
      if (err.code === 'EPERM' || err.code === 'EBUSY') {
        console.warn(`[WhatsApp] ${dir} silinirken yetki hatası alındı (Deneme ${i + 1}/${retries}). 1 saniye bekleniyor...`);
        await new Promise(res => setTimeout(res, 1000));
      } else {
        break; // Bilinmeyen başka bir hata, çık
      }
    }
  }
}

export function getStatus(): WAState {
  return { ...state };
}

export async function initialize(): Promise<void> {
  if (shuttingDown) return;
  if (state.status === 'connected' || state.status === 'connecting' || state.status === 'reconnecting') return;
  
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  
  const dir = getAuthDir();
  
  // Check if we have an existing session
  const hasExistingSession = fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
  state = { status: hasExistingSession ? 'reconnecting' : 'connecting', qrBase64: null, error: null };

  try {
    // Node.js 18+ webcrypto built-in; eski sürümlerde manuel set gerekebilir.
    if (!globalThis.crypto) {
      (globalThis as any).crypto = webcrypto;
    }

    if (!Baileys) Baileys = await _dynamicImport('@whiskeysockets/baileys');
    if (!QRCode) QRCode = await _dynamicImport('qrcode');

    const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestWaWebVersion, makeCacheableSignalKeyStore, Browsers } = Baileys as any;

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const { default: pino } = await _dynamicImport('pino');
    const logger = pino({ level: 'silent' });
    const { state: authState, saveCreds } = await useMultiFileAuthState(dir);

    let version: number[] = [2, 3000, 1027934701];
    try {
      const result = await Promise.race([
        fetchLatestWaWebVersion(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]) as any;
      version = result.version;
      console.log(`📱 WhatsApp Web versiyonu: ${version}`);
    } catch {
      console.log(`⚠️ Versiyon çekilemedi, fallback kullanılıyor: ${version}`);
    }

    if (socket) {
       try { socket.end(undefined); } catch {}
       socket = null;
    }

    socket = makeWASocket({
      version,
      logger,
      auth: {
        creds: authState.creds,
        keys: makeCacheableSignalKeyStore(authState.keys, logger),
      },
      printQRInTerminal: false,
      browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.04'],
      keepAliveIntervalMs: 20000,
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    socket.ev.on('creds.update', saveCreds);

    if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
    connectionTimeoutTimer = setTimeout(() => {
      if (state.status === 'connecting') {
         console.error('WhatsApp bağlantı zaman aşımı');
         state = { status: 'disconnected', qrBase64: null, error: 'Bağlantı zaman aşımına uğradı. Lütfen internetinizi kontrol edin.' };
         if (socket) {
            try { socket.end(undefined); } catch {}
            socket = null;
         }
      }
    }, 20000);

  socket.ev.on('messages.upsert', async (m: any) => {
    try {
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us')) continue;

        // Düğme yanıtı: selectedButtonId öncelikli, selectedDisplayText yedek, düz metin son
        const buttonId = msg.message.buttonsResponseMessage?.selectedButtonId || '';
        const buttonText = msg.message.buttonsResponseMessage?.selectedDisplayText || '';
        const text = buttonId || msg.message.conversation || msg.message.extendedTextMessage?.text || buttonText || '';
        if (!text) continue;

        const phone = remoteJid.split('@')[0];
        let cleanPhone = phone;
        if (cleanPhone.startsWith('90')) cleanPhone = cleanPhone.slice(2);

        let newStatus: 'ACCEPTED' | 'DECLINED' | null = null;
        // Düğme ID kontrolü (buttonId: 'CONSENT_YES' veya 'CONSENT_NO')
        if (buttonId === 'CONSENT_YES') {
          newStatus = 'ACCEPTED';
        } else if (buttonId === 'CONSENT_NO') {
          newStatus = 'DECLINED';
        } else {
          // Yazılı yanıt kontrolü (fallback)
          const upperText2 = text.trim().toLocaleUpperCase('tr-TR');
          if (['EVET', 'KABUL', '1'].includes(upperText2) || upperText2 === 'ONAYLIYORUM') {
            newStatus = 'ACCEPTED';
          } else if (['HAYIR', 'IPTAL', 'İPTAL', 'RET', '2'].includes(upperText2) || upperText2 === 'REDDEDİYORUM' || upperText2 === 'REDDEDIYORUM') {
            newStatus = 'DECLINED';
          }
        }

        if (newStatus) {
          const contact = await prisma.parentContact.findFirst({
            where: {
              OR: [
                { phone: { endsWith: cleanPhone } },
                { phone: { endsWith: `90${cleanPhone}` } }
              ]
            }
          });

          if (contact) {
            await prisma.parentContact.update({
              where: { id: contact.id },
              data: { waConsentStatus: newStatus, waConsentDate: new Date() },
            });

            const replyText = newStatus === 'ACCEPTED'
              ? '✅ Okul bilgilendirme mesajları için onayınız alınmıştır. Teşekkür ederiz.'
              : '❌ Okul bilgilendirme mesajlarını almayı reddettiniz. Size artık WhatsApp üzerinden okul bilgilendirmeleri gönderilmeyecektir.';

            if (socket && !shuttingDown) await socket.sendMessage(remoteJid, { text: replyText });
          }
        }
      }
    } catch (error) {
      console.error('Error handling incoming WhatsApp message:', error);
    }
  });

  socket.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !shuttingDown) {
      if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
      consecutiveFailures = 0;
      const base64 = await (QRCode as any).toDataURL(qr);
      state = { status: 'qr', qrBase64: base64, error: null };
      console.log('\ud83d\udcf1 WhatsApp QR kodu hazır');
    }

    if (connection === 'open' && !shuttingDown) {
      if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
      consecutiveFailures = 0;
      state = { status: 'connected', qrBase64: null, error: null };
      console.log('\u2705 WhatsApp bağlantısı kuruldu');
    }

    if (connection === 'close') {
      socket = null;
      if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);

      if (shuttingDown) {
        state = { status: 'disconnected', qrBase64: null, error: null };
        return;
      }

      const { Boom } = await _dynamicImport('@hapi/boom');
      const reason = (lastDisconnect?.error instanceof Boom)
        ? (lastDisconnect.error as any).output?.statusCode
        : undefined;
      const errMsg = lastDisconnect?.error?.message || '';
      console.log(`\ud83d\udd0c WA bağlantı kapandı. reason=${reason} error=${errMsg}`);

      if (reason === DisconnectReason.loggedOut) {
        // Kullanıcı oturumu kapattı — auth temizle, bağlantıyı kes
        clearAuthDirWithRetry(getAuthDir()).catch(() => {});
        consecutiveFailures = 0;
        state = { status: 'disconnected', qrBase64: null, error: 'Oturum kapatıldı.' };
        console.log('\ud83d\udd34 WhatsApp oturumu kapatıldı');

      } else if (reason === DisconnectReason.restartRequired || errMsg.includes('restart')) {
        // 515 = restartRequired: stream yeniden başlatılması gerekiyor.
        // Bu WhatsApp protokolünün normal bir parçasıdır ve QR hâlâ geçerlidir.
        // Auth dosyalarını SİLME — sadece stream'i yeniden başlat.
        consecutiveFailures += 1;
        console.log(`🔄 WhatsApp stream yeniden başlatılıyor (515), deneme: ${consecutiveFailures}...`);

        if (consecutiveFailures >= 8) {
          // Çok fazla deneme — kullanıcıya bildir ve dur
          consecutiveFailures = 0;
          clearAuthDirWithRetry(getAuthDir()).catch(() => {});
          state = { status: 'disconnected', qrBase64: null, error: 'Bağlantı kurulamıyor. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.' };
          console.log('🔴 Çok fazla başarısız deneme, bağlantı durduruldu.');
        } else {
          // QR varsa ekranda göstermeye devam et (qrBase64 temizleme!)
          const keepQr = state.status === 'qr' && state.qrBase64;
          state = keepQr
            ? { ...state }  // QR'ı koru
            : { status: 'connecting', qrBase64: null, error: null };
          
          const delay = Math.min(2000 * consecutiveFailures, 10000);
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (!shuttingDown) initialize();
          }, delay);
        }

      } else {
        // Diğer hatalar: bozuk JSON, 500 vb.
        consecutiveFailures += 1;
        const shouldCleanAuth = reason === 500 || errMsg.includes('Unexpected token') || errMsg.includes('JSON');
        if (shouldCleanAuth) {
          console.log('\ud83d\udd34 Auth dosyaları bozuk, temizleniyor...');
          clearAuthDirWithRetry(getAuthDir()).catch(() => {});
        }
        const delay = Math.min(5000 * consecutiveFailures, 20000);
        state = { status: 'connecting', qrBase64: null, error: null };
        console.log(`\ud83d\udd04 WhatsApp yeniden bağlanıyor (${delay}ms sonra)...`);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (!shuttingDown) initialize();
        }, delay);
      }
    }
  });
  } catch (error: any) {
    console.error('WhatsApp başlatma hatası:', error);
    clearAuthDirWithRetry(dir).catch(() => {});
    state = { status: 'disconnected', qrBase64: null, error: error.message || 'Bağlantı başlatılamadı' };
  }
}

export async function disconnect(clearAuth: boolean = false): Promise<void> {
  shuttingDown = true;
  consecutiveFailures = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (connectionTimeoutTimer) {
    clearTimeout(connectionTimeoutTimer);
    connectionTimeoutTimer = null;
  }

  const currentSocket = socket;
  socket = null;

  if (currentSocket) {
    if (clearAuth) {
      await currentSocket.logout();
    } else {
      currentSocket.end(undefined);
    }
  }

  if (clearAuth) {
    await clearAuthDirWithRetry(getAuthDir()).catch(() => {});
  }
  state = { status: 'disconnected', qrBase64: null, error: null };
}

function toJid(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('00')) clean = clean.slice(2);
  if (clean.startsWith('0')) clean = '90' + clean.slice(1);
  if (!clean.startsWith('90') && clean.length === 10) clean = '90' + clean;
  return `${clean}@s.whatsapp.net`;
}

async function checkConsent(phone: string): Promise<void> {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Veritabanında telefon numarasının son haneleriyle eşleşen veliyi bul
  const contact = await prisma.parentContact.findFirst({
    where: {
      OR: [
        { phone: { endsWith: cleanPhone } },
        { phone: { endsWith: `90${cleanPhone}` } }
      ]
    }
  });

  if (!contact) throw new Error('İlgili telefon numarasına ait veli kaydı bulunamadı.');
  if (contact.waConsentStatus !== 'ACCEPTED') {
    throw new Error('Veli WhatsApp bildirimlerini açıkça onaylamadığı için (Durum: ' + (contact.waConsentStatus || 'Bekliyor') + ') mesaj gönderilemedi.');
  }
}

export async function sendConsentRequest(phone: string): Promise<void> {
  if (!socket || state.status !== 'connected' || shuttingDown) {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  const jid = toJid(phone);
  const bodyText =
    `Sayın Veli,\n\n` +
    `Okulumuz, *devamsızlık bildirimleri, yazılı uyarılar ve okul bilgilendirmelerini* ` +
    `WhatsApp üzerinden iletmek istemektedir.\n\n` +
    `Bu bildirimleri almayı kabul ediyor musunuz?`;

  try {
    // WhatsApp Business: düğmeli mesaj formatı
    await (socket as any).sendMessage(jid, {
      text: bodyText,
      buttons: [
        {
          buttonId: 'CONSENT_YES',
          buttonText: { displayText: '✅ Evet, Kabul Ediyorum' },
          type: 1,
        },
        {
          buttonId: 'CONSENT_NO',
          buttonText: { displayText: '❌ Hayır, Reddediyorum' },
          type: 1,
        },
      ],
      footer: 'OkulDesk · Okul Yönetim Sistemi',
    });
    console.log(`📤 WhatsApp onay isteği (düğmeli) gönderildi: ${phone}`);
  } catch (btnErr) {
    // Fallback: Düğme desteklenmiyorsa numaralı seçenekli düz metin
    console.warn('Düğmeli mesaj gönderilemedi, düz metin fallback kullanılıyor:', (btnErr as any)?.message);
    const fallbackText =
      `${bodyText}\n\n` +
      `*1️⃣ EVET* — Kabul ediyorum, bildirim almak istiyorum.\n` +
      `*2️⃣ HAYIR* — Reddediyorum, bildirim almak istemiyorum.\n\n` +
      `Lütfen yalnızca *1* veya *2* yazarak yanıt veriniz.\n\n` +
      `_OkulDesk · Okul Yönetim Sistemi_`;
    await socket.sendMessage(jid, { text: fallbackText });
    console.log(`📤 WhatsApp onay isteği (metin) gönderildi: ${phone}`);
  }
}

export async function sendTextMessage(phone: string, text: string): Promise<void> {
  if (!socket || state.status !== 'connected' || shuttingDown) {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  await checkConsent(phone);
  const jid = toJid(phone);
  await socket.sendMessage(jid, { text });
}

export async function sendMessageWithPDF(
  phone: string,
  text: string,
  pdfPath: string,
  fileName = 'belge.pdf'
): Promise<void> {
  if (!socket || state.status !== 'connected' || shuttingDown) {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  if (!fs.existsSync(pdfPath)) throw new Error('PDF dosyası bulunamadı.');
  await checkConsent(phone);
  const jid = toJid(phone);
  const document = fs.readFileSync(pdfPath);
  await socket.sendMessage(jid, { document, fileName, mimetype: 'application/pdf', caption: text });
}

export async function sendMessageWithImage(
  phone: string,
  text: string,
  imagePath: string
): Promise<void> {
  if (!socket || state.status !== 'connected' || shuttingDown) {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  if (!fs.existsSync(imagePath)) throw new Error('Görsel dosyası bulunamadı.');
  await checkConsent(phone);
  const jid = toJid(phone);
  const image = fs.readFileSync(imagePath);
  await socket.sendMessage(jid, { image, caption: text, mimetype: 'image/jpeg' });
}

export async function sendMessageWithImageBuffer(
  phone: string,
  text: string,
  imageBuffer: Buffer
): Promise<void> {
  if (!socket || state.status !== 'connected' || shuttingDown) {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  await checkConsent(phone);
  const jid = toJid(phone);
  await socket.sendMessage(jid, { image: imageBuffer, caption: text, mimetype: 'image/jpeg' });
}

export const whatsappService = {
  initialize,
  disconnect,
  getStatus,
  setAuthDir,
  sendTextMessage,
  sendConsentRequest,
  sendMessageWithPDF,
  sendMessageWithImage,
  sendMessageWithImageBuffer,
};
