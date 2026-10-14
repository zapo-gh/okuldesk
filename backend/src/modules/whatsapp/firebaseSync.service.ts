import https from 'node:https';
import prisma from '../shared/utils/prisma';
import { getOrCreateConsentToken } from './webConsent.controller';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAf007RXSrj9ABuBl6oXt2ZbbWsG3vawUA',
  authDomain: 'alizmtal-wp-onay.firebaseapp.com',
  projectId: 'alizmtal-wp-onay',
  storageBucket: 'alizmtal-wp-onay.firebasestorage.app',
  messagingSenderId: '98386876324',
  appId: '1:98386876324:web:1cc0da55437f2c12ff5331',
  hostingUrl: 'https://alizmtal-wp-onay.web.app',
};

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return { integerValue: String(val) };
  if (typeof val === 'string') return { stringValue: val };
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields) return result;
  for (const [k, v] of Object.entries(fields)) {
    if ('stringValue' in v) result[k] = v.stringValue;
    else if ('booleanValue' in v) result[k] = v.booleanValue;
    else if ('integerValue' in v) result[k] = Number(v.integerValue);
    else if ('timestampValue' in v) result[k] = v.timestampValue;
    else if ('nullValue' in v) result[k] = null;
  }
  return result;
}

function makeFirestoreRequest(url: string, options: https.RequestOptions, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      rejectUnauthorized: false, // MEB ve okul ağı TLS proxy uyumluluğu
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error?.message || `HTTP ${res.statusCode}: ${data}`));
          }
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('Firestore isteği zaman aşımına uğradı.')); });
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

export class FirebaseSyncService {
  /**
   * Firebase Hosting ve Firestore yapılandırma durumunu döner
   */
  getStatus() {
    return {
      active: true,
      projectId: FIREBASE_CONFIG.projectId,
      hostingUrl: FIREBASE_CONFIG.hostingUrl,
    };
  }

  /**
   * Bir veli kaydı için onay bağlantısı oluşturur
   */
  getConsentWebUrl(token: string): string {
    return `${FIREBASE_CONFIG.hostingUrl}/?t=${token}`;
  }

