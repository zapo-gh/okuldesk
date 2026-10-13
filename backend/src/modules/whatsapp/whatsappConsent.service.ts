import * as XLSX from 'xlsx';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export interface ConsentStats {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
}

export interface ConsentRow {
  rowNum: number;
  schoolNumber: string;
  studentName: string;
  className: string;
  parentName: string;
  phone: string;
  relation: string;
  status: 'ACCEPTED' | 'DECLINED' | 'PENDING';
  statusLabel: string;
  consentDate: string;
}

export interface ConsentImportPreviewItem {
  rowNum: number;
  phone: string;
  parentName?: string;
  studentName?: string;
  matched: boolean;
  oldStatus: string;
  newStatus: 'ACCEPTED' | 'DECLINED' | 'PENDING';
}

export interface ConsentImportResult {
  totalParsed: number;
  matched: number;
  unmatched: number;
  updated: number;
  errors: string[];
  preview: ConsentImportPreviewItem[];
}

/** GSM numarasını 05XXXXXXXXX formatına dönüştürür */
export function normalizePhoneKey(phone: string | null | undefined): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('5')) return '0' + digits;
  if (digits.length === 11 && digits.startsWith('05')) return digits;
  return digits.length >= 10 ? digits.slice(-10) : '';
}

/** Türkçe tarih formatlama */
function formatDate(d: Date | null): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export class WhatsAppConsentService {
  /**
   * Onay istatistiklerini getirir
   */
  async getStats(): Promise<ConsentStats> {
    const contacts = await prisma.parentContact.findMany({
      where: { parent: { deletedAt: null } },
      select: { waConsentStatus: true },
    });

    let accepted = 0;
    let declined = 0;
    let pending = 0;

    for (const c of contacts) {
      if (c.waConsentStatus === 'ACCEPTED') accepted++;
      else if (c.waConsentStatus === 'DECLINED') declined++;
      else pending++;
    }

    return {
      total: contacts.length,
      accepted,
      declined,
      pending,
    };
  }

  /**
   * Tüm velilerin onay durumlarını Excel dosyası olarak oluşturur
   */
  async exportToExcel(): Promise<Buffer> {
    const contacts = await prisma.parentContact.findMany({
      where: { parent: { deletedAt: null } },
      include: {
        parent: {
          include: {
            students: {
              where: { deletedAt: null },
              select: { schoolNumber: true, fullName: true, className: true },
            },
          },
        },
      },
      orderBy: [{ parent: { fullName: 'asc' } }],
    });

    // Başlıklar
    const data: (string | number)[][] = [
      [
        'Sıra',
        'Öğrenci No',
        'Öğrenci Adı Soyadı',
        'Sınıfı',
        'Veli Adı Soyadı',
        'Veli Telefonu',
        'Yakınlık',
        'WhatsApp Onay Durumu',
        'Onay Tarihi',
      ],
    ];

    let rowNum = 1;
    for (const c of contacts) {
      const studentNos = c.parent.students.map((s) => s.schoolNumber).join(', ') || '—';
      const studentNames = c.parent.students.map((s) => s.fullName).join(', ') || '—';
      const classNames = c.parent.students.map((s) => s.className).join(', ') || '—';

      let statusText = 'BEKLİYOR';
      if (c.waConsentStatus === 'ACCEPTED') statusText = 'ONAYLANDI';
      else if (c.waConsentStatus === 'DECLINED') statusText = 'REDDEDİLDİ';

      data.push([
        rowNum++,
        studentNos,
        studentNames,
        classNames,
        c.parent.fullName || '—',
        c.phone || '',
        c.name || 'Veli',
        statusText,
        formatDate(c.waConsentDate),
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Sütun genişlikleri (okunabilirlik için)
    ws['!cols'] = [
      { wch: 6 },  // Sıra
      { wch: 14 }, // Öğrenci No
      { wch: 26 }, // Öğrenci Adı Soyadı
      { wch: 12 }, // Sınıfı
      { wch: 24 }, // Veli Adı Soyadı
      { wch: 16 }, // Veli Telefonu
      { wch: 12 }, // Yakınlık
      { wch: 22 }, // WhatsApp Onay Durumu
      { wch: 18 }, // Onay Tarihi
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'WhatsApp Onay Listesi');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Excel dosyasından WhatsApp onay durumlarını okur ve içeri aktarır / günceller
   */
  async importFromExcel(buffer: Buffer, mode: 'preview' | 'import'): Promise<ConsentImportResult> {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new AppError('Excel dosyasında sayfa bulunamadı.', 400);

    const sheet = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });

    if (rows.length < 2) {
      throw new AppError('Excel dosyası boş veya veri içermiyor.', 400);
    }

    // Başlık satırını analiz et (hangi sütunda ne var)
    let phoneCol = -1;
    let statusCol = -1;
    let parentNameCol = -1;
    let studentNameCol = -1;

    // İlk 3 satırı kontrol et
    for (let r = 0; r < Math.min(3, rows.length); r++) {
      const headerRow = rows[r];
      for (let c = 0; c < headerRow.length; c++) {
        const val = String(headerRow[c] ?? '').toLocaleUpperCase('tr-TR');
        if (phoneCol === -1 && (val.includes('TELEFON') || val.includes('TEL') || val.includes('GSM') || val.includes('PHONE'))) {
          phoneCol = c;
        }
        if (statusCol === -1 && (val.includes('ONAY') || val.includes('DURUM') || val.includes('STATUS') || val.includes('CONSENT'))) {
          statusCol = c;
        }
        if (parentNameCol === -1 && (val.includes('VELİ') || val.includes('VELI'))) {
          parentNameCol = c;
        }
        if (studentNameCol === -1 && (val.includes('ÖĞRENCİ') || val.includes('OGRENCI'))) {
          studentNameCol = c;
        }
      }
      if (phoneCol !== -1 && statusCol !== -1) break;
    }

    // Otomatik bulamazsa varsayılan sütun indexleri:
    // Standart export: Sıra(0), ÖğrNo(1), ÖğrAdı(2), Sınıf(3), VeliAdı(4), Telefon(5), Yakınlık(6), Onay(7)
    if (phoneCol === -1) phoneCol = 5;
    if (statusCol === -1) statusCol = 7;

    // Tüm mevcut ParentContact kayıtlarını telefonlarına göre indexle
    const allContacts = await prisma.parentContact.findMany({
      where: { parent: { deletedAt: null } },
      include: {
        parent: {
          include: {
            students: { select: { fullName: true } },
          },
        },
      },
    });

    const contactMap = new Map<string, typeof allContacts[0]>();
    for (const c of allContacts) {
      const k = normalizePhoneKey(c.phone);
      if (k) contactMap.set(k, c);
    }

    const previewItems: ConsentImportPreviewItem[] = [];
    const updateBatches: { id: string; status: 'ACCEPTED' | 'DECLINED' | 'PENDING' }[] = [];
    const errors: string[] = [];
    let totalParsed = 0;
    let matched = 0;
    let unmatched = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawPhone = String(row[phoneCol] ?? '').trim();
      const rawStatus = String(row[statusCol] ?? '').trim().toLocaleUpperCase('tr-TR');
      const phoneKey = normalizePhoneKey(rawPhone);

      // Telefon numarası yoksa veya geçersizse atla
      if (!phoneKey || phoneKey.length < 10) continue;

      totalParsed++;

      // Durumu normalize et
      let targetStatus: 'ACCEPTED' | 'DECLINED' | 'PENDING' = 'PENDING';
      if (
        rawStatus.includes('ONAY') ||
        rawStatus.includes('KABUL') ||
        rawStatus.includes('ACCEPTED') ||
        rawStatus.includes('EVET') ||
        rawStatus === '1'
      ) {
        targetStatus = 'ACCEPTED';
      } else if (
        rawStatus.includes('RED') ||
        rawStatus.includes('RET') ||
        rawStatus.includes('DECLINED') ||
        rawStatus.includes('HAYIR') ||
        rawStatus.includes('İPTAL') ||
        rawStatus.includes('IPTAL') ||
        rawStatus === '2'
      ) {
        targetStatus = 'DECLINED';
      } else {
        targetStatus = 'PENDING';
      }

      const foundContact = contactMap.get(phoneKey);
      if (foundContact) {
        matched++;
        previewItems.push({
          rowNum: i + 1,
          phone: rawPhone,
          parentName: foundContact.parent.fullName,
          studentName: foundContact.parent.students.map((s) => s.fullName).join(', ') || undefined,
          matched: true,
          oldStatus: foundContact.waConsentStatus,
          newStatus: targetStatus,
        });

        updateBatches.push({
          id: foundContact.id,
          status: targetStatus,
        });
      } else {
        unmatched++;
        previewItems.push({
          rowNum: i + 1,
          phone: rawPhone,
          parentName: parentNameCol !== -1 ? String(row[parentNameCol] ?? '').trim() : undefined,
          studentName: studentNameCol !== -1 ? String(row[studentNameCol] ?? '').trim() : undefined,
          matched: false,
          oldStatus: 'BULUNAMADI',
          newStatus: targetStatus,
        });
      }
    }

    if (mode === 'preview') {
      return {
        totalParsed,
        matched,
        unmatched,
        updated: 0,
        errors,
        preview: previewItems.slice(0, 50), // İlk 50 satırı önizleme için döndür
      };
    }

    // Import Modu: Güncellemeleri yap
    let updatedCount = 0;
    const now = new Date();

    for (const batch of updateBatches) {
      try {
        await prisma.parentContact.update({
          where: { id: batch.id },
          data: {
            waConsentStatus: batch.status,
            waConsentDate: batch.status === 'PENDING' ? null : now,
          },
        });
        updatedCount++;
      } catch (e: any) {
        errors.push(`Kayıt güncellenirken hata (${batch.id}): ${e.message}`);
      }
    }

    return {
      totalParsed,
      matched,
      unmatched,
      updated: updatedCount,
      errors,
      preview: [],
    };
  }
}

export const whatsappConsentService = new WhatsAppConsentService();
