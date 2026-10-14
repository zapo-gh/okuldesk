import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import sharp from 'sharp';
import { whatsappService } from './whatsapp.service';
import { absenteeismService } from '../absenteeism/absenteeism.service';
import { warningsService } from '../warnings/warnings.service';
import { getFullPageBuffer } from '../absenteeism/pdfPreview.service';
import { settingsService } from '../settings/settings.service';
import prisma from '../shared/utils/prisma';
import { whatsappConsentService } from './whatsappConsent.service';
import { tunnelService } from './tunnel.service';
import { firebaseSyncService } from './firebaseSync.service';
import { getOrCreateConsentToken } from './webConsent.controller';
import { generateConsentFormPdf, generateMultipleConsentFormsPdf } from './consentPdf.generator';

// ── Devamsızlık mesaj şablonları (varsayılan) ─────────────────────────────────
// Kullanıcı Settings sayfasından kendi şablonunu girebilir.
// Yer tutucular: {{ogrenciAdi}} {{ozurluGun}} {{ozursuzGun}} {{toplamGun}} {{okulAdi}} {{uyariNo}}

const DEFAULT_WA_TEMPLATES: Record<number, string> = {
  1: `📩 *ÖĞRENCİ DEVAMSIZLIK BİLGİLENDİRMESİ*
_(1. Uyarı Bildirimi)_

Sayın Velimiz,

Okulumuz *{{okulAdi}}* bünyesinde öğrenim gören öğrencimiz *{{ogrenciAdi}}*'nın güncel devamsızlık durumu aşağıda bilgilerinize sunulmuştur:

▫️ *Özürsüz Devamsızlık:* {{ozursuzGun}} Gün
▫️ *Özürlü (İzin/Rapor):* {{ozurluGun}} Gün
▫️ *Toplam Devamsızlık:* {{toplamGun}} Gün

Milli Eğitim Bakanlığı mevzuatı gereği öğrencimizin devamsızlık sınırlarını aşmaması ve ders başarısının olumsuz etkilenmemesi adına okula düzenli devamının sağlanmasını önemle rica ederiz.

📌 *Not:* Detaylı devamsızlık mektubu ve ilgili belgeler okul idaremiz tarafından resmi kayıt altına alınmıştır.

Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`,

  2: `⚠️ *ÖĞRENCİ DEVAMSIZLIK UYARISI*
_(2. Kritik Seviye Uyarısı)_

Sayın Velimiz,

Öğrencimiz *{{ogrenciAdi}}*'nın devamsızlık süresi yasal sınır eşiğine yaklaşmış bulunmaktadır:

▫️ *Özürsüz Devamsızlık:* {{ozursuzGun}} Gün
▫️ *Özürlü (İzin/Rapor):* {{ozurluGun}} Gün
▫️ *Toplam Devamsızlık:* {{toplamGun}} Gün

⚠️ *Yasal Hatırlatma:* MEB Ortaöğretim Kurumları Yönetmeliği uyarınca; özürsüz devamsızlığı 10 günü veya toplam devamsızlığı 30 günü aşan öğrenciler, ders puanlarına bakılmaksızın başarısız sayılarak sınıf tekrarına kalmaktadır.

Öğrencimizin eğitim hakkının kesintiye uğramaması adına devamsızlık durumunun ivedilikle takip edilmesini ve mazeret belgelerinin (varsa sevk/rapor) süresi içerisinde okul idaremize teslim edilmesini rica ederiz.

Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`,

  3: `🚨 *ÖNEMLİ VE ACİL: DEVAMSIZLIK SON UYARISI*
_(3. Uyarı - Yasal Sınır Eşiği Bildirimi)_

Sayın Velimiz,

Öğrencimiz *{{ogrenciAdi}}*'nın devamsızlığı kritik yasal sınır aşamasına ulaşmıştır:

▫️ *Özürsüz Devamsızlık:* {{ozursuzGun}} Gün
▫️ *Özürlü (İzin/Rapor):* {{ozurluGun}} Gün
▫️ *Toplam Devamsızlık:* {{toplamGun}} Gün

🛑 *DİKKAT:* MEB mevzuatına göre özürsüz 10 gün veya toplam 30 gün devamsızlık sınırının aşılması durumunda öğrencinin doğrudan sınıf tekrarına kalacağını, daha önce sınıf tekrarı yapmış olması hâlinde ise örgün eğitim dışına çıkarılacağını önemle hatırlatırız.

Öğrencimizin durumunu görüşmek ve gerekli yasal süreçleri tamamlamak üzere en kısa sürede okulumuz ilgili müdür yardımcılığı ile görüşmeniz gerekmektedir.

Saygılarımızla,
*{{okulAdi}} MÜDÜRLÜĞÜ*`,
};

