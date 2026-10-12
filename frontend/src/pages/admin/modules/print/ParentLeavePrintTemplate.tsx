import React from 'react';

interface DateRange {
  startDate: string;
  endDate?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
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
    <div className="w-[21cm] h-[14.8cm] p-6 mx-auto bg-white text-black font-serif relative flex flex-col overflow-hidden" style={{ boxSizing: 'border-box' }}>
      {/* A5 Yatay Boyutu (210 x 148 mm) Ayarı: CSS'de @page { size: A5 landscape; margin: 0; } olacak şekilde ayarlandı */}
      
      <div className="text-center font-bold text-xl leading-tight mb-3 mt-1">
        {schoolName.toLocaleUpperCase('tr-TR')} MÜDÜRLÜĞÜNE
      </div>
      
      <div className="mt-3 text-justify leading-relaxed text-[14px] indent-8">
        Velisi bulunduğum okulunuz <strong>{data.student.className}</strong> sınıfı, <strong>{data.student.schoolNumber}</strong> numaralı <strong>{data.student.fullName}</strong> isimli öğrencinin, 
        aşağıda belirtilen tarihlerde{data.reason ? <span> <strong>{data.reason}</strong> mazereti nedeniyle </span> : ' geçerli mazereti nedeniyle '} 
        okula devam edemeyeceğini / edemediğini bildirir; <strong>Millî Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği'nin 36 ncı maddesinin 7 nci fıkrası</strong> hükmü uyarınca belirtilen tarihlerde <strong>izinli sayılması</strong> ve devamsızlığının <strong>özürlü devamsızlık</strong> olarak e-Okul sistemine işlenmesi hususunda gereğini bilgilerinize arz ederim.
      </div>
      
      <div className="mt-3.5 flex justify-between items-start">
        <div className="w-2/3 pr-4">
          <div className="font-bold mb-1.5 underline text-[14px]">İzin İstenilen / Mazeret Bildirilen Tarihler:</div>
          <ul className="list-disc pl-5 text-[12.5px] columns-2 gap-x-6">
            {ranges.length > 0 ? ranges.map((range, idx) => {
              const s = new Date(range.startDate).toLocaleDateString('tr-TR');
              const e = range.endDate ? new Date(range.endDate).toLocaleDateString('tr-TR') : s;
              const label = s === e ? s : `${s} - ${e}`;
              const typeLabel = range.isHalfDay
                ? `(Yarım Gün - ${range.halfDayPeriod === 'morning' ? 'Öğleden Önce' : 'Öğleden Sonra'})`
                : '(Tam Gün)';
              return <li key={idx} className="font-medium mb-1 break-inside-avoid">{label} <span className="font-normal text-[11px] text-gray-700">{typeLabel}</span></li>;
            }) : (
              <li>Tarih belirtilmedi</li>
            )}
          </ul>
        </div>

        <div className="text-center mr-6 shrink-0">
          <div className="mb-3 text-[13px]">
            Tarih: {new Date().toLocaleDateString('tr-TR')}
          </div>
          <div className="font-bold text-[13px]">Veli Adı Soyadı</div>
          <div className="text-[13px]">........................................</div>
          <div className="mt-4 font-bold text-[13px]">İmza</div>
        </div>
      </div>
      
      <div className="mt-2.5 text-[13px]">
        <div className="font-bold mb-1 underline">VELİ İLETİŞİM BİLGİLERİ:</div>
        <div className="flex mb-0.5">
          <div className="w-20 font-bold">Adres</div>
          <div>: ........................................................................................................</div>
        </div>
        <div className="flex mb-0.5">
          <div className="w-20"></div>
          <div>  ........................................................................................................</div>
        </div>
        <div className="flex">
          <div className="w-20 font-bold">Telefon</div>
          <div>: ..........................................................</div>
        </div>
      </div>

      <div className="mt-auto text-[9.5px] text-gray-600 text-left border-t border-gray-300 pt-1.5 pb-1 leading-snug">
        * <strong>Yasal Dayanak:</strong> Millî Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği (Madde 36/7) gereğince; veli tarafından yapılan yazılı bildirim veya mazeret belgesi, mazeretin bitimini takip eden <strong>en geç 5 iş günü</strong> içinde okul yönetimine teslim edilir ve e-Okul sistemine işlenir. Toplam devamsızlık süresi özürsüz 10 günü, özürlü ve özürsüz toplam 30 günü aşamaz.
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
