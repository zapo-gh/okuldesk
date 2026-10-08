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

const TYPES = [
  { val: 'KULTUREL', label: 'Kültürel (Tiyatro, Sinema vb.)' },
  { val: 'SPOR', label: 'Sportif (Turnuva, Maç vb.)' },
  { val: 'BILIMSEL', label: 'Bilimsel (TÜBİTAK, Proje Fuarı vb.)' },
  { val: 'SOSYAL', label: 'Sosyal Sorumluluk (Kermes, Yardım vb.)' },
  { val: 'DIGER', label: 'Diğer Etkinlikler' },
];

export async function generateSingleActivityPdf(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts();
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 70, bottom: 50, left: 70, right: 70 },
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
    
    const { activity, schoolName } = data;
    const typeLabel = TYPES.find(t => t.val === activity.type)?.label || activity.type;
    const mDate = activity.plannedDate ? new Date(activity.plannedDate).toLocaleDateString('tr-TR') : '................';

    let curY = doc.page.margins.top;

    doc.font('B').fontSize(14).text('T.C.', ML, curY, { width: CW, align: 'center' });
    curY += 20;
    doc.text('MİLLİ EĞİTİM BAKANLIĞI', ML, curY, { width: CW, align: 'center' });
    curY += 20;
    doc.text((schoolName || '... LİSESİ MÜDÜRLÜĞÜNE').toLocaleUpperCase('tr-TR'), ML, curY, { width: CW, align: 'center' });
    curY += 60;

    doc.font('R').fontSize(12);
    const p1 = `     Okulumuzda yürütülen sosyal ve kültürel faaliyetler kapsamında, ${mDate} tarihinde "${activity.name}" adıyla bir etkinlik düzenlenmesi planlanmaktadır.`;
    doc.text(p1, ML, curY, { width: CW, align: 'justify', lineGap: 5 });
    curY = doc.y + 15;

    const p2 = `     "${typeLabel}" türünde gerçekleştirilecek olan bu etkinliğin temel amacı; ${activity.description || 'öğrencilerimizin sosyokültürel gelişimlerine katkı sağlamaktır.'}`;
    doc.text(p2, ML, curY, { width: CW, align: 'justify', lineGap: 5 });
    curY = doc.y + 15;

    const p3 = `     Etkinliğin okulumuz içerisinde / dışında gerçekleştirilmesi ve gerekli yasal izinlerin alınması hususunda;`;
    doc.text(p3, ML, curY, { width: CW, align: 'justify', lineGap: 5 });
    curY = doc.y + 15;

    const p4 = `     Makamlarınızca da uygun görülmesi halinde Olur'larınıza arz ederim.`;
    doc.text(p4, ML, curY, { width: CW, align: 'justify', lineGap: 5 });
    curY = doc.y + 80;

    const sigW = CW / 2;
    // Danışman
    doc.font('B').text('Sorumlu / Danışman Öğretmen', ML, curY, { width: sigW, align: 'center' });
    doc.font('B').text('O L U R', ML + sigW, curY, { width: sigW, align: 'center' });
    curY += 20;

    doc.font('R').text(activity.assignedStaffName || '....................', ML, curY, { width: sigW, align: 'center' });
    doc.text('.../.../20...', ML + sigW, curY, { width: sigW, align: 'center' });
    curY += 20;
    
    doc.font('B').text(data.principalName || 'Okul Müdürü', ML + sigW, curY, { width: sigW, align: 'center' });
    curY += 40;

    doc.font('R').text('İmza', ML, curY, { width: sigW, align: 'center' });
    doc.text('İmza', ML + sigW, curY, { width: sigW, align: 'center' });

    doc.end();
  });
}


export async function generateAllActivitiesPdf(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts();
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
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
    
    const { activities, academicYear, principalName } = data;

    let curY = doc.page.margins.top;

    const checkPageBreak = (height: number) => {
      if (curY + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        curY = doc.page.margins.top;
      }
    };

    doc.font('B').fontSize(12).text(`${academicYear || ''} EĞİTİM ÖĞRETİM YILI`, ML, curY, { width: CW, align: 'center' });
    curY += 15;
    doc.fontSize(14).text('EĞİTİM KURUMU SOSYAL ETKİNLİKLER YILLIK ÇALIŞMA PLANI (EK-7/a)', ML, curY, { width: CW, align: 'center' });
    curY += 30;

    const w1 = CW * 0.05; // SIRA NO
    const w2 = CW * 0.15; // TARIH
    const w3 = CW * 0.25; // ADI
    const w4 = CW * 0.15; // TURU
    const w5 = CW * 0.25; // AMACI
    const w6 = CW * 0.15; // SORUMLU

    const drawRow = (rData: string[], isHeader: boolean, rowH: number) => {
      checkPageBreak(rowH);
      
      const widths = [w1, w2, w3, w4, w5, w6];
      let x = ML;

      doc.rect(ML, curY, CW, rowH).stroke(BLACK);
      if (isHeader) {
        doc.rect(ML, curY, CW, rowH).fill('#f0f0f0');
      }

      doc.font(isHeader ? 'B' : 'R').fontSize(9).fillColor(BLACK);

      for(let i = 0; i < 6; i++) {
        const textH = doc.heightOfString(rData[i], { width: widths[i] - 10 });
        const yOffset = (rowH - textH) / 2;
        doc.text(rData[i], x + 5, curY + yOffset, { width: widths[i] - 10, align: (i===2 || i===4) && !isHeader ? 'left' : 'center' });
        if(i < 5) {
          doc.rect(x + widths[i], curY, 0, rowH).stroke(BLACK);
        }
        x += widths[i];
      }
      curY += rowH;
    };

    drawRow(['SIRA NO', 'PLANLANAN TARİH', 'ETKİNLİK ADI', 'ETKİNLİK TÜRÜ', 'AMACI / AÇIKLAMASI', 'SORUMLU ÖĞRETMEN'], true, 25);

    if (!activities || activities.length === 0) {
      drawRow(['', '', 'Kayıtlı etkinlik bulunmamaktadır.', '', '', ''], false, 30);
    } else {
      activities.forEach((a: any, idx: number) => {
        const typeLabel = TYPES.find(t => t.val === a.type)?.label || a.type;
        const dateStr = a.plannedDate ? new Date(a.plannedDate).toLocaleDateString('tr-TR') : 'Belirtilmedi';
        const cols = [
          (idx + 1).toString(),
          dateStr,
          a.name || '-',
          typeLabel || '-',
          a.description || '-',
          a.assignedStaffName || '-'
        ];

        // Calculate dynamic height based on column contents
        let maxH = 25;
        doc.font('R').fontSize(9);
        const widths = [w1, w2, w3, w4, w5, w6];
        for(let i=0; i<6; i++) {
          const h = doc.heightOfString(cols[i], { width: widths[i] - 10 });
          if(h + 10 > maxH) maxH = h + 10;
        }

        drawRow(cols, false, maxH);
      });
    }

    checkPageBreak(80);
    curY += 30;

    const sigW = CW / 2;
    doc.font('R').text('Sosyal Etkinlikler Kurulu Başkanı', ML, curY, { width: sigW, align: 'center' });
    
    doc.text('UYGUNDUR', ML + sigW, curY, { width: sigW, align: 'center' });
    doc.text('.../.../20...', ML + sigW, curY + 15, { width: sigW, align: 'center' });
    doc.font('B').text(principalName || 'Okul Müdürü', ML + sigW, curY + 30, { width: sigW, align: 'center' });

    doc.end();
  });
}
