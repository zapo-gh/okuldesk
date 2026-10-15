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
  for (const dir of candidates) {
    const regular = path.join(dir, 'arial.ttf');
    const bold = path.join(dir, 'arialbd.ttf');
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold };
    }
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

export interface DailyAbsenteeismReportItem {
  id: string;
  studentId: string;
  studentName?: string;
  schoolNumber?: string;
  className?: string;
  date: string;
  sessionType: 'MORNING' | 'AFTERNOON' | 'FULL_DAY' | string;
  parentName: string;
  parentPhone: string;
  status: 'SENT' | 'FAILED' | string;
  errorMessage?: string;
  sentAt: string;
}

export interface DailyAbsenteeismReportOptions {
  schoolName: string;
  principalName?: string;
  date: string;
  items: DailyAbsenteeismReportItem[];
}

const SESSION_LABELS: Record<string, string> = {
  MORNING: 'Sabah (1. Ders)',
  AFTERNOON: 'Öğle (1. Ders)',
  FULL_DAY: 'Tam Gün',
};

export async function generateDailyAbsenteeismReportPdf(options: DailyAbsenteeismReportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts();
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 35, bottom: 45, left: 35, right: 35 },
      bufferPages: true,
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('R', fonts.regular);
    doc.registerFont('B', fonts.bold);

    const ML = doc.page.margins.left;
    const PW = doc.page.width;
    const CW = PW - ML - doc.page.margins.right;
    const BLACK = '#1e293b';
    let curY = doc.page.margins.top;

    const formattedDate = options.date.split('-').reverse().join('.');
    const totalCount = options.items.length;
    const sentCount = options.items.filter(i => i.status === 'SENT').length;
    const failedCount = totalCount - sentCount;

    // Helper: draw header
    const drawHeader = () => {
      doc.font('B').fontSize(11).fillColor('#334155');
      doc.text('T.C. MİLLÎ EĞİTİM BAKANLIĞI', ML, curY, { width: CW, align: 'center' });
      curY += 15;

      const sName = (options.schoolName || 'OKUL MÜDÜRLÜĞÜ').toLocaleUpperCase('tr-TR');
      doc.fontSize(12).fillColor('#0f172a').text(sName, ML, curY, { width: CW, align: 'center' });
      curY += 16;

      doc.fontSize(11).fillColor('#1e40af').text('GÜNLÜK ANLIK DEVAMSIZLIK BİLDİRİM VE VELİ İLETİŞİM RAPORU', ML, curY, { width: CW, align: 'center' });
      curY += 18;

      // Info strip
      doc.rect(ML, curY, CW, 24).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.font('B').fontSize(8.5).fillColor('#334155');
      doc.text(`Tarih: ${formattedDate}`, ML + 8, curY + 7);
      doc.text(`Toplam Bildirim: ${totalCount}`, ML + 130, curY + 7);
      doc.fillColor('#059669').text(`İletilen: ${sentCount}`, ML + 270, curY + 7);
      doc.fillColor(failedCount > 0 ? '#dc2626' : '#64748b').text(`Başarısız: ${failedCount}`, ML + 370, curY + 7);
      doc.fillColor('#64748b').font('R').text(`Rapor Saati: ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`, ML + 440, curY + 7, { width: 80, align: 'right' });
      curY += 30;
    };

    drawHeader();

    // Group items by class
    const groups: Record<string, DailyAbsenteeismReportItem[]> = {};
    for (const item of options.items) {
      const cls = (item.className || 'Belirtilmemiş').trim();
      if (!groups[cls]) groups[cls] = [];
      groups[cls].push(item);
    }

    const sortedClasses = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'tr-TR', { numeric: true }));

    const checkPageBreak = (neededHeight: number) => {
      if (curY + neededHeight > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        curY = doc.page.margins.top;
        drawHeader();
        drawTableHeader();
      }
    };

    // Table Column Widths (Total: 525 pt)
    const colW = {
      seq: 25,
      cls: 45,
      num: 45,
      name: 135,
      session: 85,
      parent: 110,
      time: 40,
      status: 40,
    };

    const drawTableHeader = () => {
      doc.rect(ML, curY, CW, 18).fillAndStroke('#e2e8f0', '#94a3b8');
      doc.font('B').fontSize(7.5).fillColor('#1e293b');

      let x = ML;
      doc.text('S.No', x + 2, curY + 5, { width: colW.seq - 4, align: 'center' });
      x += colW.seq;
      doc.text('Sınıf', x + 2, curY + 5, { width: colW.cls - 4 });
      x += colW.cls;
      doc.text('Okul No', x + 2, curY + 5, { width: colW.num - 4, align: 'center' });
      x += colW.num;
      doc.text('Öğrenci Adı Soyadı', x + 2, curY + 5, { width: colW.name - 4 });
      x += colW.name;
      doc.text('Oturum / Zaman', x + 2, curY + 5, { width: colW.session - 4 });
      x += colW.session;
      doc.text('Veli Adı / Tel', x + 2, curY + 5, { width: colW.parent - 4 });
      x += colW.parent;
      doc.text('Saat', x + 2, curY + 5, { width: colW.time - 4, align: 'center' });
      x += colW.time;
      doc.text('Durum', x + 2, curY + 5, { width: colW.status - 4, align: 'center' });

      curY += 18;
    };

    drawTableHeader();

    let globalIndex = 1;

    for (const clsName of sortedClasses) {
      const classItems = groups[clsName];
      const classSent = classItems.filter(i => i.status === 'SENT').length;
      const classFailed = classItems.length - classSent;

      // Sınıf başlığı için alan kontrolü
      checkPageBreak(35);

      // Sınıf Ayırıcı Başlık Satırı
      doc.rect(ML, curY, CW, 16).fillAndStroke('#f1f5f9', '#cbd5e1');
      doc.font('B').fontSize(8).fillColor('#0f172a');
      doc.text(`📁 ${clsName} SINIFI · (${classItems.length} Öğrenci | ${classSent} İletildi${classFailed > 0 ? `, ${classFailed} Başarısız` : ''})`, ML + 6, curY + 4);
      curY += 16;

      // Öğrenci Satırları
      for (const row of classItems) {
        checkPageBreak(18);

        const isEven = globalIndex % 2 === 0;
        if (isEven) {
          doc.rect(ML, curY, CW, 17).fill('#fafafa');
        }
        doc.rect(ML, curY, CW, 17).stroke('#e2e8f0');

        let x = ML;

        // Sıra No
        doc.font('R').fontSize(7.5).fillColor('#64748b');
        doc.text(String(globalIndex), x + 2, curY + 4, { width: colW.seq - 4, align: 'center' });
        x += colW.seq;

        // Sınıf
        doc.font('B').fontSize(7.5).fillColor('#334155');
        doc.text(row.className || clsName, x + 2, curY + 4, { width: colW.cls - 4 });
        x += colW.cls;

        // Okul No
        doc.font('B').fontSize(7.5).fillColor('#1e40af');
        doc.text(row.schoolNumber || '-', x + 2, curY + 4, { width: colW.num - 4, align: 'center' });
        x += colW.num;

        // Öğrenci Adı Soyadı
        doc.font('B').fontSize(7.5).fillColor('#0f172a');
        doc.text(row.studentName || 'Bilinmiyor', x + 2, curY + 4, { width: colW.name - 4, lineBreak: false });
        x += colW.name;

        // Oturum
        doc.font('R').fontSize(7).fillColor('#334155');
        const sessionLabel = SESSION_LABELS[row.sessionType] || row.sessionType || 'Sabah';
        doc.text(sessionLabel, x + 2, curY + 4, { width: colW.session - 4 });
        x += colW.session;

        // Veli Bilgisi
        doc.font('R').fontSize(7).fillColor('#1e293b');
        const parentSummary = `${row.parentName || 'Veli'} (${row.parentPhone || '-'})`;
        doc.text(parentSummary, x + 2, curY + 4, { width: colW.parent - 4, lineBreak: false });
        x += colW.parent;

        // Gönderim Saati
        doc.font('R').fontSize(7).fillColor('#475569');
        const timeStr = row.sentAt
          ? new Date(row.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
          : '-';
        doc.text(timeStr, x + 2, curY + 4, { width: colW.time - 4, align: 'center' });
        x += colW.time;

        // Durum
        if (row.status === 'SENT') {
          doc.font('B').fontSize(7).fillColor('#059669');
          doc.text('İletildi', x + 2, curY + 4, { width: colW.status - 4, align: 'center' });
        } else {
          doc.font('B').fontSize(7).fillColor('#dc2626');
          doc.text('Hata', x + 2, curY + 4, { width: colW.status - 4, align: 'center' });
        }

        curY += 17;
        globalIndex++;
      }
    }

    // İmza Alanı
    checkPageBreak(65);
    curY += 20;

    const colSignW = 200;
    doc.font('R').fontSize(8.5).fillColor('#334155');
    doc.text(formattedDate, ML + CW - colSignW, curY, { width: colSignW, align: 'center' });
    curY += 12;
    doc.font('B').fontSize(9).fillColor('#0f172a');
    doc.text(options.principalName || '............................', ML + CW - colSignW, curY, { width: colSignW, align: 'center' });
    curY += 12;
    doc.font('R').fontSize(8.5).fillColor('#334155');
    doc.text('Okul Müdürü', ML + CW - colSignW, curY, { width: colSignW, align: 'center' });

    // Sayfa Numaraları
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.font('R').fontSize(7.5).fillColor('#94a3b8');
      doc.text(
        `OkulDesk Bilgi Sistemi · Sayfa ${i + 1} / ${pages.count}`,
        ML,
        doc.page.height - 30,
        { width: CW, align: 'center' }
      );
    }

    doc.end();
  });
}