  /**
   * Tek bir veli bilgisini Firebase Firestore'a yükler/günceller
   */
  async uploadSingleContactToFirestore(contactId: string): Promise<string> {
    const contact = await prisma.parentContact.findUnique({
      where: { id: contactId },
      include: {
        parent: {
          include: {
            students: {
              where: { deletedAt: null },
              select: { id: true, fullName: true, className: true, schoolNumber: true },
            },
          },
        },
      },
    });

    if (!contact || !contact.parent) throw new Error('Veli kaydı bulunamadı.');

    const token = await getOrCreateConsentToken(contact.id);
    const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });

    const student = contact.parent.students[0] || {
      fullName: 'Kayıtlı Öğrenci',
      className: '—',
      schoolNumber: '—',
    };

    const docPayload = {
      token,
      contactId: contact.id,
      parentId: contact.parentId,
      schoolName: settings?.schoolName || 'Okul Müdürlüğü',
      schoolAddr: [settings?.schoolAddress, settings?.schoolDistrictCity].filter(Boolean).join(', ') || 'Okul İdaresi',
      schoolContact: `Tel: ${settings?.schoolPhone || ''} | E-posta: ${settings?.schoolEmail || ''}`,
      studentName: student.fullName,
      studentClass: student.className,
      studentNumber: student.schoolNumber,
      parentName: contact.parent.fullName || contact.name,
      parentPhone: contact.phone,
      waConsentStatus: contact.waConsentStatus || 'PENDING',
      updatedAt: new Date().toISOString(),
    };

    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/consents/${token}?key=${FIREBASE_CONFIG.apiKey}`;
    await makeFirestoreRequest(url, { method: 'PATCH' }, { fields: toFirestoreFields(docPayload) });

    console.log(`[Firebase] ✅ Veli Firestore'a yüklendi: ${student.fullName} -> ${contact.parent.fullName} (Token: ${token.slice(0, 8)}...)`);
    return token;
  }

  /**
   * Seçilen sınıftaki (veya tüm okuldaki) velileri toplu olarak Firebase Firestore'a yükler
   */
  async uploadClassConsentsToFirestore(className?: string): Promise<{ total: number; uploaded: number; failed: number }> {
    const contacts: any[] = await (prisma.parentContact as any).findMany({
      where: {
        parent: {
          deletedAt: null,
          ...(className ? { students: { some: { className, deletedAt: null } } } : {}),
        },
      },
      include: {
        parent: {
          include: {
            students: {
              where: { deletedAt: null },
              select: { id: true, fullName: true, className: true, schoolNumber: true },
            },
          },
        },
      },
    });

    const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });
    const sName = settings?.schoolName || 'Okul Müdürlüğü';
    const sAddr = [settings?.schoolAddress, settings?.schoolDistrictCity].filter(Boolean).join(', ') || 'Okul İdaresi';
    const sContact = `Tel: ${settings?.schoolPhone || ''} | E-posta: ${settings?.schoolEmail || ''}`;

    let uploaded = 0;
    let failed = 0;

    for (const c of contacts) {
      try {
        const token = await getOrCreateConsentToken(c.id);
        const student = c.parent?.students?.[0] || {
          fullName: 'Kayıtlı Öğrenci',
          className: '—',
          schoolNumber: '—',
        };

        const docPayload = {
          token,
          contactId: c.id,
          parentId: c.parentId,
          schoolName: sName,
          schoolAddr: sAddr,
          schoolContact: sContact,
          studentName: student.fullName,
          studentClass: student.className,
          studentNumber: student.schoolNumber,
          parentName: c.parent?.fullName || c.name,
          parentPhone: c.phone,
          waConsentStatus: c.waConsentStatus || 'PENDING',
          updatedAt: new Date().toISOString(),
        };

        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/consents/${token}?key=${FIREBASE_CONFIG.apiKey}`;
        await makeFirestoreRequest(url, { method: 'PATCH' }, { fields: toFirestoreFields(docPayload) });
        uploaded++;
      } catch (err: any) {
        failed++;
        console.warn(`[Firebase] Yükleme hatası (${c.phone}):`, err?.message);
      }
    }

    return { total: contacts.length, uploaded, failed };
  }

  /**
   * Firebase Firestore'da velilerin verdikleri onayları çeker ve yerel veritabanına işler
   */
  async syncConsentsFromFirebase(): Promise<{ totalInCloud: number; updatedLocally: number }> {
    let updatedLocally = 0;
    let totalInCloud = 0;

    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/consents?key=${FIREBASE_CONFIG.apiKey}&pageSize=1000`;
      const res = await makeFirestoreRequest(url, { method: 'GET' });

      const documents = res.documents || [];
      totalInCloud = documents.length;

      for (const doc of documents) {
        const data = fromFirestoreFields(doc.fields);
        const status = data.waConsentStatus;
        const contactId = data.contactId;

        // Sadece veli tercihini belirtmişse (ACCEPTED veya DECLINED) senkronize et
        if (contactId && (status === 'ACCEPTED' || status === 'DECLINED')) {
          const existing = await prisma.parentContact.findUnique({
            where: { id: contactId },
            select: { id: true, waConsentStatus: true },
          });

          if (existing && existing.waConsentStatus !== status) {
            const submittedDate = data.submittedAt ? new Date(data.submittedAt) : new Date();

            await (prisma.parentContact as any).update({
              where: { id: contactId },
              data: {
                waConsentStatus: status,
                waConsentDate: submittedDate,
                consentSource: 'WEB',
                consentIp: data.consentIp || null,
                consentUserAgent: data.consentUserAgent ? String(data.consentUserAgent).slice(0, 255) : null,
              },
            });

            updatedLocally++;
            console.log(`[Firebase Sync] 🔄 Veli onayı yerel veritabanına işlendi: ID=${contactId}, Durum=${status}`);
          }
        }
      }
    } catch (err: any) {
      console.error('[Firebase Sync] Çekme hatası:', err?.message || err);
      throw err;
    }

    return { totalInCloud, updatedLocally };
  }
}

export const firebaseSyncService = new FirebaseSyncService();
