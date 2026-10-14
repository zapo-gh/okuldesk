import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export interface ConsentPdfData {
  schoolName: string;
  schoolAddress?: string;
  schoolDistrictCity?: string;
  schoolEmail?: string;
  schoolPhone?: string;
  studentName: string;
  className: string;
  schoolNumber: string;
  parentName: string;
  parentPhone: string;
  relation?: string; // Anne, Baba, Vasi
  waConsentStatus?: string; // ACCEPTED, DECLINED, PENDING
  waConsentDate?: string | Date | null;
  consentSource?: string | null;
  consentIp?: string | null;
  consentToken?: string | null;
}

function resolveFonts(): { regular: string; bold: string } {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'fonts'),
    path.resolve(process.cwd(), 'fonts'),
    path.resolve(process.cwd(), 'backend', 'fonts'),
  ];
  for (const dir of candidates) {
    const regular = path.join(dir, 'times.ttf');
    const bold = path.join(dir, 'timesbd.ttf');
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold };
    }
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

function drawCheckbox(doc: PDFKit.PDFDocument, x: number, y: number, checked = false, size = 11) {
  doc.save();
  doc.rect(x, y, size, size).lineWidth(1).strokeColor('#0f172a').stroke();
  if (checked) {
    doc.lineWidth(1.6).strokeColor('#0f172a');
    doc.moveTo(x + 2.5, y + size / 2)
       .lineTo(x + size / 2 - 0.5, y + size - 2.5)
       .lineTo(x + size - 1.5, y + 2.5)
       .stroke();
  }
  doc.restore();
}

/**
 * Tek bir veli/öğrenci için MEB standartlarında 2 sayfalık KVKK ve Açık Rıza Formu oluşturur.
 * Sayfa 1: Aydınlatma Metni (Resmi MEB standart metni, okunabilir punto)
 * Sayfa 2: Açık Rıza Beyanı ve İmza Formu (Kimlik tablosu, onay kutuları ve imza alanı)
 */
export function generateConsentFormPdf(data: ConsentPdfData): Promise<Buffer> {
  return generateMultipleConsentFormsPdf([data]);
}

/**
 * Birden fazla öğrenci/veli (örn: tüm sınıf) için 2'şer sayfalık formları birleştirir.
 */
