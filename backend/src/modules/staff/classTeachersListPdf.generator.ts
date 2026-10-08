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

export async function generateClassTeachersListPdf(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts();
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 40, right: 40 },
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
    const BLACK = '#000000';
    let curY = doc.page.margins.top;

    const checkPageBreak = (height: number) => {
      if (curY + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        curY = doc.page.margins.top;
      }
    };

    // --- Header ---
    doc.font('B').fontSize(12).fillColor(BLACK);
    doc.text(`${data.academicYear || '2024-2025'} EĞİTİM ÖĞRETİM YILI`, ML, curY, { width: CW, align: 'center' });
    curY += 20;
    doc.fontSize(14).text((data.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ').toLocaleUpperCase('tr-TR'), ML, curY, { width: CW, align: 'center' });
    curY += 20;
    doc.text('SINIF/ŞUBE REHBER ÖĞRETMENLERİ DAĞILIM ÇİZELGESİ', ML, curY, { width: CW, align: 'center' });
    curY += 30;

    // --- Table Headers ---
    const rowH = 25;
    const wSira = CW * 0.10;
    const wSinif = CW * 0.25;
    const wOgretmen = CW * 0.40;
    const wBrans = CW * 0.25;

    const drawRow = (sira: string, sinif: string, ogretmen: string, brans: string, isHeader: boolean) => {
      checkPageBreak(rowH);

      doc.rect(ML, curY, CW, rowH).stroke(BLACK);
      if (isHeader) {
        doc.rect(ML, curY, CW, rowH).fill('#f3f4f6');
      }

      const py = 7;
      doc.font(isHeader ? 'B' : 'R').fontSize(10).fillColor(BLACK);
      
      doc.text(sira, ML, curY + py, { width: wSira, align: 'center' });
      doc.rect(ML + wSira, curY, 0, rowH).stroke(); // vertical line
      
      doc.text(sinif, ML + wSira, curY + py, { width: wSinif, align: 'center' });
      doc.rect(ML + wSira + wSinif, curY, 0, rowH).stroke(); // vertical line

      doc.text(ogretmen, ML + wSira + wSinif + 5, curY + py, { width: wOgretmen - 10, align: 'left' });
      doc.rect(ML + wSira + wSinif + wOgretmen, curY, 0, rowH).stroke(); // vertical line

      doc.text(brans, ML + wSira + wSinif + wOgretmen + 5, curY + py, { width: wBrans - 10, align: 'left' });

      curY += rowH;
    };

    drawRow('SIRA', 'SINIF / ŞUBE ADI', 'SINIF REHBER ÖĞRETMENİ', 'BRANŞI', true);

    const staffList = data.staff || [];
    if (staffList.length === 0) {
      checkPageBreak(rowH);
      doc.rect(ML, curY, CW, rowH).stroke(BLACK);
      doc.font('R').fontSize(10).fillColor(BLACK);
      doc.text('Kayıtlı sınıf rehber öğretmeni bulunmamaktadır.', ML, curY + 7, { width: CW, align: 'center' });
      curY += rowH;
    } else {
      staffList.forEach((s: any, idx: number) => {
        drawRow((idx + 1).toString(), s.className || '-', s.name || '-', s.brans || '-', false);
      });
    }

    // --- Signatures ---
    checkPageBreak(120);
    curY += 40;
    const sigW = 150;
    const sigX = PW - doc.page.margins.right - sigW;

    doc.font('R').fontSize(11).text('UYGUNDUR', sigX, curY, { width: sigW, align: 'center' });
    curY += 20;
    const d = new Date();
    const dateStr = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    doc.text(dateStr, sigX, curY, { width: sigW, align: 'center' });
    curY += 40;
    doc.font('B').text(data.principalName || 'Okul Müdürü', sigX, curY, { width: sigW, align: 'center' });

    doc.end();
  });
}
