import fs from 'fs';
import * as pdfParseModule from 'pdf-parse';
import { XMLParser } from 'fast-xml-parser';

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

const normalizeTurkish = (text: string) => {
  if (!text) return '';
  return text
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g');
};

export class InvoiceParseService {
  /**
   * PDF veya XML dosyasını okuyup faturadaki verileri ayıklar
   * @param filePath Dosya yolu
   * @param originalName Dosyanın asıl adı (uzantı kontrolü için)
   */
  async parseInvoice(filePath: string, originalName: string) {
    if (originalName.toLowerCase().endsWith('.xml')) {
      return this.parseXml(filePath);
    }
    return this.parsePdf(filePath);
  }

  private async parseXml(filePath: string) {
    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
    const jsonObj = parser.parse(xmlData);

    const invoice = jsonObj.Invoice;
    if (!invoice) throw new Error('Geçerli bir e-Fatura/e-Arşiv XML dosyası değil.');

    const result = {
      companyName: '',
      invoiceNumber: invoice.ID || '',
      amount: '',
      invoiceDate: invoice.IssueDate || '',
      dueDate: '',
      type: 'Diğer',
      notes: ''
    };

    // Tutar (PayableAmount)
    if (invoice.LegalMonetaryTotal && invoice.LegalMonetaryTotal.PayableAmount) {
      const amt = invoice.LegalMonetaryTotal.PayableAmount['#text'] || invoice.LegalMonetaryTotal.PayableAmount;
      result.amount = amt.toString();
    }

    // Son Ödeme Tarihi (PaymentMeans -> PaymentDueDate)
    if (invoice.PaymentMeans && invoice.PaymentMeans.PaymentDueDate) {
      result.dueDate = invoice.PaymentMeans.PaymentDueDate;
    }

    // Kurum Adı (AccountingSupplierParty -> Party -> PartyName)
    if (invoice.AccountingSupplierParty && invoice.AccountingSupplierParty.Party) {
      const party = invoice.AccountingSupplierParty.Party;
      if (party.PartyName && party.PartyName.Name) {
        result.companyName = party.PartyName.Name;
      } else if (party.PartyTaxScheme && party.PartyTaxScheme.RegistrationName) {
        result.companyName = party.PartyTaxScheme.RegistrationName;
      }
    }

    // Gereksiz Base64 kodlarını temizle (XSLT ve İmza gibi) regex'in kafasını karıştırmaması için
    const cleanXml = xmlData
      .replace(/<cbc:EmbeddedDocumentBinaryObject[\s\S]*?<\/cbc:EmbeddedDocumentBinaryObject>/gi, '')
      .replace(/<ds:SignatureValue[\s\S]*?<\/ds:SignatureValue>/gi, '')
      .replace(/<ds:X509Certificate[\s\S]*?<\/ds:X509Certificate>/gi, '');

    const searchXml = normalizeTurkish(cleanXml);

    // Tür Tahmini (Kurum ismine ve içeriğe göre)
    const lowerName = result.companyName.toLowerCase();
    const allText = searchXml.toLowerCase(); // Sadece temizlenmiş metni kullan
    if (lowerName.includes('enerjisa') || lowerName.includes('elektrik') || lowerName.includes('tedaş') || lowerName.includes('ck boğaziçi')) {
      result.type = 'Elektrik';
    } else if (lowerName.includes('aski') || lowerName.includes('iski') || lowerName.includes('su ve kanalizasyon')) {
      result.type = 'Su';
    } else if (lowerName.includes('doğalgaz') || lowerName.includes('baskentgaz') || lowerName.includes('igdas')) {
      result.type = 'Doğalgaz';
    } else if (lowerName.includes('telekom') || lowerName.includes('turkcell') || lowerName.includes('vodafone') || lowerName.includes('ttnet') || lowerName.includes('turknet') || lowerName.includes('superonline')) {
      if (allText.includes('adsl') || allText.includes('vdsl') || allText.includes('fiber') || allText.includes('dsl')) {
        result.type = 'İnternet';
      } else if (allText.includes('gsm') || allText.includes('cep telefonu') || allText.includes('mobil iletisim')) {
        result.type = 'Telefon';
      } else if (allText.includes('internet')) {
        result.type = 'İnternet';
      } else {
        result.type = 'Telefon'; // Fallback
      }
    }

    if (result.type === 'Telefon' || result.type === 'İnternet') {
      // GSM veya Sabit Hat tespiti: 5xxxxxxxxx veya 05xxxxxxxxx, 2xxxxxxxxx, 3xxxxxxxxx, 850xxxxxxx vb.
      const phoneMatch = searchXml.match(/(?:Telefon|Gsm|Mobil|Hat|Hizmet)[\s\S]{0,20}?(?:No|Numarasi|Numara)[\s\S]{0,10}?>?\s*[:\-]*\s*(\+?90\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|0?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|0?\s*[2348]\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/i)
        || searchXml.match(/\b(0?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})\b/); // genel olarak bir gsm no geçiyorsa
      if (phoneMatch && phoneMatch[1]) {
        result.notes = `${result.type === 'Telefon' ? 'Telefon/GSM No' : 'Hizmet No'}: ${phoneMatch[1].trim().replace(/\s+/g, '')}`;
      } else {
        // Fallback to hizmet no/hesap no
        const hizmetMatch = searchXml.match(/(?:Hizmet|Hesap|Musteri)[\s\S]{0,15}?\b(?:No|Numara|Numarasi|Kodu)\b[\s\S]{0,10}?>?\s*[:\-]*\s*([A-Z0-9]{4,20})/i);
        if (hizmetMatch && hizmetMatch[1]) {
          result.notes = `Hizmet/Hesap No: ${hizmetMatch[1].trim()}`;
        }
      }
    } else if (result.type === 'Elektrik' || result.type === 'Su' || result.type === 'Doğalgaz') {
      // Abone / Tesisat Numarası yakalama
      const aboneMatch = searchXml.match(/(?:Abone|Tesisat|Hizmet|Sozlesme|Musteri|Hesap|Tuketici)[\s\S]{0,15}?\b(?:No|Numara|Numarasi|Kodu)\b[\s\S]{0,10}?>?\s*[:\-]*\s*([A-Z0-9]{4,20})/i) 
        || searchXml.match(/schemeID="(?:TESISAT_NO|ABONE_NO|SOZLESME_NO|MUSTERI_NO)"[^>]*>\s*([A-Z0-9]{4,20})/i)
        || searchXml.match(/#(?:TESISAT|ABONE|SOZLESME|MUSTERI|VKONT)[\s\S]{0,5}?[:\-]\s*([A-Z0-9]{4,20})/i);

      if (aboneMatch && aboneMatch[1]) {
        const prefix = result.type === 'Elektrik' ? 'Abone/Tesisat No' : 'Abone/Sözleşme No';
        result.notes = `${prefix}: ${aboneMatch[1].trim()}`;
      }
    } else {
      // Diğer durumlar için
      const aboneMatch = searchXml.match(/(?:Abone|Tesisat|Hizmet|Sozlesme|Musteri|Hesap|Tuketici)[\s\S]{0,15}?\b(?:No|Numara|Numarasi|Kodu)\b[\s\S]{0,10}?>?\s*[:\-]*\s*([A-Z0-9]{4,20})/i) 
        || searchXml.match(/schemeID="(?:TESISAT_NO|ABONE_NO|SOZLESME_NO|MUSTERI_NO)"[^>]*>\s*([A-Z0-9]{4,20})/i)
        || searchXml.match(/#(?:TESISAT|ABONE|SOZLESME|MUSTERI|VKONT)[\s\S]{0,5}?[:\-]\s*([A-Z0-9]{4,20})/i);

      if (aboneMatch && aboneMatch[1]) {
        result.notes = `Hesap/Abone No: ${aboneMatch[1].trim()}`;
      }
    }

    return result;
  }

  private async parsePdf(filePath: string) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    const result = {
      companyName: '',
      invoiceNumber: '',
      amount: '',
      invoiceDate: '',
      dueDate: '',
      type: 'Diğer',
      notes: ''
    };

    // 1. Kurum Adı Tahmini (Elektrik/Su/Doğalgaz anahtar kelimeleri)
    const searchText = normalizeTurkish(text);
    const lowerText = searchText.toLowerCase();
    if (lowerText.includes('enerjisa') || lowerText.includes('elektrik') || lowerText.includes('tedaş') || lowerText.includes('ck boğaziçi')) {
      result.type = 'Elektrik';
      if (lowerText.includes('enerjisa')) result.companyName = 'Enerjisa';
      else if (lowerText.includes('ck boğaziçi')) result.companyName = 'CK Boğaziçi';
      else result.companyName = 'Elektrik Dağıtım A.Ş.';
    } else if (lowerText.includes('aski') || lowerText.includes('iski') || lowerText.includes('su ve kanalizasyon')) {
      result.type = 'Su';
      result.companyName = 'Su ve Kanalizasyon İdaresi';
    } else if (lowerText.includes('doğalgaz') || lowerText.includes('baskentgaz') || lowerText.includes('igdas')) {
      result.type = 'Doğalgaz';
      result.companyName = 'Doğalgaz Dağıtım A.Ş.';
    } else if (lowerText.includes('telekom') || lowerText.includes('turkcell') || lowerText.includes('vodafone') || lowerText.includes('ttnet') || lowerText.includes('turknet') || lowerText.includes('superonline')) {
      if (lowerText.includes('adsl') || lowerText.includes('vdsl') || lowerText.includes('fiber') || lowerText.includes('dsl')) {
        result.type = 'İnternet';
      } else if (lowerText.includes('gsm') || lowerText.includes('cep telefonu') || lowerText.includes('mobil iletisim')) {
        result.type = 'Telefon';
      } else if (lowerText.includes('internet')) {
        result.type = 'İnternet';
      } else {
        result.type = 'Telefon';
      }
      
      if (lowerText.includes('turkcell')) result.companyName = 'Turkcell';
      else if (lowerText.includes('vodafone')) result.companyName = 'Vodafone';
      else result.companyName = 'Türk Telekom';
    }

    // 2. Fatura Numarası (Genelde 16 haneli harf+rakam veya FATURA NO: xxx formatında olur)
    // Örn: ETT2024000012345
    const invoiceNoMatch = text.match(/([A-Z]{3}202[0-9]{12})/i) || text.match(/(?:Fatura\s*No|Fatura\s*Numarası)[\s\:\-]+([A-Z0-9]+)/i);
    if (invoiceNoMatch) {
      result.invoiceNumber = invoiceNoMatch[1].trim();
    }

    // 3. Tutar (Ödenecek Tutar: 1.234,56 veya Toplam Tutar: 1234.56)
    const amountMatch = text.match(/(?:Ödenecek\s*Tutar|Toplam\s*Tutar|Fatura\s*Tutarı|Genel\s*Toplam)[\s\:\-]+([\d\.\,]+)/i);
    if (amountMatch) {
      // Virgülü ve noktayı parse edilebilir formata getir (ör: 1.234,56 -> 1234.56)
      let amt = amountMatch[1].trim();
      // Eğer format 1.234,56 ise (virgül kuruş)
      if (amt.includes(',') && amt.includes('.')) {
        amt = amt.replace(/\./g, '').replace(',', '.');
      } else if (amt.includes(',')) {
        // sadece virgül varsa muhtemelen kuruş: 1234,56
        amt = amt.replace(',', '.');
      }
      result.amount = amt;
    }

    // 4. Son Ödeme Tarihi (Son Ödeme Tarihi: 15.09.2026 veya Vade Tarihi: 15/09/2026)
    const dueDateMatch = text.match(/(?:Son\s*Ödeme|Ödeme\s*Son|Vade\s*Tarihi|Son\s*Öd\.\s*Tar\.)[\s\S]{0,15}?(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})/i);
    if (dueDateMatch) {
      // 15.09.2026 -> 2026-09-15
      const parts = dueDateMatch[1].split(/[\.\-\/]/);
      if (parts.length === 3) {
        result.dueDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // 5. Fatura Tarihi
    const dateMatch = text.match(/(?:Fatura\s*Tarihi|Düzenleme\s*Tarihi)[\s\:\-]+(\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4})/i);
    if (dateMatch) {
      const parts = dateMatch[1].split(/[\.\-\/]/);
      if (parts.length === 3) {
        result.invoiceDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Eğer Kurum adı hala boşsa, faturadaki ilk mantıklı satırı alalım (Genelde Kurum Adı en üsttedir)
    if (!result.companyName) {
      const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 5 && !l.match(/tarih|fatura|sayın|tc/i));
      if (lines.length > 0) {
        // İlk 2 satırdan birinde A.Ş., LTD. vb geçiyorsa
        const compLine = lines.slice(0, 3).find((l: string) => /A\.Ş\.|LTD\.|ŞTİ\.|BAŞKANLIĞI|MÜDÜRLÜĞÜ/i.test(l));
        if (compLine) result.companyName = compLine.substring(0, 50);
      }
    }

    // 6. Özel numaralar (Telefon/Abone/Tesisat)
    // searchText is already defined above in this function.

    if (result.type === 'Telefon' || result.type === 'İnternet') {
      const phoneMatch = searchText.match(/(?:Telefon|Gsm|Mobil|Hat|Hizmet)[\s\S]{0,20}?(?:No|Numarasi|Numara)[\s\:\-]+(\+?90\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|0?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|0?\s*[2348]\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/i)
        || searchText.match(/\b(0?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2})\b/);
      if (phoneMatch && phoneMatch[1]) {
        result.notes = `${result.type === 'Telefon' ? 'Telefon/GSM No' : 'Hizmet No'}: ${phoneMatch[1].trim().replace(/\s+/g, '')}`;
      } else {
        const hizmetMatch = searchText.match(/(?:Hizmet|Hesap|Musteri)[\s\S]{0,20}?(?:No|Numarasi|Kodu)[\s\:\-]+([A-Z0-9]{4,20})/i);
        if (hizmetMatch && hizmetMatch[1]) {
          result.notes = `Hizmet/Hesap No: ${hizmetMatch[1].trim()}`;
        }
      }
    } else if (result.type === 'Elektrik' || result.type === 'Su' || result.type === 'Doğalgaz') {
      const aboneMatch = searchText.match(/(?:Abone|Tesisat|Hizmet|Sozlesme|Musteri|Hesap|Tuketici)[\s\S]{0,20}?(?:No|Numarasi|Kodu)[\s\:\-]+([A-Z0-9]{4,20})/i)
        || searchText.match(/#(?:TESISAT|ABONE|SOZLESME|MUSTERI|VKONT)[\s\S]{0,5}?[:\-]\s*([A-Z0-9]{4,20})/i);
      if (aboneMatch && aboneMatch[1]) {
        const prefix = result.type === 'Elektrik' ? 'Abone/Tesisat No' : 'Abone/Sözleşme No';
        result.notes = `${prefix}: ${aboneMatch[1].trim()}`;
      }
    } else {
      const aboneMatch = searchText.match(/(?:Abone|Tesisat|Hizmet|Sozlesme|Musteri|Hesap|Tuketici)[\s\S]{0,20}?(?:No|Numarasi|Kodu)[\s\:\-]+([A-Z0-9]{4,20})/i)
        || searchText.match(/#(?:TESISAT|ABONE|SOZLESME|MUSTERI|VKONT)[\s\S]{0,5}?[:\-]\s*([A-Z0-9]{4,20})/i);
      if (aboneMatch && aboneMatch[1]) {
        result.notes = `Hesap/Abone No: ${aboneMatch[1].trim()}`;
      }
    }

    return result;
  }
}

export const invoicePdfService = new InvoiceParseService();
