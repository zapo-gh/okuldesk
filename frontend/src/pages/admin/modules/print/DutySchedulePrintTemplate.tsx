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
  monthName?: string;
  year?: number;
  workDays?: WorkDay[];
}

const DAYS = [
  { val: 1, label: 'Pazartesi' },
  { val: 2, label: 'Salı' },
  { val: 3, label: 'Çarşamba' },
  { val: 4, label: 'Perşembe' },
  { val: 5, label: 'Cuma' },
];

export const DutySchedulePrintTemplate = forwardRef<HTMLDivElement, DutySchedulePrintTemplateProps>(
  ({ stations, staffList, assignments, monthName = 'Aylık', year, workDays = [] }, ref) => {
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
    const weekList = weeks.filter(Boolean);

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
                <th className="border border-black p-2 w-36 uppercase">Nöbet Yeri</th>
                {DAYS.map(d => (
                  <th key={d.val} className="border border-black p-2 uppercase">{d.label}</th>
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
                    <th className="border border-black p-1.5 w-36 uppercase text-left pl-2">Nöbet Yeri</th>
                    {DAYS.map(day => {
                      const d = week.find(w => w.dayOfWeek === day.val);
                      return (
                        <th key={`header-${day.val}`} className="border border-black p-1.5 uppercase">
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
                  <th key={`admin-header-${day.val}`} className="border border-black p-1.5 uppercase w-1/5">{day.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {DAYS.map(day => {
                  const adminAssignments = assignments.filter(a => a.dayOfWeek === day.val);
                  const adminNames = Array.from(new Set(adminAssignments.map(a => {
                    const s = staffList.find(staff => staff.id === a.staffId);
                    if (s && !s.gorev?.toLowerCase().includes('öğretmen')) return s.name;
                    return null;
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
