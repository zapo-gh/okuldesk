import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function resolveFonts(): { regular: string; bold: string } {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'fonts'),
    path.resolve(process.cwd(), 'fonts'),
    path.resolve(process.cwd(), 'backend', 'fonts'),
    'C:/Windows/Fonts',
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

export async function generateStaffTransferPdf(transfer: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts();
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 30, bottom: 30, left: 30, right: 30 },
      bufferPages: true,
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('R', fonts.regular);
    doc.registerFont('B', fonts.bold);

    const ML = doc.page.margins.left;
    const MT = doc.page.margins.top;
    const PW = doc.page.width;
    const CW = PW - ML - doc.page.margins.right;
    let curY = MT;
    const BLACK = '#000000';

    let ex: any = {};
    try {
      if (transfer.extraData) ex = JSON.parse(transfer.extraData);
    } catch {}

    const drawBorder = (x: number, y: number, w: number, h: number) => {
      doc.rect(x, y, w, h).stroke(BLACK);
    };

    const drawCell = (
      x: number, y: number, w: number, h: number,
      text: string,
      options: { bold?: boolean; align?: string; size?: number; paddingX?: number; paddingY?: number } = {}
    ) => {
      drawBorder(x, y, w, h);
      const isBold = options.bold ?? false;
      const align = options.align ?? 'left';
      const size = options.size ?? 9.5;
      const px = options.paddingX ?? 5;
      const py = options.paddingY ?? 4;

      doc.font(isBold ? 'B' : 'R').fontSize(size).fillColor(BLACK);
      
      const textHeight = doc.heightOfString(text, { width: w - px * 2, align: align as any });
      const currentY = align === 'center' ? y + (h - textHeight) / 2 : y + py;

      doc.text(text, x + px, currentY, { width: w - px * 2, align: align as any, lineBreak: true });
    };

    // --- TITLE ---
    drawCell(ML, curY, CW, 20, 'PERSONEL NAKİL BİLDİRİMİ', { bold: true, align: 'center', size: 12 });
    curY += 20;

    const LBL_W = CW * 0.35;
    const VAL_W = CW * 0.65;
    const ROW_H = 17;

    // --- ROWS ---
    drawCell(ML, curY, LBL_W, ROW_H, 'ADI-SOYADI', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, transfer.staffName || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'T.C. KİMLİK NO', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, transfer.tcKimlikNo || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'EMEKLİ SİCİL NO', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.emekliSicilNo || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'SAYMANLIK KİŞİ NO', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.saymanlikKisiNo || '-');
    curY += ROW_H;

    // Görevi - Eski/Yeni
    drawCell(ML, curY, LBL_W, ROW_H * 2, 'GÖREVİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W / 2, ROW_H, 'ESKİ GÖREVİ', { bold: true, align: 'center' });
    drawCell(ML + LBL_W + (VAL_W / 2), curY, VAL_W / 2, ROW_H, 'YENİ GÖREVİ', { bold: true, align: 'center' });
    curY += ROW_H;
    drawCell(ML + LBL_W, curY, VAL_W / 2, ROW_H, ex.eskiGorevi || '-', { align: 'center' });
    drawCell(ML + LBL_W + (VAL_W / 2), curY, VAL_W / 2, ROW_H, ex.yeniGorevi || '-', { align: 'center' });
    curY += ROW_H;

    // Memuriyeti - Eski/Yeni
    drawCell(ML, curY, LBL_W, ROW_H * 2, 'MEMURİYETİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W / 2, ROW_H, 'ESKİ GÖREV YERİ', { bold: true, align: 'center' });
    drawCell(ML + LBL_W + (VAL_W / 2), curY, VAL_W / 2, ROW_H, 'YENİ GÖREV YERİ', { bold: true, align: 'center' });
    curY += ROW_H;
    drawCell(ML + LBL_W, curY, VAL_W / 2, ROW_H, transfer.currentSchool || '-', { align: 'center' });
    drawCell(ML + LBL_W + (VAL_W / 2), curY, VAL_W / 2, ROW_H, transfer.newSchool || '-', { align: 'center' });
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'GÖREVE İLK BAŞLAMA TARİHİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.goreveBaslamaTarihi || '-');
    curY += ROW_H;

    // Derece Kademesi
    drawCell(ML, curY, LBL_W, ROW_H, 'DERECE - KADEMESİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W / 2, ROW_H, `ESKİ: ${ex.eskiDerece || '-'}`);
    drawCell(ML + LBL_W + (VAL_W / 2), curY, VAL_W / 2, ROW_H, `YENİ: ${ex.yeniDerece || '-'}`);
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'TERFİ TARİHİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.terfiTarihi || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'ÖĞRENİM DURUMU', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.ogrenimDurumu || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'AİLE DURUMU (EŞİNİN ÇALIŞIP ÇALIŞMADIĞI)', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.aileDurumu || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'YILLIK İZİN DURUMU', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.yillikIzinDurumu || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'KIDEM AYLIĞINA ESAS HİZMET SÜRESİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.kidemHizmetSuresi || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'ATAMA VE TEBLİĞ TARİHİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W / 2, ROW_H, `ATAMA: ${ex.atamaTarihi || '-'}`);
    drawCell(ML + LBL_W + (VAL_W / 2), curY, VAL_W / 2, ROW_H, `TEBLİĞ: ${ex.tebligTarihi || '-'}`);
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'ESKİ MEMURİYETİNDEN AYRILIŞ TARİHİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.ayrilisTarihi || transfer.transferDate || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'YENİ GÖREV YERİNDE AYLIĞA HAK KAZANDIĞI TARİH', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.ayligaHakKazanmaTarihi || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, '15 GÜN İÇİNDE HAREKAT ETMEDİĞİ TAKTİRDE GECİKME NEDENİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.gecikmeNedeni || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'ŞAHSİ VE AİLE YOLLUĞUNU ALIP ALMADIĞI (ALMIŞ İSE TUTARI)', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.yollukDurumu === 'Almıştır' ? `ALMIŞTIR (${ex.yollukTutari})` : 'ALMAMIŞTIR');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'GİYECEK YARDIMI ALIP, ALMADIĞI (ALMIŞ İSE TUTARI)', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.giyecekYardimi === 'Almıştır' ? `ALMIŞTIR (${ex.giyecekTutari})` : 'YOKTUR');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'BANKA PROMOSYONU ALIP ALMADIĞI (ALMIŞ İSE TARİH VE TUTARI)', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.bankaPromosyonu === 'Almıştır' ? `ALMIŞTIR - ${ex.bankaPromosyonTarihTutar}` : 'YOKTUR');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'EĞİTİME HAZIRLIK ÖDENEĞİNİ ALIP ALMADIĞI (ALMIŞ İSE TUTARI)', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.egitimeHazirlikOdenegi === 'Almıştır' ? `ALMIŞTIR - ${ex.egitimeHazirlikTarihTutar}` : 'YOKTUR');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'BORÇLU İSE BORÇLARINA AİT BİLGİLER', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.borcDurumu === 'Yoktur' ? 'BİLİNEN BORCU YOKTUR' : (ex.borcMetin || '-'));
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'MAAŞI ÜZERİNDE İCRA VEYA NAFAKA KESİNTİSİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.icraNafaka || 'Yoktur');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'ALMIŞ OLDUĞU SAĞLIK RAPORLARI (HEYET / NORMAL)', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, `Heyet: ${ex.saglikRaporuHeyet || 'Yok'} | Normal: ${ex.saglikRaporuNormal || 'Yok'}`);
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'SÜRE GELEN GELİR VERGİSİ MATRAHI (YIL İÇİNDEKİ TOPLAMI)', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.gelirVergisiMatrahi || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'YABANCI DİL TAZMİNATINDAN YARARLANIP YARARLANMADIĞI', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.yabanciDilTazminati || '-');
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'ÜZERİNDE ZİMMET KAYDININ BULUNUP BULUNMADIĞI', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.zimmetDurumu === 'Yoktur' ? 'YOKTUR' : (ex.zimmetMetin || '-'));
    curY += ROW_H;

    drawCell(ML, curY, LBL_W, ROW_H, 'SENDİKA BİLGİLERİ', { bold: true });
    drawCell(ML + LBL_W, curY, VAL_W, ROW_H, ex.sendikaBilgisi || '-');
    curY += ROW_H;

    // --- SIGNATURES ---
    curY += 8;
    const SIG_W = CW / 4;
    
    // Header
    drawCell(ML + SIG_W * 0, curY, SIG_W, 26, 'Düzenleyen\n(Müdür Yardımcısı)', { bold: true, align: 'center', size: 9 });
    drawCell(ML + SIG_W * 1, curY, SIG_W, 26, 'Düzenleyen\n(Okul Müdürü)', { bold: true, align: 'center', size: 9 });
    drawCell(ML + SIG_W * 2, curY, SIG_W, 26, 'Tahakkuk Memuru\n(Gerçekleştirme Görevlisi)', { bold: true, align: 'center', size: 9 });
    drawCell(ML + SIG_W * 3, curY, SIG_W, 26, 'Personel Birim Yetkilisi', { bold: true, align: 'center', size: 9 });
    curY += 26;

    // Names
    const nameY = curY;
    drawCell(ML + SIG_W * 0, nameY, SIG_W, 26, `${ex.mudurYardimcisiAd || '................'}\n${ex.mudurYardimcisiUnvan || 'Müdür Yardımcısı'}`, { align: 'center', size: 9 });
    drawCell(ML + SIG_W * 1, nameY, SIG_W, 26, `${ex.okulMuduruAd || '................'}\nOkul Müdürü`, { align: 'center', size: 9 });
    drawCell(ML + SIG_W * 2, nameY, SIG_W, 26, `${ex.tahakkukMemuruAd || '................'}\n${ex.tahakkukMemuruUnvan || 'Gerçekleştirme Görevlisi'}`, { align: 'center', size: 9 });
    drawCell(ML + SIG_W * 3, nameY, SIG_W, 26, `${ex.personelBirimYetkilisiAd || '................'}\n${ex.personelBirimYetkilisiUnvan || 'Personel Birim Yetkilisi'}`, { align: 'center', size: 9 });
    curY += 26;

    // Signatures
    drawCell(ML + SIG_W * 0, curY, SIG_W, 30, 'İmza', { align: 'center', size: 9 });
    drawCell(ML + SIG_W * 1, curY, SIG_W, 30, 'İmza', { align: 'center', size: 9 });
    drawCell(ML + SIG_W * 2, curY, SIG_W, 30, 'İmza', { align: 'center', size: 9 });
    drawCell(ML + SIG_W * 3, curY, SIG_W, 30, 'İmza', { align: 'center', size: 9 });

    doc.end();
  });
}
