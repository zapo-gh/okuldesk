import React, { useCallback, useMemo } from 'react';

const DAYS = [
  { val: 1, label: 'Pazartesi' },
  { val: 2, label: 'Salı' },
  { val: 3, label: 'Çarşamba' },
  { val: 4, label: 'Perşembe' },
  { val: 5, label: 'Cuma' },
];

const CLASS_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-lime-100 text-lime-800 border-lime-200',
  'bg-sky-100 text-sky-800 border-sky-200',
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
  getPeriodTime?: (period: number) => string | null;
  onCellClick?: (group: any) => void;
}

export default function TimetableGrid({
  entries,
  viewMode,
  todayDow,
  getPeriodTime,
  onCellClick,
}: TimetableGridProps) {
  const { periods } = useMemo(() => {
    const max = entries.length > 0 ? Math.max(...entries.map(e => e.period)) : 8;
    const safeMax = Math.max(max, 8);
    return { maxPeriod: safeMax, periods: Array.from({ length: safeMax }, (_, i) => i + 1) };
  }, [entries]);

  const getCells = useCallback(
    (day: number, period: number) => entries.filter(e => e.dayOfWeek === day && e.period === period),
    [entries],
  );

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full text-sm border-collapse print:border-2 print:border-black print:text-black">
        <thead>
          <tr>
            <th className="px-4 py-4 text-left text-xs font-extrabold text-slate-700 uppercase tracking-wider w-28 bg-slate-200/90 sticky left-0 z-20 shadow-[1px_1px_0_0_rgba(203,213,225,1)] print:static print:bg-gray-100 print:border print:border-black print:shadow-none print:text-black print:p-0.5 print:text-[10px] print:w-auto">
              Gün
            </th>
            {periods.map(p => {
              const time = getPeriodTime ? getPeriodTime(p) : null;
              return (
                <th
                  key={p}
                  className="px-2 py-3 text-center text-xs font-extrabold text-slate-700 uppercase tracking-wider min-w-[110px] bg-slate-100/90 border-b border-slate-200 print:bg-gray-100 print:border print:border-black print:text-black print:p-0.5 print:min-w-0"
                >
                  <span className="block print:text-[9px] print:leading-none">{p}. Ders</span>
                  {time && (
                    <span className="block text-[10px] font-normal text-slate-500 normal-case tracking-normal mt-0.5 print:text-black print:text-[7px] print:leading-none print:mt-0">
                      {time}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="bg-white print:bg-transparent">
          {DAYS.map((day, rowIndex) => {
            const isToday = todayDow !== undefined && day.val === todayDow;
            return (
              <tr
                key={day.val}
                className={`transition-colors group border-b border-slate-200 last:border-0 print:border-b print:border-black ${
                  isToday 
                    ? 'bg-indigo-50/80 hover:bg-indigo-100/60' 
                    : rowIndex % 2 === 0 
                      ? 'bg-white hover:bg-slate-50' 
                      : 'bg-slate-50/70 hover:bg-slate-100/60'
                }`}
              >
                <td
                  className={`px-4 py-3 font-bold text-xs uppercase sticky left-0 z-10 shadow-[1px_0_0_0_rgba(226,232,240,1)] transition-colors print:static print:bg-gray-50 print:border print:border-black print:shadow-none print:text-black print:p-1 print:text-[10px] ${
                    isToday
                      ? 'bg-indigo-100/90 text-indigo-800'
                      : rowIndex % 2 === 0
                        ? 'bg-slate-50/90 text-slate-700'
                        : 'bg-slate-100/80 text-slate-700'
                  }`}
                >
                  {day.label}
                  {isToday && (
                    <span className="block text-indigo-500 text-[9px] font-semibold normal-case tracking-normal mt-0.5 print:hidden">
                      ● bugün
                    </span>
                  )}
                </td>
                {periods.map(period => {
                  const cells = getCells(day.val, period);
                  const grouped = groupCells(cells);
                  return (
                    <td key={period} className="px-1 py-1 text-center align-middle border-l border-slate-100 first:border-l-0 print:border print:border-black print:p-0">
                      {grouped.length > 0 ? (
                        <div className="flex flex-col gap-0.5 w-full h-full">
                          {grouped.map((group, idx) => (
                            <div
                              key={idx}
                              onClick={() => onCellClick?.(group)}
                              className={`flex flex-col items-center justify-center rounded-xl border px-1 py-1.5 w-full min-h-[50px] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 print:rounded-none print:border-none print:shadow-none print:bg-transparent print:p-0 print:min-h-0 print:text-black ${getSubjectColor(group.subject)} ${onCellClick ? 'cursor-pointer' : ''}`}
                            >
                              {viewMode === 'teacher' ? (
                                <>
                                  <span className="font-extrabold text-[13px] leading-tight mb-0.5 print:text-[10px] print:text-black print:mb-0">
                                    {group.classNames.join(', ')}
                                  </span>
                                  {group.subject && (
                                    <span className="font-semibold text-[10px] opacity-75 leading-tight uppercase print:opacity-100 print:text-[9px] print:text-black">
                                      {group.subject}
                                    </span>
                                  )}
                                  {group.room && (
                                    <span className="text-[9px] opacity-60 leading-tight mt-0.5 print:opacity-100 print:text-[8px] print:text-black print:mt-0">
                                      <span className="print:hidden">🚪 </span>
                                      <span className="hidden print:inline">Derslik: </span>
                                      {group.room}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {group.subject && (
                                    <span className="font-extrabold text-[13px] leading-tight mb-0.5 uppercase print:text-[10px] print:text-black print:mb-0">
                                      {group.subject}
                                    </span>
                                  )}
                                  {group.staffNames.length > 0 && (
                                    <div className="flex flex-col items-center gap-0 mt-0.5 print:mt-0">
                                      {group.staffNames.map((name: string, i: number) => (
                                        <span key={i} className="font-semibold text-[10px] opacity-80 leading-tight text-center print:opacity-100 print:text-[9px] print:text-black">
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {group.room && (
                                    <span className="text-[9px] opacity-60 leading-tight mt-0.5 print:opacity-100 print:text-[8px] print:text-black print:mt-0">
                                      <span className="print:hidden">🚪 </span>
                                      <span className="hidden print:inline">Derslik: </span>
                                      {group.room}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-2 py-2 w-full min-h-[60px] text-xs font-medium text-slate-400/60 print:border-none print:bg-transparent print:text-transparent print:min-h-0 print:hidden">
                          Boş
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
