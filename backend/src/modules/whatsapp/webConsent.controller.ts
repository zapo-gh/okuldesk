import { Request, Response } from 'express';
import prisma from '../shared/utils/prisma';
import { v4 as uuidv4 } from 'uuid';

/**
 * Veliye özel benzersiz onay token'ı oluşturur veya mevcut geçerli token'ı döner
 */
export async function getOrCreateConsentToken(contactId: string): Promise<string> {
  const contact = await prisma.parentContact.findUnique({
    where: { id: contactId },
    select: { id: true, consentToken: true, consentTokenExpiresAt: true },
  });

  if (!contact) throw new Error('Veli iletişim kaydı bulunamadı.');

  // Eğer geçerli bir token varsa onu kullan (30 gün geçerli)
  if (
    contact.consentToken &&
    contact.consentTokenExpiresAt &&
    new Date(contact.consentTokenExpiresAt).getTime() > Date.now()
  ) {
    return contact.consentToken;
  }

  const newToken = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 gün

  await prisma.parentContact.update({
    where: { id: contactId },
    data: {
      consentToken: newToken,
      consentTokenExpiresAt: expiresAt,
    },
  });

  return newToken;
}

/**
 * Web Onay Sayfasını HTML olarak sunar
 */
export async function renderWebConsentPage(req: Request, res: Response) {
  const { token } = req.params;

  if (!token || typeof token !== 'string') {
    res.status(400).send(renderErrorHtml('Geçersiz Onay Bağlantısı', 'Lütfen size iletilen bağlantıyı eksiksiz açtığınızdan emin olun.'));
    return;
  }

  // Yönetici önizleme ve test modu
  if (token === 'demo' || token === 'test') {
    const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });
    const html = renderFullConsentHtml({
      token: 'demo',
      schoolName: settings?.schoolName || 'Okul Müdürlüğü',
      schoolAddr: [settings?.schoolAddress, settings?.schoolDistrictCity].filter(Boolean).join(', ') || 'Okul Adresi',
      schoolContact: `E-posta: ${settings?.schoolEmail || 'Belirtilmedi'} | Tel: ${settings?.schoolPhone || 'Belirtilmedi'}`,
      studentName: 'Örnek Öğrenci',
      studentClass: '10-A',
      studentNumber: '1001',
      parentName: 'Örnek Veli (Deneme)',
      parentPhone: '05xx xxx xx xx',
      currentWaStatus: 'PENDING',
      waDate: null,
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    return;
  }

  const contact = await prisma.parentContact.findUnique({
    where: { consentToken: token },
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

  if (!contact || !contact.parent) {
    res.status(404).send(renderErrorHtml('Bağlantı Bulunamadı', 'Bu onay bağlantısı geçersiz veya süresi dolmuş olabilir. Lütfen okul idaresi ile iletişime geçiniz.'));
    return;
  }

  if (contact.consentTokenExpiresAt && new Date(contact.consentTokenExpiresAt).getTime() < Date.now()) {
    res.status(410).send(renderErrorHtml('Bağlantının Süresi Doldu', 'Bu onay bağlantısının geçerlilik süresi dolmuştur. Yeni bir bağlantı için okul idaresine başvurabilirsiniz.'));
    return;
  }

  const settings = await prisma.schoolSettings.findUnique({ where: { id: 'singleton' } });
  const schoolName = settings?.schoolName || 'Okul';
  const schoolAddr = [settings?.schoolAddress, settings?.schoolDistrictCity].filter(Boolean).join(', ') || 'Okul İdaresi';
  const schoolContact = `E-posta: ${settings?.schoolEmail || 'Belirtilmedi'} | Tel: ${settings?.schoolPhone || 'Belirtilmedi'}`;

  const student = contact.parent.students[0] || {
    fullName: 'Kayıtlı Öğrenci',
    className: '—',
    schoolNumber: '—',
  };

  const html = renderFullConsentHtml({
    token,
    schoolName,
    schoolAddr,
    schoolContact,
    studentName: student.fullName,
    studentClass: student.className,
    studentNumber: student.schoolNumber,
    parentName: contact.parent.fullName || contact.name,
    parentPhone: contact.phone,
    currentWaStatus: contact.waConsentStatus,
    waDate: contact.waConsentDate ? new Date(contact.waConsentDate).toLocaleDateString('tr-TR') : null,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

/**
 * Web onay formunun gönderildiği API
 */
export async function submitWebConsent(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { waConsent } = req.body;

    if (!['ACCEPTED', 'DECLINED'].includes(waConsent)) {
      res.status(400).json({ success: false, message: 'Lütfen WhatsApp iletişim izni tercihinizi belirtiniz.' });
      return;
    }

    if (token === 'demo' || token === 'test') {
      res.json({
        success: true,
        message: 'Bu bir deneme (demo) sayfasıdır. Seçiminiz başarıyla test edildi.',
        data: {
          waConsent,
          date: new Date().toLocaleString('tr-TR'),
        },
      });
      return;
    }

    const contact = await prisma.parentContact.findUnique({
      where: { consentToken: token },
    });

    if (!contact) {
      res.status(404).json({ success: false, message: 'Onay kaydı bulunamadı veya bağlantı geçersiz.' });
      return;
    }

    const now = new Date();

    // Cloudflare tüneli veya ters vekil arkasındaki gerçek istemci IP adresini al
    const rawIp = 
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      '';
    const clientIp = typeof rawIp === 'string' ? rawIp.replace(/^.*:/, '') : '';
    const userAgent = (req.headers['user-agent'] as string) || '';

    await (prisma.parentContact as any).update({
      where: { id: contact.id },
      data: {
        waConsentStatus: waConsent,
        waConsentDate: now,
        consentSource: 'WEB',
        consentIp: clientIp,
        consentUserAgent: userAgent.slice(0, 255),
      },
    });

    console.log(`[Web Consent] ✅ Onay kaydedildi: Tel=${contact.phone}, WA=${waConsent}, IP=${clientIp}, Cihaz=${userAgent.slice(0, 45)}`);

    res.json({
      success: true,
      message: 'Açık rıza tercihiniz başarıyla kaydedildi. Teşekkür ederiz.',
      data: {
        waConsent,
        date: now.toLocaleString('tr-TR'),
      },
    });
  } catch (err: any) {
    console.error('[Web Consent] Hata:', err);
    res.status(500).json({ success: false, message: 'Tercihiniz kaydedilirken bir hata oluştu.' });
  }
}

function renderErrorHtml(title: string, desc: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Okul Bilgilendirme</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: white; border-radius: 16px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e2e8f0; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; margin: 0 0 12px; color: #0f172a; }
    p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>${title}</h1>
    <p>${desc}</p>
  </div>
</body>
</html>`;
}

interface FormHtmlParams {
  token: string;
  schoolName: string;
  schoolAddr: string;
  schoolContact: string;
  studentName: string;
  studentClass: string;
  studentNumber: string;
  parentName: string;
  parentPhone: string;
  currentWaStatus?: string;
  waDate?: string | null;
}

function renderFullConsentHtml(p: FormHtmlParams): string {
  const isDemo = p.token === 'demo' || p.token === 'test';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${p.schoolName} - Veli Açık Rıza Portalı</title>
  <meta property="og:title" content="${p.schoolName} - Resmi Veli Açık Rıza Portalı">
  <meta property="og:description" content="6698 Sayılı KVKK Kapsamında Veli Bilgilendirme ve Açık Rıza Formu">
  <meta property="og:type" content="website">
  <meta name="theme-color" content="#4f46e5">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-dark: #4338ca;
      --primary-light: #eef2ff;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --success: #10b981;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); line-height: 1.5; padding: 12px 10px 40px; -webkit-tap-highlight-color: transparent; }
    .container { max-width: 620px; margin: 0 auto; }
    
    /* Demo Banner */
    .demo-banner { background: #fef3c7; border: 1.5px solid #f59e0b; color: #92400e; padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(245,158,11,0.15); }
    
    /* Header */
    .header { text-align: center; margin-bottom: 16px; padding: 8px 4px 4px; }
    .school-badge { display: inline-flex; align-items: center; gap: 6px; background: #e0e7ff; color: var(--primary-dark); padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; margin-bottom: 8px; border: 1px solid #c7d2fe; }
    .school-name { font-size: 18px; font-weight: 800; color: #0f172a; line-height: 1.35; margin-bottom: 4px; }
    .portal-title { font-size: 13px; color: var(--text-muted); font-weight: 500; }
    
    /* Step Tabs */
    .tabs-bar { display: flex; gap: 8px; background: #e2e8f0; padding: 4px; border-radius: 14px; margin-bottom: 18px; }
    .tab-btn { flex: 1; padding: 10px 8px; border-radius: 10px; font-size: 12.5px; font-weight: 700; text-align: center; border: none; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; color: #475569; background: transparent; }
    .tab-btn.active { background: #ffffff; color: var(--primary-dark); box-shadow: 0 2px 8px rgba(0,0,0,0.08); font-weight: 800; }
    .tab-step { width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; background: #cbd5e1; color: #334155; }
    .tab-btn.active .tab-step { background: var(--primary); color: white; }
    
    /* Info Card */
    .info-card { background: var(--card-bg); border-radius: 14px; padding: 14px 16px; border: 1px solid var(--border); box-shadow: 0 2px 6px -2px rgba(0,0,0,0.04); margin-bottom: 16px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
    .info-item { display: flex; flex-direction: column; }
    .info-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 2px; }
    .info-val { font-size: 13px; font-weight: 800; color: #1e293b; }
    
    /* Page Views */
    .page-view { display: none; }
    .page-view.active { display: block; animation: fadeIn 0.25s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    
    /* Article Card (Page 1) */
    .article-box { background: var(--card-bg); border-radius: 14px; padding: 18px 16px; border: 1px solid var(--border); box-shadow: 0 2px 8px -2px rgba(0,0,0,0.05); margin-bottom: 16px; }
    .article-header { border-bottom: 1.5px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 14px; }
    .article-tag { display: inline-block; font-size: 11px; font-weight: 800; color: #4338ca; background: #e0e7ff; padding: 3px 10px; border-radius: 6px; margin-bottom: 6px; }
    .article-main-title { font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.35; }
    .article-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    
    .article-content { display: flex; flex-direction: column; gap: 14px; font-size: 12.5px; color: #334155; line-height: 1.6; }
    .art-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; }
    .art-title { font-weight: 800; color: #0f172a; font-size: 12.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    
    /* Page 1 Action */
    .page-next-btn { width: 100%; background: var(--primary); color: white; border: none; padding: 14px; border-radius: 12px; font-size: 14.5px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
    .page-next-btn:hover { background: var(--primary-dark); }
    
    /* Page 2 Cards */
    .form-card { background: var(--card-bg); border-radius: 14px; padding: 20px 16px; border: 1px solid var(--border); box-shadow: 0 2px 8px -2px rgba(0,0,0,0.05); margin-bottom: 16px; }
    .notice-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #166534; font-weight: 600; line-height: 1.5; margin-bottom: 16px; }
    
    .choice-group { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
    .choice-card { display: flex; align-items: flex-start; gap: 14px; padding: 16px; border-radius: 14px; border: 2px solid #e2e8f0; background: #ffffff; cursor: pointer; transition: all 0.2s ease; position: relative; user-select: none; }
    .choice-card:hover { border-color: #cbd5e1; }
    .choice-card.selected-yes { border-color: #10b981; background: #f0fdf4; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.18); }
    .choice-card.selected-no { border-color: #ef4444; background: #fef2f2; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.15); }
    
    .choice-radio { appearance: none; width: 22px; height: 22px; border: 2px solid #94a3b8; border-radius: 50%; margin-top: 2px; flex-shrink: 0; position: relative; transition: all 0.15s ease; background: white; }
    .choice-card.selected-yes .choice-radio { border-color: #10b981; background: #10b981; }
    .choice-card.selected-yes .choice-radio::after { content: ''; position: absolute; width: 8px; height: 8px; background: white; border-radius: 50%; top: 5px; left: 5px; }
    .choice-card.selected-no .choice-radio { border-color: #ef4444; background: #ef4444; }
    .choice-card.selected-no .choice-radio::after { content: ''; position: absolute; width: 8px; height: 8px; background: white; border-radius: 50%; top: 5px; left: 5px; }
    
    .choice-info { flex: 1; }
    .choice-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 13.5px; font-weight: 800; margin-bottom: 4px; }
    .choice-card.selected-yes .choice-badge { color: #047857; }
    .choice-card.selected-no .choice-badge { color: #b91c1c; }
    .choice-desc { font-size: 12px; color: #475569; line-height: 1.5; }
    
    /* Buttons in Page 2 */
    .btn-row { display: flex; gap: 10px; margin-top: 14px; }
    .btn-back { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 14px 16px; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; }
    .btn-back:hover { background: #e2e8f0; color: #0f172a; }
    .btn-submit { flex: 1; background: var(--primary); color: white; border: none; padding: 14px 16px; border-radius: 12px; font-size: 14.5px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .btn-submit:hover { background: var(--primary-dark); }
    .btn-submit:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }
    
    /* Success Box */
    .success-card { display: none; background: #ffffff; border-radius: 16px; padding: 32px 20px; text-align: center; border: 2px solid #10b981; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.2); margin-top: 10px; }
    .success-icon { font-size: 52px; margin-bottom: 12px; }
    .success-title { font-size: 18px; font-weight: 800; color: #065f46; margin-bottom: 6px; }
    .success-desc { font-size: 13px; color: #047857; line-height: 1.5; margin-bottom: 16px; }
    .success-summary { background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; border: 1px solid #bbf7d0; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #dcfce7; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { color: #166534; font-weight: 600; font-size: 12px; }
    .summary-val { font-weight: 800; color: #14532d; font-size: 13px; }
    
    /* Footer */
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    ${isDemo ? `
      <div class="demo-banner">
        <span>🧪</span>
        <div><strong>YÖNETİCİ TEST MODU (DEMO)</strong> · Bu sayfa velilere gönderilen mobil rıza portalının önizlemesidir. Yapılan seçimler test amaçlıdır.</div>
      </div>
    ` : ''}

    <div class="header">
      <div class="school-badge">🏛️ ${p.schoolName}</div>
      <h1 class="school-name">Veli Açık Rıza Portalı</h1>
      <p class="portal-title">WhatsApp İletişim Hattı Kişisel Veri ve İletişim İzni</p>
    </div>

    <!-- 2 Adımlı Sekme Çubuğu -->
    <div class="tabs-bar">
      <button type="button" class="tab-btn active" id="tabBtn1" onclick="switchTab(1)">
        <span class="tab-step">1</span>
        <span>Aydınlatma Metni (Sayfa 1)</span>
      </button>
      <button type="button" class="tab-btn" id="tabBtn2" onclick="switchTab(2)">
        <span class="tab-step">2</span>
        <span>Açık Rıza Formu (Sayfa 2)</span>
      </button>
    </div>

    <!-- Öğrenci & Veli Özet Kartı -->
    <div class="info-card">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Öğrenci Adı Soyadı</span>
          <span class="info-val">${p.studentName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Sınıfı / Numarası</span>
          <span class="info-val">${p.studentClass} · No: ${p.studentNumber}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Veli Adı Soyadı</span>
          <span class="info-val">${p.parentName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Kayıtlı Telefon</span>
          <span class="info-val">${p.parentPhone}</span>
        </div>
      </div>
    </div>

    <!-- ── 1. SAYFA: AYDINLATMA METNİ ── -->
    <div id="page1" class="page-view active">
      <div class="article-box">
        <div class="article-header">
          <span class="article-tag">1. Sayfa · MEB Mevzuat Bilgilendirmesi</span>
          <h2 class="article-main-title">Kişisel Verilerin Korunması Aydınlatma Metni</h2>
          <p class="article-sub">6698 sayılı KVKK 10. maddesi uyarınca veli bilgilendirmesidir.</p>
        </div>

        <div class="article-content">
          <p><strong>Sayın Velimiz,</strong><br>
          6698 sayılı Kişisel Verilerin Korunması Kanunu'nun (KVKK) 10. maddesi ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Tebliği uyarınca, okulumuz tarafından kurulan WhatsApp İletişim Hattı kapsamında işlenecek kişisel verilerinize ilişkin bilgilendirme aşağıda sunulmuştur. Bu metin bir rıza beyanı niteliğinde değildir; rıza tercihiniz 2. Sayfada alınmaktadır.</p>

          <div class="art-section">
            <div class="art-title">1. Veri Sorumlusu</div>
            <p>${p.schoolName}<br>Adres: ${p.schoolAddr}<br>${p.schoolContact}</p>
          </div>

          <div class="art-section">
            <div class="art-title">2. İşlenen Kişisel Veriler</div>
            <p>• <strong>Veliye Ait:</strong> Ad soyad, cep telefonu numarası, öğrenciye yakınlık derecesi; açık rıza işlemine ait teknik erişim ve işlem güvenliği log kayıtları (işlem tarihi, saati, bağlantı IP adresi ve cihaz/tarayıcı bilgisi).<br>
            • <strong>Öğrenciye Ait:</strong> Ad soyad, sınıfı, okul numarası, devamsızlık durumu (özürlü/özürsüz), yazılı uyarılar, okul duyuruları ve etkinlik bilgilendirmeleri.</p>
          </div>

          <div class="art-section">
            <div class="art-title">3. Kişisel Verilerin İşlenme Amacı</div>
            <p>Öğrencinin eğitim-öğretim sürecine ilişkin resmi bildirimlerin (devamsızlık, yazılı uyarı mektubu, resmi duyuru ve toplantılar) veliye ivedi, güvenli ve doğrudan iletilmesi amacıyla işlenmektedir.</p>
          </div>

          <div class="art-section">
            <div class="art-title">4. Hukuki Sebep</div>
            <p>WhatsApp bildirimleri için KVKK'nın 5. maddesinin 1. fıkrası uyarınca <strong>"açık rızanız"</strong>dır. Açık rıza işleminin bilgi güvenliği ve 5651 ile 6698 sayılı kanunlar kapsamındaki ispat yükümlülüğünün yerine getirilmesi amacıyla teknik log kayıtları (IP adresi ve işlem zaman damgası) KVKK'nın 5/2-(ç) ve 5/2-(e) maddeleri uyarınca işlenmektedir. WhatsApp iletişim hattı tercihe bağlı olup açık rıza vermemeniz halinde bilgilendirmeler SMS, telefon veya okuldan elden matbu evrak ile yapılmaya devam edecektir.</p>
          </div>

          <div class="art-section">
            <div class="art-title">5. Verilerin Aktarılması (Yurt Dışı Sunucuları)</div>
            <p>WhatsApp uygulaması Meta Platforms Inc. altyapısıyla çalıştığından, iletişim hattının kullanılması durumunda veriler uygulamanın yurt dışı sunucularına aktarılmaktadır (KVKK m. 9).</p>
          </div>

          <div class="art-section">
            <div class="art-title">6. Güvenlik Güvenceleri</div>
            <p>Okul adına tahsis edilmiş kurumsal hat kullanılır. Velilerin telefon numaraları diğer velilere kesinlikle görünmez ve üçüncü şahıslarla paylaşılmaz.</p>
          </div>

          <div class="art-section">
            <div class="art-title">7. Saklama Süresi ve Rızanın Geri Alınması</div>
            <p>Veriler öğrencinin okuldaki öğrenim süresi boyunca veya rızanızı geri alana kadar saklanır. Dilediğiniz zaman okul idaresine yazılı başvurarak veya WhatsApp hattına bildirerek açık rızanızı hiçbir gerekçe göstermeksizin geri alabilirsiniz.</p>
          </div>
        </div>
      </div>

      <button type="button" class="page-next-btn" onclick="switchTab(2)">
        <span>Aydınlatma Metnini Okudum ➔ Sayfa 2: Rıza Tercihine Geç</span>
      </button>
    </div>

    <!-- ── 2. SAYFA: AÇIK RIZA FORMU ── -->
    <div id="page2" class="page-view">
      <form id="consentForm" onsubmit="submitForm(event)">
        <div class="form-card">
          <div class="article-header">
            <span class="article-tag">2. Sayfa · Açık Rıza Tercihi</span>
            <h2 class="article-main-title">WhatsApp İletişim İzni Tercihiniz</h2>
            <p class="article-sub">Lütfen aşağıdan öğrencinize ilişkin onay tercihinizi belirleyiniz.</p>
          </div>

          <div class="notice-box">
            ⚖️ <strong>Beyan:</strong> 1. Sayfada yer alan WhatsApp İletişim Hattı Kişisel Verilerin Korunması Aydınlatma Metnini okudum, haklarımı ve yurt dışı veri aktarımını anladım.
          </div>

          <div class="choice-group">
            <!-- ONAYLIYORUM KARTI -->
            <label class="choice-card ${p.currentWaStatus === 'ACCEPTED' ? 'selected-yes' : ''}" onclick="selectChoice('ACCEPTED')">
              <input type="radio" name="waConsent" value="ACCEPTED" class="choice-radio" ${p.currentWaStatus === 'ACCEPTED' ? 'checked' : ''} required>
              <div class="choice-info">
                <div class="choice-badge">✅ ONAYLIYORUM</div>
                <div class="choice-desc">
                  Öğrencime ilişkin bilgilendirmelerin (devamsızlık, yazılı uyarılar ve resmi duyurular) <strong>WhatsApp İletişim Hattı</strong> üzerinden iletilmesine ve ilgili verilerin yurt dışı sunuculara aktarılmasına açık rıza veriyorum.
                </div>
              </div>
            </label>

            <!-- ONAYLAMIYORUM KARTI -->
            <label class="choice-card ${p.currentWaStatus === 'DECLINED' ? 'selected-no' : ''}" onclick="selectChoice('DECLINED')">
              <input type="radio" name="waConsent" value="DECLINED" class="choice-radio" ${p.currentWaStatus === 'DECLINED' ? 'checked' : ''}>
              <div class="choice-info">
                <div class="choice-badge">❌ ONAYLAMIYORUM</div>
                <div class="choice-desc">
                  WhatsApp üzerinden bilgilendirme almak istemiyorum. Öğrencime ilişkin resmi bilgilendirmelerin SMS, telefon veya okuldan elden matbu evrak ile yapılmasını talep ediyorum.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn-back" onclick="switchTab(1)">
            ← 1. Sayfa (Metni İncele)
          </button>
          <button type="submit" id="submitBtn" class="btn-submit">
            <span>Seçimimi Kaydet ve Onayla</span> ➔
          </button>
        </div>
      </form>
    </div>

    <!-- Başarı Makbuz Kartı -->
    <div id="successCard" class="success-card">
      <div class="success-icon">🎉</div>
      <h2 class="success-title">Tercihiniz Başarıyla Kaydedildi</h2>
      <p class="success-desc">Açık rıza beyanınız okul yönetim bilgi sistemine işlenmiştir. Katılımınız için teşekkür ederiz.</p>
      
      <div class="success-summary">
        <div class="summary-row">
          <span class="summary-label">Öğrenci:</span>
          <span class="summary-val">${p.studentName} (${p.studentClass})</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Veli:</span>
          <span class="summary-val">${p.parentName}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">WhatsApp İletişim Kararı:</span>
          <span class="summary-val" id="resWa">—</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">İşlem Tarihi:</span>
          <span class="summary-val" id="resDate">—</span>
        </div>
      </div>

      <button type="button" onclick="window.close()" class="btn-back" style="margin-top: 16px; width: 100%;">
        Pencereyi Kapat
      </button>
    </div>

    <div class="footer">
      ${p.schoolName} · OkulDesk Veli Bilgilendirme Portalı
    </div>
  </div>

  <script>
    function switchTab(num) {
      const page1 = document.getElementById('page1');
      const page2 = document.getElementById('page2');
      const tabBtn1 = document.getElementById('tabBtn1');
      const tabBtn2 = document.getElementById('tabBtn2');

      if (num === 1) {
        page1.classList.add('active');
        page2.classList.remove('active');
        tabBtn1.classList.add('active');
        tabBtn2.classList.remove('active');
      } else {
        page1.classList.remove('active');
        page2.classList.add('active');
        tabBtn1.classList.remove('active');
        tabBtn2.classList.add('active');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function selectChoice(val) {
      const inputs = document.querySelectorAll('input[name="waConsent"]');
      inputs.forEach(input => {
        const card = input.closest('.choice-card');
        if (input.value === val) {
          input.checked = true;
          card.classList.add(val === 'ACCEPTED' ? 'selected-yes' : 'selected-no');
          card.classList.remove(val === 'ACCEPTED' ? 'selected-no' : 'selected-yes');
        } else {
          card.classList.remove('selected-yes', 'selected-no');
        }
      });
    }

    async function submitForm(e) {
      e.preventDefault();
      const form = document.getElementById('consentForm');
      const btn = document.getElementById('submitBtn');
      const waVal = form.querySelector('input[name="waConsent"]:checked')?.value;

      if (!waVal) {
        alert('Lütfen tercihinizi belirleyiniz (ONAYLIYORUM veya ONAYLAMIYORUM).');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span>Kaydediliyor...</span> ⏳';

      try {
        const res = await fetch('/api/public/consent/${p.token}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waConsent: waVal }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Kayıt başarısız oldu.');
        }

        document.getElementById('page1').style.display = 'none';
        document.getElementById('page2').style.display = 'none';
        document.querySelector('.tabs-bar').style.display = 'none';
        
        const successCard = document.getElementById('successCard');
        document.getElementById('resWa').textContent = waVal === 'ACCEPTED' ? '✅ ONAYLANDI' : '❌ ONAYLANMADI (REDDEDİLDİ)';
        document.getElementById('resDate').textContent = data.data?.date || new Date().toLocaleString('tr-TR');
        successCard.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        alert(err.message || 'İşlem sırasında bir hata oluştu.');
        btn.disabled = false;
        btn.innerHTML = '<span>Seçimimi Kaydet ve Onayla</span> ➔';
      }
    }
  </script>
</body>
</html>`;
}
