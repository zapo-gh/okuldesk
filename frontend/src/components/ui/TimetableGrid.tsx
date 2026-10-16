import React, { useCallback, useMemo } from 'react';
import { parseAndStandardizeClass } from '../../utils/classNameFormatter';

const DAYS = [
  { val: 1, label: 'Pazartesi', short: 'Pzt' },
  { val: 2, label: 'Salı', short: 'Sal' },
  { val: 3, label: 'Çarşamba', short: 'Çar' },
  { val: 4, label: 'Perşembe', short: 'Per' },
  { val: 5, label: 'Cuma', short: 'Cum' },
];

const CLASS_COLORS = [
  'bg-blue-100/90 text-blue-950 border-blue-300/80',
  'bg-emerald-100/90 text-emerald-950 border-emerald-300/80',
  'bg-amber-100/90 text-amber-950 border-amber-300/80',
  'bg-violet-100/90 text-violet-950 border-violet-300/80',
  'bg-rose-100/90 text-rose-950 border-rose-300/80',
  'bg-teal-100/90 text-teal-950 border-teal-300/80',
  'bg-cyan-100/90 text-cyan-950 border-cyan-300/80',
  'bg-indigo-100/90 text-indigo-950 border-indigo-300/80',
  'bg-fuchsia-100/90 text-fuchsia-950 border-fuchsia-300/80',
  'bg-orange-100/90 text-orange-950 border-orange-300/80',
  'bg-lime-100/90 text-lime-950 border-lime-300/80',
  'bg-sky-100/90 text-sky-950 border-sky-300/80',
  'bg-purple-100/90 text-purple-950 border-purple-300/80',
];

export function getSubjectColor(subject?: string): string {
  if (!subject) return 'bg-slate-100 text-slate-700 border-slate-200';
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CLASS_COLORS[Math.abs(hash) % CLASS_COLORS.length];
}

export const groupCells = (cells: any[]) => {
  const groups: Record<string, any> = {};
  cells.forEach(cell => {
    const key = cell.subject || 'BOS';
    if (!groups[key]) {
      groups[key] = {
        ...cell,
        staffNames: cell.staff ? [cell.staff.name] : [],
        classNames: cell.className ? [cell.className] : [],
      };
    } else {
      if (cell.staff && !groups[key].staffNames.includes(cell.staff.name))
        groups[key].staffNames.push(cell.staff.name);
      if (cell.className && !groups[key].classNames.includes(cell.className))
        groups[key].classNames.push(cell.className);
    }
  });
  return Object.values(groups);
};

interface TimetableGridProps {
  entries: any[];
  viewMode: 'teacher' | 'class';
  todayDow?: number;
  currentPeriod?: number | null;
  getPeriodTime?: (period: number) => string | null;
  onCellClick?: (group: any) => void;
  classDisplayMap?: Record<string, string>;
}