// BEP (Bireysel Eğitim Planı) öğrencileri için şablon — tüm uyarı seviyeleri için aynı
const BEP_WA_TEMPLATE = `*Devamsızlık Mektubu – {{uyariNo}}. Uyarı*

Sayın Velimiz,

Milli Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği'ne göre; tam zamanlı kaynaştırma/bütünleştirme (BEP) yoluyla eğitim alan öğrenciler için özürsüz devamsızlık sınırı 20 gün, toplam devamsızlık sınırı ise 70 gündür.

Öğrenciniz *{{ogrenciAdi}}*'nın devamsızlığı; *{{ozurluGun}} gün özürlü, {{ozursuzGun}} gün özürsüz* olmak üzere *toplam {{toplamGun}} gündür.*

*Özürsüz devamsızlığı 20 günü veya toplam devamsızlığı 70 günü aşan BEP kapsamındaki öğrenciler, ders puanlarına bakılmaksızın başarısız sayılmakta ve sınıf tekrarına kalmaktadır.*

Öğrencinizin okula devamının sağlanması hususunda gereğini rica ederiz.

{{okulAdi}}`;

function formatDay(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return '?';
  return val % 1 === 0 ? String(val) : val.toFixed(1).replace('.', ',');
}

/** Gün değerini doğrular: boşsa fallback; geçersiz/negatif ise fallback. */
function parseDays(raw: unknown, fallback: number | null): number | null {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = parseFloat(String(raw));
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : fallback;
}

/** Gövdeden gelen seçili telefonları string dizisine çevirir. */
function parseSelectedPhones(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((p): p is string => typeof p === 'string');
}

/** Yüzde değerini 0–100 aralığına sıkıştırır; geçersizse undefined. */
function parsePercent(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = parseFloat(String(raw));
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, n));
}

function formatSchoolClosing(schoolName: string): string {
  const clean = (schoolName || '').trim();
  if (!clean) return 'Okul Müdürlüğü';
  if (/müdürlüğü$/i.test(clean)) return clean;
  const isUpper = clean === clean.toLocaleUpperCase('tr-TR');
  return isUpper ? `${clean} MÜDÜRLÜĞÜ` : `${clean} Müdürlüğü`;
}

function buildAbsenteeismMessage(opts: {
  template: string;
  studentName: string;
  warningNumber: number;
  excusedDays: number | null;
  unexcusedDays: number | null;
  schoolName: string;
}): string {
  const { template, studentName, warningNumber, excusedDays, unexcusedDays, schoolName } = opts;
  const total = (excusedDays ?? 0) + (unexcusedDays ?? 0);
  const closingName = formatSchoolClosing(schoolName);

  // Fonksiyonlu replace: değerlerdeki '$&' gibi dizilerin özel anlam kazanmasını önler
  return template
    .replace(/\{\{ogrenciAdi\}\}/g, () => studentName)
    .replace(/\{\{ozurluGun\}\}/g, () => formatDay(excusedDays))
    .replace(/\{\{ozursuzGun\}\}/g, () => formatDay(unexcusedDays))
    .replace(/\{\{toplamGun\}\}/g, () => formatDay(total))
    .replace(/\{\{okulAdi\}\}\s*(?:Müdürlüğü|MÜDÜRLÜĞÜ|müdürlüğü)/gi, () => closingName)
    .replace(/\{\{okulAdi\}\}/g, () => schoolName)
    .replace(/\{\{uyariNo\}\}/g, () => String(warningNumber))
    .trim();
}

