import React from 'react';
import { parseAndStandardizeClass } from '../../../../utils/classNameFormatter';

export interface CoverMatrixPrintTemplateProps {
  date: string;
  covers: any[];
  absences: any[];
  dailyDutyStaff: any[];
  staffList?: any[];
  schoolName?: string;
  onlyAssigned?: boolean;
  showMerged?: boolean;
  classDisplayMap?: Record<string, string>;
  printNotes?: string;
  printNotesEnabled?: boolean;
}

export const CoverMatrixPrintTemplate = React.forwardRef<
  HTMLDivElement,
  CoverMatrixPrintTemplateProps
>(({ date, covers, absences, dailyDutyStaff, staffList = [], schoolName, onlyAssigned = true, showMerged = true, classDisplayMap = {}, printNotes, printNotesEnabled }, ref) => {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('tr-TR', { weekday: 'long' });
  const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const formattedDate = dateObj.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Yardımcı: Personel için devamsızlık nedeni
  const getAbsenceReason = (staffId: string) => {
    const a = absences.find(abs => String(abs.staffId) === String(staffId));
    if (!a) return 'İzinli';
    const r = a.reason || 'İzinli';
    const t = a.absenceTime === 'SABAH' ? ' (Sabah)' : a.absenceTime === 'OGLEDEN_SONRA' ? ' (Öğleden Sonra)' : '';
    return r + t;
  };

  // Bir ders atamasına atanmış personelin ID'sini al
  const getAssignedStaffId = (c: any): string | null => {
    const id = c.substituteStaffId || c.substituteStaff?.id || c.suggestedSubstitute?.staff?.id;
    return id ? String(id) : null;
  };

  // Grup birleştirme filtresi uygulanmış geçerli görevlendirmeler
  const effectiveCovers = covers.filter(c => {
    if (c.isCancelled) return false;
    const isMerged = Boolean(
      c.isMerged ||
      c.isCombined ||
      (c.notes && c.notes.toLowerCase().includes('birleştir'))
    );
    if (!showMerged && isMerged) return false;
    return true;
  });

  // O gün fiilen en az 1 boş derse görevlendirilmiş öğretmenlerin ID kümesi
  const assignedTeacherIds = new Set<string>();
  effectiveCovers.forEach(c => {
    const subId = getAssignedStaffId(c);
    if (subId) assignedTeacherIds.add(subId);
  });

  // Nöbetçi listesi: onlyAssigned=true ise SADECE görevi olan nöbetçiler ve görevlendirilmiş öğretmenler
  const dutyTeacherList: {
    staffId: string;
    name: string;
    stationName?: string;
  }[] = [];

  const addedStaffIds = new Set<string>();

  // 1. Tanımlı nöbetçilerden görevi olanlar (onlyAssigned=false ise tümü)
  dailyDutyStaff.forEach(d => {
    if (d.staff && !addedStaffIds.has(String(d.staff.id))) {
      const staffIdStr = String(d.staff.id);
      const isAssigned = assignedTeacherIds.has(staffIdStr);
      if (!onlyAssigned || isAssigned) {
        addedStaffIds.add(staffIdStr);
        dutyTeacherList.push({
          staffId: staffIdStr,
          name: d.staff.name,
          stationName: d.station?.name || ''
        });
      }
    }
  });

  // 2. Nöbetçi olmayıp görevlendirilmiş diğer öğretmenler (örn. ders birleştirme için)
  effectiveCovers.forEach(c => {
    const subId = getAssignedStaffId(c);
    if (!subId || addedStaffIds.has(subId)) return;

    const sub = c.substituteStaff || c.suggestedSubstitute?.staff;
    const name = sub?.name || staffList.find((s: any) => String(s.id) === subId)?.name;
    if (name) {
      addedStaffIds.add(subId);
      dutyTeacherList.push({
        staffId: subId,
        name,
        stationName: '' // Nöbet yeri yok veya birleştirilen ders
      });
    }
  });

  // Görevlendirme Metni Satırları (Saate göre sıralı)
  const validCovers = effectiveCovers
    .filter(c => getAssignedStaffId(c))
    .sort((a, b) => a.period - b.period);

  const assignmentTextItems = validCovers.map(c => {
    const subId = getAssignedStaffId(c);
    const sub = c.substituteStaff || c.suggestedSubstitute?.staff;
    const subName =
      sub?.name ||
      dutyTeacherList.find(t => t.staffId === subId)?.name ||
      staffList.find((s: any) => String(s.id) === subId)?.name ||
      '—';
    const dutyEntry = dailyDutyStaff.find(d => String(d.staff?.id) === subId);
    const stationName = dutyEntry?.station?.name;
    const absentName = c.absentStaff?.name || '—';
    const reason = getAbsenceReason(c.absentStaffId || c.absentStaff?.id);

    const isMerged = Boolean(c.isMerged || c.isCombined || (c.notes && c.notes.toLowerCase().includes('birleştir')));
    const displayClassName = parseAndStandardizeClass(c.className || '', classDisplayMap).displayName;
    const mergedTeacher = c.mergedWithStaff?.name || c.presentCoTeachers?.[0]?.name || subName || 'Öğretmen';
    const displayAbsentName = [c.absentStaff, ...(c.coAbsentStaffs || [])].filter(Boolean).map((s: any) => s.name).join(' & ') || absentName;

    if (isMerged) {
      return {
        period: c.period,
        text: `${c.period}. saat — ${displayClassName} (${displayAbsentName} - ${reason}): Grup Birleştirilecek - ${mergedTeacher}`
      };
    }

    const stationTag = stationName ? ` [${stationName}]` : '';
    return {
      period: c.period,
      text: `${c.period}. saat — ${displayClassName}: ${subName}${stationTag} (${absentName} - ${reason})`
    };
  });

  return (
    <div
      ref={ref}
      className="p-8 bg-white font-sans text-slate-900 print:text-black print:p-2"
      style={{ minWidth: '950px' }}
    >
      <style type="text/css" media="print">
        {`
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        `}
      </style>

      {/* Başlık */}
      <div className="text-center mb-3">
        {schoolName && (
          <h2 className="text-xs uppercase font-semibold text-slate-500 mb-0.5 print:text-slate-700">
            {schoolName}
          </h2>
        )}
        <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 print:text-black">
          Tarih: {formattedDate} ({dayNameCap}) Nöbetçi Öğretmen Boş Ders Görevlendirme Listesi
        </h1>
      </div>

      {/* Matris Tablosu */}
      <table className="w-full border-collapse border border-slate-400 text-xs mb-5">
        <thead>
          <tr className="bg-slate-100 print:bg-slate-100 font-bold text-slate-800 print:text-black">
            <th className="border border-slate-400 p-2 text-center w-48 font-bold text-xs uppercase tracking-wider">
              Öğretmen
            </th>
            {periods.map(p => (
              <th
                key={p}
                className="border border-slate-400 p-1.5 text-center text-xs font-bold"
                style={{ minWidth: '68px' }}
              >
                {p}. Saat
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dutyTeacherList.length === 0 ? (
            <tr>
              <td
                colSpan={periods.length + 1}
                className="border border-slate-400 p-4 text-center text-slate-500 italic"
              >
                Bu tarih için atanmış nöbetçi veya görevlendirme bulunamadı.
              </td>
            </tr>
          ) : (
            dutyTeacherList.map(teacher => {
              return (
                <tr key={teacher.staffId} className="hover:bg-slate-50/50">
                  {/* Öğretmen ve Nöbet Yeri */}
                  <td className="border border-slate-400 p-1.5 bg-slate-50/30">
                    <div className="font-extrabold text-[11px] leading-tight text-slate-900 print:text-black uppercase">
                      {teacher.name}
                    </div>
                    {teacher.stationName && (
                      <div className="text-[9px] font-semibold text-slate-500 print:text-slate-700 uppercase mt-0.5 tracking-tighter">
                        {teacher.stationName}
                      </div>
                    )}
                  </td>

                  {/* 1 - 11 Saatler */}
                  {periods.map(period => {
                    const matchCover = effectiveCovers.find(
                      c =>
                        c.period === period &&
                        getAssignedStaffId(c) === teacher.staffId
                    );

                    if (!matchCover) {
                      return (
                        <td
                          key={period}
                          className="border border-slate-400 p-1 text-center text-slate-400 font-medium text-xs"
                        >
                          —
                        </td>
                      );
                    }

                    const absentName = matchCover.absentStaff?.name || '—';
                    const reason = getAbsenceReason(
                      matchCover.absentStaffId || matchCover.absentStaff?.id
                    );
                    const isMerged = Boolean(
                      matchCover.isMerged ||
                        matchCover.isCombined ||
                        (matchCover.notes &&
                          matchCover.notes.toLowerCase().includes('birleştir'))
                    );
                    const mergedTeacherName = matchCover.mergedWithStaff?.name || matchCover.presentCoTeachers?.[0]?.name;

                    return (
                      <td
                        key={period}
                        className="border border-slate-400 p-1 text-center bg-blue-50/20 leading-tight align-middle"
                      >
                        <div className="font-black text-[11px] text-slate-900 print:text-black">
                          {parseAndStandardizeClass(matchCover.className || '', classDisplayMap).displayName}
                        </div>
                        {isMerged && (
                          <div className="text-[8px] font-bold text-purple-800 print:text-black">
                            Grup Birleştirildi {mergedTeacherName ? `(${mergedTeacherName})` : ''}
                          </div>
                        )}
                        <div className="text-[9px] text-slate-600 print:text-slate-800 mt-0.5 leading-tight">
                          <span>{absentName}</span>
                          <span className="block text-[8px] text-slate-500 print:text-slate-600">
                            — {reason}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Görevlendirme Metni */}
      {assignmentTextItems.length > 0 && (
        <div className="mt-4 pt-2 border-t border-slate-300">
          <div className="mb-2">
            <h3 className="text-xs font-black uppercase text-slate-900 print:text-black">
              Görevlendirme Metni
            </h3>
            <p className="text-[10px] text-slate-600 font-medium">Tarih: {formattedDate}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-[10px] text-slate-800 print:text-black">
            {assignmentTextItems.map((item, idx) => (
              <div key={idx} className="leading-snug">
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resmi Açıklamalar / Notlar */}
      {printNotesEnabled && printNotes && printNotes.trim() && (
        <div className="mt-4 pt-2 border-t border-slate-300 text-[10px] text-slate-800 print:text-black">
          <h4 className="font-bold uppercase text-[10px] text-slate-900 print:text-black mb-1">
            Açıklamalar:
          </h4>
          <div className="whitespace-pre-line leading-relaxed text-[9.5px] pl-0.5">
            {printNotes.trim()}
          </div>
        </div>
      )}

      {/* Alt Bilgi */}
      <div className="mt-6 flex justify-between items-center text-[9px] text-slate-400 print:text-slate-500">
        <span>OkulDesk Boş Ders Yönetim Sistemi</span>
        <span>Yazdırma: {new Date().toLocaleString('tr-TR')}</span>
      </div>
    </div>
  );
});

CoverMatrixPrintTemplate.displayName = 'CoverMatrixPrintTemplate';