export function generateMultipleConsentFormsPdf(list: ConsentPdfData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts();
    const chunks: Buffer[] = [];

    // A4 Boyutu: 595.28 x 841.89 pt
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 32, bottom: 20, left: 45, right: 45 },
      autoFirstPage: false,
      bufferPages: true,
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('R', fonts.regular);
    doc.registerFont('B', fonts.bold);

    const PW = 595.28;
    const ML = 45;
    const MR = 45;
    const CW = PW - ML - MR; // 505.28 pt

    list.forEach((item) => {
      const schoolTitle = (item.schoolName || 'OKUL MÜDÜRLÜĞÜ').toLocaleUpperCase('tr-TR');
      const schoolDistrict = (item.schoolDistrictCity || '').toLocaleUpperCase('tr-TR');
      const schoolAddr = [
        item.schoolAddress || '[Okul Adresi]',
        item.schoolDistrictCity || '',
      ].filter(Boolean).join(', ');
      const schoolContact = `İletişim: ${item.schoolEmail || '[e-posta adresi]'} / ${item.schoolPhone || '[telefon numarası]'}`;

      const rel = (item.relation || '').toLocaleLowerCase('tr-TR');
      const isAnne = rel.includes('anne');
      const isBaba = rel.includes('baba');
      const isVasi = rel.includes('vasi');

      const isWaAccepted = item.waConsentStatus === 'ACCEPTED';
      const isWaDeclined = item.waConsentStatus === 'DECLINED';

      // ════════════════════════════════════════════════════════════════════════
      // SAYFA 1: AYDINLATMA METNİ (MEB STANDARTLARINDA TAM METİN - 8 MADDE)
      // ════════════════════════════════════════════════════════════════════════
      doc.addPage();
      let curY = 30;

      // 1. Resmi Başlık Bloğu (Antet)
      doc.font('B').fontSize(11).fillColor('#0f172a').text('T.C.', ML, curY, { width: CW, align: 'center', lineBreak: false });
      curY += 14;
      if (schoolDistrict) {
        doc.font('B').fontSize(10.5).fillColor('#1e293b').text(`${schoolDistrict} MİLLÎ EĞİTİM MÜDÜRLÜĞÜ`, ML, curY, { width: CW, align: 'center', lineBreak: false });
        curY += 14;
      }
      doc.font('B').fontSize(11.5).fillColor('#0f172a').text(`${schoolTitle} MÜDÜRLÜĞÜ`, ML, curY, { width: CW, align: 'center', lineBreak: false });
      curY += 17;

      // Çift Çizgi (Resmi Evrak Ayracı)
      doc.lineWidth(1).strokeColor('#0f172a').moveTo(ML, curY).lineTo(ML + CW, curY).stroke();
      doc.lineWidth(0.4).strokeColor('#64748b').moveTo(ML, curY + 2.5).lineTo(ML + CW, curY + 2.5).stroke();
      curY += 13;

      // Belge Başlığı
      doc.font('B').fontSize(10.5).fillColor('#0f172a').text('KİŞİSEL VERİLERİN KORUNMASI KANUNU (KVKK) KAPSAMINDA', ML, curY, { width: CW, align: 'center', lineBreak: false });
      curY += 13.5;
      doc.font('B').fontSize(11.5).fillColor('#0f172a').text('WHATSAPP İLETİŞİM HATTI VELİ AYDINLATMA METNİ', ML, curY, { width: CW, align: 'center', lineBreak: false });
      curY += 17;

      // Sayın Velimiz Hitabı
      doc.font('B').fontSize(10).fillColor('#0f172a').text('Sayın Velimiz,', ML, curY, { lineBreak: false });
      curY += 13;

      // Giriş Paragrafı (Kullanıcının verbatim metni, okunaklı punto)
      const introText = "6698 sayılı Kişisel Verilerin Korunması Kanunu'nun (KVKK) 10. maddesi ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, okulumuz tarafından kurulan WhatsApp İletişim Hattı kapsamında işlenecek kişisel verilerinize ilişkin bilgilendirme aşağıda sunulmuştur. Bu metin bir rıza beyanı niteliğinde değildir; rıza tercihiniz ayrı bir beyanla alınmaktadır.";
      const bodyFontSize = 9.4;
      const lineGapVal = 2.0;

      doc.font('R').fontSize(bodyFontSize).fillColor('#1e293b').text(introText, ML, curY, { width: CW, align: 'justify', lineGap: lineGapVal });
      curY += doc.heightOfString(introText, { width: CW, lineGap: lineGapVal }) + 10;

      // 8 MADDELİK TAM VE EKSİKSİZ AYDINLATMA METNİ
      const articles = [
        {
          num: '1. Veri Sorumlusu',
          desc: `${item.schoolName || '[Okul Adı]'}, ${schoolAddr}. İletişim: ${item.schoolEmail || '[e-posta adresi]'} / ${item.schoolPhone || '[telefon numarası]'}. Başvuru yolu: Okul idaresine yazılı dilekçe veya yukarıdaki kurumsal e-posta adresi.`,
        },
        {
          num: '2. İşlenen Kişisel Veriler',
          desc: '• Veli: Ad soyad, telefon numarası, öğrenciyle yakınlık derecesi.\n• Öğrenci: Ad soyad, sınıf, okul numarası; not, devamsızlık, ödev ve etkinlik bilgileri.\n• Yalnızca ayrıca onay verilmesi halinde: Okul içi etkinliklere ilişkin fotoğraf ve video kayıtları (ayrı form kapsamında).',
        },
        {
          num: '3. Kişisel Verilerin İşlenme Amacı',
          desc: 'Öğrencinin eğitim-öğretim sürecine ilişkin bilgilendirmelerin (not, devamsızlık, ödev, etkinlik ve idari duyurular) veliye hızlı ve etkin biçimde iletilmesi ile veli-okul iletişiminin sağlanması.',
        },
        {
          num: '4. Hukuki Sebep',
          desc: "Verileriniz, KVKK'nın 5/1. maddesi uyarınca açık rızanıza dayanılarak işlenmektedir. WhatsApp hattını kullanmak isteyip istemediğiniz tamamen sizin tercihinize bağlıdır.",
        },
        {
          num: '5. Verilerin Aktarılması',
          desc: "İletişim altyapısı olarak WhatsApp Business uygulaması kullanıldığından, verileriniz uygulamanın kendi veri politikaları çerçevesinde yurt dışındaki sunuculara aktarılmaktadır. Bu aktarım, KVKK'nın 9. maddesi kapsamında ve açık rızanıza dayanılarak gerçekleştirilmektedir. Kanuni yükümlülüklerimiz saklı kalmak kaydıyla, verileriniz WhatsApp dışında herhangi bir üçüncü kişi, kurum veya kuruluşla paylaşılmayacaktır.",
        },
        {
          num: '6. Hattın Kullanımına İlişkin Güvenceler',
          desc: 'İletişim hattı okul adına açılmış kurumsal bir hattır; öğretmenlerin kişisel telefon numaraları kullanılmaz. Mesajlar birebir veya yayın listesi yoluyla iletilir; velilerin telefon numaraları birbirine görünmez.',
        },
        {
          num: '7. Saklama Süresi',
          desc: 'Verileriniz, öğrencinin okulumuzdaki öğrenimi süresince ve rızanızı geri almanıza kadar işlenecek; amaç ortadan kalktığında veya rızanız geri alındığında silinecek, yok edilecek veya anonim hale getirilecektir.',
        },
        {
          num: '8. Haklarınız ve Alternatif İletişim Yolu',
          desc: "KVKK'nın 11. maddesi kapsamında; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini isteme ve kanuna aykırı işleme nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz. Bu haklarınızı yukarıda belirtilen başvuru yolu ile kullanabilirsiniz.\nWhatsApp üzerinden bilgilendirme almak istemeyen velilerimize bilgilendirmeler SMS, e-posta veya telefon yoluyla yapılmaya devam edilecektir. Bu tercih nedeniyle velimiz ve öğrencimiz hiçbir hak kaybına uğramayacaktır.",
        },
      ];

      articles.forEach((art) => {
        doc.font('B').fontSize(bodyFontSize + 0.3).fillColor('#0f172a').text(art.num + ':', ML, curY, { lineBreak: false });
        curY += (bodyFontSize + 2.5);
        doc.font('R').fontSize(bodyFontSize).fillColor('#1e293b').text(art.desc, ML + 8, curY, { width: CW - 8, align: 'justify', lineGap: lineGapVal });
        curY += doc.heightOfString(art.desc, { width: CW - 8, lineGap: lineGapVal }) + 6.5;
      });

      // Sayfa 1 Dipnotu (Alt Bilgi)
      const footer1Y = 804;
      doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(ML, footer1Y).lineTo(ML + CW, footer1Y).stroke();
      doc.font('R').fontSize(7.5).fillColor('#64748b').text(
        '* Bu aydınlatma metni bilgilendirme amacıyla sunulmuş olup velide kalabilir. Açık rıza tercihi 2. sayfadaki form ile okul idaresine teslim edilir.',
        ML, footer1Y + 4, { width: CW - 65, align: 'left', lineBreak: false }
      );
      doc.font('B').fontSize(8).fillColor('#0f172a').text('Sayfa 1 / 2', ML + CW - 50, footer1Y + 4, { width: 50, align: 'right', lineBreak: false });


      // ════════════════════════════════════════════════════════════════════════
      // SAYFA 2: AÇIK RIZA BEYANI FORMU (MEB MATBU EVRAK DÜZENİ)
      // ════════════════════════════════════════════════════════════════════════
      doc.addPage();
      let curY2 = 30;

      // 1. Resmi Başlık
      doc.font('B').fontSize(11).fillColor('#0f172a').text('T.C.', ML, curY2, { width: CW, align: 'center', lineBreak: false });
      curY2 += 14;
      if (schoolDistrict) {
        doc.font('B').fontSize(10.5).fillColor('#1e293b').text(`${schoolDistrict} MİLLÎ EĞİTİM MÜDÜRLÜĞÜ`, ML, curY2, { width: CW, align: 'center', lineBreak: false });
        curY2 += 14;
      }
      doc.font('B').fontSize(11.5).fillColor('#0f172a').text(`${schoolTitle} MÜDÜRLÜĞÜ`, ML, curY2, { width: CW, align: 'center', lineBreak: false });
      curY2 += 17;

      // Çift Çizgi
      doc.lineWidth(1).strokeColor('#0f172a').moveTo(ML, curY2).lineTo(ML + CW, curY2).stroke();
      doc.lineWidth(0.4).strokeColor('#64748b').moveTo(ML, curY2 + 2.5).lineTo(ML + CW, curY2 + 2.5).stroke();
      curY2 += 13;

      // Belge Başlığı
      doc.font('B').fontSize(12).fillColor('#0f172a').text('WHATSAPP İLETİŞİM HATTI VELİ AÇIK RIZA ONAY FORMU', ML, curY2, { width: CW, align: 'center', lineBreak: false });
      curY2 += 18;

      // Açıklama Paragrafı
      const page2Intro = "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca tarafıma sunulan Aydınlatma Metni'ni okudum ve anladım. WhatsApp İletişim Hattı'nı kullanmak isteyip istemediğimin tamamen kendi tercihim olduğunu, açık rıza vermemem veya rızamı geri almam halinde hiçbir hak kaybına uğramayacağımı biliyorum. Bu kapsamda velisi/yasal temsilcisi bulunduğum öğrenciye ilişkin rıza tercihim aşağıda belirtilmiştir:";
      doc.font('R').fontSize(9.3).fillColor('#1e293b').text(page2Intro, ML, curY2, { width: CW, align: 'justify', lineGap: 2.2 });
      curY2 += doc.heightOfString(page2Intro, { width: CW, lineGap: 2.2 }) + 13;

      // ── BÖLÜM 1: ÖĞRENCİ VE VELİ BİLGİLERİ TABLOSU (MEB MATBU IZGARA) ──
      const tblY = curY2;
      const tblW = CW;
      const rowH = 27;
      const cW1 = 125;
      const cW2 = 145;
      const cW3 = 105;

      // Başlık Şeridi
      doc.rect(ML, tblY, tblW, 21).fillColor('#f8fafc').fill();
      doc.rect(ML, tblY, tblW, 21 + (rowH * 3)).lineWidth(0.8).strokeColor('#334155').stroke();
      doc.font('B').fontSize(9.2).fillColor('#0f172a').text('1. ÖĞRENCİ VE VELİ / YASAL TEMSİLCİ KİMLİK VE İLETİŞİM BİLGİLERİ', ML + 8, tblY + 6, { lineBreak: false });

      // Yatay satır ayraçları
      for (let r = 1; r <= 3; r++) {
        const lY = tblY + 21 + (r * rowH);
        if (r < 3) {
          doc.lineWidth(0.4).strokeColor('#cbd5e1').moveTo(ML, lY).lineTo(ML + tblW, lY).stroke();
        }
      }

      // Dikey kolon ayraçları
      const colX1 = ML + cW1;
      const colX2 = colX1 + cW2;
      const colX3 = colX2 + cW3;
      const tableDataStartY = tblY + 21;

      [colX1, colX2, colX3].forEach(x => {
        doc.lineWidth(0.4).strokeColor('#cbd5e1').moveTo(x, tableDataStartY).lineTo(x, tableDataStartY + (rowH * 3)).stroke();
      });

      // Satır 1: Öğrenci Bilgileri
      const r1Y = tableDataStartY;
      doc.font('B').fontSize(8.8).fillColor('#334155').text('Öğrencinin Adı Soyadı', ML + 8, r1Y + 8, { lineBreak: false });
      doc.font('B').fontSize(9.5).fillColor('#0f172a').text(item.studentName || '....................................................', colX1 + 8, r1Y + 7, { lineBreak: false });

      doc.font('B').fontSize(8.8).fillColor('#334155').text('Sınıfı / Okul No', colX2 + 8, r1Y + 8, { lineBreak: false });
      const classNoStr = `${item.className || '.........'}  -  No: ${item.schoolNumber || '.........'}`;
      doc.font('R').fontSize(9.5).fillColor('#0f172a').text(classNoStr, colX3 + 8, r1Y + 7, { lineBreak: false });

      // Satır 2: Veli Bilgileri & Yakınlık
      const r2Y = r1Y + rowH;
      doc.font('B').fontSize(8.8).fillColor('#334155').text('Velinin Adı Soyadı', ML + 8, r2Y + 8, { lineBreak: false });
      doc.font('B').fontSize(9.5).fillColor('#0f172a').text(item.parentName || '....................................................', colX1 + 8, r2Y + 7, { lineBreak: false });

      doc.font('B').fontSize(8.8).fillColor('#334155').text('Öğrenciye Yakınlığı', colX2 + 8, r2Y + 8, { lineBreak: false });

      let cbX = colX3 + 8;
      drawCheckbox(doc, cbX, r2Y + 7, isAnne, 10);
      doc.font('R').fontSize(8.8).fillColor('#0f172a').text('Anne', cbX + 13, r2Y + 8, { lineBreak: false });

      cbX += 45;
      drawCheckbox(doc, cbX, r2Y + 7, isBaba, 10);
      doc.font('R').fontSize(8.8).fillColor('#0f172a').text('Baba', cbX + 13, r2Y + 8, { lineBreak: false });

      cbX += 45;
      drawCheckbox(doc, cbX, r2Y + 7, isVasi, 10);
      doc.font('R').fontSize(8.8).fillColor('#0f172a').text('Vasi', cbX + 13, r2Y + 8, { lineBreak: false });

      // Satır 3: Telefon ve Bildirim Türü
      const r3Y = r2Y + rowH;
      doc.font('B').fontSize(8.8).fillColor('#334155').text('WhatsApp Telefon No', ML + 8, r3Y + 8, { lineBreak: false });
      doc.font('B').fontSize(10).fillColor('#0f172a').text(item.parentPhone || '....................................................', colX1 + 8, r3Y + 7, { lineBreak: false });

      doc.font('B').fontSize(8.8).fillColor('#334155').text('Bildirim Türü', colX2 + 8, r3Y + 8, { lineBreak: false });
      doc.font('R').fontSize(8.8).fillColor('#334155').text('Not, Devamsızlık, Ödev, Duyuru', colX3 + 8, r3Y + 8, { lineBreak: false });

      curY2 = tblY + 21 + (rowH * 3) + 16;

      // ── BÖLÜM 2: AÇIK RIZA TERCİHİ SEÇENEKLERİ ──
      doc.font('B').fontSize(9.8).fillColor('#0f172a').text('2. AÇIK RIZA TERCİHİ (Lütfen durumunuza uygun seçeneği işaretleyiniz)', ML, curY2, { lineBreak: false });
      curY2 += 14;

      // KART 1: ONAYLIYORUM KUTUSU
      const c1Y = curY2;
      const c1H = 72;
      const opt1Text = "Yukarıda kimlik ve iletişim bilgileri yer alan öğrencime ait eğitim-öğretim sürecine ilişkin bildirimlerin (not, devamsızlık durumu, ödev, toplantı ve resmi okul etkinlik duyuruları) okulun kurumsal WhatsApp İletişim Hattı üzerinden iletilmesini; iletişim altyapısı olarak WhatsApp Business uygulaması kullanıldığından telefon numaramın ve ilgili öğrenci verilerimin uygulamanın yurt dışındaki sunucularına aktarılmasına (KVKK m. 9) özgür irademle AÇIK RIZA VERİYORUM.";

      doc.roundedRect(ML, c1Y, CW, c1H, 3).lineWidth(isWaAccepted ? 1.4 : 0.9).strokeColor(isWaAccepted ? '#059669' : '#059669').stroke();
      doc.roundedRect(ML, c1Y, CW, 22, 3).fillColor('#f0fdf4').fill();
      drawCheckbox(doc, ML + 10, c1Y + 5.5, isWaAccepted, 11);
      doc.font('B').fontSize(9.8).fillColor('#065f46').text('KABUL EDİYORUM  /  AÇIK RIZA VERİYORUM', ML + 28, c1Y + 6.5, { lineBreak: false });
      doc.font('R').fontSize(8.8).fillColor('#1e293b').text(opt1Text, ML + 12, c1Y + 27, { width: CW - 24, align: 'justify', lineGap: 1.8 });

      curY2 = c1Y + c1H + 12;

      // KART 2: ONAYLAMIYORUM KUTUSU
      const c2Y = curY2;
      const c2H = 50;
      const opt2Text = "WhatsApp İletişim Hattı üzerinden tarafıma bildirim yapılmasını KABUL ETMİYORUM. Bilgilendirmelerin tarafıma SMS, telefon veya matbu evrak (yazılı bildirim) yoluyla yapılmasını talep ediyorum.";

      doc.roundedRect(ML, c2Y, CW, c2H, 3).lineWidth(isWaDeclined ? 1.4 : 0.9).strokeColor(isWaDeclined ? '#e11d48' : '#e11d48').stroke();
      doc.roundedRect(ML, c2Y, CW, 22, 3).fillColor('#fff1f2').fill();
      drawCheckbox(doc, ML + 10, c2Y + 5.5, isWaDeclined, 11);
      doc.font('B').fontSize(9.8).fillColor('#9f1239').text('KABUL ETMİYORUM  /  AÇIK RIZA VERMİYORUM', ML + 28, c2Y + 6.5, { lineBreak: false });
      doc.font('R').fontSize(8.8).fillColor('#1e293b').text(opt2Text, ML + 12, c2Y + 27, { width: CW - 24, align: 'justify', lineGap: 1.8 });

      curY2 = c2Y + c2H + 13;

      // Yasal Bilgilendirme Kutusu
      doc.roundedRect(ML, curY2, CW, 38, 3).fillColor('#f8fafc').fill();
      doc.roundedRect(ML, curY2, CW, 38, 3).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
      doc.font('R').fontSize(8.2).fillColor('#475569').text(
        'Önemli Not ve Rızanın Geri Alınması: Açık rıza tercihinizi dilediğiniz zaman okul idaresine yazılı başvuruda bulunarak hiçbir gerekçe göstermeksizin geri alabilirsiniz. WhatsApp hattını kabul etmemeniz veya rızanızı geri almanız durumunda velimiz ve öğrencimiz hiçbir hak kaybına uğramayacak; bilgilendirmeler alternatif resmi kanallardan sürdürülecektir.',
        ML + 8, curY2 + 5.5, { width: CW - 16, align: 'justify', lineGap: 1.8 }
      );
      curY2 += 51;

      // ── BÖLÜM 3: BEYAN VE İMZA BLOĞU ──
      const sBoxY = curY2;
      const sBoxH = 92;
      doc.roundedRect(ML, sBoxY, CW, sBoxH, 3).lineWidth(0.8).strokeColor('#334155').stroke();
      doc.rect(ML, sBoxY, CW, 21).fillColor('#f1f5f9').fill();
      doc.font('B').fontSize(9.2).fillColor('#0f172a').text('3. BEYAN SAHİBİ (VELİ / YASAL TEMSİLCİ) ONAYI VE İMZA', ML + 8, sBoxY + 6, { lineBreak: false });

      const sCol1X = ML + 16;
      const sCol2X = ML + (CW / 2) + 12;
      const sRow1Y = sBoxY + 30;
      const sRow2Y = sBoxY + 56;

      const isOnlineConsent = item.consentSource === 'WEB' && (item.waConsentStatus === 'ACCEPTED' || item.waConsentStatus === 'DECLINED');
      const formattedDate = item.waConsentDate ? new Date(item.waConsentDate).toLocaleString('tr-TR') : '..... / ..... / 202...';

      doc.font('B').fontSize(8.8).fillColor('#334155').text('İşlem / Beyan Tarihi:', sCol1X, sRow1Y, { lineBreak: false });
      doc.font('R').fontSize(9.5).fillColor('#0f172a').text(formattedDate, sCol1X + 92, sRow1Y, { lineBreak: false });

      doc.font('B').fontSize(8.8).fillColor('#334155').text('Velinin Adı Soyadı:', sCol2X, sRow1Y, { lineBreak: false });
      doc.font('B').fontSize(9.5).fillColor('#0f172a').text(item.parentName || '..........................................................', sCol2X + 88, sRow1Y, { lineBreak: false });

      doc.font('B').fontSize(8.8).fillColor('#334155').text('İmza / Teyit:', sCol2X, sRow2Y, { lineBreak: false });
      if (isOnlineConsent) {
        doc.font('B').fontSize(8.8).fillColor('#059669').text('[DİJİTAL ELEKTRONİK ONAYLI]', sCol2X + 88, sRow2Y, { lineBreak: false });
      } else {
        doc.font('R').fontSize(9).fillColor('#94a3b8').text('..........................................................', sCol2X + 88, sRow2Y, { lineBreak: false });
      }

      if (isOnlineConsent) {
        doc.font('R').fontSize(7.5).fillColor('#047857').text(
          `✓ Bu onay veli tarafından web onay portalı üzerinden elektronik olarak verilmiştir (IP: ${item.consentIp || 'Kayıtlı'}, Token: ${item.consentToken ? item.consentToken.slice(0, 8) + '...' : 'Doğrulandı'}).`,
          sCol1X, sBoxY + sBoxH - 14, { width: CW - 32, lineBreak: false }
        );
      }

      // Sayfa 2 Dipnotu (Alt Bilgi)
      const footer2Y = 804;
      doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(ML, footer2Y).lineTo(ML + CW, footer2Y).stroke();
      doc.font('R').fontSize(7.5).fillColor('#64748b').text(
        '* Bu form veli tarafından imzalandıktan sonra okul idaresine teslim edilecek ve öğrencinin özlük dosyasında muhafaza edilecektir.',
        ML, footer2Y + 4, { width: CW - 65, align: 'left', lineBreak: false }
      );
      doc.font('B').fontSize(8).fillColor('#0f172a').text('Sayfa 2 / 2', ML + CW - 50, footer2Y + 4, { width: 50, align: 'right', lineBreak: false });
    });

    doc.end();
  });
}
