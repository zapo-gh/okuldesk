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

export async function generateParentAssociationMeetingPdf(payload: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { meeting, schoolName, principalName } = payload;
      const { regular, bold } = resolveFonts();
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- HEADER ---
      doc.font(bold).fontSize(12).text('T.C.', { align: 'center' });
      doc.text('MİLLİ EĞİTİM BAKANLIĞI', { align: 'center' });
      doc.text(schoolName || '................ LİSESİ MÜDÜRLÜĞÜ', { align: 'center' });
      doc.text('OKUL AİLE BİRLİĞİ BAŞKANLIĞI', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(14).text('YÖNETİM KURULU KARAR TUTANAĞI', { align: 'center', underline: true });
      doc.moveDown(2);

      // --- MEETING INFO ---
      const startX = 50;
      let currentY = doc.y;

      doc.font(bold).fontSize(11).text('Toplantı Türü', startX, currentY);
      doc.font(regular).text(`: ${meeting.type}`, startX + 120, currentY);
      currentY += 20;

      doc.font(bold).text('Karar No', startX, currentY);
      doc.font(regular).text(`: ${meeting.meetingNumber}`, startX + 120, currentY);
      currentY += 20;

      const dateStr = meeting.date ? new Date(meeting.date).toLocaleDateString('tr-TR') : '';
      doc.font(bold).text('Tarih', startX, currentY);
      doc.font(regular).text(`: ${dateStr}`, startX + 120, currentY);
      
      doc.moveDown(2);

      // --- AGENDA ITEMS ---
      doc.font(bold).fontSize(12).text('GÜNDEM MADDELERİ:', startX, doc.y);
      doc.moveDown(0.5);
      
      const agendaItems = meeting.agendaItems || [];
      
      agendaItems.forEach((item: any, idx: number) => {
        doc.font(regular).fontSize(11).text(`${idx + 1}. ${item.topic}`, startX + 20, doc.y);
      });
      doc.moveDown(1.5);

      // --- DECISIONS ---
      doc.font(bold).fontSize(12).text('GÖRÜŞÜLEN KONULAR VE ALINAN KARARLAR:', startX, doc.y);
      doc.moveDown(1);
      
      agendaItems.forEach((item: any, idx: number) => {
        doc.font(bold).fontSize(11).text(`Karar Madde ${idx + 1}:`, startX, doc.y);
        doc.moveDown(0.2);
        doc.font(regular).text(item.decision || 'Bu madde hakkında herhangi bir karar veya görüş belirtilmemiştir.', startX + 20, doc.y, { align: 'justify' });
        doc.moveDown(0.8);
      });

      doc.moveDown(1);
      doc.font(regular).text('Yukarıda belirtilen gündem maddeleri görüşülerek belirtilen kararlar oy birliği / oy çokluğu ile alınmıştır.', startX, doc.y, { align: 'center' });
      doc.moveDown(3);

      // --- SIGNATURES ---
      const sigY = doc.y;
      
      doc.font(bold).fontSize(10);
      
      const colWidth = 90;
      const offsets = [
        { label: 'OAB Başkanı', x: 50 },
        { label: 'Bşk. Yrd.', x: 150 },
        { label: 'Muhasip Üye', x: 250 },
        { label: 'Yazman', x: 350 },
        { label: 'Üye', x: 450 }
      ];

      offsets.forEach(off => {
        doc.text(off.label, off.x, sigY, { width: colWidth, align: 'center' });
      });

      const sigLineY = sigY + 50;
      offsets.forEach(off => {
        doc.font(regular).text('....................', off.x, sigLineY, { width: colWidth, align: 'center' });
      });

      doc.moveDown(4);
      
      const finalY = doc.y + 40;
      doc.font(regular).text('UYGUNDUR', 50, finalY, { align: 'center' });
      doc.moveDown(0.5);
      doc.font(bold).text('Okul Müdürü', { align: 'center' });
      doc.moveDown(3);
      doc.font(regular).text(principalName || '....................', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
