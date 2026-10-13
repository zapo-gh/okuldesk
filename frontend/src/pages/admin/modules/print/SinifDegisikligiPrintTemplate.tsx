import React from 'react';

export interface SinifDegisikligiData {
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
    address?: string;
  };
  reason: string;
  date: string;
}

interface PrintTemplateProps {
  data: SinifDegisikligiData;
  settings: any;
}

export default function SinifDegisikligiPrintTemplate({ data, settings }: PrintTemplateProps) {
  const schoolName = settings?.schoolName || 'ALİYA İZZETBEGOVİÇ MESLEKİ VE TEKNİK ANADOLU LİSESİ';

  return (
    <div className="w-[21cm] min-h-[29.7cm] p-[2.5cm] mx-auto bg-white text-black font-serif relative flex flex-col" style={{ boxSizing: 'border-box' }}>
      <div className="text-center font-bold text-xl leading-tight mb-16 mt-8">
        {schoolName.toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜNE
      </div>
      
      <div className="text-justify leading-relaxed text-[16px] indent-8 mb-8">
        Velisi bulunduğum okulunuz <strong>{data.student.className || '......'}</strong> sınıfı,{' '}
        <strong>{data.student.schoolNumber || '............'}</strong> nolu öğrencisi{' '}
        <strong>{data.student.fullName || '...........................................'}</strong>'ın{' '}
        (T.C. No: {data.student.tcNo || '...........................'}),{' '}
        <strong>{data.reason || '......................................................................'}</strong>{' '}
        nedeniyle sınıf değişikliği yapılması hususunda;
      </div>
      
      <div className="text-justify leading-relaxed text-[16px] indent-8 mb-24">
        Gereğini arz ederim.
      </div>

      <div className="flex justify-end mb-8">
        <div className="text-center">
          <div className="mb-2">{data.date ? new Date(data.date).toLocaleDateString('tr-TR') : '..../..../20...'}</div>
          <div className="font-bold">{data.parent.fullName || '...........................................'}</div>
          <div className="mb-8">({data.parent.relation || 'Velisi'})</div>
          <div>İmza</div>
        </div>
      </div>
      
      <div className="mt-8 text-[15px] space-y-2">
        <div className="flex">
          <div className="w-24 font-bold">T.C. No</div>
          <div>: {data.parent.tcNo || '...........................................'}</div>
        </div>
        <div className="flex">
          <div className="w-24 font-bold">Telefon</div>
          <div>: {data.parent.phone || '...........................................'}</div>
        </div>
        {data.parent.address && (
          <div className="flex">
            <div className="w-24 font-bold">Adres</div>
            <div className="flex-1">: {data.parent.address}</div>
          </div>
        )}
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
