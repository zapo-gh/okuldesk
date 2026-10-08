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

export async function generateBoardMeetingPdf(data: any): Promise<Buffer> {
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
    doc.font('B').fontSize(14).fillColor(BLACK);
    doc.text((data.schoolName || 'Okul Adı').toLocaleUpperCase('tr-TR'), ML, curY, { width: CW, align: 'center' });
    curY += 25;
    
    doc.fontSize(12).underline(ML, curY, CW, 1, { color: BLACK });
    doc.text(data.meeting.title || data.meeting.type || 'Toplantı Tutanağı', ML, curY, { width: CW, align: 'center', underline: true });
    doc.underline(ML, 0, 0, 0); // remove underline for next text
    curY += 40;

    // --- Info Table ---
    const rowH = 25;
    const col1W = CW * 0.25;
    const col2W = CW * 0.75;
    const mDate = data.meeting.date ? new Date(data.meeting.date).toLocaleDateString('tr-TR') : '';

    const drawBorder = (x: number, y: number, w: number, h: number) => {
      doc.rect(x, y, w, h).stroke(BLACK);
    };

    // Date
    drawBorder(ML, curY, col1W, rowH);
    doc.rect(ML, curY, col1W, rowH).fill('#f3f4f6');
    doc.fillColor(BLACK).font('B').fontSize(11);
    doc.text('Toplantı Tarihi', ML + 5, curY + 6);
    drawBorder(ML + col1W, curY, col2W, rowH);
    doc.font('R').text(mDate, ML + col1W + 5, curY + 6);
    curY += rowH;

    // Time
    drawBorder(ML, curY, col1W, rowH);
    doc.rect(ML, curY, col1W, rowH).fill('#f3f4f6');
    doc.fillColor(BLACK).font('B');
    doc.text('Toplantı Saati', ML + 5, curY + 6);
    drawBorder(ML + col1W, curY, col2W, rowH);
    doc.font('R').text(data.meeting.time || '', ML + col1W + 5, curY + 6);
    curY += rowH;

    // Location
    drawBorder(ML, curY, col1W, rowH);
    doc.rect(ML, curY, col1W, rowH).fill('#f3f4f6');
    doc.fillColor(BLACK).font('B');
    doc.text('Toplantı Yeri', ML + 5, curY + 6);
    drawBorder(ML + col1W, curY, col2W, rowH);
    doc.font('R').text(data.meeting.location || 'Öğretmenler Odası', ML + col1W + 5, curY + 6);
    curY += rowH;

    curY += 30;

    // --- Agenda Items ---
    doc.font('B').fontSize(11).text('GÜNDEM MADDELERİ VE ALINAN KARARLAR', ML, curY, { underline: true });
    curY += 20;

    const agendaItems = data.meeting.agendaItems || [];
    if (agendaItems.length === 0) {
      doc.font('R').fontSize(10).fillColor('#666666').text('Gündem maddesi eklenmemiştir.', ML, curY);
      curY += 20;
    } else {
      doc.fillColor(BLACK);
      agendaItems.forEach((item: any, idx: number) => {
        const topicText = `Gündem Madde ${idx + 1}: ${item.topic}`;
        const decisionText = item.decision || '';
        
        doc.font('B').fontSize(10);
        const topicH = doc.heightOfString(topicText, { width: CW });
        doc.font('R').fontSize(10);
        const decisionH = doc.heightOfString(decisionText, { width: CW - 20 }); // padding left 20

        const totalH = topicH + 5 + decisionH + 15;
        checkPageBreak(totalH);

        doc.font('B').text(topicText, ML, curY, { width: CW });
        curY += topicH + 5;

        // Draw left border for decision
        doc.rect(ML + 10, curY, 0, decisionH + 2).stroke('#cccccc');
        doc.font('R').text(decisionText, ML + 20, curY, { width: CW - 20, align: 'justify' });
        
        curY += decisionH + 15;
      });
    }

    // Conclusion text
    checkPageBreak(60);
    curY += 10;
    doc.font('R').fontSize(10).text(
      'Yukarıda belirtilen gündem maddeleri görüşülmüş olup, toplantı sonucunda ilgili kararlar imza altına alınarak kabul edilmiştir.',
      ML, curY, { width: CW, align: 'justify' }
    );
    curY += 40;

    // --- Signatures (Board/Zümre Başkanı - Okul Müdürü) ---
    checkPageBreak(120);
    const sigW = CW / 2;
    // Row 1
    doc.font('B').text('....................................', ML, curY, { width: sigW, align: 'center' });
    doc.font('R').text('Uygundur.', ML + sigW, curY, { width: sigW, align: 'center' });
    curY += 15;
    
    // Row 2
    doc.font('R').text('Kurul / Zümre Başkanı', ML, curY, { width: sigW, align: 'center' });
    doc.text(mDate || '.../.../20...', ML + sigW, curY, { width: sigW, align: 'center' });
    curY += 40;
    
    // Row 3
    doc.font('B').text(data.principalName || '....................................', ML + sigW, curY, { width: sigW, align: 'center' });
    curY += 15;
    
    // Row 4
    doc.font('R').text('Okul Müdürü', ML + sigW, curY, { width: sigW, align: 'center' });


    // ==========================================
    // IMPRINT / ATTENDEES TABLE (NEW PAGE)
    // ==========================================
    const attendees = data.meeting.attendees || [];
    if (attendees.length > 0) {
      doc.addPage();
      curY = doc.page.margins.top;

      doc.font('B').fontSize(14).text('TOPLANTI İMZA SİRKÜSÜ', ML, curY, { width: CW, align: 'center', underline: true });
      curY += 25;
      doc.fontSize(11).text(data.meeting.title || data.meeting.type || 'Toplantı', ML, curY, { width: CW, align: 'center' });
      curY += 15;
      doc.font('R').fontSize(10).text(mDate, ML, curY, { width: CW, align: 'center' });
      curY += 30;

      // Table Header
      const thH = 25;
      const w1 = CW * 0.10; // S.N
      const w2 = CW * 0.40; // Adı Soyadı
      const w3 = CW * 0.30; // Görevi / Branşı
      const w4 = CW * 0.20; // İmza

      const drawAttendeeRow = (sno: string, ad: string, gorev: string, isHeader: boolean) => {
        const rowH = isHeader ? 25 : 35; // taller rows for signature space
        checkPageBreak(rowH);

        doc.rect(ML, curY, CW, rowH).stroke(BLACK);
        if (isHeader) {
          doc.rect(ML, curY, CW, rowH).fill('#f3f4f6');
        }

        const py = isHeader ? 7 : 12;
        doc.font(isHeader ? 'B' : 'R').fontSize(9).fillColor(BLACK);
        
        // SN
        doc.text(sno, ML, curY + py, { width: w1, align: 'center' });
        doc.rect(ML + w1, curY, 0, rowH).stroke(); // V-line
        
        // Adı
        if (isHeader) {
          doc.text(ad, ML + w1, curY + py, { width: w2, align: 'center' });
        } else {
          doc.font('B').text(ad, ML + w1 + 5, curY + py, { width: w2 - 10, align: 'left' });
          doc.font('R'); // reset
        }
        doc.rect(ML + w1 + w2, curY, 0, rowH).stroke(); // V-line
        
        // Görev
        if (isHeader) {
          doc.text(gorev, ML + w1 + w2, curY + py, { width: w3, align: 'center' });
        } else {
          doc.text(gorev, ML + w1 + w2 + 5, curY + py, { width: w3 - 10, align: 'left' });
        }
        doc.rect(ML + w1 + w2 + w3, curY, 0, rowH).stroke(); // V-line

        // İmza
        if (isHeader) {
          doc.text('İMZA', ML + w1 + w2 + w3, curY + py, { width: w4, align: 'center' });
        }

        curY += rowH;
      };

      drawAttendeeRow('S.N', 'ADI SOYADI', 'GÖREVİ / BRANŞI', true);

      const staffList = data.staffList || [];
      attendees.forEach((attId: string, idx: number) => {
        const staff = staffList.find((s: any) => s.id === attId);
        if (staff) {
          const titleArr = [];
          if (staff.title) titleArr.push(staff.title);
          if (staff.brans) titleArr.push(staff.brans);
          const gorev = titleArr.join(' / ') || 'Öğretmen';
          drawAttendeeRow((idx + 1).toString(), staff.name, gorev, false);
        }
      });
    }

    doc.end();
  });
}
