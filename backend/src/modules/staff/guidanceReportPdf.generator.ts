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

export async function generateGuidanceReportPdf(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts();
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      bufferPages: true,
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('R', fonts.regular);
    doc.registerFont('B', fonts.bold);

    const ML = doc.page.margins.left;
    let curY = doc.page.margins.top;
    const PW = doc.page.width;
    const CW = PW - ML - doc.page.margins.right;
    const BLACK = '#000000';

    // Header
    doc.font('B').fontSize(12).fillColor(BLACK);
    doc.text('T.C.', ML, curY, { width: CW, align: 'center' });
    curY = doc.y;
    doc.text('MİLLÎ EĞİTİM BAKANLIĞI', ML, curY, { width: CW, align: 'center' });
    curY = doc.y;
    doc.text((data.schoolName || '................ LİSESİ MÜDÜRLÜĞÜ').toLocaleUpperCase('tr-TR'), ML, curY, { width: CW, align: 'center' });
    curY = doc.y;
    doc.text(`${data.academicYear || '2025-2026'} EĞİTİM ÖĞRETİM YILI`, ML, curY, { width: CW, align: 'center' });
    
    curY += 30;

    // Title
    doc.fontSize(14).underline(ML, curY, CW, 1, { color: BLACK });
    doc.text('SINIF REHBERLİK AYLIK FAALİYET RAPORU', ML, curY, { width: CW, align: 'center', underline: true });
    doc.underline(ML, 0, 0, 0); // remove underline for next text
    
    curY += 40;

    // Info Table
    const rowH = 25;
    const col1W = CW * 0.35;
    const col2W = CW * 0.65;

    const drawBorder = (x: number, y: number, w: number, h: number) => {
      doc.rect(x, y, w, h).stroke(BLACK);
    };
    
    // Row 1
    drawBorder(ML, curY, col1W, rowH);
    doc.rect(ML, curY, col1W, rowH).fill('#f3f4f6');
    doc.fillColor(BLACK).font('B').fontSize(11);
    doc.text('Sınıfı', ML + 10, curY + 6);
    drawBorder(ML + col1W, curY, col2W, rowH);
    doc.font('R').text(data.className || '-', ML + col1W + 10, curY + 6);
    curY += rowH;

    // Row 2
    drawBorder(ML, curY, col1W, rowH);
    doc.rect(ML, curY, col1W, rowH).fill('#f3f4f6');
    doc.fillColor(BLACK).font('B');
    doc.text('Sınıf Rehber Öğretmeni', ML + 10, curY + 6);
    drawBorder(ML + col1W, curY, col2W, rowH);
    doc.font('R').text(data.staffName || '-', ML + col1W + 10, curY + 6);
    curY += rowH;

    // Row 3
    drawBorder(ML, curY, col1W, rowH);
    doc.rect(ML, curY, col1W, rowH).fill('#f3f4f6');
    doc.fillColor(BLACK).font('B');
    doc.text('Ait Olduğu Ay', ML + 10, curY + 6);
    drawBorder(ML + col1W, curY, col2W, rowH);
    doc.font('R').text(data.month || '-', ML + col1W + 10, curY + 6);
    curY += rowH;

    curY += 30;

    // Activities Section
    doc.font('B').fontSize(11).text('YAPILAN ÇALIŞMALAR VE FAALİYET ÖZETİ', ML, curY, { underline: true });
    curY += 20;

    const actText = data.activities || 'Bu ay içerisinde planlanan rehberlik faaliyetleri gerçekleştirilmiş olup, öğrencilerin akademik ve sosyal gelişimleri takip edilmiştir.';
    const boxH = Math.max(250, doc.heightOfString(actText, { width: CW - 20, align: 'justify' }) + 40);
    
    drawBorder(ML, curY, CW, boxH);
    doc.font('R').fontSize(11).text(actText, ML + 10, curY + 10, {
      width: CW - 20,
      align: 'justify',
      lineBreak: true
    });

    curY += boxH + 40;

    // Signatures
    // Sınıf Rehber Öğretmeni / Okul Müdürü
    const sigW = CW / 2;
    doc.font('B').text('Sınıf Rehber Öğretmeni', ML, curY, { width: sigW, align: 'center' });
    doc.text('Okul Müdürü', ML + sigW, curY, { width: sigW, align: 'center' });
    
    curY += 20;
    doc.font('R').text(data.staffName || '-', ML, curY, { width: sigW, align: 'center' });
    doc.text('Tasdik Olunur', ML + sigW, curY, { width: sigW, align: 'center' });

    curY += 40;
    doc.text('....................................', ML, curY, { width: sigW, align: 'center' });
    doc.font('B').text(data.principalName || 'Okul Müdürü', ML + sigW, curY, { width: sigW, align: 'center' });

    doc.end();
  });
}
