import fs from 'fs';
import path from 'path';
import { webcrypto } from 'crypto';
import prisma from '../shared/utils/prisma';

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

// Gönderilen ve henüz yanıtlanmamış onay istekleri (telefonun son 10 hanesi -> zaman damgası).
const pendingConsent = new Map<string, number>();
const CONSENT_PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CONSENT_RESEND_MIN_MS = 10 * 60 * 1000;

// Mesajlar arası bekleme (WhatsApp'ın spam algısını azaltmak için)
let sendQueue: Promise<unknown> = Promise.resolve();
const SEND_GAP_MIN_MS = 1500;
const SEND_GAP_MAX_MS = 3000;

import { config } from '../shared/config';

function getAuthDir(): string {
  if (authDir) return authDir;
  if (process.env.WHATSAPP_AUTH_DIR) return process.env.WHATSAPP_AUTH_DIR;
  const uploadDir = config.upload.dir;
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

// ── Telefon yardımcıları ─────────────────────────────────────────────────────

/** Telefonun son 10 hanesi (TR GSM formatı). Geçersizse boş string. */
function phoneKey(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

async function findContactsByPhone(phone: string) {
  const key = phoneKey(phone);
  if (!key) return [];
  const all = await prisma.parentContact.findMany({
    where: { phone: { not: '' }, parent: { deletedAt: null } },
    select: { id: true, phone: true, waConsentStatus: true },
  });
  return all.filter(c => phoneKey(c.phone) === key);
}

function toJid(phone: string): string {
  let clean = String(phone ?? '').replace(/\D/g, '');
  if (clean.startsWith('00')) clean = clean.slice(2);
  if (clean.startsWith('0')) clean = '90' + clean.slice(1);
  if (!clean.startsWith('90') && clean.length === 10) clean = '90' + clean;
  if (clean.length < 11) throw new Error('Geçersiz telefon numarası.');
  return `${clean}@s.whatsapp.net`;
}

function enqueueSend<T>(fn: () => Promise<T>): Promise<T> {
  const run = sendQueue.then(fn);
  const gap = SEND_GAP_MIN_MS + Math.random() * (SEND_GAP_MAX_MS - SEND_GAP_MIN_MS);
  sendQueue = run.then(
    () => new Promise(res => setTimeout(res, gap)),
    () => new Promise(res => setTimeout(res, gap)),
  );
  return run;
}

function ensureConnected() {
  if (!socket || state.status !== 'connected' || shuttingDown) {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
}

/** Mevcut bir oturum varsa sunucu açılışında otomatik bağlanır. */
export async function autoConnect(): Promise<void> {
  try {
    const dir = getAuthDir();
    if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
      await initialize();
    }
  } catch (err) {
    console.error('WhatsApp otomatik bağlanma hatası:', err);
  }
}

export async function initialize(): Promise<void> {
  if (shuttingDown) return;
  // 'qr' durumunda da guard'a tabi değil — QR görünürken yeniden bağlanabilmeli
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

    if (!Baileys) {
      // TypeScript'in `import()` ifadesini `require()`'a çevirmesini (CJS module resolution) engellemek için
      Baileys = await eval(`import('@whiskeysockets/baileys')`);
    }
    if (!QRCode) QRCode = require('qrcode');

    const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestWaWebVersion, makeCacheableSignalKeyStore, Browsers } = Baileys as any;

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const pino = require('pino');
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
       const old = socket;
       socket = null; // Eski soketin 'close' olayı artık yok sayılır
       try { old.end(undefined); } catch {}
    }

    const sock = makeWASocket({
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
    socket = sock;

    sock.ev.on('creds.update', saveCreds);

    if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
    connectionTimeoutTimer = setTimeout(() => {
      if (socket === sock && (state.status === 'connecting' || state.status === 'reconnecting')) {
         console.error('WhatsApp bağlantı zaman aşımı');
         state = { status: 'disconnected', qrBase64: null, error: 'Bağlantı zaman aşımına uğradı. Lütfen internetinizi kontrol edin.' };
         socket = null;
         try { sock.end(undefined); } catch {}
      }
    }, 20000);

  sock.ev.on('messages.upsert', async (m: any) => {
    if (socket !== sock) return;
    // Geçmiş senkronizasyonundan gelen eski mesajları işleme
    if (m.type && m.type !== 'notify') return;
    try {
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const remoteJid: string | undefined = msg.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) continue;

        // Düğme yanıtı: selectedButtonId öncelikli, selectedDisplayText yedek, düz metin son
        const buttonId =
          msg.message.buttonsResponseMessage?.selectedButtonId ||
          msg.message.templateButtonReplyMessage?.selectedId || '';
        const buttonText = msg.message.buttonsResponseMessage?.selectedDisplayText || '';
        const text = buttonId || msg.message.conversation || msg.message.extendedTextMessage?.text || buttonText || '';
        if (!text) continue;

        // Telefon numarasını belirle (@lid kimliklerinde gerçek numara ayrı alanda gelir)
        let phoneJid: string | undefined = remoteJid;
        if (remoteJid.endsWith('@lid')) {
          phoneJid = msg.key.remoteJidAlt || msg.key.senderPn || undefined;
          if (!phoneJid) {
            try { phoneJid = await sock.signalRepository?.lidMapping?.getPNForLID?.(remoteJid); } catch {}
          }
        }
        if (!phoneJid || !phoneJid.includes('@s.whatsapp.net')) continue;
        const key = phoneKey(phoneJid.split('@')[0].split(':')[0]);
        if (!key) continue;

        const upperText = text.trim().toLocaleUpperCase('tr-TR');
        const requestedAt = pendingConsent.get(key);
        const hasPending = !!requestedAt && Date.now() - requestedAt < CONSENT_PENDING_TTL_MS;

        let newStatus: 'ACCEPTED' | 'DECLINED' | null = null;
        if (buttonId === 'CONSENT_YES') {
          newStatus = 'ACCEPTED';
        } else if (buttonId === 'CONSENT_NO') {
          newStatus = 'DECLINED';
        } else if (['EVET', 'KABUL', 'ONAYLIYORUM'].includes(upperText)) {
          newStatus = 'ACCEPTED';
        } else if (['HAYIR', 'IPTAL', 'İPTAL', 'RET', 'REDDEDİYORUM', 'REDDEDIYORUM', 'DUR', 'STOP'].includes(upperText)) {
          newStatus = 'DECLINED';
        } else if (hasPending && upperText === '1') {
          // "1"/"2" gibi belirsiz yanıtlar yalnızca bekleyen bir onay isteği varken geçerli
          newStatus = 'ACCEPTED';
        } else if (hasPending && upperText === '2') {
          newStatus = 'DECLINED';
        }

        if (!newStatus) continue;

        const contacts = await findContactsByPhone(key);
        if (contacts.length === 0) continue;

        await prisma.parentContact.updateMany({
          where: { id: { in: contacts.map(c => c.id) } },
          data: { waConsentStatus: newStatus, waConsentDate: new Date() },
        });
        pendingConsent.delete(key);

        const replyText = newStatus === 'ACCEPTED'
          ? '✅ Okul bilgilendirme mesajları için onayınız alınmıştır. Teşekkür ederiz.'
          : '❌ Okul bilgilendirme mesajlarını almayı reddettiniz. Size artık WhatsApp üzerinden okul bilgilendirmeleri gönderilmeyecektir.';

        if (socket === sock && !shuttingDown) {
          try { await sock.sendMessage(remoteJid, { text: replyText }); } catch (e) {
            console.warn('Onay yanıtı gönderilemedi:', (e as any)?.message);
          }
        }
      }
    } catch (error) {
      console.error('Error handling incoming WhatsApp message:', error);
    }
  });

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    // Eski (yerini yeni sokete bırakmış) bağlantının olayları yok sayılır
    if (socket !== sock) return;

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

      const { Boom } = require('@hapi/boom');
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
          // Çok fazla deneme — kullanıcıya bildir ve dur. Oturum dosyaları korunur.
          consecutiveFailures = 0;
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
            if (!shuttingDown) {
              state = { status: 'disconnected', qrBase64: null, error: null };
              initialize();
            }
          }, delay);
        }

      } else {
        // Diger hatalar. Yalnizca gercekten bozuk (JSON) auth dosyalari temizlenir;
        // gecici ag hatalarinda (wsarecv, ECONNRESET, 500 vb.) oturum korunur.
        consecutiveFailures += 1;
        const corruptAuth = errMsg.includes('Unexpected token') || errMsg.includes('JSON');
        const isNetworkDrop = errMsg.includes('wsarecv') || errMsg.includes('ECONNRESET') ||
          errMsg.includes('ECONNABORTED') || errMsg.includes('ETIMEDOUT') ||
          errMsg.includes('forcibly closed');
        if (corruptAuth) {
          console.log('\ud83d\udd34 Auth dosyalari bozuk, temizleniyor...');
          clearAuthDirWithRetry(getAuthDir()).catch(() => {});
        }
        // Gecici ag kopmasi: daha kisa bekleme ile yeniden baglan
        const delay = isNetworkDrop
          ? Math.min(2000 * consecutiveFailures, 8000)
          : Math.min(5000 * consecutiveFailures, 20000);
        state = { status: 'connecting', qrBase64: null, error: null };
        if (isNetworkDrop) {
          console.log(`\ud83d\udfe1 WhatsApp ag kopmasi, ${delay}ms sonra yeniden baglanıyor... (${errMsg.slice(0, 80)})`);
        } else {
          console.log(`\ud83d\udd04 WhatsApp yeniden baglanıyor (${delay}ms sonra)...`);
        }
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (!shuttingDown) {
            state = { status: 'disconnected', qrBase64: null, error: null };
            initialize();
          }
        }, delay);
      }
    }
  });
  } catch (error: any) {
    console.error('WhatsApp başlatma hatası:', error);
    // Çalışan oturumu silme; yalnızca dosya bozuksa temizle.
    const msg: string = error?.message || '';
    if (msg.includes('Unexpected token') || msg.includes('JSON')) {
      clearAuthDirWithRetry(dir).catch(() => {});
    }
    state = { status: 'disconnected', qrBase64: null, error: msg || 'Bağlantı başlatılamadı' };
  }
}

