import React from 'react';

export interface MesemNakilData {
  student: {
    fullName: string;
    tcNo: string;
    schoolNumber: string;
    className: string;
  };
  parent: {
    fullName: string;
    tcNo: string;
    phone: string;
    relation: string;
  };
  mesemName: string;
  date: string;
}

interface PrintTemplateProps {
  data: MesemNakilData;
  settings: any;
}

export default function MesemNakilPrintTemplate({ data, settings }: PrintTemplateProps) {
  const schoolName = settings?.schoolName || 'ALİYA İZZETBEGOVİÇ MESLEKİ VE TEKNİK ANADOLU LİSESİ';

  // MESEM ismine uygun ek yönetimi (eğer kullanıcı sadece okul adını yazdıysa 'ne / Merkezine ekleme)
  const mesemDisplay = data.mesemName?.trim() || '';

  return (
    <div className="w-[21cm] min-h-[29.7cm] p-[2.5cm] mx-auto bg-white text-black font-serif relative flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
      <div>
        {/* Üst Makam Başlığı */}
        <div className="text-center font-bold text-lg sm:text-xl leading-tight mb-12 mt-4 tracking-wide">
          {schoolName.toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜNE
        </div>
        
        {/* Dilekçe Metni (Resmî Dilekçe Kurallarına Uygun Paragraf ve Satır Boşlukları) */}
        <div className="text-justify leading-relaxed text-[16px] indent-8">
          Velisi olduğum okulunuz öğrencisi <strong>{data.student.fullName || '...........................................'}</strong>'ın 
          (T.C. Kimlik No: {data.student.tcNo || '...........................'}) kaydını{' '}
          <strong>{mesemDisplay ? `${mesemDisplay}'ne` : '........................................... Mesleki Eğitim Merkezi\'ne'}</strong> aldırmak 
          istiyorum. Öğrencimin öğrenim durum belgesi ve öğrenim belgesinin tarafıma verilerek e-Okul sisteminde 
          Mesleki Eğitim Merkezine "nakil gidebilir" olarak işaretlenmesini talep ediyorum.
        </div>
        
        {/* Kapanış Cümlesi - Üst Paragrafın Doğal Devamı Olarak Satır Başı */}
        <div className="text-justify leading-relaxed text-[16px] indent-8 mt-4 mb-16">
          Gereğini arz ederim.
        </div>

        {/* Tarih ve İmza Bloğu (Sağa Yaslı) */}
        <div className="flex justify-end mb-12">
          <div className="text-center min-w-[220px]">
            <div className="mb-3 font-medium text-[15px]">
              {data.date ? new Date(data.date).toLocaleDateString('tr-TR') : '..../..../20...'}
            </div>
            <div className="font-bold text-[16px]">
              {data.parent.fullName || '...........................................'}
            </div>
            <div className="text-sm text-slate-700 mb-8">
              ({data.parent.relation || 'Öğrenci Velisi'})
            </div>
            <div className="text-sm font-semibold tracking-wider">
              (İmza)
            </div>
          </div>
        </div>
      </div>
      
      {/* Veli İletişim Bilgileri Bloğu */}
      <div className="mt-auto text-[14px] border-t border-slate-300 pt-4 space-y-1.5">
        <div className="font-bold text-slate-900 mb-1">Veli Bilgileri:</div>
        <div className="flex">
          <div className="w-28 font-semibold text-slate-700">T.C. Kimlik No</div>
          <div>: {data.parent.tcNo || '...........................................'}</div>
        </div>
        <div className="flex">
          <div className="w-28 font-semibold text-slate-700">Telefon</div>
          <div>: {data.parent.phone || '...........................................'}</div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
}