export default function TimetableGrid({
  entries,
  viewMode,
  todayDow,
  currentPeriod,
  getPeriodTime,
  onCellClick,
  classDisplayMap,
}: TimetableGridProps) {
  const { periods } = useMemo(() => {
    const max = entries.length > 0 ? Math.max(...entries.map(e => e.period)) : 10;
    // MTAL okullarında standart 10 ders saati vardır (bazı sınıflarda 11)
    const safeMax = Math.max(max, 10);
    return { maxPeriod: safeMax, periods: Array.from({ length: safeMax }, (_, i) => i + 1) };
  }, [entries]);

  const activeDays = useMemo(() => {
    const hasSat = entries.some(e => e.dayOfWeek === 6);
    const hasSun = entries.some(e => e.dayOfWeek === 7);
    const list = [...DAYS];
    if (hasSat) list.push({ val: 6, label: 'Cumartesi', short: 'Cmt' });
    if (hasSun) list.push({ val: 7, label: 'Pazar', short: 'Paz' });
    return list;
  }, [entries]);

  const getCells = useCallback(
    (day: number, period: number) => entries.filter(e => e.dayOfWeek === day && e.period === period),
    [entries],
  );

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto print:overflow-visible">
      <table className="w-full table-fixed text-xs border-collapse print:border-2 print:border-black print:text-black print:table-fixed print:w-full min-w-[700px] xl:min-w-0">
        <colgroup>
          <col className="w-14 sm:w-16 md:w-20 print:w-[8%]" style={{ width: '70px' }} />
          {periods.map(p => (
            <col key={p} style={{ width: `calc((100% - 70px) / ${periods.length})` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="px-1.5 py-1.5 text-center text-[11px] font-extrabold text-slate-700 uppercase tracking-wider bg-slate-200/90 sticky left-0 z-20 shadow-[1px_1px_0_0_rgba(203,213,225,1)] print:static print:bg-gray-100 print:border print:border-black print:shadow-none print:text-black print:p-0.5 print:text-[9px] overflow-hidden">
              Gün
            </th>
            {periods.map(p => {
              const time = getPeriodTime ? getPeriodTime(p) : null;
              const isLivePeriod = todayDow !== undefined && todayDow >= 1 && todayDow <= 5 && currentPeriod === p;
              return (
                <th
                  key={p}
                  className={`px-0.5 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200 print:bg-gray-100 print:border print:border-black print:text-black print:p-0.5 overflow-hidden transition-colors ${
                    isLivePeriod
                      ? 'bg-emerald-100/90 text-emerald-950 font-black'
                      : 'bg-slate-100/90 text-slate-700'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1 leading-tight truncate print:text-[8px] print:leading-none">
                    <span>{p}. Ders</span>
                    {isLivePeriod && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping print:hidden" />
                    )}
                  </span>
                  {time && (
                    <span className="block text-[9px] font-normal text-slate-500 normal-case tracking-normal mt-0.5 truncate print:text-black print:text-[6.5px] print:leading-none print:mt-0 print:tracking-tighter">
                      {time}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white print:bg-transparent">
          {activeDays.map((day, rowIndex) => {
            const isToday = todayDow !== undefined && day.val === todayDow;
            return (
              <tr
                key={day.val}
                className={`transition-colors group border-b border-slate-200 last:border-0 print:border-b print:border-black ${
                  isToday 
                    ? 'bg-indigo-50/70 hover:bg-indigo-100/50' 
                    : rowIndex % 2 === 0 
                      ? 'bg-white hover:bg-slate-50/60' 
                      : 'bg-slate-50/50 hover:bg-slate-100/50'
                }`}
              >
                <td
                  className={`px-1 py-1 text-center font-bold text-xs uppercase sticky left-0 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] transition-colors print:static print:bg-gray-50 print:border print:border-black print:shadow-none print:text-black print:p-1 print:text-[9px] print:break-words overflow-hidden ${
                    isToday
                      ? 'bg-indigo-100/95 text-indigo-800'
                      : rowIndex % 2 === 0
                        ? 'bg-slate-50/95 text-slate-700'
                        : 'bg-slate-100/90 text-slate-700'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center leading-tight">
                    <span className="tracking-tight text-[11px] font-bold">{day.label}</span>
                    {isToday && (
                      <span className="inline-block px-1.5 py-0.2 text-[8px] font-bold text-indigo-700 bg-indigo-200/80 rounded-full mt-0.5 print:hidden">
                        Bugün
                      </span>
                    )}
                  </div>
                </td>
                {periods.map(period => {
                  const cells = getCells(day.val, period);
                  const grouped = groupCells(cells);
                  const isLiveNow = isToday && currentPeriod === period;
                  return (
                    <td
                      key={period}
                      className={`p-0.5 text-center align-middle border-l border-slate-100 first:border-l-0 print:border print:border-black print:p-0 print:align-top overflow-hidden ${
                        isLiveNow ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {grouped.length > 0 ? (
                        <div className="flex flex-col gap-0.5 w-full h-full">
                          {grouped.map((group, idx) => {
                            const fullSubject = group.subjectName || group.subject || '';
                            const classStr = group.classNames
                              ? group.classNames.map((cn: string) => parseAndStandardizeClass(cn, classDisplayMap).displayName).join(', ')
                              : '';
                            const teacherStr = group.staffNames?.join(', ') || '';
                            const tooltip = `${fullSubject ? `Ders: ${fullSubject}` : ''}${classStr ? `\nSınıf: ${classStr}` : ''}${teacherStr ? `\nÖğretmen: ${teacherStr}` : ''}${group.room ? `\nDerslik: ${group.room}` : ''}\n${period}. Ders (${day.label})`;

                            return (
                              <div
                                key={idx}
                                onClick={() => onCellClick?.(group)}
                                title={tooltip}
                                className={`flex flex-col items-center justify-center rounded-lg border px-1 py-1 w-full min-h-[38px] shadow-2xs transition-all duration-150 hover:shadow-md hover:scale-[1.01] print:rounded-none print:border-none print:shadow-none print:bg-transparent print:p-0.5 print:min-h-0 print:text-black ${getSubjectColor(group.subject)} ${onCellClick ? 'cursor-pointer' : ''} ${
                                  isLiveNow ? 'ring-2 ring-emerald-500 shadow-md' : ''
                                }`}
                              >
                                {viewMode === 'teacher' ? (
                                  <>
                                    <span className="font-bold text-[11px] leading-tight text-slate-900 truncate max-w-full print:text-[8px] print:leading-none print:text-black print:mb-0 print:tracking-tighter">
                                      {classStr}
                                    </span>
                                    {group.subject && (
                                      <span className="font-semibold text-[10px] opacity-80 leading-tight uppercase truncate max-w-full print:opacity-100 print:text-[7.5px] print:leading-none print:text-black print:tracking-tighter mt-0.5">
                                        {group.subject}
                                      </span>
                                    )}
                                    {group.room && (
                                      <span className="text-[9px] opacity-75 font-medium leading-none truncate max-w-full mt-0.5 flex items-center justify-center gap-0.5 print:opacity-100 print:text-[7px] print:leading-none print:text-black print:mt-0 print:tracking-tighter">
                                        <span className="print:hidden">🚪</span> {group.room}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {group.subject && (
                                      <span className="font-bold text-[11px] leading-tight text-slate-900 uppercase truncate max-w-full print:text-[8.5px] print:leading-[9px] print:text-black print:mb-0 print:tracking-tighter">
                                        {group.subject}
                                      </span>
                                    )}
                                    {teacherStr && (
                                      <span className="font-medium text-[10px] opacity-85 leading-tight truncate max-w-full print:opacity-100 print:text-[7px] print:leading-[8px] print:text-black print:tracking-tighter mt-0.5">
                                        {teacherStr}
                                      </span>
                                    )}
                                    {group.room && (
                                      <span className="text-[9px] opacity-75 font-medium leading-none truncate max-w-full mt-0.5 flex items-center justify-center gap-0.5 print:opacity-100 print:text-[6.5px] print:leading-none print:text-black print:mt-0.5 print:tracking-tighter">
                                        <span className="print:hidden">🚪</span> {group.room}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-lg border border-slate-100/80 bg-slate-50/40 w-full min-h-[38px] text-[11px] font-light text-slate-300 select-none hover:bg-slate-50/80 transition-colors print:border-none print:bg-transparent print:text-transparent print:min-h-0 print:hidden">
                          —
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