/**
 * Bağlantıyı keser.
 * @param clearAuth true ise WhatsApp oturumu kapatılır ve auth dosyaları silinir.
 * @param final true ise (sunucu kapanışı) yeniden bağlanma kalıcı olarak engellenir.
 */
export async function disconnect(clearAuth: boolean = false, final: boolean = false): Promise<void> {
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

  try {
    if (currentSocket) {
      if (clearAuth) {
        try { await currentSocket.logout(); } catch (e) {
          console.warn('WhatsApp logout başarısız (bağlantı zaten kopmuş olabilir):', (e as any)?.message);
          try { currentSocket.end(undefined); } catch {}
        }
      } else {
        try { currentSocket.end(undefined); } catch {}
      }
    }

    if (clearAuth) {
      await clearAuthDirWithRetry(getAuthDir()).catch(() => {});
    }
  } finally {
    state = { status: 'disconnected', qrBase64: null, error: null };
    // Kullanıcı kaynaklı kesmeden sonra yeniden bağlanabilmek için bayrağı sıfırla.
    if (!final) shuttingDown = false;
  }
}

async function checkConsent(phone: string): Promise<void> {
  if (!phoneKey(phone)) throw new Error('Veli telefon numarası geçersiz veya boş.');

  // Aynı numaraya sahip tüm kayıtlar kontrol edilir
  const contacts = await findContactsByPhone(phone);

  if (contacts.length === 0) throw new Error('İlgili telefon numarasına ait veli kaydı bulunamadı.');
  const notAccepted = contacts.find(c => c.waConsentStatus !== 'ACCEPTED');
  if (notAccepted) {
    throw new Error('Veli WhatsApp bildirimlerini açıkça onaylamadığı için (Durum: ' + (notAccepted.waConsentStatus || 'Bekliyor') + ') mesaj gönderilemedi.');
  }
}

