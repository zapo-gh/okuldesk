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

    const getStaffNames = (stationId: string, dayOfWeek: number, weekNum: number) => {
      const cellAsgns = assignments.filter(a => {
        const aWeek = a.weekNumber !== undefined && a.weekNumber !== null ? Number(a.weekNumber) : 0;
        return a.stationId === stationId && a.dayOfWeek === dayOfWeek && aWeek === Number(weekNum);
      });
      if (cellAsgns.length === 0) return '';
      return cellAsgns
        .map(a => {
          const s = staffList.find(st => st.id === a.staffId);
          return s ? s.name : '';
        })
        .filter(Boolean)
        .join(', ');
    };

    const getWeekFingerprint = (weekNum: number) => {
      return stations.map(st => {
        return DAYS.map(d => {
          const staffIds = assignments
            .filter(a => {
              const aWeek = a.weekNumber !== undefined && a.weekNumber !== null ? Number(a.weekNumber) : 0;
              return a.stationId === st.id && a.dayOfWeek === d.val && aWeek === Number(weekNum);
            })
            .map(a => a.staffId)
            .sort()
            .join(',');
          return `${st.id}_${d.val}:${staffIds}`;
        }).join(';');
      }).join('|');
    };

    // Haftalara böl
    const weeks: WorkDay[][] = [];
    workDays.forEach(d => {
      if (!weeks[d.weekNum]) weeks[d.weekNum] = [];
      weeks[d.weekNum].push(d);
    });
    const weekList = weeks.filter(Boolean).filter(week => {
      // Sadece en az bir atama içeren haftaları tut
      return assignments.some(a => Number(a.weekNumber ?? 0) === Number(week[0].weekNum));
    });

    // Hafta grupları: Ardışık aynı nöbet dağılımına sahip haftaları birleştir
    interface WeekGroup {
      weekIndices: number[]; // 1-tabanlı hafta sırası (ör. [1, 2])
      weekNums: number[];
      weeks: WorkDay[][];
      firstDay: WorkDay;
      lastDay: WorkDay;
      fingerprint: string;
    }

    const weekGroups: WeekGroup[] = [];

    weekList.forEach((week, idx) => {
      const weekNum = week[0].weekNum;
      const fp = getWeekFingerprint(weekNum);
      const displayIdx = idx + 1;

      const prevGroup = weekGroups[weekGroups.length - 1];
      if (prevGroup && prevGroup.fingerprint === fp) {
        prevGroup.weekIndices.push(displayIdx);
        prevGroup.weekNums.push(weekNum);
        prevGroup.weeks.push(week);
        prevGroup.lastDay = week[week.length - 1];
      } else {
        weekGroups.push({
          weekIndices: [displayIdx],
          weekNums: [weekNum],
          weeks: [week],
          firstDay: week[0],
          lastDay: week[week.length - 1],
          fingerprint: fp,
        });
      }
    });

    // Eski mod (workDays yok)
    const legacyMode = workDays.length === 0;

    // Ay içerisinde nöbet yerleri değişmiyor mu?
    // Eğer tüm haftaların dağılımı aynıysa (en fazla 1 grup varsa) nöbet yeri değişmiyordur.
    const isUniformMonth = !legacyMode && weekGroups.length <= 1;

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
          <table className="w-full border-collapse border border-black text-xs text-center" style={{ pageBreakInside: 'avoid' }}>
            <thead>
              <tr className="bg-gray-100">
                <th className="w-44 text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border border-black">Nöbet Yeri</th>
                {DAYS.map(d => (
                  <th key={d.val} className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border border-black">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stations.map(st => (
                <tr key={st.id}>
                  <td className="border border-black p-2 font-bold text-left">{st.name}</td>
                  {DAYS.map(d => (
                    <td key={d.val} className="border border-black p-2">
                      {getStaffNames(st.id, d.val, 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : isUniformMonth ? (
          /* Ay içerisinde nöbet yeri değişmiyorsa: Sadece 1 tablo, ayın gününü belirtmeden */
          <div style={{ pageBreakInside: 'avoid' }}>
            <table className="w-full border-collapse border border-black text-xs text-center">
              <thead>
                <tr className="bg-gray-50">
                  <th className="w-44 text-left px-3 py-2.5 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100 border border-black">
                    Nöbet Yeri
                  </th>
                  {DAYS.map(day => (
                    <th key={day.val} className="text-center px-3 py-2.5 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-100 border border-black">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stations.map(st => (
                  <tr key={st.id}>
                    <td className="border border-black p-2 font-bold text-left pl-2">{st.name}</td>
                    {DAYS.map(day => (
                      <td key={`cell-${day.val}`} className="border border-black p-2 font-medium">
                        {getStaffNames(st.id, day.val, weekGroups[0]?.weekNums[0] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Ay içerisinde rotasyon olup yerler değişiyorsa: Değişen nöbet dönemlerini göster */
          weekGroups.map((group, gIdx) => {
            const firstDay = group.firstDay;
            const lastDay = group.lastDay;
            const mNameFirst = firstDay.monthName || monthName;
            const mNameLast = lastDay.monthName || monthName;
            const dateRangeStr = mNameFirst !== mNameLast
              ? `${firstDay.dayNum} ${mNameFirst} - ${lastDay.dayNum} ${mNameLast} ${year}`
              : `${firstDay.dayNum}-${lastDay.dayNum} ${mNameFirst} ${year}`;
            
            const weekLabel = group.weekIndices.length === 1
              ? `${group.weekIndices[0]}. HAFTA`
              : group.weekIndices.length === 2
                ? `${group.weekIndices[0]}. VE ${group.weekIndices[1]}. HAFTA`
                : `${group.weekIndices[0]}. - ${group.weekIndices[group.weekIndices.length - 1]}. HAFTA`;

            const isSingleWeek = group.weeks.length === 1;

            return (
              <div key={gIdx} className={`${gIdx > 0 ? 'mt-4' : ''}`} style={{ pageBreakInside: 'avoid' }}>
                <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold uppercase text-gray-700 border border-black border-b-0">
                  {weekLabel} — {dateRangeStr}
                </div>
                <table className="w-full border-collapse border border-black text-xs text-center">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="w-44 text-left px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border border-black">
                        Nöbet Yeri
                      </th>
                      {DAYS.map(day => {
                        const d = isSingleWeek ? group.weeks[0]?.find(w => w.dayOfWeek === day.val) : null;
                        return (
                          <th key={day.val} className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider bg-gray-50 border border-black">
                            <div>{day.label}</div>
                            {d && <div className="font-bold text-gray-800 text-[11px]">{d.dayNum}</div>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {stations.map(st => (
                      <tr key={st.id}>
                        <td className="border border-black p-1.5 font-bold text-left pl-2">{st.name}</td>
                        {DAYS.map(day => (
                          <td key={`cell-${day.val}`} className="border border-black p-1.5 font-medium">
                            {getStaffNames(st.id, day.val, group.weekNums[0])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}



        {/* Görev notu */}
        <div className="mt-5 text-xs text-justify" style={{ pageBreakInside: 'avoid' }}>
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
            <div className="mt-4 border border-gray-300 rounded p-3 text-xs" style={{ pageBreakInside: 'avoid' }}>
              <p className="font-bold text-xs uppercase mb-2">Nöbet Muaf Personel Listesi</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Personel</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Muafiyet Gerekçesi</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Bitiş Tarihi</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">Not</th>
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
                * MEB Ortaöğretim Kurumları Yönetmeliği gereğince nöbet muafiyeti tanınmıştır.
              </p>
            </div>
          );
        })()}

        {/* İmza */}
        <table className="w-full text-center border-none mt-6" style={{ pageBreakInside: 'avoid' }}>
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
