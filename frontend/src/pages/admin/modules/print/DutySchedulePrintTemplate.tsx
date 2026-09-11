import React, { forwardRef } from 'react';
import { PrintableDocument } from '../../../../components/ui/PrintableDocument';
import { useSettings } from '../../../../context/SettingsContext';

interface WorkDay {
  date: Date;
  dayOfWeek: number;
  dayNum: number;
  weekNum: number;
  monthName?: string;
}

interface DutySchedulePrintTemplateProps {
  stations: any[];
  staffList: any[];
  assignments: any[];
  staffConfigs?: any[];
  monthName?: string;
  year?: number;
  workDays?: WorkDay[];
}

const EXEMPTION_LABELS: Record<string, string> = {
  HAMILE: 'Hamile (24. Hafta+)',
  DOGUM_SONRASI: 'Doğum Sonrası (Analık İzni+1 Yıl)',
  HIZMET_YILI_KADIN: '20+ Yıl Hizmet (Kadın)',
  HIZMET_YILI_ERKEK: '25+ Yıl Hizmet (Erkek)',
  ENGELLI: 'Engelli Öğretmen',
  ENGELLI_BAKIM: 'Engelli Birey/Çocuk Bakımı',
  OZEL_EGITIM: 'Özel Eğitim Sınıfı Öğretmeni',
  DIGER: 'Diğer',
};

const DAYS = [
  { val: 1, label: 'Pazartesi' },
  { val: 2, label: 'Salı' },
  { val: 3, label: 'Çarşamba' },
  { val: 4, label: 'Perşembe' },
  { val: 5, label: 'Cuma' },
];