export async function sendConsentRequest(phone: string): Promise<void> {
  ensureConnected();
  const jid = toJid(phone);
  const key = phoneKey(phone);

  const last = pendingConsent.get(key);
  if (last && Date.now() - last < CONSENT_RESEND_MIN_MS) {
    throw new Error('Bu veliye onay isteği az önce gönderildi. Lütfen birkaç dakika bekleyin.');
  }

  const text =
    `Sayın Veli,\n\n` +
    `Okulumuz, *devamsızlık bildirimleri, yazılı uyarılar ve okul bilgilendirmelerini* ` +
    `WhatsApp üzerinden iletmek istemektedir.\n\n` +
    `Bu bildirimleri almayı kabul ediyor musunuz?\n\n` +
    `*1️⃣ EVET* — Kabul ediyorum, bildirim almak istiyorum.\n` +
    `*2️⃣ HAYIR* — Reddediyorum, bildirim almak istemiyorum.\n\n` +
    `Lütfen yalnızca *1* veya *2* yazarak yanıt veriniz.\n\n` +
    `_OkulDesk · Okul Yönetim Sistemi_`;

  // Not: WhatsApp normal hesaplarda eski "buttons" formatını göstermediği için
  // her zaman numaralı düz metin kullanılır.
  await enqueueSend(async () => {
    ensureConnected();
    await socket.sendMessage(jid, { text });
  });

  pendingConsent.set(key, Date.now());

  // Daha önce reddetmiş velinin durumunu tekrar beklemeye al
  const contacts = await findContactsByPhone(phone);
  const declined = contacts.filter(c => c.waConsentStatus === 'DECLINED').map(c => c.id);
  if (declined.length > 0) {
    await prisma.parentContact.updateMany({
      where: { id: { in: declined } },
      data: { waConsentStatus: 'PENDING', waConsentDate: null },
    });
  }
  console.log('📤 WhatsApp onay isteği gönderildi.');
}

