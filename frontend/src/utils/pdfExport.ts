import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * HTML DOM elementini yüksek çözünürlüklü bir PDF olarak indirir.
 * @param elementId PDF'e çevrilecek DOM elemanının ID'si
 * @param filename İndirilecek dosyanın adı (örn: 'belge.pdf')
 */
export const downloadElementAsPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return false;
  }

  try {
    // A4 boyutu için scale ayarını yükselterek netliği artırıyoruz
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // A4 kağıt boyutları (mm cinsinden)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Eğer içerik bir sayfadan uzunsa, birden fazla sayfa ekleme mantığı
    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('PDF oluşturulurken hata:', error);
    return false;
  }
};

import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Vektörel PDF oluşturma (Geliştirilmek Üzere Taslak)
 * İleride Matbu Evraklar ve Mektuplar için bu metod kullanılabilir.
 * Not: Türkçe karakterler (ş, ğ, ı, vs.) için projeye bir TTF font (Örn: Roboto.ttf)
 * eklenmeli ve fontkit ile embed edilmelidir.
 */
export const downloadVectorialPDF = async (textLines: string[], filename: string, title?: string) => {
  try {
    const pdfDoc = await PDFDocument.create();
    // A4 Portrait
    const page = pdfDoc.addPage([595.28, 841.89]); 
    
    // Geçici olarak standart font kullanılıyor (Türkçe karakterlerde sorun yaratabilir)
    // Önerilen: const fontBytes = await fetch('/fonts/Roboto-Regular.ttf').then(res => res.arrayBuffer());
    // pdfDoc.registerFontkit(fontkit);
    // const customFont = await pdfDoc.embedFont(fontBytes);
    
    let y = 800;
    
    if (title) {
      page.drawText(title, { x: 50, y, size: 16 });
      y -= 30;
    }

    for (const line of textLines) {
      if (y < 50) {
        // Çok basit sayfa yönetimi (Page Break)
      }
      page.drawText(line, { x: 50, y, size: 12 });
      y -= 20;
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Vektörel PDF oluşturulurken hata:', error);
    return false;
  }
};

