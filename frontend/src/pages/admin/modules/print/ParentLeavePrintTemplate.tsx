import React from 'react';

interface DateRange {
  startDate: string;
  endDate?: string;
}

interface PrintTemplateProps {
  data: {
    student: {
      fullName: string;
      className: string;
      schoolNumber: string;
    };
    dateRanges: string;
    reason: string;
  };
  settings: any;
}

export default function ParentLeavePrintTemplate({ data, settings }: PrintTemplateProps) {
  const schoolName = settings?.schoolName || '................................................... LİSESİ';
  
  let ranges: DateRange[] = [];
  try {
    ranges = JSON.parse(data.dateRanges || '[]');
  } catch {
    //
  }

  return (
    <div className="w-[21cm] h-[14.8cm] p-8 mx-auto bg-white text-black font-serif relative flex flex-col" style={{ boxSizing: 'border-box' }}>
      {/* A5 Yatay Boyutu (210 x 148 mm) Ayarı: CSS'de @page { size: A5 landscape; margin: 0; } olacak şekilde ayarlandı */}
      
      <div className="text-center font-bold text-xl leading-tight mb-4 mt-4">
        {schoolName.toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜNE
      </div>
      
      <div className="mt-6 text-justify leading-relaxed text-[15px] indent-8">
        Velisi bulunduğum, okulunuzun <strong>{data.student.className}</strong> sınıfı, <strong>{data.student.schoolNumber}</strong> numaralı <strong>{data.student.fullName}</strong> isimli öğrencinin, 
        aşağıda belirttiğim tarihlerde
        {data.reason ? <span> <strong>{data.reason}</strong> mazereti nedeniyle </span> : ' mazeretinden dolayı '}
        izinli sayılması hususunda gereğini bilgilerinize arz ederim.
      </div>
      
      <div className="mt-6 flex justify-between items-start">
        <div className="w-2/3 pr-4">
          <div className="font-bold mb-3 underline text-[15px]">İzin İstenilen Tarihler:</div>
          <ul className="list-disc pl-5 text-[13px] columns-2 gap-x-6">
            {ranges.length > 0 ? ranges.map((range, idx) => {
              const s = new Date(range.startDate).toLocaleDateString('tr-TR');
              const e = range.endDate ? new Date(range.endDate).toLocaleDateString('tr-TR') : s;
              const label = s === e ? s : `${s} - ${e}`;
              const typeLabel = (range as any).isHalfDay ? '(Yarım Gün)' : '(Tam Gün)';
              return <li key={idx} className="font-medium mb-1 break-inside-avoid">{label} <span className="font-normal text-[11px]">{typeLabel}</span></li>;
            }) : (
              <li>Tarih belirtilmedi</li>
            )}
          </ul>
        </div>

        <div className="text-center mr-8">
          <div className="mb-6">
            Tarih: {new Date().toLocaleDateString('tr-TR')}
          </div>
          <div className="font-bold">Veli Adı Soyadı</div>
          <div>........................................</div>
          <div className="mt-8 font-bold">İmza</div>
        </div>
      </div>
      
      <div className="mt-6 text-[14px]">
        <div className="font-bold mb-2 underline">VELİ İLETİŞİM BİLGİLERİ:</div>
        <div className="flex mb-1">
          <div className="w-24 font-bold">Adres</div>
          <div>: ........................................................................................................</div>
        </div>
        <div className="flex mb-1">
          <div className="w-24"></div>
          <div>  ........................................................................................................</div>
        </div>
        <div className="flex">
          <div className="w-24 font-bold">Telefon</div>
          <div>: ..........................................................</div>
        </div>
      </div>

      <div className="mt-auto text-[10px] text-gray-500 text-center border-t border-gray-300 pt-2 pb-4">
        * MEB Ortaöğretim Kurumları Yönetmeliği (Madde 36) gereğince, özür belgesi veya veli beyanı mazeretin bitimini takip eden en geç 5 iş günü içinde okul yönetimine teslim edilmelidir.
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A5 landscape;
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