export const DutySchedulePrintTemplate = forwardRef<HTMLDivElement, DutySchedulePrintTemplateProps>(
  ({ stations, staffList, assignments, staffConfigs = [], monthName = 'Aylık', year, workDays = [] }, ref) => {
    const { settings } = useSettings();

    const getStaffName = (stationId: string, dayOfWeek: number, weekNum: number) => {
      const a = assignments.find(a => a.stationId === stationId && a.dayOfWeek === dayOfWeek && a.weekNumber === weekNum);
      if (!a) return '';
      const s = staffList.find(s => s.id === a.staffId);
      return s ? s.name : '';
    };

    // Haftalara böl
    const weeks: WorkDay[][] = [];
    workDays.forEach(d => {
      if (!weeks[d.weekNum]) weeks[d.weekNum] = [];
      weeks[d.weekNum].push(d);
    });
    const weekList = weeks.filter(Boolean).filter(week => {
      // Sadece en az bir atama içeren haftaları tut
      return assignments.some(a => a.weekNumber === week[0].weekNum);
    });

    // Eski mod (workDays yok)
    const legacyMode = workDays.length === 0;

    return (
      <PrintableDocument ref={ref} landscape={true}>
        {/* Başlık */}
        <div className="text-center mb-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-0.5">
            {settings?.schoolName || 'Okul Adı'}
          </p>
          <h2 className="text-base font-bold uppercase">
            {monthName} {year} — AYLIK NÖBET ÇİZELGESİ
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{settings?.academicYear || ''} Eğitim-Öğretim Yılı</p>
        </div>

        {legacyMode ? (
          /* Eski haftalık mod */
          <table className="w-full border-collapse border border-black text-xs text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-36 text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Nöbet Yeri</th>
                {DAYS.map(d => (
                  <th key={d.val} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stations.map(st => (
                <tr key={st.id}>
                  <td className="border border-black p-2 font-bold text-left">{st.name}</td>
                  {DAYS.map(d => (
                    <td key={d.val} className="border border-black p-2">
                      {getStaffName(st.id, d.val, 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Aylık mod — haftalara göre bölünmüş */
          weekList.map((week, wIdx) => (
            <div key={wIdx} className={wIdx > 0 ? 'mt-4' : ''}>
              <div className="bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-600 border border-black border-b-0">
                {(() => {
                  const firstDay = week[0];
                  const lastDay = week[week.length - 1];
                  const mNameFirst = firstDay.monthName || monthName;
                  const mNameLast = lastDay.monthName || monthName;
                  if (mNameFirst !== mNameLast) {
                    return `${wIdx + 1}. Hafta — ${firstDay.dayNum} ${mNameFirst} - ${lastDay.dayNum} ${mNameLast} ${year}`;
                  }
                  return `${wIdx + 1}. Hafta — ${firstDay.dayNum}-${lastDay.dayNum} ${mNameFirst} ${year}`;
                })()}
              </div>
              <table className="w-full border-collapse border border-black text-xs text-center">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="w-36 text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Nöbet Yeri</th>
                    {DAYS.map(day => {
                      const d = week.find(w => w.dayOfWeek === day.val);
                      return (
                        <th key={day.val} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                          <div>{day.label}</div>
                          <div className="font-bold text-gray-700">{d ? d.dayNum : '-'}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {stations.map(st => (
                    <tr key={st.id}>
                      <td className="border border-black p-1.5 font-bold text-left pl-2">{st.name}</td>
                      {DAYS.map(day => {
                        const d = week.find(w => w.dayOfWeek === day.val);
                        return (
                          <td key={`cell-${day.val}`} className="border border-black p-1.5">
                            {d ? getStaffName(st.id, d.dayOfWeek, d.weekNum) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}

        {/* Nöbetçi İdareciler */}
        <div className="mt-4">
          <div className="bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-600 border border-black border-b-0 text-center">
            Nöbetçi İdareciler
          </div>
          <table className="w-full border-collapse border border-black text-xs text-center">
            <thead>
              <tr className="bg-gray-50">
                {DAYS.map(day => (
                  <th key={day.val} className="w-1/5 text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">{day.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {DAYS.map(day => {
                  const adminConfigs = staffConfigs.filter(c => c.isAdmin && c.isFixedDay && c.fixedDayOfWeek === day.val);
                  const adminNames = Array.from(new Set(adminConfigs.map(c => {
                    const s = staffList.find(staff => staff.id === c.staffId);
                    return s ? s.name : null;
                  }).filter(Boolean)));
                  
                  return (
                    <td key={`admin-cell-${day.val}`} className="border border-black p-2 font-semibold">
                      {adminNames.length > 0 ? adminNames.join(', ') : '-'}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Görev notu */}
        <div className="mt-5 text-xs text-justify">
          <p>
            <strong>Nöbetçi Öğretmenlerin Görevleri:</strong><br />
            1. Nöbet görevi, ilk dersten 15 dakika önce başlar, son ders bitiminden 15 dakika sonra biter.<br />
            2. Nöbetçi öğretmenler, boş geçen dersleri doldurmakla ve okul idaresinin vereceği eğitim-öğretimle ilgili diğer görevleri yapmakla yükümlüdür.<br />
            3. Nöbet mahallerinde öğrencilerin güvenliğini sağlamak, teneffüslerde öğrencileri bahçeye yönlendirmek esastır.
          </p>
        </div>

        {/* Muaf Personel Listesi — MEB Mevzuatı */}
        {(() => {
          const exemptStaff = staffConfigs
            .filter(c => c.isExempt)
            .map(c => ({
              ...c,
              name: staffList.find(s => s.id === c.staffId)?.name || c.staffId,
            }))
            .filter(c => c.name);
          if (exemptStaff.length === 0) return null;
          return (
            <div className="mt-4 border border-gray-300 rounded p-3 text-xs">
              <p className="font-bold text-xs uppercase mb-2">Nöbet Muaf Personel Listesi</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Personel</th>
                    <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Muafiyet Gerekçesi</th>
                    <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Bitiş Tarihi</th>
                    <th className="text-left text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Not</th>
                  </tr>
                </thead>
                <tbody>
                  {exemptStaff.map((c, i) => (
                    <tr key={c.staffId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-1 font-semibold">{c.name}</td>
                      <td className="border border-gray-300 p-1">{EXEMPTION_LABELS[c.exemptionReason] || c.exemptionReason || '—'}</td>
                      <td className="border border-gray-300 p-1">{c.exemptionEndDate || '—'}</td>
                      <td className="border border-gray-300 p-1">{c.exemptionNote || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-gray-500" style={{fontSize:'9px'}}>
                * MEB Ortaoğretim Kurumları Yönetmeliği gereğince nöbet muafiyeti tanınmıştır.
              </p>
            </div>
          );
        })()}

        {/* İmza */}
        <table className="w-full text-center border-none mt-6">
          <tbody>
            <tr>
              <td className="border-none w-1/2 align-bottom h-20">
                <p className="font-bold text-xs">......................................</p>
                <p className="text-xs">Müdür Yardımcısı</p>
              </td>
              <td className="border-none w-1/2 align-bottom h-20">
                <p className="text-xs mb-2">Uygundur.</p>
                <p className="text-xs">..../..../20...</p>
                <p className="font-bold text-xs mt-3">{settings?.principalName || '......................................'}</p>
                <p className="text-xs">Okul Müdürü</p>
              </td>
            </tr>
          </tbody>
        </table>
      </PrintableDocument>
    );
  }
);

DutySchedulePrintTemplate.displayName = 'DutySchedulePrintTemplate';
