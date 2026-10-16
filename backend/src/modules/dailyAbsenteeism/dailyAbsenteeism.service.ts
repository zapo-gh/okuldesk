import crypto from 'crypto';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { StudentsService } from '../students/students.service';
import { whatsappService } from '../whatsapp/whatsapp.service';

export interface DailyAbsenteeismSendParams {
  studentId: string;
  date: string;
  sessionType: 'MORNING' | 'AFTERNOON' | 'FULL_DAY';
  parentName: string;
  parentPhone: string;
  message: string;
}

export class DailyAbsenteeismService {
  private static tableInitialized = false;

  private async ensureTable(): Promise<void> {
    if (DailyAbsenteeismService.tableInitialized) return;
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "DailyAbsenteeismNotification" (
          "id" TEXT PRIMARY KEY,
          "studentId" TEXT NOT NULL,
          "date" TEXT NOT NULL,
          "sessionType" TEXT NOT NULL,
          "parentName" TEXT NOT NULL,
          "parentPhone" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'SENT',
          "errorMessage" TEXT,
          "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "waMessageId" TEXT,
          "deliveryStatus" TEXT DEFAULT 'PENDING',
          "deliveredAt" DATETIME,
          "readAt" DATETIME,
          FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE
        );
      `);

      // Migration: Mevcut tabloda yeni teslim ve okundu kolonları yoksa dinamik ekle
      try {
        const tableCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
          `PRAGMA table_info("DailyAbsenteeismNotification")`
        );
        const colNames = new Set((tableCols || []).map(r => r.name.toLowerCase()));
        if (!colNames.has('wamessageid')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "DailyAbsenteeismNotification" ADD COLUMN "waMessageId" TEXT;`);
        }
        if (!colNames.has('deliverystatus')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "DailyAbsenteeismNotification" ADD COLUMN "deliveryStatus" TEXT DEFAULT 'PENDING';`);
        }
        if (!colNames.has('deliveredat')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "DailyAbsenteeismNotification" ADD COLUMN "deliveredAt" DATETIME;`);
        }
        if (!colNames.has('readat')) {
          await prisma.$executeRawUnsafe(`ALTER TABLE "DailyAbsenteeismNotification" ADD COLUMN "readAt" DATETIME;`);
        }
      } catch (colErr) {
        console.warn('[DailyAbsenteeismService] kolon kontrol hatası:', colErr);
      }

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_daily_notif_student_date" 
        ON "DailyAbsenteeismNotification"("studentId", "date", "sessionType");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_daily_notif_date" 
        ON "DailyAbsenteeismNotification"("date");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_daily_notif_wamsgid" 
        ON "DailyAbsenteeismNotification"("waMessageId");
      `);

      DailyAbsenteeismService.tableInitialized = true;
    } catch (err) {
      console.error('[DailyAbsenteeismService] ensureTable hatası:', err);
    }
  }

  /**
   * Girilen okul numaralarına göre öğrencileri ve veli bilgilerini arar.
   */
  async lookupStudentsByNumbers(rawNumbers: string[]) {
    await this.ensureTable();

    const cleanNumbers = Array.from(
      new Set(
        rawNumbers
          .map(n => String(n).trim())
          .filter(n => n.length > 0)
      )
    );

    if (cleanNumbers.length === 0) {
      return { found: [], notFound: [] };
    }

    const students = await prisma.student.findMany({
      where: {
        schoolNumber: { in: cleanNumbers },
        status: 'ACTIVE',
      },
      include: {
        parents: {
          where: { deletedAt: null },
          include: {
            contacts: true,
          },
        },
      },
    });

    const mapped = students.map(s => StudentsService.mapStudentParents(s));

    // Sıralamayı girilen numara sırasına göre yap
    const foundNumbers = new Set(mapped.map(s => s.schoolNumber));
    const notFound = cleanNumbers.filter(n => !foundNumbers.has(n));

    return {
      found: mapped,
      notFound,
    };
  }

  /**
   * Seçilen sınıftaki tüm aktif öğrencileri velileriyle birlikte getirir.
   */
  async getStudentsByClass(className: string) {
    await this.ensureTable();

    if (!className) throw new AppError('Sınıf adı zorunludur.', 400);

    const students = await prisma.student.findMany({
      where: {
        className,
        status: 'ACTIVE',
      },
      include: {
        parents: {
          where: { deletedAt: null },
          include: {
            contacts: true,
          },
        },
      },
    });

    // Numara sırasına göre doğal sıralama
    const sorted = students.sort((a, b) => {
      const numA = parseInt(a.schoolNumber, 10);
      const numB = parseInt(b.schoolNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.schoolNumber.localeCompare(b.schoolNumber, 'tr');
    });

    return sorted.map(s => StudentsService.mapStudentParents(s));
  }

  /**
   * Belirtilen tarih ve oturum için daha önce gönderilmiş olan öğrencileri listeler.
   */
  async checkDuplicates(date: string, sessionType: string, studentIds?: string[]) {
    await this.ensureTable();

    let query = `
      SELECT studentId, sentAt, parentName, parentPhone, status
      FROM "DailyAbsenteeismNotification"
      WHERE "date" = ? AND "sessionType" = ? AND "status" = 'SENT'
    `;
    const params: any[] = [date, sessionType];

    if (studentIds && studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(',');
      query += ` AND studentId IN (${placeholders})`;
      params.push(...studentIds);
    }

    const rows: any = await prisma.$queryRawUnsafe(query, ...params);
    return rows;
  }

  /**
   * Belirtilen tarihteki bildirim geçmişini getirir.
   */
  async getHistory(date?: string) {
    await this.ensureTable();

    const targetDate = date || new Date().toISOString().slice(0, 10);

    const rows: any = await prisma.$queryRawUnsafe(`
      SELECT 
        d.id, d.studentId, d.date, d.sessionType, d.parentName, d.parentPhone,
        d.message, d.status, d.errorMessage, d.sentAt,
        d.waMessageId, d.deliveryStatus, d.deliveredAt, d.readAt,
        s.fullName as studentName, s.schoolNumber, s.className
      FROM "DailyAbsenteeismNotification" d
      LEFT JOIN "Student" s ON s.id = d.studentId
      WHERE d.date = ?
      ORDER BY d.sentAt DESC
    `, targetDate);

    return rows;
  }

  /**
   * Baileys socket ACK olayları (SERVER_ACK, DELIVERY_ACK, READ) geldiğinde veritabanındaki bildirim durumunu günceller.
   */
  async updateDeliveryStatus(waMessageId: string, deliveryStatus: 'SERVER_ACK' | 'DELIVERED' | 'READ') {
    if (!waMessageId) return;
    await this.ensureTable();
    try {
      if (deliveryStatus === 'READ') {
        await prisma.$executeRawUnsafe(`
          UPDATE "DailyAbsenteeismNotification"
          SET "deliveryStatus" = 'READ',
              "readAt" = COALESCE("readAt", CURRENT_TIMESTAMP),
              "deliveredAt" = COALESCE("deliveredAt", CURRENT_TIMESTAMP)
          WHERE "waMessageId" = ?
        `, waMessageId);
      } else if (deliveryStatus === 'DELIVERED') {
        await prisma.$executeRawUnsafe(`
          UPDATE "DailyAbsenteeismNotification"
          SET "deliveryStatus" = CASE WHEN "deliveryStatus" = 'READ' THEN 'READ' ELSE 'DELIVERED' END,
              "deliveredAt" = COALESCE("deliveredAt", CURRENT_TIMESTAMP)
          WHERE "waMessageId" = ?
        `, waMessageId);
      } else if (deliveryStatus === 'SERVER_ACK') {
        await prisma.$executeRawUnsafe(`
          UPDATE "DailyAbsenteeismNotification"
          SET "deliveryStatus" = CASE WHEN "deliveryStatus" IN ('DELIVERED', 'READ') THEN "deliveryStatus" ELSE 'SERVER_ACK' END
          WHERE "waMessageId" = ?
        `, waMessageId);
      }
    } catch (err) {
      console.warn('[DailyAbsenteeismService] updateDeliveryStatus hatası:', err);
    }
  }

  /**
   * Tek bir öğrenci velisine anlık WhatsApp bildirimi gönderir ve veritabanına kaydeder.
   */
  async sendSingleNotification(params: DailyAbsenteeismSendParams) {
    await this.ensureTable();

    const { studentId, date, sessionType, parentName, parentPhone, message } = params;

    if (!studentId || !date || !sessionType || !parentPhone || !message) {
      throw new AppError('Eksik bilgi: Öğrenci, tarih, oturum, telefon ve mesaj zorunludur.', 400);
    }

    const id = crypto.randomUUID();
    let status = 'SENT';
    let errorMessage: string | null = null;
    let waMessageId: string | null = null;
    let deliveryStatus = 'PENDING';

    try {
      // WhatsApp servisi üzerinden doğrudan mesajı ilet
      const sendRes = await whatsappService.sendTextMessage(parentPhone, message);
      waMessageId = sendRes?.messageId || null;
      deliveryStatus = waMessageId ? 'SERVER_ACK' : 'PENDING';
    } catch (err: any) {
      status = 'FAILED';
      deliveryStatus = 'FAILED';
      errorMessage = err?.message || 'Bilinmeyen WhatsApp gönderim hatası';
    }

    // Sonucu veritabanına kaydet
    await prisma.$executeRawUnsafe(`
      INSERT INTO "DailyAbsenteeismNotification" (
        "id", "studentId", "date", "sessionType", "parentName", "parentPhone", "message", "status", "errorMessage", "sentAt", "waMessageId", "deliveryStatus"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `, id, studentId, date, sessionType, parentName || '', parentPhone, message, status, errorMessage, waMessageId, deliveryStatus);

    if (status === 'FAILED') {
      return {
        success: false,
        id,
        status,
        deliveryStatus,
        error: errorMessage,
      };
    }

    return {
      success: true,
      id,
      status: 'SENT',
      waMessageId,
      deliveryStatus,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Belirtilen bildirim kaydını siler.
   */
  async deleteHistoryItem(id: string) {
    await this.ensureTable();
    await prisma.$executeRawUnsafe(`
      DELETE FROM "DailyAbsenteeismNotification" WHERE "id" = ?
    `, id);
    return { success: true };
  }
}

export const dailyAbsenteeismService = new DailyAbsenteeismService();