export const whatsappController = {
  /** GET /api/whatsapp/status */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const st = whatsappService.getStatus();
      res.json({ success: true, data: st });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/connect */
  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      await whatsappService.initialize();
      res.json({ success: true, message: 'Bağlantı başlatıldı.' });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/disconnect */
  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      await whatsappService.disconnect(true); // true = clear auth
      res.json({ message: 'WhatsApp bağlantısı kesildi' });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/whatsapp/send/absenteeism/:id
   *  Devamsızlık kaydını PDF + mesaj olarak tüm velilere gönderir
   */
  async sendAbsenteeism(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await absenteeismService.getById(req.params.id);
      const parents = record.student.parents;

      if (!parents || parents.length === 0) {
        res.status(400).json({ success: false, message: 'Bu öğrenciye tanımlı veli bulunamadı.' });
        return;
      }

      // Seçili velileri filtrele (frontend'den gelen selectedPhones dizisi)
      const selectedPhones = parseSelectedPhones(req.body.selectedPhones);
      const filteredParents = (selectedPhones && selectedPhones.length > 0)
        ? (parents as any[]).filter((p: any) => selectedPhones.includes(p.phone))
        : parents;

      if (filteredParents.length === 0) {
        res.status(400).json({ success: false, message: 'Gönderilecek veli seçilmedi.' });
        return;
      }

      const pdfPath = await absenteeismService.servePdf(req.params.id);
      const studentName = record.student.fullName;

      // Önizleme JPG varsa görsel olarak gönder (WhatsApp'ta inline görünür)
      // Yoksa PDF dosyasını belge olarak gönder (fallback)
      const previewPath: string | null = (record as any).previewPath ?? null;
      const useImage = !!previewPath && fs.existsSync(previewPath);

      // Kullanıcı tarafından seçilen kırpma alanı (0–100 arası yüzde değerleri)
      const cropTop = parsePercent(req.body.cropTop);
      const cropBottom = parsePercent(req.body.cropBottom);
      const hasCustomCrop = useImage && cropTop !== undefined && cropBottom !== undefined
        && cropBottom > cropTop;

      // Şablonu settings'ten al, yoksa varsayılanı kullan; BEP öğrencileri için BEP şablonu
      const settings = await settingsService.get();
      const warningNo = record.warningNumber;
      const isBep = !!(record as any).isBep;
      const templateKey = `waTemplate${Math.min(warningNo, 3)}` as 'waTemplate1' | 'waTemplate2' | 'waTemplate3';
      const templateText = isBep
        ? BEP_WA_TEMPLATE
        : (settings[templateKey] && (settings[templateKey] as string).trim())
          ? settings[templateKey] as string
          : DEFAULT_WA_TEMPLATES[Math.min(warningNo, 3)] ?? DEFAULT_WA_TEMPLATES[2];

      const excusedDays = parseDays(req.body.excusedDays, (record as any).excusedDays ?? null);
      const unexcusedDays = parseDays(req.body.unexcusedDays, (record as any).unexcusedDays ?? null);

      const results: { parent: string; phone: string; ok: boolean; error?: string }[] = [];

      for (const parent of filteredParents) {
        const msg = buildAbsenteeismMessage({
          template: templateText,
          studentName,
          warningNumber: warningNo,
          excusedDays,
          unexcusedDays,
          schoolName: settings.schoolName || 'Okul Yönetimi',
        });

        try {
          if (useImage) {
            if (hasCustomCrop) {
              // Kullanıcının seçtiği bölgeyi PDF'den yeniden kırp ve buffer olarak gönder
              const pageBuf = await getFullPageBuffer(pdfPath);
              const meta = await sharp(pageBuf).metadata();
              const imgH = meta.height!;
              const imgW = meta.width!;
              const topPx = Math.max(0, Math.floor(imgH * cropTop! / 100));
              const heightPx = Math.max(1, Math.min(imgH - topPx, Math.floor(imgH * (cropBottom! - cropTop!) / 100)));
              const cropBuf = await sharp(pageBuf)
                .extract({ left: 0, top: topPx, width: imgW, height: heightPx })
                .jpeg({ quality: 100 })
                .toBuffer();
              await whatsappService.sendMessageWithImageBuffer(parent.phone, msg, cropBuf);
            } else {
              await whatsappService.sendMessageWithImage(parent.phone, msg, previewPath!);
            }
          } else {
            const fileName = `devamsizlik_${studentName.replace(/\s/g, '_')}.pdf`;
            await whatsappService.sendMessageWithPDF(parent.phone, msg, pdfPath, fileName);
          }
          results.push({ parent: parent.fullName, phone: parent.phone, ok: true });
        } catch (err: any) {
          results.push({ parent: parent.fullName, phone: parent.phone, ok: false, error: err.message });
        }
      }

      // En az bir gönderim başarılıysa waSentAt güncelle
      if (results.some(r => r.ok)) {
        await prisma.absenteeism.update({
          where: { id: req.params.id },
          data: { waSentAt: new Date() },
        });
      }

      res.json({ success: true, data: { results } });
    } catch (err) { next(err); }
  },

  /** GET /api/whatsapp/full-image/absenteeism/:id
   *  PDF'nin ilk sayfasını kırpmasız, tam boyutlu JPEG olarak base64 döndürür.
   *  Kullanıcının kırpma alanını seçebilmesi için frontend'de gösterilir.
   */
  async fullImageAbsenteeism(req: Request, res: Response, next: NextFunction) {
    try {
      const pdfPath = await absenteeismService.servePdf(req.params.id);
      const pageBuf = await getFullPageBuffer(pdfPath);
      const jpegBuf = await sharp(pageBuf).jpeg({ quality: 90 }).toBuffer();
      res.json({ success: true, data: { image: jpegBuf.toString('base64') } });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/preview/absenteeism/:id
   *  Mesaj önizlemesi döndürür (gönderim yapmaz)
   */
  async previewAbsenteeism(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await absenteeismService.getById(req.params.id);
      const parents = record.student.parents;

      if (!parents || parents.length === 0) {
        res.status(400).json({ success: false, message: 'Bu öğrenciye tanımlı veli bulunamadı.' });
        return;
      }

      const settings = await settingsService.get();
      const warningNo = record.warningNumber;
      const isBep = !!(record as any).isBep;
      const templateKey = `waTemplate${Math.min(warningNo, 3)}` as 'waTemplate1' | 'waTemplate2' | 'waTemplate3';
      const templateText = isBep
        ? BEP_WA_TEMPLATE
        : (settings[templateKey] && (settings[templateKey] as string).trim())
          ? settings[templateKey] as string
          : DEFAULT_WA_TEMPLATES[Math.min(warningNo, 3)] ?? DEFAULT_WA_TEMPLATES[2];

      const excusedDays = parseDays(req.body.excusedDays, (record as any).excusedDays ?? null);
      const unexcusedDays = parseDays(req.body.unexcusedDays, (record as any).unexcusedDays ?? null);

      const previewPath: string | null = (record as any).previewPath ?? null;
      const hasPreviewImage = !!previewPath && fs.existsSync(previewPath);

      const messages = parents.map((parent: any) => ({
        parent: parent.fullName,
        relation: parent.relation || 'Veli',
        phone: parent.phone,
        waConsentStatus: parent.waConsentStatus || 'PENDING',
        waConsentDate: parent.waConsentDate || null,
        isPrimary: !!parent.isPrimary,
        message: buildAbsenteeismMessage({
          template: templateText,
          studentName: record.student.fullName,
          warningNumber: warningNo,
          excusedDays,
          unexcusedDays,
          schoolName: settings.schoolName || 'Okul Yönetimi',
        }),
      }));

      res.json({
        success: true,
        data: {
          studentName: record.student.fullName,
          className: record.student.className,
          warningNumber: warningNo,
          excusedDays,
          unexcusedDays,
          hasPreviewImage,
          messages,
        },
      });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/send/warning/:id
   *  Yazılı uyarı mesajı (ve opsiyonel PDF belgesi) seçili velilere gönderir
   */
  async sendWarning(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await warningsService.getById(req.params.id);
      if (!record) {
        res.status(404).json({ success: false, message: 'Yazılı uyarı kaydı bulunamadı.' });
        return;
      }

      const parentsRaw = record.student?.parents || [];
      if (parentsRaw.length === 0) {
        res.status(400).json({ success: false, message: 'Bu öğrenciye tanımlı veli bulunamadı.' });
        return;
      }
      
      const parents = parentsRaw.filter((p: any) => p.phone && p.phone.trim().length > 0);

      // Seçili velileri filtrele (frontend'den gelen selectedPhones dizisi)
      const selectedPhones = parseSelectedPhones(req.body.selectedPhones);
      const filteredParents = (selectedPhones && selectedPhones.length > 0)
        ? parents.filter((p: any) => selectedPhones.includes(p.phone))
        : parents;

      if (filteredParents.length === 0) {
        res.status(400).json({ success: false, message: 'Gönderilecek veli seçilmedi.' });
        return;
      }

      const settings = await settingsService.get();
      const schoolName = settings.schoolName || 'Okul Yönetimi';

      // PDF dosyasını kontrol et (mevcut değilse oluşturulur)
      let pdfPath: string | null = null;
      try {
        const pdfInfo = await warningsService.servePdf(record.id);
        if (pdfInfo && pdfInfo.fullPath && fs.existsSync(pdfInfo.fullPath)) {
          pdfPath = pdfInfo.fullPath;
        }
      } catch (err) {
        console.warn('Yazılı uyarı PDF dosyasını alma/oluşturma hatası:', err);
      }

      const sendAsPdf = req.body.sendAsPdf !== false;
      const results: { parent: string; phone: string; ok: boolean; error?: string }[] = [];

      for (const parent of filteredParents) {
        const greeting = parent.fullName ? `Sayın ${parent.fullName},` : 'Sayın Veli,';
        const msg =
          `📩 *ÖĞRENCİ YAZILI UYARI BİLGİLENDİRMESİ*\n` +
          `_(${record.warningNumber}. Yazılı Uyarı / Tutanak)_\n\n` +
          `${greeting}\n\n` +
          `Okulumuz *${schoolName}* bünyesinde öğrenim gören öğrencimiz *${record.student.fullName}* (${record.student.className} sınıfı, No: ${record.student.schoolNumber}) hakkında okul içi kurallar doğrultusunda *${record.warningNumber}. yazılı uyarı tutanağı* düzenlenmiştir.\n\n` +
          `▫️ *İlgili Davranış:* ${record.behaviorText}\n` +
          (record.description ? `▫️ *Açıklama / Detay:* ${record.description}\n` : '') +
          `\nÖğrencimizin okul kurallarına uyumu ve olumlu davranış gelişiminin desteklenmesi adına konunun takibini rica ederiz.\n\n` +
          `Saygılarımızla,\n*${schoolName}*`;

        try {
          if (sendAsPdf && pdfPath) {
            const safeName = record.student.fullName.replace(/\s+/g, '_');
            const fileName = `yazili_uyari_${safeName}_${record.warningNumber}.pdf`;
            await whatsappService.sendMessageWithPDF(parent.phone, msg, pdfPath, fileName);
          } else {
            await whatsappService.sendTextMessage(parent.phone, msg);
          }
          results.push({ parent: parent.fullName, phone: parent.phone, ok: true });
        } catch (err: any) {
          results.push({ parent: parent.fullName, phone: parent.phone, ok: false, error: err.message });
        }
      }

      // En az bir gönderim başarılıysa waSentAt güncelle
      if (results.some(r => r.ok)) {
        await prisma.writtenWarning.update({
          where: { id: req.params.id },
          data: { waSentAt: new Date() },
        });
      }

      res.json({ success: true, data: { results } });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/preview/warning/:id
   *  Yazılı uyarı mesaj önizlemesi döndürür (gönderim yapmaz)
   */
  async previewWarning(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await warningsService.getById(req.params.id);
      if (!record) {
        res.status(404).json({ success: false, message: 'Yazılı uyarı kaydı bulunamadı.' });
        return;
      }

      const parents = record.student?.parents || [];
      if (parents.length === 0) {
        res.status(400).json({ success: false, message: 'Bu öğrenciye tanımlı veli bulunamadı.' });
        return;
      }

      const settings = await settingsService.get();
      const schoolName = settings.schoolName || 'Okul Yönetimi';

      const messages = parents
        .filter((p: any) => p.phone && p.phone.trim().length > 0)
        .map((parent: any) => {
          const greeting = parent.fullName ? `Sayın ${parent.fullName},` : 'Sayın Veli,';
          const msg =
            `📩 *ÖĞRENCİ YAZILI UYARI BİLGİLENDİRMESİ*\n` +
            `_(${record.warningNumber}. Yazılı Uyarı / Tutanak)_\n\n` +
            `${greeting}\n\n` +
            `Okulumuz *${schoolName}* bünyesinde öğrenim gören öğrencimiz *${record.student.fullName}* (${record.student.className} sınıfı, No: ${record.student.schoolNumber}) hakkında okul içi kurallar doğrultusunda *${record.warningNumber}. yazılı uyarı tutanağı* düzenlenmiştir.\n\n` +
            `▫️ *İlgili Davranış:* ${record.behaviorText}\n` +
            (record.description ? `▫️ *Açıklama / Detay:* ${record.description}\n` : '') +
            `\nÖğrencimizin okul kurallarına uyumu ve olumlu davranış gelişiminin desteklenmesi adına konunun takibini rica ederiz.\n\n` +
            `Saygılarımızla,\n*${schoolName}*`;

          return {
            parent: parent.fullName,
            relation: parent.relation || 'Veli',
            phone: parent.phone,
            isPrimary: !!parent.isPrimary,
            waConsentStatus: parent.waConsentStatus || 'PENDING',
            waConsentDate: parent.waConsentDate || null,
            message: msg,
          };
        });

      res.json({
        success: true,
        data: {
          studentName: record.student.fullName,
          className: record.student.className,
          warningNumber: record.warningNumber,
          behaviorText: record.behaviorText,
          description: record.description,
          messages,
        },
      });
    } catch (err) { next(err); }
  },

  sendConsentRequestToParent: async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { parentId } = req.body;
      if (!parentId || typeof parentId !== 'string') {
        res.status(400).json({ success: false, message: 'parentId gerekli.' });
        return;
      }


      // 2. WhatsApp bağlantı kontrolü
      const waStatus = whatsappService.getStatus();
      if (waStatus.status !== 'connected') {
        res.status(400).json({
          success: false,
          message: 'WhatsApp bağlı değil. Lütfen "WhatsApp Bağlantısı" sayfasından karekodu okutarak oturum açınız.',
        });
        return;
      }

      const parent = await prisma.parent.findUnique({
        where: { id: parentId },
        include: {
          contacts: { where: { isPrimary: true } },
          students: {
            where: { deletedAt: null },
            select: { fullName: true, className: true, schoolNumber: true },
          },
        },
      });

      if (!parent || parent.deletedAt) {
        res.status(404).json({ success: false, message: 'Veli bulunamadı.' });
        return;
      }

      const primaryContact = parent.contacts[0];
      const primaryPhone = primaryContact?.phone?.trim();
      if (!primaryContact || !primaryPhone) {
        res.status(400).json({ success: false, message: 'Veli telefon numarası bulunamadı.' });
        return;
      }

      const token = await getOrCreateConsentToken(primaryContact.id);
      
      // Firebase Firestore'a veli ve öğrenci kaydını hazırla/yükle
      try {
        await firebaseSyncService.uploadSingleContactToFirestore(primaryContact.id);
      } catch (fbErr: any) {
        console.warn('[Firebase] Firestore yükleme uyarısı:', fbErr?.message || fbErr);
      }

      // Kalıcı ve resmi Google .web.app onay bağlantısı
      const webConsentLink = firebaseSyncService.getConsentWebUrl(token);
      const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });

      await whatsappService.sendConsentRequest(primaryPhone, webConsentLink, {
        schoolName: settings?.schoolName || undefined,
        schoolPhone: (settings as any)?.schoolPhone || undefined,
      });

      res.json({
        success: true,
        message: 'Onay isteği ve güvenli web formu bağlantısı veliye iletildi.',
        webConsentLink,
        hasTunnel: true,
      });
    } catch (err: any) {
      console.error('[WhatsApp Consent] Hata:', err?.message || err);
      res.status(400).json({
        success: false,
        message: err?.message || 'Onay isteği gönderilemedi.',
      });
    }
  },

  getConsentList: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await whatsappConsentService.getAllConsentsList();
      res.json({ success: true, data: list });
    } catch (err) { next(err); }
  },

  manualUpdateConsent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId, waConsentStatus, photoConsentStatus } = req.body;
      if (!contactId) {
        res.status(400).json({ message: 'contactId gerekli.' });
        return;
      }

      const now = new Date();
      const updateData: any = {
        consentSource: 'MANUAL',
      };

      if (waConsentStatus && ['ACCEPTED', 'DECLINED', 'PENDING'].includes(waConsentStatus)) {
        updateData.waConsentStatus = waConsentStatus;
        updateData.waConsentDate = waConsentStatus === 'PENDING' ? null : now;
      }

      if (photoConsentStatus && ['ACCEPTED', 'DECLINED', 'PENDING'].includes(photoConsentStatus)) {
        updateData.photoConsentStatus = photoConsentStatus;
        updateData.photoConsentDate = photoConsentStatus === 'PENDING' ? null : now;
      }

      const updated = await prisma.parentContact.update({
        where: { id: contactId },
        data: updateData,
      });

      res.json({ success: true, message: 'Veli rıza durumu başarıyla güncellendi.', data: updated });
    } catch (err) { next(err); }
  },

  downloadConsentPdf: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId } = req.params;
      const contact = await prisma.parentContact.findUnique({
        where: { id: contactId },
        include: {
          parent: {
            include: {
              students: {
                where: { deletedAt: null },
                select: { fullName: true, className: true, schoolNumber: true },
              },
            },
          },
        },
      });

      if (!contact || !contact.parent) {
        res.status(404).json({ message: 'Veli kaydı bulunamadı.' });
        return;
      }

      const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });
      const student = contact.parent.students[0] || {
        fullName: '',
        className: '',
        schoolNumber: '',
      };

      const pdfBuffer = await generateConsentFormPdf({
        schoolName: settings?.schoolName || 'OKUL',
        schoolAddress: settings?.schoolAddress || '',
        schoolDistrictCity: settings?.schoolDistrictCity || '',
        schoolEmail: settings?.schoolEmail || '',
        schoolPhone: settings?.schoolPhone || '',
        studentName: student.fullName,
        className: student.className,
        schoolNumber: student.schoolNumber,
        parentName: contact.parent.fullName || contact.name,
        parentPhone: contact.phone,
        relation: contact.name,
        waConsentStatus: contact.waConsentStatus,
        waConsentDate: contact.waConsentDate,
        consentSource: contact.consentSource,
        consentIp: (contact as any).consentIp,
        consentToken: contact.consentToken,
      });

      const filename = `KVKK_Onay_Formu_${student.schoolNumber || 'Veli'}_${student.fullName.replace(/\s+/g, '_') || 'Form'}.pdf`;
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(pdfBuffer.length),
      });
      res.send(pdfBuffer);
    } catch (err) { next(err); }
  },

  downloadClassConsentPdf: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { className } = req.params;
      const students = await prisma.student.findMany({
        where: { className, deletedAt: null },
        include: {
          parents: {
            where: { deletedAt: null },
            include: {
              contacts: {
                where: { isPrimary: true },
              },
            },
          },
        },
        orderBy: { schoolNumber: 'asc' },
      });

      if (students.length === 0) {
        res.status(404).json({ message: 'Bu sınıfta kayıtlı öğrenci bulunamadı.' });
        return;
      }

      const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });
      const list = students.map((s) => {
        const parent = s.parents[0];
        const contact = parent?.contacts[0];
        return {
          schoolName: settings?.schoolName || 'OKUL',
          schoolAddress: settings?.schoolAddress || '',
          schoolDistrictCity: settings?.schoolDistrictCity || '',
          schoolEmail: settings?.schoolEmail || '',
          schoolPhone: settings?.schoolPhone || '',
          studentName: s.fullName,
          className: s.className,
          schoolNumber: s.schoolNumber,
          parentName: parent?.fullName || '....................',
          parentPhone: contact?.phone || '....................',
          relation: contact?.name || 'Veli',
          waConsentStatus: contact?.waConsentStatus || 'PENDING',
          waConsentDate: contact?.waConsentDate,
          consentSource: contact?.consentSource,
          consentIp: (contact as any)?.consentIp,
          consentToken: contact?.consentToken,
        };
      });

      const pdfBuffer = await generateMultipleConsentFormsPdf(list);
      const filename = `KVKK_Onay_Formlari_Sinif_${className.replace(/\s+/g, '_')}.pdf`;
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(pdfBuffer.length),
      });
      res.send(pdfBuffer);
    } catch (err) { next(err); }
  },

  getTunnelStatus: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await tunnelService.getStatus();
      res.json({ success: true, data: status });
    } catch (err) { next(err); }
  },

  startTunnel: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await tunnelService.start();
      res.json({ success: true, data: status });
    } catch (err) { next(err); }
  },

  stopTunnel: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await tunnelService.stop();
      res.json({ success: true, data: status });
    } catch (err) { next(err); }
  },

  getConsentStats: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await whatsappConsentService.getStats();
      res.json({ success: true, data: stats });
    } catch (err) { next(err); }
  },

  exportConsents: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const excelBuffer = await whatsappConsentService.exportToExcel();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `WhatsApp_Onay_Listesi_${dateStr}.xlsx`;

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(excelBuffer.length),
      });
      res.send(excelBuffer);
    } catch (err) { next(err); }
  },

  importConsents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'Excel dosyası yüklenmedi.' });
        return;
      }
      const mode = req.query.mode === 'import' ? 'import' : 'preview';
      const result = await whatsappConsentService.importFromExcel(req.file.buffer, mode);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  getFirebaseStatus: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = firebaseSyncService.getStatus();
      res.json({ success: true, data: status });
    } catch (err) { next(err); }
  },

  syncFirebaseConsents: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await firebaseSyncService.syncConsentsFromFirebase();
      res.json({
        success: true,
        message: result.updatedLocally > 0
          ? `${result.updatedLocally} adet yeni veli onayı buluttan çekilerek işlendi.`
          : 'Yeni onay bulunamadı, veritabanı güncel.',
        data: result,
      });
    } catch (err) { next(err); }
  },

  uploadFirebaseConsents: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { className } = req.body;
      const result = await firebaseSyncService.uploadClassConsentsToFirestore(className);
      res.json({
        success: true,
        message: `${result.uploaded} veli kaydı Firebase bulutuna başarıyla yüklendi.`,
        data: result,
      });
    } catch (err) { next(err); }
  },
};