export async function sendTextMessage(phone: string, text: string): Promise<void> {
  ensureConnected();
  await checkConsent(phone);
  const jid = toJid(phone);
  await enqueueSend(async () => {
    ensureConnected();
    await socket.sendMessage(jid, { text });
  });
}

export async function sendMessageWithPDF(
  phone: string,
  text: string,
  pdfPath: string,
  fileName = 'belge.pdf'
): Promise<void> {
  ensureConnected();
  if (!fs.existsSync(pdfPath)) throw new Error('PDF dosyası bulunamadı.');
  await checkConsent(phone);
  const jid = toJid(phone);
  const document = fs.readFileSync(pdfPath);
  await enqueueSend(async () => {
    ensureConnected();
    await socket.sendMessage(jid, { document, fileName, mimetype: 'application/pdf', caption: text });
  });
}

export async function sendMessageWithImage(
  phone: string,
  text: string,
  imagePath: string
): Promise<void> {
  ensureConnected();
  if (!fs.existsSync(imagePath)) throw new Error('Görsel dosyası bulunamadı.');
  await checkConsent(phone);
  const jid = toJid(phone);
  const image = fs.readFileSync(imagePath);
  await enqueueSend(async () => {
    ensureConnected();
    await socket.sendMessage(jid, { image, caption: text, mimetype: 'image/jpeg' });
  });
}

export async function sendMessageWithImageBuffer(
  phone: string,
  text: string,
  imageBuffer: Buffer
): Promise<void> {
  ensureConnected();
  await checkConsent(phone);
  const jid = toJid(phone);
  await enqueueSend(async () => {
    ensureConnected();
    await socket.sendMessage(jid, { image: imageBuffer, caption: text, mimetype: 'image/jpeg' });
  });
}

export const whatsappService = {
  initialize,
  autoConnect,
  disconnect,
  getStatus,
  setAuthDir,
  sendTextMessage,
  sendConsentRequest,
  sendMessageWithPDF,
  sendMessageWithImage,
  sendMessageWithImageBuffer,
};
